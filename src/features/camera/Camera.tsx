// "Line it up": the live camera with a faint copy of the first photo, a
// light meter, a grid and a self-timer. Falls back to the phone's own camera
// or gallery through a file input when the live camera isn't available.

import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Copy, Grid3x3, Image as ImageIcon, RefreshCw, SunMedium, SwitchCamera, Timer, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button, cx } from '../../components/ui';
import { useBackClose, toast } from '../../components/overlay';
import { usePhotoUrl } from '../../data/hooks';
import {
  centreBrightness, compareLight, isInAppBrowser, LIGHT_TEXT, liveCameraSupported, NotAPhotoError, pickFile, processFile, processSource,
  type LightCheck, type ProcessedPhoto,
} from '../../data/photos';

export interface CaptureOptions {
  title: string;
  tip?: string;
  mode: 'camera' | 'gallery';
  /** The first photo of this view, shown faintly over the live camera. */
  ghostId?: string;
  /** Brightness of the first photo of this view, for the light check. */
  firstBrightness?: number;
}

export interface CaptureResult {
  processed: ProcessedPhoto;
  source: 'camera' | 'gallery' | 'live';
  lightDiffers: boolean;
  file?: File;
}

type Stage = 'live' | 'file' | 'processing' | 'preview' | 'error';

interface CaptureState extends CaptureOptions {
  resolve: (r: CaptureResult | null) => void;
  stage: Stage;
  file?: File;
  processed?: ProcessedPhoto;
  source?: CaptureResult['source'];
  error?: string;
}

let state: CaptureState | null = null;
const listeners = new Set<() => void>();
const setState = (s: CaptureState | null) => {
  state = s;
  listeners.forEach((l) => l());
};
const patch = (p: Partial<CaptureState>) => state && setState({ ...state, ...p });

async function handleFile(filePromise: Promise<File | null>, source: 'camera' | 'gallery') {
  const file = await filePromise;
  if (!state) return;
  if (!file) {
    if (state.stage === 'file') finish(null);
    return;
  }
  patch({ stage: 'processing' });
  try {
    const processed = await processFile(file);
    patch({ stage: 'preview', processed, file, source });
  } catch (e) {
    patch({ stage: 'error', error: e instanceof NotAPhotoError ? "That file isn't a photo. Choose a photo instead." : "That photo couldn't be read. Please try another." });
  }
}

/** Must be called straight from a tap, so the phone lets the file picker open. */
export function capturePhoto(opts: CaptureOptions): Promise<CaptureResult | null> {
  return new Promise((resolve) => {
    if (opts.mode === 'camera' && isInAppBrowser()) {
      // These browsers often block the camera: explain first, with a way out.
      setState({ ...opts, resolve, stage: 'error', error: "Instagram and WhatsApp's built-in browsers can block the camera. You can still try, or choose a photo." });
      return;
    }
    const live = opts.mode === 'camera' && liveCameraSupported();
    if (live) {
      setState({ ...opts, resolve, stage: 'live' });
      return;
    }
    const filePromise = pickFile({ camera: opts.mode === 'camera' });
    setState({ ...opts, resolve, stage: 'file' });
    void handleFile(filePromise, opts.mode === 'camera' ? 'camera' : 'gallery');
  });
}

function finish(r: CaptureResult | null) {
  const s = state;
  if (s?.processed && !r) URL.revokeObjectURL(s.processed.previewUrl);
  setState(null);
  s?.resolve(r);
}

export function CaptureHost() {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  const open = !!s && s.stage !== 'file';
  useBackClose(open, () => finish(null));
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish(null);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && s ? (
        <motion.div
          key="cam"
          role="dialog"
          aria-modal="true"
          aria-label={s.title}
          className="fixed inset-0 z-[75] flex flex-col bg-[#060B16] text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {s.stage === 'live' ? <LiveCamera s={s} /> : null}
          {s.stage === 'processing' ? (
            <div className="grid flex-1 place-items-center" role="status">
              <RefreshCw className="h-8 w-8 animate-spin opacity-80" aria-hidden />
              <span className="sr-only">Getting your photo ready</span>
            </div>
          ) : null}
          {s.stage === 'preview' && s.processed ? <Preview s={s} /> : null}
          {s.stage === 'error' ? <Fallback s={s} /> : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TopBar({ title, tip }: { title: string; tip?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 pb-3 pt-[calc(12px+var(--safe-t))]">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {tip ? <p className="mt-0.5 text-[0.88rem] text-white/75">{tip}</p> : null}
      </div>
      <button type="button" onClick={() => finish(null)} aria-label="Close camera" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
        <X className="h-6 w-6" aria-hidden />
      </button>
    </div>
  );
}

function LiveCamera({ s }: { s: CaptureState }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [opacity, setOpacity] = useState(35);
  const [grid, setGrid] = useState(false);
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [count, setCount] = useState<number | null>(null);
  const [light, setLight] = useState<LightCheck | null>(null);
  const ghostUrl = usePhotoUrl(s.ghostId, 'full');

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
          setReady(true);
        }
      } catch {
        if (!cancelled) patch({ stage: 'error', error: "Your camera didn't open. You can use the phone's camera or choose a photo instead." });
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  // The light meter, twice a second, against the first photo.
  useEffect(() => {
    if (!ready || !s.firstBrightness) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      setLight(compareLight(centreBrightness(v, v.videoWidth, v.videoHeight), s.firstBrightness));
    }, 500);
    return () => clearInterval(id);
  }, [ready, s.firstBrightness]);

  const shoot = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    try {
      const processed = await processSource(v, v.videoWidth, v.videoHeight, facing === 'user');
      streamRef.current?.getTracks().forEach((t) => t.stop());
      patch({ stage: 'preview', processed, source: 'live' });
    } catch {
      patch({ stage: 'error', error: "That photo couldn't be saved. Please try again." });
    }
  };

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      setCount(null);
      void shoot();
      return;
    }
    const id = setTimeout(() => setCount((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const mirror = facing === 'user';
  return (
    <>
      <TopBar title={s.title} tip={s.tip} />
      <div className="relative mx-auto w-full max-w-[560px] flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay className={cx('absolute inset-0 h-full w-full object-cover', mirror && '-scale-x-100')} />
        {ghostUrl ? <img src={ghostUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ opacity: opacity / 100 }} /> : null}
        {grid ? (
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="border border-white/25" />
            ))}
          </div>
        ) : null}
        {!ready ? (
          <p className="absolute inset-0 grid place-items-center text-white/80" role="status">
            Starting the camera
          </p>
        ) : null}
        {light ? (
          <div className="absolute inset-x-0 top-3 flex justify-center px-3" aria-live="polite">
            <span className={cx('flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.88rem] font-semibold', light === 'match' ? 'bg-[#0F5E52]/90' : 'bg-[#7A5A00]/90')}>
              <SunMedium className="h-4 w-4" aria-hidden />
              {LIGHT_TEXT[light]}
            </span>
          </div>
        ) : null}
        {count !== null ? (
          <div className="absolute inset-0 grid place-items-center bg-black/30 font-serif text-[6rem]" aria-live="assertive">
            {count}
          </div>
        ) : null}
      </div>
      <div className="mx-auto w-full max-w-[560px] px-5 pb-[calc(18px+var(--safe-b))] pt-3">
        {ghostUrl ? (
          <label className="mb-3 flex items-center gap-3 text-[0.88rem]">
            <span className="shrink-0 text-white/80">First photo</span>
            <input type="range" min={0} max={70} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full accent-[#FDDC69]" aria-label="How strongly to show your first photo" />
          </label>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setGrid((g) => !g)} aria-pressed={grid} aria-label="Grid" className={cx('grid h-12 w-12 place-items-center rounded-full', grid ? 'bg-white text-[#060B16]' : 'bg-white/10')}>
            <Grid3x3 className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setTimer((t) => (t === 0 ? 3 : t === 3 ? 10 : 0))}
            aria-label={`Self-timer: ${timer ? `${timer} seconds` : 'off'}`}
            className={cx('flex h-12 min-w-[48px] items-center justify-center gap-1 rounded-full px-3', timer ? 'bg-white text-[#060B16]' : 'bg-white/10')}
          >
            <Timer className="h-5 w-5" aria-hidden />
            {timer ? <span className="text-sm font-bold">{timer}s</span> : null}
          </button>
          <button
            type="button"
            onClick={() => (timer ? setCount(timer) : void shoot())}
            disabled={!ready || count !== null}
            aria-label="Take photo"
            className="grid h-[76px] w-[76px] place-items-center rounded-full border-4 border-white/90 disabled:opacity-40"
          >
            <span className="h-[58px] w-[58px] rounded-full bg-white" />
          </button>
          <button type="button" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} aria-label="Switch camera" className="grid h-12 w-12 place-items-center rounded-full bg-white/10">
            <SwitchCamera className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              const filePromise = pickFile({ camera: false });
              patch({ stage: 'file' });
              void handleFile(filePromise, 'gallery');
            }}
            aria-label="Choose from gallery"
            className="grid h-12 w-12 place-items-center rounded-full bg-white/10"
          >
            <ImageIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}

function Preview({ s }: { s: CaptureState }) {
  const p = s.processed!;
  const light = compareLight(p.brightness, s.firstBrightness);
  const differs = !!s.firstBrightness && light !== 'match';
  const use = (lightDiffers: boolean) => finish({ processed: p, source: s.source ?? 'camera', lightDiffers, file: s.file });
  const fromGallery = s.source === 'gallery';
  const retakeLabel = fromGallery ? 'Pick another' : 'Retake';
  const retake = () => {
    URL.revokeObjectURL(p.previewUrl);
    if (s.source === 'live') patch({ stage: 'live', processed: undefined });
    else {
      const filePromise = pickFile({ camera: s.source === 'camera' });
      patch({ stage: 'file', processed: undefined });
      void handleFile(filePromise, s.source === 'camera' ? 'camera' : 'gallery');
    }
  };
  return (
    <>
      <TopBar title={s.title} />
      <div className="relative mx-auto grid w-full max-w-[560px] flex-1 place-items-center overflow-hidden px-4">
        <img src={p.previewUrl} alt="Your new photo" className="max-h-full max-w-full rounded-[20px] object-contain" />
      </div>
      <div className="mx-auto w-full max-w-[560px] space-y-3 px-5 pb-[calc(18px+var(--safe-b))] pt-4">
        {s.firstBrightness ? (
          <p className={cx('flex items-start gap-2 rounded-[16px] px-4 py-3 text-[0.95rem] font-semibold', differs ? 'bg-[#FFF8E1] text-[#5C4300]' : 'bg-[#E7F3F1] text-[#0F5E52]')} role="status">
            {differs ? <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <SunMedium className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
            {differs ? `${light === 'less' ? 'Less' : 'More'} light than your first photo. Try the same spot and time of day.` : 'The light is close to your first photo.'}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2.5">
          {differs ? (
            <>
              <Button onClick={retake} icon={fromGallery ? ImageIcon : Camera}>
                {retakeLabel}
              </Button>
              <Button variant="secondary" onClick={() => use(true)}>
                Use anyway
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={retake}>
                {retakeLabel}
              </Button>
              <Button onClick={() => use(false)}>Use photo</Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Fallback({ s }: { s: CaptureState }) {
  const inApp = isInAppBrowser();
  const pick = (camera: boolean) => {
    const filePromise = pickFile({ camera });
    patch({ stage: 'file' });
    void handleFile(filePromise, camera ? 'camera' : 'gallery');
  };
  return (
    <>
      <TopBar title={s.title} />
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-4 px-6 pb-[calc(24px+var(--safe-b))]">
        <p className="font-serif text-[2rem] leading-tight">Let's use your phone's camera</p>
        <p className="text-white/80">{s.error}</p>
        {inApp ? (
          <div className="rounded-[18px] bg-white/10 p-4 text-[0.95rem]">
            <p className="font-semibold">Opened from Instagram or WhatsApp?</p>
            <p className="mt-1 text-white/80">Their built-in browser can block the camera. Tap the menu, then "Open in Chrome" or "Open in Safari".</p>
            <button
              type="button"
              className="mt-3 flex min-h-[44px] items-center gap-2 rounded-xl bg-white/15 px-3 font-semibold"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${location.origin}${location.pathname}`);
                  toast('Link copied. Open it in Chrome or Safari.');
                } catch {
                  toast("Copy this page's address from the menu.");
                }
              }}
            >
              <Copy className="h-4 w-4" aria-hidden /> Copy link
            </button>
          </div>
        ) : null}
        <Button size="lg" icon={Camera} onClick={() => pick(true)}>
          Use the phone camera
        </Button>
        <Button size="lg" variant="secondary" icon={ImageIcon} onClick={() => pick(false)}>
          Choose from gallery
        </Button>
      </div>
    </>
  );
}
