import {
  Calculator, Calendar, CircleCheck, CirclePause, CirclePlay, Flag, Layers, Package, Pencil, Printer, Settings2, Sparkles, Trash2,
  TriangleAlert, type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ring } from '../../components/art';
import { FAMILY_ICON, Page, ResultCard, familyTone } from '../../components/blocks';
import { Sheet, ask, confirmAsk, toast } from '../../components/overlay';
import { Button, ChoiceCard, Chip, StatusChip, TONE_BG, TONE_INK, cx } from '../../components/ui';
import { changeOf, warningOf } from '../../content/concerns';
import { QUICK_BY_ID, QUICK_OPTIONS, RESULTS, USE_BY_ID, USE_OPTIONS, resultCopy } from '../../content/copy';
import { deleteCheckin, deleteEvent, pauseTracker, resumeTracker, updateCheckin } from '../../data/actions';
import { useModels } from '../../data/hooks';
import { today } from '../../data/today';
import { shareLabel, sortByDate, QUARTERS } from '../../engine/clock';
import { formatDate, isDateStr } from '../../engine/dates';
import type { TrackerModel } from '../../engine/model';
import { LOOK_NAMES } from '../../engine/rules';
import type { Checkin, QuickId, UseId } from '../../engine/types';
import { NoTrackers, TrackerSwitch, useChosenTracker } from '../common';

export default function Progress() {
  const models = useModels();
  const { chosen: m, all, choose } = useChosenTracker(models);
  if (!models) return null;
  return (
    <Page title="Progress">
      {!m ? (
        <NoTrackers line="Start a tracker to see your weeks of real use, your look dates and your history here." />
      ) : (
        <>
          <TrackerSwitch all={all} chosen={m} choose={choose} />
          <ProgressBody key={m.tracker.id} m={m} />
        </>
      )}
    </Page>
  );
}

function ProgressBody({ m }: { m: TrackerModel }) {
  const nav = useNavigate();
  const [howOpen, setHowOpen] = useState(false);
  const Icon = FAMILY_ICON[m.status.family];
  const id = m.tracker.id;
  const active = m.tracker.status === 'active';

  const milestone = (kind: 'early' | 'full') => {
    const done = kind === 'early' ? m.earlyDone : m.fullDone;
    const date = kind === 'early' ? m.earlyDate : m.fullDate;
    const weeks = kind === 'early' ? m.windows.early : m.windows.full;
    const skipped = kind === 'early' && !m.earlyDone && !!m.fullDone;
    let value: string;
    if (done?.ev.code) value = `Done · ${RESULTS[done.ev.code].title}`;
    else if (skipped) value = 'Went straight to the full look';
    else if (m.pending?.ready && m.pending.kind === kind) value = 'Ready now';
    else value = date ? formatDate(date, { ref: m.today }) : 'Set when you use it again';
    return (
      <div className={cx('rounded-[18px] p-4', kind === 'early' ? 'bg-sand-50' : 'bg-blue-50')}>
        <p className={cx('text-[0.78rem] font-bold uppercase tracking-[0.08em]', kind === 'early' ? 'text-sand-ink' : 'text-blue-ink')}>
          {kind === 'early' ? 'Early look' : 'Full look'} · week {weeks}
        </p>
        <p className="mt-1 font-semibold text-ink">{value}</p>
      </div>
    );
  };

  return (
    <>
      <section className="card flex flex-col items-center p-6 text-center" aria-label="Weeks of real use">
        <Ring
          weeks={m.clock.weeks}
          full={m.windows.full}
          early={m.windows.early}
          size={220}
          tone={m.concern.tone}
          label={`${m.clock.wholeWeeks}`}
          sub={m.clock.wholeWeeks > m.windows.full ? 'weeks of real use' : `weeks of ${m.windows.full}`}
        />
        <p className="mt-4 text-[0.95rem] text-ink2">
          {Math.floor(m.clock.calendarWeeks)} calendar weeks · {shareLabel(m.clock.share)}
        </p>
        <StatusChip tone={familyTone(m.status.family)} icon={Icon} className="mt-3">
          {m.status.title}
        </StatusChip>
        <button type="button" onClick={() => setHowOpen(true)} className="mt-3 flex min-h-[44px] items-center gap-2 font-semibold text-primary">
          <Calculator className="h-4 w-4" aria-hidden /> How we count
        </button>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {milestone('early')}
        {milestone('full')}
      </div>

      {active ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {m.warnings.length ? (
            <Button variant="primary" icon={TriangleAlert} to={`/t/${id}/safety`}>
              Check this first
            </Button>
          ) : m.pending?.ready ? (
            <Button icon={Flag} to={`/t/${id}/look`}>
              Start your look
            </Button>
          ) : (
            <Button icon={Calendar} variant={m.due ? 'primary' : 'secondary'} to={`/t/${id}/checkin`}>
              {m.due ? 'Check in' : 'Check in early'}
            </Button>
          )}
          <Button variant="secondary" icon={Printer} to={`/t/${id}/summary`}>
            Summary
          </Button>
        </div>
      ) : (
        <p className="mt-4 rounded-[18px] bg-grey-50 p-4 text-ink2">This tracker is closed. Its history stays here, read-only.</p>
      )}

      <Insights m={m} />
      <Timeline m={m} />

      <div className="mt-6 grid gap-2.5">
        {active ? (
          <Button
            variant="secondary"
            icon={m.clock.paused ? CirclePlay : CirclePause}
            onClick={async () => {
              if (m.clock.paused) {
                const r = await ask({ title: 'When did you start using it again?', input: { label: 'Date', type: 'date' }, confirmLabel: 'Resume tracking' });
                if (!r.ok) return;
                await resumeTracker(id, isDateStr(r.value) && r.value <= today() ? r.value : today());
                toast('Your clock is running again.');
              } else {
                const eid = await pauseTracker(id);
                toast('Tracking paused. Your clock waits for you.', { undo: () => void deleteEvent(eid) });
              }
            }}
          >
            {m.clock.paused ? 'Resume tracking' : 'Pause tracking'}
          </Button>
        ) : null}
        <Button variant="ghost" icon={Settings2} onClick={() => nav(`/settings/tracker/${id}`)}>
          Tracker settings
        </Button>
      </div>

      <HowWeCount m={m} open={howOpen} onClose={() => setHowOpen(false)} />
    </>
  );
}

function HowWeCount({ m, open, onClose }: { m: TrackerModel; open: boolean; onClose: () => void }) {
  const kindLabel = { before: 'Before this tracker', checkin: 'Check-in period', since: 'Since your last check-in' } as const;
  return (
    <Sheet open={open} onClose={onClose} title="How we count" description="Only the weeks you really used it count toward your look dates.">
      <div className="overflow-x-auto rounded-lg" tabIndex={0} role="region" aria-label="How your weeks are counted">
        <table className="w-full border-collapse text-left text-[0.92rem]">
          <thead>
            <tr className="text-ink2">
              <th className="border-b border-line py-2 pr-3 font-semibold">Period</th>
              <th className="border-b border-line py-2 pr-3 font-semibold">How often</th>
              <th className="border-b border-line py-2 text-right font-semibold">Weeks counted</th>
            </tr>
          </thead>
          <tbody>
            {m.clock.periods.map((p) => (
              <tr key={`${p.from}-${p.to}`} className="align-top">
                <td className="border-b border-line py-2.5 pr-3">
                  <span className="block font-semibold text-ink">
                    {formatDate(p.from, { ref: m.today, short: true })} to {formatDate(p.to, { ref: m.today, short: true })}
                  </span>
                  <span className="text-[0.82rem] text-ink2">
                    {kindLabel[p.kind]} · {p.days} days{p.pausedDays ? `, ${p.pausedDays} paused` : ''}
                  </span>
                </td>
                <td className="border-b border-line py-2.5 pr-3">{USE_BY_ID[p.use].label}</td>
                <td className="border-b border-line py-2.5 text-right font-semibold tabular-nums">{Math.round((p.quarterDays / 28) * 100) / 100}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 font-bold text-navy">
                Weeks of real use
              </td>
              <td className="pt-3 text-right font-bold tabular-nums text-navy">{Math.round(m.clock.weeks * 100) / 100}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-4 rounded-[16px] bg-grey-50 p-4 text-[0.92rem] text-ink2">
        This is an estimate, not science. Each day counts as a full day if you used it most days, half if about half the days, and a quarter if once in a while. Paused days count as zero. Studies tested use as the label says, so counting part-weeks is a cautious guess.
      </p>
    </Sheet>
  );
}

// ---------- insights ----------

function Insights({ m }: { m: TrackerModel }) {
  const checkins = sortByDate(m.data.checkins);
  if (!checkins.length) return null;
  const last = checkins.slice(-8);
  const quickLevel: Record<QuickId, number> = { better: 3, same: 2, worse: 1, unsure: 0 };
  const changes = new Map<string, number>();
  for (const c of checkins) for (const x of c.changes) changes.set(x, (changes.get(x) ?? 0) + 1);
  for (const e of m.data.events) if (e.type === 'change' && e.code) changes.set(e.code, (changes.get(e.code) ?? 0) + 1);
  const W = 300;
  const H = 110;
  // Room for at least 6 bars, so one check-in doesn't fill the chart.
  const step = W / Math.max(6, last.length);
  const answered = last.filter((c) => c.quick);
  return (
    <section className="mt-8" aria-labelledby="insights">
      <h2 id="insights" className="mb-3 text-[0.82rem] font-bold uppercase tracking-[0.08em] text-ink2">
        Insights
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="font-semibold text-ink">How often you used it</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Use at your last ${last.length} check-ins: ${last.map((c) => USE_BY_ID[c.use].label).join(', ')}`}>
            {last.map((c, i) => {
              const h = (QUARTERS[c.use] / 4) * (H - 26) + 4;
              return (
                <g key={c.id}>
                  <rect x={i * step + step * 0.2} y={H - 18 - h} width={step * 0.6} height={h} rx={6} className="fill-primary" opacity={0.35 + (QUARTERS[c.use] / 4) * 0.65} />
                  <text x={i * step + step / 2} y={H - 3} textAnchor="middle" fontSize="10" className="fill-ink2">
                    {formatDate(c.date, { short: true, ref: m.today }).replace(' ', '\u00a0')}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {answered.length ? (
        <div className="card p-4">
          <p className="font-semibold text-ink">{m.concern.quick.label} over time</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`${m.concern.quick.label}: ${last.map((c) => (c.quick ? QUICK_BY_ID[c.quick].label : 'not answered')).join(', ')}`}>
            {[3, 2, 1].map((lv) => (
              <line key={lv} x1="0" x2={W} y1={H - 18 - lv * 26} y2={H - 18 - lv * 26} className="stroke-line" strokeDasharray="4 4" />
            ))}
            {last.map((c, i) =>
              c.quick ? (
                <circle key={c.id} cx={i * step + step / 2} cy={H - 18 - quickLevel[c.quick] * 26} r={7} className={c.quick === 'better' ? 'fill-mint-ink' : c.quick === 'worse' ? 'fill-coral-ink' : 'fill-grey-ink'} />
              ) : null,
            )}
            <text x="2" y={H - 18 - 3 * 26 - 6} fontSize="10" className="fill-ink2">
              Better
            </text>
            <text x="2" y={H - 18 - 1 * 26 + 14} fontSize="10" className="fill-ink2">
              Worse
            </text>
          </svg>
          <p className="mt-1 text-[0.82rem] text-ink2">Quick signs never change your result.</p>
        </div>
        ) : null}
        <div className="card p-4 sm:col-span-2">
          <p className="font-semibold text-ink">Changes logged</p>
          {changes.size ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {[...changes].map(([code, n]) => (
                <li key={code} className="rounded-full bg-lav-50 px-3 py-1.5 text-[0.88rem] font-semibold text-lav-ink">
                  {changeOf(m.tracker.concern, code)?.label ?? code}
                  {n > 1 ? ` · ${n}×` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[0.92rem] text-ink2">Nothing new logged. That keeps your results clearer.</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------- timeline ----------

interface Item {
  key: string;
  date: string;
  order: number;
  icon: LucideIcon;
  tone: 'blue' | 'lav' | 'mint' | 'sand' | 'rose' | 'grey' | 'accent';
  title: string;
  sub: string;
  open?: () => void;
}

function Timeline({ m }: { m: TrackerModel }) {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [lookId, setLookId] = useState<string | null>(null);
  const t = m.tracker;
  const items: Item[] = [];
  items.push({
    key: 'start',
    date: t.createdDate,
    order: 0,
    icon: Sparkles,
    tone: 'blue',
    title: 'Tracker started',
    sub: t.startDate < t.createdDate ? `Using it since ${formatDate(t.startDate, { ref: m.today })}, ${USE_BY_ID[t.setupUse].phrase}` : `Using it ${USE_BY_ID[t.setupUse].phrase}`,
  });
  for (const c of m.data.checkins) {
    const bits = [USE_BY_ID[c.use].label];
    if (c.changes.length) bits.push(`${c.changes.length} change${c.changes.length > 1 ? 's' : ''}`);
    if (c.warnings.length) bits.push('warning sign');
    if (c.quick) bits.push(`${m.concern.quick.label.toLowerCase()}: ${QUICK_BY_ID[c.quick].label.toLowerCase()}`);
    items.push({ key: c.id, date: c.date, order: c.createdAt, icon: c.warnings.length ? TriangleAlert : CircleCheck, tone: c.warnings.length ? 'rose' : 'mint', title: 'Check-in', sub: bits.join(' · '), open: () => setCheckin(c) });
  }
  for (const e of m.data.events) {
    const map: Record<string, [LucideIcon, Item['tone'], string]> = {
      change: [Layers, 'lav', `Change: ${changeOf(t.concern, e.code ?? '')?.label ?? ''}`],
      warning: [TriangleAlert, 'rose', `Warning sign: ${warningOf(t.concern, e.code ?? '')?.label ?? ''}`],
      warningClosed: [CircleCheck, 'mint', e.how === 'doctor' ? 'Warning closed: seen a doctor' : 'Warning closed: it settled'],
      pause: [CirclePause, 'grey', 'Paused'],
      resume: [CirclePlay, 'blue', 'Started again'],
      pack: [Package, 'sand', 'Opened a new pack'],
    };
    const [icon, tone, title] = map[e.type];
    items.push({
      key: e.id,
      date: e.date,
      order: e.createdAt,
      icon,
      tone,
      title,
      sub: formatDate(e.date, { ref: m.today }),
      open: t.status === 'active'
        ? async () => {
            if (await confirmAsk({ title: 'Remove this entry?', body: `${title}, ${formatDate(e.date, { ref: m.today })}. Your dates will be worked out again.`, confirmLabel: 'Remove', danger: true })) {
              await deleteEvent(e.id);
              toast('Entry removed.');
            }
          }
        : undefined,
    });
  }
  for (const l of m.looks) {
    if (!l.ev.code) continue;
    const r = RESULTS[l.ev.code];
    items.push({ key: l.look.id, date: l.look.date, order: l.look.createdAt + 1, icon: FAMILY_ICON[r.family], tone: 'accent', title: `Your ${LOOK_NAMES[l.look.kind]}`, sub: r.title, open: () => setLookId(l.look.id) });
  }
  items.sort((a, b) => (a.date === b.date ? b.order - a.order : a.date < b.date ? 1 : -1));
  const look = m.looks.find((l) => l.look.id === lookId);

  return (
    <section className="mt-8" aria-labelledby="timeline">
      <h2 id="timeline" className="mb-3 text-[0.82rem] font-bold uppercase tracking-[0.08em] text-ink2">
        Timeline
      </h2>
      <ol className="card divide-y divide-line overflow-hidden p-0">
        {items.map((it) => {
          const body = (
            <>
              <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-[12px]', TONE_BG[it.tone], TONE_INK[it.tone])}>
                <it.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{it.title}</span>
                <span className="block text-[0.88rem] text-ink2">{it.sub}</span>
              </span>
              <span className="shrink-0 text-[0.85rem] text-ink2">{formatDate(it.date, { ref: m.today, short: true })}</span>
            </>
          );
          return (
            <li key={it.key}>
              {it.open ? (
                <button type="button" onClick={it.open} className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left hover:bg-grey-50">
                  {body}
                </button>
              ) : (
                <div className="flex min-h-[64px] items-center gap-3 px-4 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
      <CheckinSheet m={m} c={checkin} onClose={() => setCheckin(null)} />
      <Sheet open={!!look} onClose={() => setLookId(null)} title={look ? `Your ${LOOK_NAMES[look.look.kind]}` : ''} hideTitle>
        {look && look.ev.code ? (
          <ResultCard {...resultCopy(look.ev, m.tracker.concern)} checks={look.ev.checks} kicker={`Your ${LOOK_NAMES[look.look.kind]} · ${formatDate(look.look.date, { ref: m.today })}`} animate={false} />
        ) : null}
      </Sheet>
    </section>
  );
}

function CheckinSheet({ m, c, onClose }: { m: TrackerModel; c: Checkin | null; onClose: () => void }) {
  const [edit, setEdit] = useState<Checkin | null>(null);
  const editable = m.tracker.status === 'active';
  const close = () => {
    setEdit(null);
    onClose();
  };
  if (!c) return <Sheet open={false} onClose={close} title="">{null}</Sheet>;
  const e = edit;
  return (
    <Sheet open={!!c} onClose={close} title={e ? 'Edit check-in' : `Check-in, ${formatDate(c.date, { ref: m.today })}`}>
      {!e ? (
        <>
          <dl className="space-y-3">
            {[
              ['How often', USE_BY_ID[c.use].label],
              ['Anything new', c.changes.map((x) => changeOf(m.tracker.concern, x)?.label).join(', ') || 'Nothing new'],
              ['Warning signs', c.warnings.map((x) => warningOf(m.tracker.concern, x)?.label).join(', ') || 'None'],
              [m.concern.quick.label, c.quick ? QUICK_BY_ID[c.quick].label : 'Not answered'],
              ...(c.note ? [['Note', c.note]] : []),
            ].map(([k, v]) => (
              <div key={k} className="rounded-[14px] bg-grey-50 px-4 py-3">
                <dt className="text-[0.82rem] font-semibold text-ink2">{k}</dt>
                <dd className="font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {editable ? (
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Button variant="secondary" icon={Pencil} onClick={() => setEdit({ ...c })}>
                Edit
              </Button>
              <Button
                variant="secondary"
                icon={Trash2}
                onClick={async () => {
                  if (!(await confirmAsk({ title: 'Delete this check-in?', body: 'Its photos stay. Your dates and results will be worked out again.', confirmLabel: 'Delete', danger: true }))) return;
                  await deleteCheckin(c.id);
                  toast('Check-in deleted.');
                  close();
                }}
              >
                Delete
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid gap-5">
          <div>
            <p className="mb-2 font-semibold">How often you used it</p>
            <div role="radiogroup" aria-label="How often" className="grid gap-2">
              {USE_OPTIONS.map((u) => (
                <ChoiceCard key={u.id} selected={e.use === u.id} title={u.label} sub={u.sub} onClick={() => setEdit({ ...e, use: u.id as UseId })} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-semibold">Anything new</p>
            <div className="flex flex-wrap gap-2">
              {m.concern.changes.map((ch) => (
                <Chip key={ch.code} selected={e.changes.includes(ch.code)} onClick={() => setEdit({ ...e, changes: e.changes.includes(ch.code) ? e.changes.filter((x) => x !== ch.code) : [...e.changes, ch.code] })}>
                  {ch.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-semibold">Warning signs</p>
            <div className="grid gap-2">
              {m.concern.warnings.map((w) => (
                <Chip key={w.code} tone="rose" className="w-full" selected={e.warnings.includes(w.code)} onClick={() => setEdit({ ...e, warnings: e.warnings.includes(w.code) ? e.warnings.filter((x) => x !== w.code) : [...e.warnings, w.code] })}>
                  {w.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-semibold">{m.concern.quick.label}</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_OPTIONS.map((q) => (
                <Chip key={q.id} selected={e.quick === q.id} onClick={() => setEdit({ ...e, quick: q.id })}>
                  {q.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid gap-2.5">
            <Button
              size="lg"
              onClick={async () => {
                await updateCheckin(e.id, { use: e.use, changes: e.changes, warnings: e.warnings, quick: e.quick });
                toast('Check-in updated. Your dates are worked out again.');
                close();
              }}
            >
              Save changes
            </Button>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
