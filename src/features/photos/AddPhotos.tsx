import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ViewGuide } from '../../components/art';
import { FlowShell, StepBody, StepTitle } from '../../components/blocks';
import { Sheet, toast } from '../../components/overlay';
import { Button, ChoiceCard, Spinner, TextField, cx } from '../../components/ui';
import { savePhotos } from '../../data/actions';
import { useModel } from '../../data/hooks';
import { exitFlow, finishFlow, goBackOr } from '../../data/flows';
import { captureDate } from '../../data/photos';
import { useToday } from '../../data/today';
import { addDays, formatDate, isDateStr } from '../../engine/dates';
import { capturePhoto, type CaptureResult } from '../camera/Camera';

interface Pending {
  view: string;
  res: CaptureResult;
  date: string;
}

export default function AddPhotos() {
  const { id, view } = useParams<{ id: string; view?: string }>();
  const nav = useNavigate();
  const m = useModel(id);
  const day = useToday();
  const [items, setItems] = useState<Pending[]>([]);
  const [ask, setAsk] = useState<{ view: string; res: CaptureResult; fromPhoto: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((p) => URL.revokeObjectURL(p.res.processed.previewUrl)), []);

  if (m === undefined) return <Spinner />;
  if (m === null) return <Navigate to="/photos" replace />;
  const views = m.concern.views.filter((v) => m.tracker.views.includes(v.id) && (!view || v.id === view));

  const add = (p: Pending) =>
    setItems((list) => {
      for (const x of list) if (x.view === p.view) URL.revokeObjectURL(x.res.processed.previewUrl);
      return [...list.filter((x) => x.view !== p.view), p];
    });
  const take = async (vid: string, mode: 'camera' | 'gallery') => {
    const v = views.find((x) => x.id === vid)!;
    const first = m.firsts[vid];
    const res = await capturePhoto({ title: v.label, tip: v.tip, mode, ghostId: first?.id, firstBrightness: first?.brightness });
    if (!res) return;
    if (mode === 'gallery' && res.file) {
      const found = await captureDate(res.file);
      setAsk({ view: vid, res, fromPhoto: found.fromPhoto && found.date && found.date <= day ? found.date : null });
    } else add({ view: vid, res, date: day });
  };
  const save = async () => {
    setBusy(true);
    try {
      await savePhotos(
        m.tracker.id,
        items.map((p) => ({ view: p.view, date: p.date, processed: p.res.processed, source: p.res.source, lightDiffers: p.res.lightDiffers })),
      );
      toast(items.length === 1 ? 'Photo saved.' : `${items.length} photos saved.`);
      await finishFlow(nav, null, `/photos?t=${m.tracker.id}`);
    } catch {
      setBusy(false);
      toast('Something went wrong saving. Please try again.');
    }
  };

  return (
    <FlowShell
      onBack={() => void goBackOr(nav, `/photos?t=${m.tracker.id}`)}
      onClose={() => void exitFlow(nav, null, `/photos?t=${m.tracker.id}`)}
      footer={
        <Button size="lg" block disabled={!items.length} loading={busy} onClick={save}>
          {items.length ? `Save ${items.length === 1 ? '1 photo' : `${items.length} photos`}` : 'Save photos'}
        </Button>
      }
    >
      <StepTitle kicker={m.tracker.productName} sub="Same spot and light as your first photos. Photos stay only on this device.">
        Add photos
      </StepTitle>
      <StepBody className="grid gap-4 sm:grid-cols-2">
        {views.map((v) => {
          const p = items.find((x) => x.view === v.id);
          return (
            <section key={v.id} className="card p-4" aria-label={v.label}>
              <h2 className="font-semibold text-ink">{v.label}</h2>
              <p className="mt-1 text-[0.88rem] text-ink2">{v.tip}</p>
              <div className="relative mt-3 aspect-[3/4] overflow-hidden rounded-[18px] border border-line bg-grey-50">
                {p ? <img src={p.res.processed.previewUrl} alt={`${v.label}, new photo`} className="h-full w-full object-cover" /> : <ViewGuide view={v.id} className="absolute inset-0 h-full w-full p-5 opacity-70" />}
                {p ? (
                  <>
                    <span className={cx('absolute left-2 top-2 rounded-lg px-2 py-1 text-[0.75rem] font-bold', p.res.lightDiffers ? 'bg-[#FFF8E1] text-[#5C4300]' : 'bg-[#143461]/85 text-white')}>
                      {formatDate(p.date, { ref: day, short: true })}
                      {p.res.lightDiffers ? ' · light differs' : ''}
                    </span>
                    <button type="button" aria-label={`Remove photo: ${v.label}`} onClick={() => setItems((l) => l.filter((x) => x.view !== v.id))} className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-card/90 shadow">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" icon={Camera} onClick={() => take(v.id, 'camera')}>
                  {p ? 'Retake' : 'Camera'}
                </Button>
                <Button size="sm" variant="secondary" icon={ImageIcon} onClick={() => take(v.id, 'gallery')}>
                  Gallery
                </Button>
              </div>
            </section>
          );
        })}
      </StepBody>
      <DateSheet
        pending={ask}
        onClose={() => setAsk(null)}
        onSave={(date) => {
          if (ask) add({ view: ask.view, res: ask.res, date });
          setAsk(null);
        }}
      />
    </FlowShell>
  );
}

function DateSheet({ pending, onClose, onSave }: { pending: { fromPhoto: string | null } | null; onClose: () => void; onSave: (d: string) => void }) {
  const day = useToday();
  const [choice, setChoice] = useState<'photo' | 'today' | 'pick'>('today');
  const [picked, setPicked] = useState(day);
  useEffect(() => {
    setChoice(pending?.fromPhoto && pending.fromPhoto !== day ? 'photo' : 'today');
    setPicked(pending?.fromPhoto ?? day);
  }, [pending, day]);
  const date = choice === 'photo' ? pending?.fromPhoto : choice === 'today' ? day : picked;
  const valid = !!date && isDateStr(date) && date <= day;
  return (
    <Sheet open={!!pending} onClose={onClose} title="When was this taken?">
      <div role="radiogroup" aria-label="When was this photo taken?" className="grid gap-3">
        {pending?.fromPhoto && pending.fromPhoto !== day ? (
          <ChoiceCard selected={choice === 'photo'} title={formatDate(pending.fromPhoto, { ref: day, year: true })} sub="The date saved in the photo" onClick={() => setChoice('photo')} />
        ) : null}
        <ChoiceCard selected={choice === 'today'} title="Today" onClick={() => setChoice('today')} />
        <ChoiceCard selected={choice === 'pick'} title="Pick a date" onClick={() => setChoice('pick')} />
      </div>
      {choice === 'pick' ? (
        <div className="mt-4">
          <TextField label="Taken on" type="date" value={picked} max={day} min={addDays(day, -900)} onChange={setPicked} />
        </div>
      ) : null}
      <Button size="lg" block className="mt-5" disabled={!valid} onClick={() => valid && onSave(date!)}>
        Use this date
      </Button>
    </Sheet>
  );
}
