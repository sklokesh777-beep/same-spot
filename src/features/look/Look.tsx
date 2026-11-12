import { motion } from 'framer-motion';
import { ArrowRight, Camera, Equal, Eye, Hand, Image as ImageIcon, Users } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { HeroArt, ViewGuide } from '../../components/art';
import { FlowShell, PhotoThumb, PhotoViewer, ResultCard, StepBody, StepTitle } from '../../components/blocks';
import { confirmAsk, toast } from '../../components/overlay';
import { Button, ChoiceCard, Spinner, cx } from '../../components/ui';
import { CONCERNS } from '../../content/concerns';
import { QUICK_OPTIONS, nextSteps, resultCopy, type NextAction } from '../../content/copy';
import { closeTracker, keepTracking, pauseTracker, saveLook, savePhotos } from '../../data/actions';
import { useModel } from '../../data/hooks';
import { beginFlow, exitFlow, finishFlow, goBackOr } from '../../data/flows';
import { useToday } from '../../data/today';
import { lastCheckin } from '../../engine/clock';
import { daysBetween, formatDate } from '../../engine/dates';
import type { TrackerModel } from '../../engine/model';
import { currentPhotos, evaluate, firstPhotos, LOOK_NAMES, pickMeaning, type Evaluation } from '../../engine/rules';
import type { LookKind, LookPick, QuickId } from '../../engine/types';
import { capturePhoto } from '../camera/Camera';
import { CalendarSheet } from '../common';

// ---------- the look while it's open ----------

interface LDraft {
  trackerId: string;
  kind: LookKind;
  chooser: 'self' | 'someone';
  order: Record<string, boolean>;
  picks: Record<string, 'A' | 'B' | 'same'>;
  skippedPhotos: boolean;
  savedId?: string;
}

let ldraft: LDraft | null = null;
const listeners = new Set<() => void>();
const setL = (d: LDraft | null) => {
  ldraft = d;
  listeners.forEach((l) => l());
};
const patchL = (p: Partial<LDraft>) => ldraft && setL({ ...ldraft, ...p });
const useL = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ldraft,
  );

function coin(): boolean {
  const a = new Uint8Array(1);
  crypto.getRandomValues(a);
  return a[0] < 128;
}

function needsCheckin(m: TrackerModel, day: string): boolean {
  const last = lastCheckin(m.data.checkins, day);
  if (daysBetween(m.tracker.createdDate, day) <= 7) return false;
  return !last || daysBetween(last.date, day) > 7;
}

export default function Look() {
  const { id, step } = useParams<{ id: string; step?: string }>();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const m = useModel(id);
  const flowKey = `look:${id}`;
  const day = useToday();
  const d = useL();
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<{ ids: string[]; labels: string[]; index: number } | null>(null);

  // Once saved, the look is cleared when this screen closes.
  useEffect(
    () => () => {
      if (ldraft?.savedId) setL(null);
    },
    [],
  );

  // Decide where the look starts.
  useEffect(() => {
    if (!m || step) return;
    const base = `/t/${m.tracker.id}`;
    beginFlow(flowKey, `${base}/look`);
    if (m.warnings.length) return void nav(`${base}/safety`, { replace: true });
    if (!m.pending?.ready) return void nav(`${base}/look/none`, { replace: true });
    if (needsCheckin(m, day)) return void nav(`${base}/checkin?then=look`, { replace: true });
    const order: Record<string, boolean> = {};
    for (const v of m.tracker.views) order[v] = coin();
    setL({ trackerId: m.tracker.id, kind: m.pending.kind, chooser: 'self', order, picks: {}, skippedPhotos: false });
    const ev = evaluate({ data: m.data, today: day });
    if (ev.code) {
      void (async () => {
        const lid = await saveLook({ trackerId: m.tracker.id, date: day, kind: m.pending!.kind, picks: [], chooser: 'self' });
        patchL({ savedId: lid });
        await finishFlow(nav, flowKey, `${base}/look/result?l=${lid}`);
      })();
      return;
    }
    nav(`${base}/look/${ev.needs === 'sense' ? 'sense' : 'intro'}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.tracker.id, step]);

  if (m === undefined) return <Spinner />;
  if (m === null) return <Navigate to="/" replace />;
  const base = `/t/${m.tracker.id}`;
  if (step === 'none') return <NotReady m={m} />;
  if (step === 'result') return <Result m={m} lookId={params.get('l') ?? d?.savedId} />;
  if (!step) return <Spinner label="Getting your look ready" />;
  if (!d || d.trackerId !== m.tracker.id) return <Navigate to={`${base}/look`} replace />;
  if (d.savedId) return <Navigate to={`${base}/look/result?l=${d.savedId}`} replace />;

  const kindName = LOOK_NAMES[d.kind];
  const shell = { onBack: () => void goBackOr(nav, '/'), onClose: () => void exitFlow(nav, flowKey, '/'), closeLabel: 'Close the look' };
  const evNow = (): Evaluation => evaluate({ data: m.data, today: day, skippedPhotos: d.skippedPhotos });
  const firsts = firstPhotos(m.tracker, m.data.photos);
  const current = currentPhotos(m.tracker, m.data.photos, day);

  const finishLook = async (extra: { picks?: LookPick[]; sense?: QuickId }) => {
    if (busy) return;
    setBusy(true);
    try {
      const lid = await saveLook({
        trackerId: m.tracker.id,
        date: day,
        kind: d.kind,
        picks: extra.picks ?? [],
        sense: extra.sense,
        chooser: d.chooser,
        skippedPhotos: d.skippedPhotos || undefined,
      });
      patchL({ savedId: lid });
      setBusy(false);
      await finishFlow(nav, flowKey, `${base}/look/result?l=${lid}`);
    } catch {
      setBusy(false);
      toast('Something went wrong saving. Please try again.');
    }
  };

  const afterPhotos = () => {
    const ev = evNow();
    if (ev.code) return void finishLook({});
    if (ev.needs === 'photos') return void nav(`${base}/look/photos`);
    nav(`${base}/look/${d.chooser === 'someone' ? 'handoff' : 'pair-0'}`);
  };

  if (step === 'intro') {
    const go = (chooser: 'self' | 'someone') => {
      patchL({ chooser });
      const ev = evNow();
      if (ev.needs === 'photos') nav(`${base}/look/photos`);
      else if (ev.code) void finishLook({});
      else nav(`${base}/look/${chooser === 'someone' ? 'handoff' : 'pair-0'}`);
    };
    return (
      <FlowShell
        {...shell}
        footer={
          <>
            <Button size="lg" block iconRight={ArrowRight} onClick={() => go('self')}>
              Start
            </Button>
            <Button size="lg" block variant="secondary" icon={Users} onClick={() => go('someone')}>
              Ask someone else to choose
            </Button>
          </>
        }
      >
        <StepTitle kicker={`Your ${kindName} · ${m.concern.short}`} sub="You'll see your first and latest photo side by side, in random order, labelled only A and B. Pick the one that looks better, or say they're about the same.">
          Let's compare without dates, so hope doesn't decide.
        </StepTitle>
        <StepBody>
          <HeroArt variant={2} className="mx-auto w-full max-w-[320px]" />
          <p className="mt-4 text-center text-[0.92rem] text-ink2">"Looks better" needs your newer photo picked in every pair.</p>
        </StepBody>
      </FlowShell>
    );
  }

  if (step === 'photos') {
    const ev = evNow();
    const stale = ev.staleViews;
    const views = CONCERNS[m.tracker.concern].views.filter((v) => stale.includes(v.id) || ev.compareViews.includes(v.id));
    const take = async (view: string, mode: 'camera' | 'gallery') => {
      const v = views.find((x) => x.id === view)!;
      const first = firsts[view];
      const res = await capturePhoto({ title: v.label, tip: v.tip, mode, ghostId: first?.id, firstBrightness: first?.brightness });
      if (!res) return;
      await savePhotos(m.tracker.id, [{ view, date: day, processed: res.processed, source: res.source, lightDiffers: res.lightDiffers }]);
      URL.revokeObjectURL(res.processed.previewUrl);
    };
    const allFresh = stale.length === 0;
    return (
      <FlowShell
        {...shell}
        footer={
          allFresh ? (
            <Button size="lg" block iconRight={ArrowRight} onClick={afterPhotos}>
              Continue
            </Button>
          ) : (
            <Button
              size="lg"
              block
              variant="secondary"
              onClick={async () => {
                const ok = await confirmAsk({
                  title: 'Skip new photos?',
                  body: ev.compareViews.length ? 'Same Spot will compare only the views with a recent photo.' : "Without a recent photo, Same Spot can't compare yet. You can come back when you've taken one.",
                  confirmLabel: 'Skip',
                  cancelLabel: 'Take photos',
                });
                if (!ok) return;
                patchL({ skippedPhotos: true });
                const after = evaluate({ data: m.data, today: day, skippedPhotos: true });
                if (after.code) void finishLook({});
                else nav(`${base}/look/${d.chooser === 'someone' ? 'handoff' : 'pair-0'}`);
              }}
            >
              Skip for now
            </Button>
          )
        }
      >
        <StepTitle kicker={`Your ${kindName}`} sub="Your latest photos are more than 2 weeks old. Take new ones in the same spot and light, lined up with your first photo.">
          A few fresh photos first
        </StepTitle>
        <StepBody className="grid gap-4 sm:grid-cols-2">
          {views.map((v) => {
            const fresh = current[v.id];
            return (
              <section key={v.id} className="card p-4" aria-label={v.label}>
                <h2 className="font-semibold text-ink">{v.label}</h2>
                <div className="mt-3">
                  {fresh ? (
                    <PhotoThumb id={fresh.id} alt={`${v.label}, today`} label="Ready" />
                  ) : (
                    <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] border border-line bg-grey-50">
                      <ViewGuide view={v.id} className="absolute inset-0 h-full w-full p-5 opacity-70" />
                    </div>
                  )}
                </div>
                {!fresh ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" icon={Camera} onClick={() => take(v.id, 'camera')}>
                      Camera
                    </Button>
                    <Button size="sm" variant="secondary" icon={ImageIcon} onClick={() => take(v.id, 'gallery')}>
                      Gallery
                    </Button>
                  </div>
                ) : null}
              </section>
            );
          })}
        </StepBody>
      </FlowShell>
    );
  }

  if (step === 'handoff' || step === 'handback') {
    const back = step === 'handback';
    return (
      <FlowShell
        {...shell}
        tone="tint"
        footer={
          <Button size="lg" block onClick={() => nav(`${base}/look/${back ? 'reveal' : 'pair-0'}`)}>
            {back ? 'I have my phone back' : "I'm ready to choose"}
          </Button>
        }
      >
        <div className="mx-auto mt-10 grid h-20 w-20 place-items-center rounded-[26px] bg-card text-primary shadow-soft">
          <Hand className="h-10 w-10" aria-hidden />
        </div>
        <StepTitle sub={back ? 'Their picks are saved. You can see the dates now.' : 'They will see two photos at a time, without dates, and pick the one that looks better. Someone who didn\'t see the start is less swayed by hope.'}>
          {back ? 'Thank you. Please hand the phone back.' : 'Hand your phone to someone you trust'}
        </StepTitle>
      </FlowShell>
    );
  }

  if (step.startsWith('pair-')) {
    const ev = evNow();
    const views = ev.compareViews;
    const i = Number(step.slice(5));
    if (!views.length) return <Navigate to={`${base}/look/intro`} replace />;
    if (!Number.isInteger(i) || i < 0 || i >= views.length) return <Navigate to={`${base}/look/pair-0`} replace />;
    const view = views[i];
    const v = CONCERNS[m.tracker.concern].views.find((x) => x.id === view)!;
    const first = firsts[view];
    const latest = current[view];
    const latestLeft = d.order[view];
    const A = latestLeft ? latest : first;
    const B = latestLeft ? first : latest;
    const pick = (p: 'A' | 'B' | 'same') => {
      patchL({ picks: { ...d.picks, [view]: p } });
      setTimeout(() => {
        if (i + 1 < views.length) nav(`${base}/look/pair-${i + 1}`);
        else nav(`${base}/look/${d.chooser === 'someone' ? 'handback' : 'reveal'}`);
      }, 160);
    };
    const chosen = d.picks[view];
    return (
      <FlowShell {...shell} step={i + 1} total={views.length}>
        <StepTitle kicker={`Pair ${i + 1} of ${views.length} · ${v.label}`}>{v.question}</StepTitle>
        <StepBody>
          <div className="grid grid-cols-2 gap-3">
            {[
              { p: A, l: 'A' },
              { p: B, l: 'B' },
            ].map(({ p, l }, k) => (
              <PhotoThumb
                key={l}
                id={p.id}
                kind="full"
                alt={`Photo ${l}`}
                label={l}
                selected={chosen === l}
                onClick={() => setViewer({ ids: [A.id, B.id], labels: ['Photo A', 'Photo B'], index: k })}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-[0.85rem] text-ink2">Tap a photo to see it full screen.</p>
          <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label="Your pick">
            {(['A', 'B'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => pick(l)}
                aria-pressed={chosen === l}
                className={cx('tap flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[18px] border px-3 py-3 font-semibold', chosen === l ? 'border-primary bg-blue-50 text-blue-ink' : 'border-line bg-card text-navy hover:border-primary/40')}
              >
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-navy font-bold text-card">{l}</span>
                {l} looks better
              </button>
            ))}
            <button
              type="button"
              onClick={() => pick('same')}
              aria-pressed={chosen === 'same'}
              className={cx('tap col-span-2 flex min-h-[56px] items-center justify-center gap-2 rounded-[18px] border font-semibold', chosen === 'same' ? 'border-primary bg-blue-50 text-blue-ink' : 'border-line bg-card text-navy hover:border-primary/40')}
            >
              <Equal className="h-5 w-5" aria-hidden /> About the same
            </button>
          </div>
        </StepBody>
        {viewer ? <PhotoViewer ids={viewer.ids} labels={viewer.labels} index={viewer.index} onClose={() => setViewer(null)} /> : null}
      </FlowShell>
    );
  }

  if (step === 'reveal') {
    const ev = evNow();
    const views = ev.compareViews;
    if (views.some((v) => !d.picks[v])) return <Navigate to={`${base}/look/pair-0`} replace />;
    const picks: LookPick[] = views.map((v) => ({ view: v, firstId: firsts[v].id, latestId: current[v].id, latestOnLeft: d.order[v], pick: d.picks[v] }));
    return (
      <FlowShell
        {...shell}
        footer={
          <Button size="lg" block loading={busy} iconRight={ArrowRight} onClick={() => finishLook({ picks })}>
            See your result
          </Button>
        }
      >
        <StepTitle kicker="The reveal">Here are the dates</StepTitle>
        <StepBody className="grid gap-4">
          {picks.map((p, k) => {
            const v = CONCERNS[m.tracker.concern].views.find((x) => x.id === p.view)!;
            const fp = firsts[p.view];
            const lp = current[p.view];
            const A = p.latestOnLeft ? lp : fp;
            const B = p.latestOnLeft ? fp : lp;
            const meaning = pickMeaning(p);
            const who = d.chooser === 'someone' ? 'They' : 'You';
            return (
              <motion.section key={p.view} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 * k, duration: 0.3 }} className="card p-4">
                <h2 className="font-semibold text-ink">{v.label}</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {[
                    { ph: A, l: 'A' },
                    { ph: B, l: 'B' },
                  ].map(({ ph, l }) => (
                    <PhotoThumb key={l} id={ph.id} alt={`Photo ${l}`} label={`${l} · ${ph.id === fp.id ? 'First' : 'Latest'}`} sub={formatDate(ph.date, { ref: day, short: true })} selected={p.pick === l} />
                  ))}
                </div>
                <p className="mt-3 flex items-start gap-2 text-[0.95rem]">
                  <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    {p.pick === 'same' ? (
                      <>
                        {who} said <b>about the same</b>, so this pair shows no clear difference.
                      </>
                    ) : (
                      <>
                        {who} picked <b>{p.pick}</b>: the {meaning === 'latest' ? 'newer' : 'first'} photo.
                      </>
                    )}
                  </span>
                </p>
              </motion.section>
            );
          })}
        </StepBody>
      </FlowShell>
    );
  }

  if (step === 'sense') {
    return (
      <FlowShell {...shell}>
        <StepTitle kicker={`Your ${kindName}`} sub="You don't have first photos, so this result is your sense only.">
          Compared with when you started, how does it seem to you?
        </StepTitle>
        <StepBody>
          <div role="radiogroup" aria-label="How does it seem?" className="grid gap-3">
            {QUICK_OPTIONS.map((o) => (
              <ChoiceCard key={o.id} selected={false} title={o.label} onClick={() => finishLook({ sense: o.id })} />
            ))}
          </div>
        </StepBody>
      </FlowShell>
    );
  }

  return <Navigate to={`${base}/look`} replace />;
}

function NotReady({ m }: { m: TrackerModel }) {
  const day = useToday();
  const nav = useNavigate();
  const close = () => void exitFlow(nav, null, '/');
  const date = m.pending && !m.pending.ready ? m.pending.waitUntil : m.earlyDone || m.fullDone ? m.fullDate : m.earlyDate;
  return (
    <FlowShell onBack={close} onClose={close} footer={<Button size="lg" block onClick={() => void finishFlow(nav, null, '/')}>Go to Home</Button>}>
      <StepTitle sub={date ? `With your latest answers, your next look is on ${formatDate(date, { ref: day })}. Keep going, and Same Spot will tell you when it's ready.` : 'Your next look date will be set when you use it again.'}>
        Not quite yet
      </StepTitle>
      <HeroArt variant={3} className="mx-auto w-full max-w-[300px]" />
    </FlowShell>
  );
}

function Result({ m, lookId }: { m: TrackerModel; lookId?: string }) {
  const nav = useNavigate();
  const [calendar, setCalendar] = useState(false);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(t);
  }, []);
  const found = m.looks.find((l) => l.look.id === lookId);
  if (!found || !found.ev.code) return waited ? <Navigate to={`/progress?t=${m.tracker.id}`} replace /> : <Spinner />;
  const ev = found.ev;
  const copy = resultCopy(ev, m.tracker.concern);
  const next = nextSteps(ev);
  const id = m.tracker.id;
  const done = (to = '/') => void finishFlow(nav, null, to);
  const run = async (a: NextAction) => {
    switch (a) {
      case 'keep':
      case 'keepNoPhotos':
      case 'later':
      case 'keepTracker':
        return done();
      case 'calendar':
        return setCalendar(true);
      case 'firstPhotos':
        return done(`/t/${id}/add-photos`);
      case 'photosNow':
        // Start the look again from the top, with new photos.
        setL(null);
        return nav(`/t/${id}/look`, { replace: true });
      case 'restart':
        return done(`/new?restart=${id}`);
      case 'derm':
        return nav(`/t/${id}/summary`);
      case 'keepTracking':
        await keepTracking(id, m.clock.wholeWeeks);
        toast('One more look after 12 more weeks of real use.');
        return done();
      case 'close':
        if (await confirmAsk({ title: 'Close this tracker?', body: 'Your history stays on this device and you can look at it any time.', confirmLabel: 'Close the tracker' })) {
          await closeTracker(id, 'done');
          toast('Tracker closed. Your history stays here.');
          done();
        }
        return;
      case 'pause':
        await pauseTracker(id);
        toast('Tracking paused. Your clock waits for you.');
        return done();
      case 'stop':
        if (await confirmAsk({ title: 'Stop using it?', body: 'Your tracker closes and its history stays on this device.', confirmLabel: 'Stop and close' })) {
          await closeTracker(id, 'stopped');
          toast('Tracker closed. Your history stays here.');
          done();
        }
        return;
    }
  };
  return (
    <FlowShell closeLabel="Close" onClose={() => done('/')}>
      <h1 className="sr-only">
        Your {LOOK_NAMES[found.look.kind]}: {copy.title}
      </h1>
      <div className="mt-2">
        <ResultCard
          title={copy.title}
          family={copy.family}
          paragraphs={copy.paragraphs}
          checks={ev.checks}
          kicker={`Your ${LOOK_NAMES[found.look.kind]} · ${formatDate(found.look.date, { ref: m.today })}`}
        />
        {found.look.chooser === 'someone' ? (
          <p className="mt-3 flex items-center gap-2 text-[0.9rem] text-ink2">
            <Users className="h-4 w-4" aria-hidden /> Someone you trust chose without dates.
          </p>
        ) : null}
      </div>
      <section className="mt-6" aria-labelledby="next-title">
        <h2 id="next-title" className="font-serif text-[1.6rem] text-navy">
          What's next
        </h2>
        {next.note ? <p className="mt-1 text-ink2">{next.note}</p> : null}
        <div className={cx('mt-4 gap-2.5', next.grid ? 'grid grid-cols-2' : 'grid')}>
          {next.steps.map((st, k) =>
            next.grid ? (
              <button key={st.id} type="button" onClick={() => run(st.id)} className="tap min-h-[72px] rounded-[18px] border border-line bg-card px-3 py-3 text-center font-semibold text-navy hover:border-primary/40">
                {st.label}
              </button>
            ) : (
              <Button key={st.id} block size="lg" variant={k === 0 ? 'primary' : 'secondary'} onClick={() => run(st.id)}>
                {st.label}
              </Button>
            ),
          )}
        </div>
      </section>
      <CalendarSheet m={m} open={calendar} onClose={() => setCalendar(false)} />
    </FlowShell>
  );
}
