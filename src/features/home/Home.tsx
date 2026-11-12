import { motion } from 'framer-motion';
import {
  ArrowRight, Calendar, Camera, CirclePause, CirclePlay, Flag, HardDrive, Layers, Package, Plus, TriangleAlert, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroArt, MiniRing } from '../../components/art';
import { ConcernBadge, FAMILY_ICON, Page, familyTone } from '../../components/blocks';
import { Sheet, ask, releaseTopOverlay, toast } from '../../components/overlay';
import { Button, Chip, Dots, IconButton, StatusChip, TONE_BG, TONE_INK, cx, type AnyTone } from '../../components/ui';
import { addEvent, deleteEvent, openedNewPack, pauseTracker, resumeTracker, saveSettings, updateTracker } from '../../data/actions';
import { db, type Settings } from '../../data/db';
import { useModels, useSettings } from '../../data/hooks';
import { today, useToday } from '../../data/today';
import { daysBetween, formatDate, isDateStr } from '../../engine/dates';
import { LOOK_NAMES } from '../../engine/rules';
import type { TrackerModel } from '../../engine/model';

interface UpNext {
  key: string;
  priority: number;
  icon: LucideIcon;
  tone: AnyTone;
  title: string;
  line: string;
  action: string;
  to: string;
}

function upNextFor(m: TrackerModel): UpNext[] {
  const id = m.tracker.id;
  const name = m.concern.short;
  const out: UpNext[] = [];
  if (m.warnings.length) {
    out.push({ key: `${id}-safety`, priority: 0, icon: TriangleAlert, tone: 'rose', title: 'Please check this first', line: `${name}: you reported a warning sign.`, action: 'Open', to: `/t/${id}/safety` });
    return out;
  }
  if (m.pending?.ready) {
    out.push({ key: `${id}-look`, priority: 1, icon: Flag, tone: 'accent', title: `Your ${LOOK_NAMES[m.pending.kind]} is ready`, line: `${name}: compare your photos without dates.`, action: 'Start', to: `/t/${id}/look` });
  } else if (m.due) {
    out.push({ key: `${id}-due`, priority: 2, icon: Calendar, tone: 'blue', title: 'Check-in due', line: `${name}: about 30 seconds.`, action: 'Check in', to: `/t/${id}/checkin` });
  }
  if (m.pack.show && !m.clock.paused) {
    const when = formatDate(m.pack.end, { ref: m.today, short: true });
    out.push({
      key: `${id}-pack`,
      priority: 3,
      icon: Package,
      tone: 'sand',
      title: m.pack.daysLeft < 0 ? `Your pack may have run out around ${when}` : m.pack.daysLeft === 0 ? 'Your pack may run out today' : `Your pack may run out around ${when}`,
      line: `${name}: see where you stand.`,
      action: 'View',
      to: `/t/${id}/pack`,
    });
  }
  return out;
}

function backupNudge(s: Settings, models: TrackerModel[], day: string): UpNext | null {
  if (s.backupReminder !== 'monthly' || !models.some((m) => m.data.photos.length || m.data.checkins.length)) return null;
  const last = s.lastBackup;
  if (last && daysBetween(last, day) < 30) return null;
  if (s.backupNudgeDismissed && daysBetween(s.backupNudgeDismissed, day) < 30) return null;
  const oldest = Math.min(...models.map((m) => daysBetween(m.tracker.createdDate, day)));
  if (!last && oldest < 7) return null;
  return { key: 'backup', priority: 4, icon: HardDrive, tone: 'grey', title: 'Back up your record', line: 'One file with your photos, kept somewhere private.', action: 'Back up', to: '/settings/data' };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const models = useModels();
  const settings = useSettings();
  const day = useToday();
  const [quick, setQuick] = useState(false);
  if (!models || !settings) return null;
  const active = models.active;

  const items = [...active.flatMap(upNextFor), ...(backupNudge(settings, active, day) ? [backupNudge(settings, active, day)!] : [])]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  return (
    <Page
      title={greeting()}
      kicker={<span className="text-[0.95rem] font-semibold text-ink2">{formatDate(day, { year: true })}</span>}
      right={active.length ? <IconButton icon={Plus} label="Quick add" tone="soft" onClick={() => setQuick(true)} /> : null}
    >
      {!active.length ? (
        <EmptyHome hasClosed={models.closed.length > 0} />
      ) : (
        <>
          {items.length ? (
            <section aria-labelledby="upnext" className="mb-7">
              <h2 id="upnext" className="mb-3 text-[0.82rem] font-bold uppercase tracking-[0.08em] text-ink2">
                Up next
              </h2>
              <div className="grid gap-2.5">
                {items.map((it, k) => (
                  <motion.div key={it.key} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: k * 0.05 }}>
                    <Link to={it.to} className={cx('tap flex items-center gap-3 rounded-[20px] p-4', TONE_BG[it.tone])}>
                      <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-card', TONE_INK[it.tone])}>
                        <it.icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{it.title}</span>
                        <span className="block text-[0.9rem] text-ink2">{it.line}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[0.92rem] font-semibold text-primary">
                        {it.action}
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </span>
                    </Link>
                    {it.key === 'backup' ? (
                      <button type="button" onClick={() => saveSettings({ backupNudgeDismissed: day })} className="ml-auto mt-1 block min-h-[40px] px-2 text-[0.85rem] font-semibold text-ink2">
                        Not now
                      </button>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            </section>
          ) : null}
          <TrackerCarousel models={active} />
          {active.length < 3 ? (
            <Button variant="secondary" block icon={Plus} to="/new" className="mt-6">
              Track something else
            </Button>
          ) : null}
        </>
      )}
      <QuickAdd open={quick} onClose={() => setQuick(false)} models={active} />
    </Page>
  );
}

function EmptyHome({ hasClosed }: { hasClosed: boolean }) {
  return (
    <section className="card mt-2 overflow-hidden p-0 text-center">
      <div className="bg-gradient-to-b from-blue-50 to-card px-6 pt-6">
        <HeroArt variant={0} className="mx-auto w-full max-w-[300px]" />
      </div>
      <div className="px-6 pb-7 pt-2">
        <h2 className="title">Start your first tracker</h2>
        <p className="mx-auto mt-2 max-w-[360px] text-ink2">Pick what you're tracking and your product. It takes about 2 minutes.</p>
        <Button size="lg" block className="mt-6" iconRight={ArrowRight} to="/new">
          Start a tracker
        </Button>
        <div className="mt-4 flex flex-col items-center gap-1">
          {hasClosed ? (
            <Link to="/settings" className="inline-flex min-h-[44px] items-center font-semibold text-primary">
              See closed trackers
            </Link>
          ) : null}
          <Link to="/settings/data" className="inline-flex min-h-[44px] items-center font-semibold text-primary">
            Restore from a backup
          </Link>
        </div>
      </div>
    </section>
  );
}

function mainAction(m: TrackerModel): { label: string; to: string } {
  const id = m.tracker.id;
  if (m.warnings.length) return { label: 'Please check this first', to: `/t/${id}/safety` };
  if (m.pending?.ready) return { label: `Start your ${LOOK_NAMES[m.pending.kind]}`, to: `/t/${id}/look` };
  if (m.clock.paused) return { label: 'View progress', to: `/progress?t=${id}` };
  if (m.due) return { label: 'Check in', to: `/t/${id}/checkin` };
  return { label: 'View progress', to: `/progress?t=${id}` };
}

function TrackerCard({ m }: { m: TrackerModel }) {
  const tone = m.concern.tone;
  const Icon = FAMILY_ICON[m.status.family];
  const act = mainAction(m);
  const nextLine = m.clock.paused
    ? 'Paused. Your clock waits for you.'
    : m.pending && !m.pending.ready && m.pending.waitUntil
      ? `Photo look: ${formatDate(m.pending.waitUntil, { ref: m.today, short: true })}`
      : `Next check-in: ${formatDate(m.nextCheckin, { ref: m.today, short: true })}`;
  const lookLine =
    m.fullDone || m.pending?.ready
      ? null
      : m.earlyDone || m.clock.wholeWeeks >= m.windows.early
        ? m.fullDate
          ? `Full look: ${formatDate(m.fullDate, { ref: m.today, short: true })}`
          : null
        : m.earlyDate
          ? `Early look: ${formatDate(m.earlyDate, { ref: m.today, short: true })}`
          : null;
  const past = m.clock.wholeWeeks > m.windows.full;
  return (
    <article className="card overflow-hidden p-0">
      <div className={cx('h-1.5', TONE_BG[tone])} aria-hidden />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <ConcernBadge concern={m.tracker.concern} />
          <div className="min-w-0 flex-1">
            <p className={cx('text-[0.78rem] font-bold uppercase tracking-[0.08em]', TONE_INK[tone])}>{m.name}</p>
            <h2 className="line-clamp-2 text-[1.08rem] font-semibold leading-snug text-ink">{m.tracker.productName}</h2>
          </div>
        </div>
        <Link
          to={`/progress?t=${m.tracker.id}`}
          className="mt-5 flex items-center gap-4 rounded-[18px] p-1 hover:bg-grey-50"
          aria-label={`${m.clock.wholeWeeks} ${past ? '' : `of ${m.windows.full} `}weeks of real use. View progress.`}
        >
          <MiniRing weeks={m.clock.weeks} full={m.windows.full} tone={tone} size={76} />
          <div>
            <p className="font-serif text-[1.6rem] leading-tight text-navy">{past ? `${m.clock.wholeWeeks} weeks` : `${m.clock.wholeWeeks} of ${m.windows.full} weeks`}</p>
            <p className="text-[0.9rem] text-ink2">{past ? `of real use, past the ${m.windows.full}-week full look` : 'of real use'}</p>
          </div>
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusChip tone={familyTone(m.status.family)} icon={Icon}>
            {m.status.title}
          </StatusChip>
        </div>
        <p className="mt-3 text-[0.92rem] text-ink2">
          {nextLine}
          {lookLine ? ` · ${lookLine}` : ''}
        </p>
        <Button block className="mt-4" to={act.to} variant={act.label === 'View progress' ? 'secondary' : 'primary'} iconRight={ArrowRight}>
          {act.label}
        </Button>
      </div>
    </article>
  );
}

function TrackerCarousel({ models }: { models: TrackerModel[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, []);
  if (models.length === 1) return <TrackerCard m={models[0]} />;
  return (
    <section aria-label="Your trackers">
      <div ref={ref} className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
        {models.map((m) => (
          <div key={m.tracker.id} className="w-[86%] shrink-0 snap-center lg:w-auto">
            <TrackerCard m={m} />
          </div>
        ))}
      </div>
      <div className="mt-3 lg:hidden">
        <Dots count={models.length} active={Math.min(i, models.length - 1)} />
      </div>
    </section>
  );
}

// ---------- quick add ----------

function QuickAdd({ open, onClose, models }: { open: boolean; onClose: () => void; models: TrackerModel[] }) {
  const nav = useNavigate();
  const [pick, setPick] = useState<string | null>(null);
  const [mode, setMode] = useState<'menu' | 'change' | 'warning'>('menu');
  useEffect(() => {
    if (open) {
      setMode('menu');
      setPick((p) => (p && models.some((m) => m.tracker.id === p) ? p : models[0]?.tracker.id ?? null));
    }
  }, [open, models]);
  const m = models.find((x) => x.tracker.id === pick) ?? models[0];
  if (!m) return null;
  const id = m.tracker.id;

  const logChange = async (code: string, label: string) => {
    const eid = await addEvent(id, 'change', code, today());
    onClose();
    toast(`Logged: ${label}`, { undo: () => void deleteEvent(eid) });
  };
  const reportWarning = async (code: string) => {
    await addEvent(id, 'warning', code, today());
    onClose();
    await releaseTopOverlay();
    nav(`/t/${id}/safety?new=1`);
  };
  const newPack = async () => {
    const before = { packOpened: m.tracker.packOpened, packDismissedFor: m.tracker.packDismissedFor };
    const eid = await openedNewPack(id, today());
    onClose();
    toast('New pack noted from today.', {
      undo: async () => {
        await deleteEvent(eid);
        await updateTracker(id, before);
      },
    });
  };
  const pause = async () => {
    if (m.clock.paused) {
      const r = await ask({ title: 'When did you start using it again?', input: { label: 'Date', type: 'date' }, confirmLabel: 'Resume tracking' });
      if (!r.ok) return;
      const date = isDateStr(r.value) && r.value <= today() ? r.value : today();
      await resumeTracker(id, date);
      onClose();
      toast('Your clock is running again.');
      return;
    }
    const eid = await pauseTracker(id, today());
    onClose();
    toast('Tracking paused. Your clock waits for you.', { undo: () => void db.events.delete(eid) });
  };

  const rows: { icon: LucideIcon; label: string; sub: string; run: () => void }[] = [
    { icon: Layers, label: 'Log a change', sub: 'A new product, illness, stress and more', run: () => setMode('change') },
    { icon: TriangleAlert, label: 'Report a warning sign', sub: 'Burning, broken skin, sudden hair loss', run: () => setMode('warning') },
    { icon: Camera, label: 'Add photos', sub: 'Matched to your first ones', run: () => { onClose(); void releaseTopOverlay().then(() => nav(`/t/${id}/add-photos`)); } },
    { icon: Package, label: 'Opened a new pack', sub: 'Resets your pack date to today', run: newPack },
    { icon: m.clock.paused ? CirclePlay : CirclePause, label: m.clock.paused ? 'Resume tracking' : 'Pause tracking', sub: m.clock.paused ? 'Start your clock again' : 'Your clock stops while paused', run: pause },
  ];
  if (models.length < 3) rows.push({ icon: Plus, label: 'New tracker', sub: 'Follow another product', run: () => { onClose(); void releaseTopOverlay().then(() => nav('/new')); } });

  return (
    <Sheet open={open} onClose={onClose} title={mode === 'change' ? 'Anything new?' : mode === 'warning' ? 'Report a warning sign' : 'Quick add'}>
      {models.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Tracker">
          {models.map((x) => (
            <Chip key={x.tracker.id} selected={x.tracker.id === id} onClick={() => setPick(x.tracker.id)}>
              {x.concern.short}
            </Chip>
          ))}
        </div>
      ) : null}
      {mode === 'menu' ? (
        <div className="-mx-2 grid">
          {rows.map((r) => (
            <button key={r.label} type="button" onClick={r.run} className="tap flex min-h-[60px] items-center gap-3 rounded-[16px] px-2 py-2 text-left hover:bg-grey-50">
              <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-blue-50 text-blue-ink">
                <r.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-ink">{r.label}</span>
                <span className="block text-[0.88rem] text-ink2">{r.sub}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-ink2" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}
      {mode === 'change' ? (
        <div className="flex flex-wrap gap-2">
          {m.concern.changes.map((c) => (
            <Chip key={c.code} selected={false} onClick={() => logChange(c.code, c.label)}>
              {c.label}
            </Chip>
          ))}
        </div>
      ) : null}
      {mode === 'warning' ? (
        <>
          <p className="mb-3 text-ink2">Same Spot will show what to do straight away.</p>
          <div className="grid gap-2">
            {m.concern.warnings.map((w) => (
              <Chip key={w.code} tone="rose" selected={false} onClick={() => reportWarning(w.code)} className="w-full">
                {w.label}
              </Chip>
            ))}
          </div>
        </>
      ) : null}
    </Sheet>
  );
}
