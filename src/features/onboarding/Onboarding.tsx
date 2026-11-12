import { motion, type PanInfo } from 'framer-motion';
import { ArrowRight, Check, HardDrive, Lock, PlusSquare, Share, Smartphone, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { HeroArt, Logo } from '../../components/art';
import { FlowShell, StepTitle } from '../../components/blocks';
import { Button, Dots, cx } from '../../components/ui';
import { getSettings, markOnboarded, saveSettings } from '../../data/actions';
import { beginFlow, finishFlow, goBackOr } from '../../data/flows';
import { restoreFromBackup } from '../restore';

const CARDS = [
  { title: 'Real use, really counted', line: 'Use it half the days? Those weeks count as half, so your dates stay honest.', art: 1 },
  { title: 'Same spot, same light', line: 'Guided photos you can line up with your first one.', art: 2 },
  { title: 'Compare without dates', line: 'Pick the better photo first. Then see the dates and an honest result.', art: 3 },
];

export function isIosSafariTab(): boolean {
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export default function Onboarding() {
  const { step = 'start' } = useParams();
  const [params] = useSearchParams();
  const replay = params.get('replay') === '1';
  const nav = useNavigate();
  // Whether onboarding was already done when this screen opened, read fresh
  // from the device (the live settings can lag just after "Delete everything").
  const [already, setAlready] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    getSettings().then((s) => alive && setAlready(s.onboarded));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!replay) beginFlow('welcome', '/welcome');
  }, [replay]);

  const finish = async () => {
    await saveSettings({ onboarded: true, ageConfirmed: true });
    markOnboarded();
    await finishFlow(nav, 'welcome', '/new');
  };
  const back = () => void goBackOr(nav, '/welcome');

  if (already === null) return null;
  if (already && !replay && step !== 'adults') return <Navigate to="/" replace />;
  if (step === 'intro') return <Intro onDone={() => (replay ? void goBackOr(nav, '/settings') : nav('/welcome/privacy'))} />;
  if (step === 'privacy') return <Privacy onBack={back} onUnder18={() => nav('/welcome/adults')} onDone={() => (isIosSafariTab() ? nav('/welcome/iphone') : finish())} />;
  if (step === 'iphone') return <IPhone onBack={back} onDone={finish} />;
  if (step === 'adults') {
    return (
      <FlowShell onBack={back} hideClose>
        <StepTitle sub="Same Spot is for adults only, so we can't start a tracker for you. A dermatologist or your doctor can help you with any skin or hair worries.">
          Same Spot is for adults
        </StepTitle>
        <Button variant="secondary" block onClick={() => nav('/welcome', { replace: true })}>
          Back to the start
        </Button>
      </FlowShell>
    );
  }
  return (
    <main id="main" tabIndex={-1} className="focus:outline-none relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-blue-50 via-bg to-lav-50 px-6 pb-[calc(28px+var(--safe-b))] pt-[calc(28px+var(--safe-t))]">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col">
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="flex items-center gap-3">
          <Logo size={44} />
          <span className="text-[1.25rem] font-bold text-navy">Same Spot</span>
        </motion.div>
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.08 }} className="mt-8">
          <HeroArt variant={0} className="mx-auto w-full max-w-[380px]" />
        </motion.div>
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45, delay: 0.16 }} className="mt-8">
          <h1 className="title-lg text-[2.75rem]">Can you tell yet whether it's working?</h1>
          <p className="mt-4 text-[1.08rem] text-ink2">Find out honestly, with your own photos and the weeks you really used it.</p>
          <p className="mt-6 text-[0.8rem] font-bold uppercase tracking-[0.08em] text-primary">Made for Be Bodywise customers</p>
        </motion.div>
        <div className="mt-auto grid gap-2 pt-8">
          <Button size="lg" block iconRight={ArrowRight} onClick={() => nav('/welcome/intro')}>
            Get started
          </Button>
          <button
            type="button"
            onClick={async () => {
              if (await restoreFromBackup()) nav('/', { replace: true });
            }}
            className="min-h-[48px] font-semibold text-primary"
          >
            Restore from a backup
          </button>
        </div>
      </div>
    </main>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === CARDS.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(CARDS.length - 1, n)));
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(i + 1);
    else if (info.offset.x > 60) go(i - 1);
  };
  const card = CARDS[i];
  return (
    <main id="main" tabIndex={-1} className="focus:outline-none flex min-h-dvh flex-col bg-bg px-6 pb-[calc(24px+var(--safe-b))] pt-[calc(16px+var(--safe-t))]">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col">
        <div className="flex justify-end">
          <button type="button" onClick={onDone} className="min-h-[48px] rounded-xl px-3 font-semibold text-primary hover:bg-primary/10">
            Skip
          </button>
        </div>
        <motion.section
          key={i}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={onDragEnd}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 cursor-grab flex-col justify-center active:cursor-grabbing"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${CARDS.length}`}
        >
          <HeroArt variant={card.art} className="mx-auto w-full max-w-[340px]" />
          <h1 className="title mt-8 text-center">{card.title}</h1>
          <p className="mx-auto mt-3 max-w-[340px] text-center text-[1.05rem] text-ink2">{card.line}</p>
        </motion.section>
        <Dots count={CARDS.length} active={i} />
        <div className="mt-6">
          <Button size="lg" block iconRight={ArrowRight} onClick={() => (last ? onDone() : go(i + 1))}>
            {last ? 'Continue' : 'Next'}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Privacy({ onDone, onUnder18, onBack }: { onDone: () => void; onUnder18: () => void; onBack: () => void }) {
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const points = [
    { icon: HardDrive, text: "What's saved: your answers, dates and any photos you take." },
    { icon: Lock, text: 'It stays only on this device. No account, no server, nobody else can see it.' },
    { icon: Trash2, text: 'You can delete everything at any time in Settings.' },
  ];
  return (
    <FlowShell onBack={onBack} hideClose footer={
      <>
        <Button
          size="lg"
          block
          disabled={!adult}
          loading={busy}
          onClick={() => {
            setBusy(true);
            onDone();
          }}
        >
          Continue
        </Button>
        <button type="button" onClick={onUnder18} className="min-h-[48px] font-semibold text-primary">
          I'm under 18
        </button>
      </>
    }>
      <StepTitle kicker="Before you start">Your record is private</StepTitle>
      <ul className="space-y-3">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 rounded-[18px] bg-card p-4 shadow-soft">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-blue-50 text-blue-ink">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="pt-1.5">{text}</span>
          </li>
        ))}
      </ul>
      <label className={cx('tap mt-6 flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[18px] border px-4', adult ? 'border-primary bg-blue-50' : 'border-line bg-card')}>
        <input type="checkbox" className="peer sr-only" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        <span className={cx('grid h-6 w-6 place-items-center rounded-md border-2 peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30', adult ? 'border-primary bg-primary text-onprimary' : 'border-line')}>
          {adult ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : null}
        </span>
        <span className="font-semibold">I'm 18 or older</span>
      </label>
    </FlowShell>
  );
}

function IPhone({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const steps = [
    { icon: Share, text: 'Tap Share at the bottom of Safari.' },
    { icon: PlusSquare, text: 'Choose "Add to Home Screen".' },
    { icon: Smartphone, text: 'Open Same Spot from your Home Screen.' },
  ];
  return (
    <FlowShell onBack={onBack} hideClose footer={
      <>
        <Button size="lg" block onClick={onDone}>
          I've added it
        </Button>
        <Button variant="ghost" block onClick={async () => { await saveSettings({ safariAnyway: true }); onDone(); }}>
          Continue in Safari
        </Button>
      </>
    }>
      <StepTitle kicker="On iPhone" sub="Safari can clear website data after 7 days without a visit. From your Home Screen, your record is safer.">
        Add Same Spot to your Home Screen
      </StepTitle>
      <ol className="space-y-3">
        {steps.map(({ icon: Icon, text }, k) => (
          <li key={text} className="flex items-center gap-4 rounded-[18px] bg-card p-4 shadow-soft">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-[0.95rem] font-bold text-card">{k + 1}</span>
            <span className="flex-1">{text}</span>
            <Icon className="h-5 w-5 text-primary" aria-hidden />
          </li>
        ))}
      </ol>
    </FlowShell>
  );
}
