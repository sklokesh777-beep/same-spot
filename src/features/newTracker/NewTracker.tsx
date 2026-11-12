import { ArrowRight, Calendar, CalendarPlus, Camera, Download, Flag, Image as ImageIcon, Info, ListChecks, ShieldAlert, Sparkles, Trash2, History } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Confetti, ViewGuide } from '../../components/art';
import { ConcernBadge, Expandables, FlowShell, StepBody, StepTitle } from '../../components/blocks';
import { Sheet, confirmAsk, toast } from '../../components/overlay';
import { Button, ChoiceCard, Chip, EvidenceMeter, Panel, TextField, cx } from '../../components/ui';
import { CONCERNS, CONCERN_ORDER } from '../../content/concerns';
import { USE_OPTIONS } from '../../content/copy';
import { DIRECTIONS_LINE, OTHER_PRODUCT_ID, PACK_WINS_LINE, productById, productsFor } from '../../content/products';
import { closeTracker, createTracker } from '../../data/actions';
import { db } from '../../data/db';
import { downloadIcs, googleCalendarLink } from '../../data/calendar';
import { useModel, useModels, useSettings } from '../../data/hooks';
import { beginFlow, exitFlow, finishFlow, goBackOr } from '../../data/flows';
import { captureDate, compareLight } from '../../data/photos';
import { today, useToday } from '../../data/today';
import { computeClock, projectDate } from '../../engine/clock';
import { addDays, formatDate, isDateStr } from '../../engine/dates';
import type { Tracker } from '../../engine/types';
import { capturePhoto, type CaptureResult } from '../camera/Camera';
import { getDraft, resetDraft, updateDraft, useDraft, type Draft } from './draft';

const STEPS = ['concern', 'product', 'start', 'use', 'pack', 'timeline', 'photos'] as const;
type Step = (typeof STEPS)[number] | 'done';
const MAX_ACTIVE = 3;

function firstMissing(d: Draft): Step {
  if (!d.concern || (d.concern === 'other' && !d.customName.trim())) return 'concern';
  if (!d.productId || (d.productId === OTHER_PRODUCT_ID && !d.productName.trim())) return 'product';
  if (!d.startChoice || !d.startDate) return 'start';
  if (!d.setupUse) return 'use';
  if (!d.packOpened) return 'pack';
  return 'photos';
}

function draftTracker(d: Draft, day: string): Tracker {
  return {
    id: 'draft',
    concern: d.concern ?? 'underarm',
    productId: d.productId ?? OTHER_PRODUCT_ID,
    productName: d.productName,
    startDate: d.startDate ?? day,
    createdDate: day,
    setupUse: d.setupUse ?? 'most',
    packDays: d.packDays,
    packOpened: d.packOpened ?? day,
    views: CONCERNS[d.concern ?? 'underarm'].views.map((v) => v.id),
    interval: d.interval,
    status: 'active',
    createdAt: 0,
  };
}

export default function NewTracker() {
  const { step } = useParams<{ step?: string }>();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const d = useDraft();
  const settings = useSettings();
  const models = useModels();

  // Once saved, the draft is cleared when this screen closes.
  useEffect(
    () => () => {
      if (getDraft().createdId) resetDraft();
    },
    [],
  );

  // A fresh start, or a restart of an older tracker.
  useEffect(() => {
    if (step) return;
    const restart = params.get('restart');
    beginFlow('new', '/new');
    (async () => {
      if (restart) {
        const t = await db.trackers.get(restart);
        if (t) {
          resetDraft({
            concern: t.concern,
            customName: t.customName ?? '',
            productId: t.productId,
            productName: t.productName,
            interval: t.interval,
            packDays: t.packDays,
            restartFrom: t.id,
          });
          nav('/new/start', { replace: true });
          return;
        }
      }
      resetDraft({ interval: settings?.defaultInterval ?? 28 });
      nav('/new/concern', { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!step || !models) return null;
  const s = step as Step;
  if (d.createdId && s !== 'done') return <Navigate to="/new/done" replace />;
  if (!d.createdId && s === 'done') return <Navigate to="/" replace />;
  if (s !== 'done' && !STEPS.includes(s as (typeof STEPS)[number])) return <Navigate to="/new" replace />;
  const idx = STEPS.indexOf(s as (typeof STEPS)[number]);
  const missing = firstMissing(d);
  if (s !== 'done' && idx > STEPS.indexOf(missing as (typeof STEPS)[number])) return <Navigate to={`/new/${missing}`} replace />;

  const atLimit = models.active.length >= MAX_ACTIVE && !d.restartFrom;
  const go = (next: Step) => nav(`/new/${next}`);
  const back = () => void goBackOr(nav, '/');
  const close = () => void exitFlow(nav, 'new', '/');
  const closeTo = '/';

  if (atLimit && s === 'concern') {
    return (
      <FlowShell onBack={back} onClose={close}>
        <StepTitle sub="You can follow up to 3 products at once. Close one in Settings to start another.">You're tracking 3 things</StepTitle>
        <Button block to="/settings">Go to Settings</Button>
      </FlowShell>
    );
  }

  const progress = { step: idx + 1, total: STEPS.length };
  switch (s) {
    case 'concern':
      return <ConcernStep d={d} onNext={() => go('product')} shell={{ ...progress, onBack: back, onClose: close, closeTo }} />;
    case 'product':
      return <ProductStep d={d} onNext={() => go('start')} shell={{ ...progress, onBack: back, onClose: close, closeTo }} />;
    case 'start':
      return <StartStep d={d} onNext={() => go('use')} shell={{ ...progress, onBack: back, onClose: close, closeTo }} />;
    case 'use':
      return <UseStep d={d} onNext={() => go('pack')} shell={{ ...progress, onBack: back, onClose: close, closeTo }} />;
    case 'pack':
      return <PackStep d={d} onNext={() => go('timeline')} shell={{ ...progress, onBack: back, onClose: close, closeTo }} />;
    case 'timeline':
      return <TimelineStep d={d} onNext={() => go('photos')} shell={{ ...progress, onBack: back, onClose: close, closeTo }} />;
    case 'photos':
      return <PhotosStep d={d} onDone={() => void finishFlow(nav, 'new', '/new/done')} shell={{ ...progress, onBack: back, onClose: close, closeTo }} />;
    case 'done':
      return <DoneStep id={d.createdId!} discreet={settings?.discreetTitles ?? true} />;
  }
}

interface ShellProps {
  step: number;
  total: number;
  onBack: () => void;
  onClose: () => void;
  closeTo: string;
}

const autoNext = (fn: () => void) => setTimeout(fn, 180);

function ConcernStep({ d, onNext, shell }: { d: Draft; onNext: () => void; shell: ShellProps }) {
  const isOther = d.concern === 'other';
  return (
    <FlowShell {...shell} footer={isOther ? <Button size="lg" block disabled={!d.customName.trim()} onClick={onNext} iconRight={ArrowRight}>Next</Button> : undefined}>
      <StepTitle kicker="New tracker">What are you tracking?</StepTitle>
      <StepBody>
        <div role="radiogroup" aria-label="What are you tracking?" className="grid gap-3">
          {CONCERN_ORDER.map((id) => {
            const c = CONCERNS[id];
            return (
              <ChoiceCard
                key={id}
                selected={d.concern === id}
                left={<ConcernBadge concern={id} size={48} />}
                title={c.label}
                sub={`Early look at ${c.early} weeks, full look at ${c.full}`}
                onClick={() => {
                  const changed = d.concern !== id;
                  updateDraft({ concern: id, ...(changed ? { productId: undefined, productName: '', photos: [] } : {}) });
                  if (id !== 'other') autoNext(onNext);
                }}
              />
            );
          })}
        </div>
        {isOther ? (
          <div className="mt-5">
            <TextField label="What would you like to track?" value={d.customName} onChange={(v) => updateDraft({ customName: v })} maxLength={30} placeholder="A short name, like dry patches" autoFocus />
          </div>
        ) : null}
      </StepBody>
    </FlowShell>
  );
}

function ProductStep({ d, onNext, shell }: { d: Draft; onNext: () => void; shell: ShellProps }) {
  const list = productsFor(d.concern!);
  const isOther = d.productId === OTHER_PRODUCT_ID;
  return (
    <FlowShell {...shell} footer={isOther ? <Button size="lg" block disabled={!d.productName.trim()} onClick={onNext} iconRight={ArrowRight}>Next</Button> : undefined}>
      <StepTitle kicker={CONCERNS[d.concern!].label}>Which product?</StepTitle>
      <StepBody>
        <div role="radiogroup" aria-label="Which product?" className="grid gap-3">
          {list.map((p) => (
            <ChoiceCard
              key={p.id}
              selected={d.productId === p.id}
              title={p.name}
              sub="Be Bodywise"
              onClick={() => {
                updateDraft({ productId: p.id, productName: p.name });
                autoNext(onNext);
              }}
            />
          ))}
          <ChoiceCard selected={isOther} title="Other product" sub="Type its name" onClick={() => updateDraft({ productId: OTHER_PRODUCT_ID, productName: isOther ? d.productName : '' })} />
        </div>
        {isOther ? (
          <div className="mt-5">
            <TextField label="Product name" value={d.productName} onChange={(v) => updateDraft({ productName: v })} maxLength={40} placeholder="As it says on the pack" autoFocus />
          </div>
        ) : null}
      </StepBody>
    </FlowShell>
  );
}

const START_CHIPS = [
  { id: '2w', label: '2 weeks ago', days: 14 },
  { id: '1m', label: '1 month ago', days: 30 },
  { id: '3m', label: '3 months ago', days: 91 },
  { id: '6m', label: '6 months ago', days: 182 },
  { id: 'pick', label: 'Pick a date', days: 0 },
];

function StartStep({ d, onNext, shell }: { d: Draft; onNext: () => void; shell: ShellProps }) {
  const day = useToday();
  const min = addDays(day, -730);
  const earlier = d.startChoice === 'earlier';
  const valid = d.startChoice === 'today' || (!!d.startDate && isDateStr(d.startDate) && d.startDate < day && d.startDate >= min);
  return (
    <FlowShell {...shell} footer={earlier ? <Button size="lg" block disabled={!valid} onClick={onNext} iconRight={ArrowRight}>Next</Button> : undefined}>
      <StepTitle kicker="Your product">When did you start using it?</StepTitle>
      <StepBody>
        <div role="radiogroup" aria-label="When did you start?" className="grid gap-3">
          <ChoiceCard
            selected={d.startChoice === 'today'}
            title="Today"
            sub="Your clock starts now"
            onClick={() => {
              updateDraft({ startChoice: 'today', startDate: day, startChip: undefined });
              autoNext(onNext);
            }}
          />
          <ChoiceCard selected={earlier} title="Earlier" sub="The weeks you've already used it count" onClick={() => updateDraft({ startChoice: 'earlier', startDate: d.startChoice === 'earlier' ? d.startDate : undefined })} />
        </div>
        {earlier ? (
          <div className="mt-5">
            <p className="mb-3 font-semibold">About when?</p>
            <div className="flex flex-wrap gap-2">
              {START_CHIPS.map((c) => (
                <Chip
                  key={c.id}
                  selected={d.startChip === c.id}
                  onClick={() => updateDraft({ startChip: c.id, startDate: c.days ? addDays(day, -c.days) : d.startDate && d.startDate < day ? d.startDate : undefined })}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
            {d.startChip === 'pick' ? (
              <div className="mt-4">
                <TextField label="Start date" type="date" value={d.startDate ?? ''} min={min} max={addDays(day, -1)} onChange={(v) => updateDraft({ startDate: v })} />
              </div>
            ) : null}
            {d.startDate && valid ? <p className="mt-4 text-ink2">You started on {formatDate(d.startDate, { ref: day })}.</p> : null}
          </div>
        ) : null}
      </StepBody>
    </FlowShell>
  );
}

function UseStep({ d, onNext, shell }: { d: Draft; onNext: () => void; shell: ShellProps }) {
  const startsToday = d.startChoice === 'today';
  return (
    <FlowShell {...shell}>
      <StepTitle kicker="Be honest, it helps" sub="Weeks you use it about half the days count as half a week. There's no wrong answer.">
        {startsToday ? 'How often will you use it?' : 'How often do you use it, honestly?'}
      </StepTitle>
      <StepBody>
        <div role="radiogroup" aria-label="How often" className="grid gap-3">
          {USE_OPTIONS.map((u) => (
            <ChoiceCard
              key={u.id}
              selected={d.setupUse === u.id}
              title={u.label}
              sub={u.sub}
              onClick={() => {
                updateDraft({ setupUse: u.id });
                autoNext(onNext);
              }}
            />
          ))}
        </div>
      </StepBody>
    </FlowShell>
  );
}

function PackStep({ d, onNext, shell }: { d: Draft; onNext: () => void; shell: ShellProps }) {
  const day = useToday();
  const opened = d.packChoice === 'today' ? day : d.packOpened;
  const valid = !!opened && isDateStr(opened) && opened <= day;
  return (
    <FlowShell {...shell} footer={<Button size="lg" block disabled={!valid} iconRight={ArrowRight} onClick={() => { updateDraft({ packOpened: opened }); onNext(); }}>Next</Button>}>
      <StepTitle kicker="Your pack" sub="Same Spot reminds you before it runs out, so you can decide calmly.">
        How long does one pack last you?
      </StepTitle>
      <StepBody>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Days one pack lasts">
          {[30, 45, 60, 90].map((n) => (
            <Chip key={n} selected={d.packDays === n} onClick={() => updateDraft({ packDays: n })}>
              About {n} days
            </Chip>
          ))}
        </div>
        <p className="mb-3 mt-7 font-semibold">When did you open your current pack?</p>
        <div className="flex flex-wrap gap-2">
          <Chip selected={d.packChoice === 'today'} onClick={() => updateDraft({ packChoice: 'today' })}>
            Today
          </Chip>
          <Chip selected={d.packChoice === 'earlier'} onClick={() => updateDraft({ packChoice: 'earlier', packOpened: d.packOpened && d.packOpened < day ? d.packOpened : addDays(day, -7) })}>
            Earlier
          </Chip>
        </div>
        {d.packChoice === 'earlier' ? (
          <div className="mt-4">
            <TextField label="Opened on" type="date" value={d.packOpened ?? ''} max={day} min={addDays(day, -365)} onChange={(v) => updateDraft({ packOpened: v })} />
          </div>
        ) : null}
      </StepBody>
    </FlowShell>
  );
}

function TimelineStep({ d, onNext, shell }: { d: Draft; onNext: () => void; shell: ShellProps }) {
  const day = useToday();
  const c = CONCERNS[d.concern!];
  const t = draftTracker(d, day);
  const clock = computeClock(t, [], [], day);
  const early = projectDate(clock, c.early, day);
  const full = projectDate(clock, c.full, day);
  const product = d.productId ? productById(d.productId) : undefined;
  const node = (label: string, value: string, sub: string, tone: string) => (
    <div className="relative flex-1 text-center">
      <span className={cx('mx-auto mb-2 block h-4 w-4 rounded-full border-[3px] border-card shadow', tone)} />
      <p className="text-[0.78rem] font-bold uppercase tracking-[0.06em] text-ink2">{label}</p>
      <p className="font-serif text-[1.45rem] leading-tight text-navy">{value}</p>
      <p className="text-[0.82rem] text-ink2">{sub}</p>
    </div>
  );
  const dateText = (p: { date: string | null; reached: boolean }) => (p.reached ? 'Ready now' : p.date ? formatDate(p.date, { ref: day, short: true }) : 'When you use it');
  return (
    <FlowShell {...shell} footer={<Button size="lg" block icon={Camera} onClick={onNext}>Take my first photos</Button>}>
      <StepTitle kicker={d.productName}>Your timeline</StepTitle>
      <StepBody>
        <section className="card p-5" aria-label="Your look dates">
          <div className="relative flex items-start">
            <div className="absolute left-[16%] right-[16%] top-[7px] h-1 rounded-full bg-gradient-to-r from-primary via-primary/60 to-accent" aria-hidden />
            {node('Today', `Week ${Math.max(0, clock.wholeWeeks)}`, 'of real use', 'bg-primary')}
            {node('Early look', dateText(early), `week ${c.early}`, 'bg-accent')}
            {node('Full look', dateText(full), `week ${c.full}`, 'bg-navy')}
          </div>
        </section>
        <div className="mt-4 grid gap-3">
          <Panel tone="mint" icon={Sparkles}>
            <b>What usually changes first:</b> {c.changesFirst.first.toLowerCase()}. Later: {c.changesFirst.later.toLowerCase()}.
          </Panel>
          <div className="card flex items-center justify-between gap-3 px-5 py-4">
            <EvidenceMeter dots={c.evidence.dots} label={c.evidence.label} />
          </div>
          <Expandables
            level={2}
            items={[
              {
                id: 'directions',
                title: 'Directions from your pack',
                icon: ListChecks,
                body: (
                  <ul className="list-disc space-y-1.5 pl-5">
                    <li>{DIRECTIONS_LINE}</li>
                    {(product?.cautions ?? []).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                    <li>{PACK_WINS_LINE}</li>
                  </ul>
                ),
              },
              {
                id: 'stop',
                title: 'Stop and check if',
                icon: ShieldAlert,
                body: (
                  <>
                    <ul className="list-disc space-y-1.5 pl-5">
                      {c.warnings.map((w) => (
                        <li key={w.code}>{w.label}</li>
                      ))}
                    </ul>
                    <p className="mt-3">If any of these happen, Same Spot shows "Please check this first" before anything else.</p>
                  </>
                ),
              },
              {
                id: 'why',
                title: 'Why these dates',
                icon: Info,
                body: (
                  <>
                    <p>{c.evidence.line}</p>
                    <p className="mt-2">These windows are starting points. If your pack says something different, change the full look in Settings.</p>
                    {c.sources.length ? (
                      <ul className="mt-3 space-y-2">
                        {c.sources.map((src) => (
                          <li key={src.url}>
                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">
                              {src.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ),
              },
            ]}
          />
        </div>
      </StepBody>
    </FlowShell>
  );
}

function PhotosStep({ d, onDone, shell }: { d: Draft; onDone: () => void; shell: ShellProps }) {
  const day = useToday();
  const c = CONCERNS[d.concern!];
  const [busy, setBusy] = useState(false);
  const [older, setOlder] = useState<{ view: string; res: CaptureResult; fromPhoto: string | null } | null>(null);
  const earlier = d.startChoice === 'earlier';

  const put = (view: string, slot: 'older' | 'today', res: CaptureResult, date: string) => {
    const rest = getDraft().photos.filter((p) => {
      const same = p.view === view && p.slot === slot;
      if (same) URL.revokeObjectURL(p.processed.previewUrl);
      return !same;
    });
    updateDraft({
      photos: [...rest, { key: `${view}-${slot}`, view, slot, date, processed: res.processed, source: slot === 'older' ? 'older' : res.source, lightDiffers: res.lightDiffers }],
    });
  };
  const remove = (view: string, slot: 'older' | 'today') => {
    updateDraft({ photos: getDraft().photos.filter((p) => !(p.view === view && p.slot === slot)) });
  };

  const takeToday = async (view: string, mode: 'camera' | 'gallery') => {
    const v = c.views.find((x) => x.id === view)!;
    // With an older photo, today's photo gets the same light check as later ones.
    const olderPhoto = getDraft().photos.find((p) => p.view === view && p.slot === 'older');
    const res = await capturePhoto({ title: v.label, tip: v.tip, mode, firstBrightness: olderPhoto?.processed.brightness });
    if (res) put(view, 'today', res, day);
  };
  const addOlder = async (view: string) => {
    const v = c.views.find((x) => x.id === view)!;
    const res = await capturePhoto({ title: `${v.label}, from around when you started`, mode: 'gallery' });
    if (!res) return;
    const found = res.file ? await captureDate(res.file) : { date: null, fromPhoto: false };
    setOlder({ view, res, fromPhoto: found.fromPhoto && found.date && found.date < day ? found.date : null });
  };

  const save = async (withPhotos: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const fresh = getDraft();
      const id = await createTracker({
        concern: fresh.concern!,
        customName: fresh.customName,
        productId: fresh.productId!,
        productName: fresh.productName,
        startDate: fresh.startDate!,
        setupUse: fresh.setupUse!,
        packDays: fresh.packDays,
        packOpened: fresh.packOpened ?? today(),
        interval: fresh.interval,
        photos: withPhotos
          ? fresh.photos.map((p) => {
              // Today's photo may have been added before the older one, so check the light again here.
              const older = p.slot === 'today' ? fresh.photos.find((x) => x.view === p.view && x.slot === 'older') : undefined;
              const differs = p.lightDiffers || (!!older && compareLight(p.processed.brightness, older.processed.brightness) !== 'match');
              return { view: p.view, date: p.date, processed: p.processed, source: p.source, lightDiffers: differs };
            })
          : [],
      });
      if (fresh.restartFrom) await closeTracker(fresh.restartFrom, 'done');
      try {
        await navigator.storage?.persist?.();
      } catch {
        /* the browser decides */
      }
      updateDraft({ createdId: id });
      onDone();
    } catch (e) {
      setBusy(false);
      toast(e instanceof Error && e.name === 'QuotaExceededError' ? 'Your device is out of space. Free some space and try again.' : 'Something went wrong saving. Please try again.');
    }
  };

  const count = d.photos.length;
  const skip = async () => {
    const ok = await confirmAsk({
      title: 'Skip photos for now?',
      body: 'Without photos, your results will rely on memory, which is easy to misjudge. You can add photos later from the Photos tab.',
      confirmLabel: 'Skip for now',
      cancelLabel: 'Take photos',
    });
    if (ok) void save(false);
  };

  return (
    <FlowShell
      {...shell}
      footer={
        count ? (
          <Button size="lg" block loading={busy} onClick={() => save(true)}>
            Save {count === 1 ? '1 photo' : `${count} photos`} and finish
          </Button>
        ) : (
          <Button size="lg" block variant="secondary" loading={busy} onClick={skip}>
            Skip for now
          </Button>
        )
      }
    >
      <StepTitle kicker="Your starting point" sub="Same spot, by a window, flash off, no filters. Photos stay only on this device.">
        First photos
      </StepTitle>
      <StepBody className="grid gap-4">
        {c.views.map((v) => {
          const todayPhoto = d.photos.find((p) => p.view === v.id && p.slot === 'today');
          const olderPhoto = d.photos.find((p) => p.view === v.id && p.slot === 'older');
          return (
            <section key={v.id} className="card p-4" aria-label={v.label}>
              <h2 className="text-[1.05rem] font-semibold text-ink">{v.label}</h2>
              <p className="mt-1 text-[0.9rem] text-ink2">{v.tip}</p>
              <div className={cx('mt-4 grid gap-3', earlier && 'grid-cols-2')}>
                {earlier ? (
                  <Slot
                    label={olderPhoto ? `First · ${formatDate(olderPhoto.date, { ref: day, short: true })}` : 'From your start'}
                    url={olderPhoto?.processed.previewUrl}
                    view={v.id}
                    empty={
                      <Button size="sm" variant="secondary" icon={History} onClick={() => addOlder(v.id)} className="w-full">
                        Add an older photo
                      </Button>
                    }
                    onRemove={olderPhoto ? () => remove(v.id, 'older') : undefined}
                  />
                ) : null}
                <Slot
                  label={todayPhoto ? 'Today' : earlier ? 'Today' : 'Your first photo'}
                  url={todayPhoto?.processed.previewUrl}
                  view={v.id}
                  empty={
                    <div className="grid w-full gap-2">
                      <Button size="sm" icon={Camera} onClick={() => takeToday(v.id, 'camera')}>
                        Take photo
                      </Button>
                      <Button size="sm" variant="secondary" icon={ImageIcon} onClick={() => takeToday(v.id, 'gallery')}>
                        Gallery
                      </Button>
                    </div>
                  }
                  onRemove={todayPhoto ? () => remove(v.id, 'today') : undefined}
                />
              </div>
            </section>
          );
        })}
        {earlier ? (
          <Panel tone="accent" icon={Flag}>
            An older photo becomes your first photo, so your first look can be ready straight away.
          </Panel>
        ) : null}
      </StepBody>
      <OlderDateSheet
        pending={older}
        startDate={d.startDate!}
        onClose={() => setOlder(null)}
        onSave={(date) => {
          if (older) put(older.view, 'older', older.res, date);
          setOlder(null);
        }}
      />
    </FlowShell>
  );
}

function Slot({ label, url, view, empty, onRemove }: { label: string; url?: string; view: string; empty: ReactNode; onRemove?: () => void }) {
  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] border border-line bg-grey-50">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <ViewGuide view={view} className="absolute inset-0 h-full w-full p-4 opacity-70" />
        )}
        <span className="absolute left-2 top-2 max-w-[calc(100%-16px)] rounded-lg bg-[#143461]/85 px-2 py-1 text-[0.75rem] font-bold text-white">{label}</span>
        {onRemove ? (
          <button type="button" onClick={onRemove} aria-label={`Remove: ${label}`} className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-card/90 text-ink shadow">
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {!url ? <div className="mt-2.5 flex">{empty}</div> : null}
    </div>
  );
}

export function OlderDateSheet({
  pending,
  startDate,
  onClose,
  onSave,
}: {
  pending: { fromPhoto: string | null } | null;
  startDate: string;
  onClose: () => void;
  onSave: (date: string) => void;
}) {
  const day = useToday();
  const [choice, setChoice] = useState<'photo' | 'start' | 'pick'>('start');
  const [picked, setPicked] = useState(startDate);
  useEffect(() => {
    setChoice(pending?.fromPhoto ? 'photo' : 'start');
    setPicked(pending?.fromPhoto ?? startDate);
  }, [pending, startDate]);
  const date = choice === 'photo' ? pending?.fromPhoto : choice === 'start' ? startDate : picked;
  const valid = !!date && isDateStr(date) && date <= day;
  return (
    <Sheet open={!!pending} onClose={onClose} title="When was this taken?" description="Your first photo should be from around when you started.">
      <div role="radiogroup" aria-label="When was this photo taken?" className="grid gap-3">
        {pending?.fromPhoto ? (
          <ChoiceCard selected={choice === 'photo'} title={formatDate(pending.fromPhoto, { ref: day, year: true })} sub="The date saved in the photo" onClick={() => setChoice('photo')} />
        ) : null}
        <ChoiceCard selected={choice === 'start'} title="Around my start date" sub={formatDate(startDate, { ref: day, year: true })} onClick={() => setChoice('start')} />
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

function DoneStep({ id, discreet }: { id: string; discreet: boolean }) {
  const m = useModel(id);
  const nav = useNavigate();
  const day = useToday();
  const finish = (to: string) => void finishFlow(nav, null, to);
  const calendarHref = useMemo(() => (m ? googleCalendarLink(m.tracker, m.data.checkins, discreet) : '#'), [m, discreet]);
  if (!m) return null;
  return (
    <FlowShell hideClose footer={
      m.pending?.ready ? (
        <>
          <Button size="lg" block iconRight={ArrowRight} onClick={() => finish(`/t/${id}/look`)}>
            Start your {m.pending.kind === 'full' ? 'full' : 'early'} look
          </Button>
          <Button variant="ghost" block onClick={() => finish('/')}>
            Go to Home
          </Button>
        </>
      ) : (
        <Button size="lg" block iconRight={ArrowRight} onClick={() => finish('/')}>
          Go to Home
        </Button>
      )
    }>
      <Confetti />
      <StepTitle kicker="All set" sub={`Your first check-in is on ${formatDate(m.nextCheckin, { ref: day })}, then every ${m.tracker.interval === 14 ? '2' : '4'} weeks. Each takes about 30 seconds.`}>
        Your tracker is ready
      </StepTitle>
      <StepBody className="grid gap-3">
        {m.pending?.ready ? (
          <Panel tone="accent" icon={Flag}>
            <b>Your {m.pending.kind === 'full' ? 'full' : 'early'} look is ready.</b> You've had about {m.clock.wholeWeeks} weeks of real use, so you can compare your photos now.
          </Panel>
        ) : (
          <section className="card grid grid-cols-2 gap-3 p-4" aria-label="Your look dates">
            {[
              ['Early look', m.earlyDate, m.windows.early],
              ['Full look', m.fullDate, m.windows.full],
            ].map(([label, date, weeks]) => (
              <div key={label as string} className="rounded-[16px] bg-grey-50 p-3">
                <p className="text-[0.78rem] font-bold uppercase tracking-[0.06em] text-ink2">{label}</p>
                <p className="font-serif text-[1.35rem] leading-tight text-navy">{date ? formatDate(date as string, { ref: day, short: true }) : 'When you use it'}</p>
                <p className="text-[0.82rem] text-ink2">week {weeks} of real use</p>
              </div>
            ))}
          </section>
        )}
        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <Calendar className="h-5 w-5 text-primary" aria-hidden /> Add check-ins to your calendar
          </h2>
          <p className="mt-1 text-[0.92rem] text-ink2">Same Spot can't send notifications. Events just say "{discreet ? 'Same Spot check-in' : 'Same Spot check-in: ' + m.concern.short}".</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <Button variant="secondary" icon={CalendarPlus} href={calendarHref}>
              Google Calendar
            </Button>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => {
                downloadIcs(m.tracker, m.data.checkins, discreet);
                toast('Calendar file ready. Open it to add your check-ins.');
              }}
            >
              Calendar file (.ics)
            </Button>
          </div>
        </section>
      </StepBody>
    </FlowShell>
  );
}
