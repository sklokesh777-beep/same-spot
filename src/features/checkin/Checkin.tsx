import { ArrowRight, Camera, CircleCheck, Flag, Image as ImageIcon, Info, Trash2 } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ViewGuide } from '../../components/art';
import { FlowShell, StepBody, StepTitle } from '../../components/blocks';
import { toast } from '../../components/overlay';
import { Button, ChoiceCard, Chip, Panel, Spinner, cx } from '../../components/ui';
import { QUICK_OPTIONS, USE_OPTIONS } from '../../content/copy';
import { addCheckin, updateCheckin, type CheckinAnswers } from '../../data/actions';
import { useModel } from '../../data/hooks';
import { beginFlow, exitFlow, finishFlow, goBackOr } from '../../data/flows';
import { useToday } from '../../data/today';
import { lastCheckin, nextCheckinDate } from '../../engine/clock';
import { daysBetween, formatDate } from '../../engine/dates';
import { LOOK_NAMES } from '../../engine/rules';
import type { FollowUp, QuickId, UseId } from '../../engine/types';
import type { ProcessedPhoto } from '../../data/photos';
import { capturePhoto } from '../camera/Camera';

// ---------- answers while the check-in is open ----------

interface CPhoto {
  view: string;
  processed: ProcessedPhoto;
  lightDiffers: boolean;
  source: 'camera' | 'gallery' | 'live';
}

interface CDraft {
  trackerId: string;
  followUp?: FollowUp;
  use?: UseId;
  changes: string[];
  warnings: string[];
  quick?: QuickId;
  photos: CPhoto[];
  savedId?: string;
  /** Where the check-in went after saving. */
  savedTo?: string;
  note: string;
}

let cdraft: CDraft | null = null;
const listeners = new Set<() => void>();
const setC = (d: CDraft | null) => {
  cdraft = d;
  listeners.forEach((l) => l());
};
const patchC = (p: Partial<CDraft>) => cdraft && setC({ ...cdraft, ...p });
const useC = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => cdraft,
  );

const ORDER = ['follow', 'use', 'changes', 'warnings', 'quick', 'photos'] as const;
type Step = (typeof ORDER)[number] | 'saved';

export default function Checkin() {
  const { id, step } = useParams<{ id: string; step?: string }>();
  const [params] = useSearchParams();
  const then = params.get('then');
  const nav = useNavigate();
  const m = useModel(id);
  const day = useToday();
  const d = useC();
  const [saving, setSaving] = useState(false);

  // Once saved, the answers are cleared when this screen closes.
  useEffect(
    () => () => {
      if (cdraft?.savedId) setC(null);
    },
    [],
  );

  const hasWarnings = !!m && m.warnings.length > 0;
  const steps: Step[] = (hasWarnings ? ORDER : ORDER.filter((s) => s !== 'follow')) as unknown as Step[];

  useEffect(() => {
    if (!m || step) return;
    beginFlow(`checkin:${m.tracker.id}`, `/t/${m.tracker.id}/checkin`);
    for (const p of cdraft?.photos ?? []) URL.revokeObjectURL(p.processed.previewUrl);
    setC({ trackerId: m.tracker.id, changes: [], warnings: [], photos: [], note: '' });
    nav(`/t/${m.tracker.id}/checkin/${steps[0]}${then ? `?then=${then}` : ''}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.tracker.id, step]);

  if (m === undefined) return <Spinner />;
  if (m === null || m.tracker.status !== 'active') return <Navigate to="/" replace />;
  if (step && (!d || d.trackerId !== m.tracker.id)) return <Navigate to={`/t/${m.tracker.id}/checkin${then ? `?then=${then}` : ''}`} replace />;
  if (!step || !d) return <Spinner />;
  const s = step as Step;
  if (d.savedId && s !== 'saved') return <Navigate to={d.savedTo ?? '/'} replace />;
  if (!d.savedId && s === 'saved') return <Navigate to="/" replace />;

  const idx = steps.indexOf(s);
  const q = (path: Step) => `/t/${m.tracker.id}/checkin/${path}${then ? `?then=${then}` : ''}`;
  const next = () => nav(q(steps[idx + 1] ?? 'saved'));
  const flowKey = `checkin:${m.tracker.id}`;
  const shell = {
    step: idx + 1,
    total: steps.length,
    onBack: () => void goBackOr(nav, '/'),
    onClose: () => void exitFlow(nav, flowKey, '/'),
    closeLabel: 'Close check-in',
  };
  const auto = (fn: () => void) => setTimeout(fn, 180);
  const qn = (n: number) => `Question ${n} of 4 · ${m.concern.short}`;

  const save = async (opts: { safety?: boolean } = {}) => {
    if (saving || !d.use) return;
    setSaving(true);
    try {
      const a: CheckinAnswers = { use: d.use, changes: d.changes, warnings: d.warnings, followUp: d.followUp, quick: opts.safety ? undefined : d.quick };
      const photos = opts.safety ? [] : d.photos.map((p) => ({ view: p.view, date: day, processed: p.processed, source: p.source, lightDiffers: p.lightDiffers }));
      const cid = await addCheckin(m.tracker.id, a, photos, day);
      const to = opts.safety ? `/t/${m.tracker.id}/safety?new=1` : then === 'look' ? `/t/${m.tracker.id}/look` : q('saved');
      patchC({ savedId: cid, savedTo: to });
      setSaving(false);
      await finishFlow(nav, flowKey, to);
    } catch {
      setSaving(false);
      toast('Something went wrong saving. Please try again.');
    }
  };

  if (s === 'follow') {
    const labels = m.warnings.map((w) => w.phrase).join(' and ');
    return (
      <FlowShell {...shell}>
        <StepTitle kicker="First, a quick check">Last time you mentioned {labels}. How is it now?</StepTitle>
        <StepBody>
          <div role="radiogroup" aria-label="How is it now?" className="grid gap-3">
            {(
              [
                ['settled', 'It has settled'],
                ['doctor', "I've seen a doctor"],
                ['still', "It's still there"],
              ] as [FollowUp, string][]
            ).map(([v, label]) => (
              <ChoiceCard
                key={v}
                selected={d.followUp === v}
                title={label}
                onClick={() => {
                  patchC({ followUp: v });
                  auto(next);
                }}
              />
            ))}
          </div>
        </StepBody>
      </FlowShell>
    );
  }

  if (s === 'use') {
    const last = lastCheckin(m.data.checkins);
    const due = nextCheckinDate(m.tracker, m.data.checkins);
    const early = daysBetween(day, due) > 0;
    const late = daysBetween(due, day) > 7;
    const since = last ? 'Since your last check-in' : `Since you started this tracker on ${formatDate(m.tracker.createdDate, { ref: day })}`;
    return (
      <FlowShell {...shell}>
        <StepTitle kicker={qn(1)} sub="There's no wrong answer. An honest answer keeps your dates honest.">
          {since}, how often did you use it as the pack says?
        </StepTitle>
        <StepBody>
          {late ? (
            <Panel tone="blue" icon={Info} className="mb-4">
              Welcome back. Same Spot counts from your last check-in.
            </Panel>
          ) : early ? (
            <Panel tone="grey" icon={Info} className="mb-4">
              A little early, and that's fine. Your check-in was due on {formatDate(due, { ref: day })}.
            </Panel>
          ) : null}
          <div role="radiogroup" aria-label="How often" className="grid gap-3">
            {USE_OPTIONS.map((u) => (
              <ChoiceCard
                key={u.id}
                selected={d.use === u.id}
                title={u.label}
                sub={u.sub}
                onClick={() => {
                  patchC({ use: u.id });
                  auto(next);
                }}
              />
            ))}
          </div>
        </StepBody>
      </FlowShell>
    );
  }

  if (s === 'changes') {
    const none = d.changes.length === 0;
    return (
      <FlowShell {...shell} footer={<Button size="lg" block iconRight={ArrowRight} onClick={next}>Next</Button>}>
        <StepTitle kicker={qn(2)} sub="Other changes can explain a difference too. Same Spot won't credit the product when it can't tell.">
          Anything new since last time?
        </StepTitle>
        <StepBody className="flex flex-wrap gap-2">
          <Chip selected={none} onClick={() => patchC({ changes: [] })}>
            Nothing new
          </Chip>
          {m.concern.changes.map((c) => (
            <Chip key={c.code} selected={d.changes.includes(c.code)} onClick={() => patchC({ changes: d.changes.includes(c.code) ? d.changes.filter((x) => x !== c.code) : [...d.changes, c.code] })}>
              {c.label}
            </Chip>
          ))}
        </StepBody>
      </FlowShell>
    );
  }

  if (s === 'warnings') {
    const none = d.warnings.length === 0;
    return (
      <FlowShell
        {...shell}
        footer={
          <Button size="lg" block iconRight={ArrowRight} loading={saving} onClick={() => (d.warnings.length ? save({ safety: true }) : next())}>
            {d.warnings.length ? 'Save and see what to do' : 'Next'}
          </Button>
        }
      >
        <StepTitle kicker={qn(3)}>Any of these since last time?</StepTitle>
        <StepBody className="grid gap-2">
          <Chip selected={none} onClick={() => patchC({ warnings: [] })} className="w-full">
            None of these
          </Chip>
          {m.concern.warnings.map((w) => (
            <Chip key={w.code} tone="rose" className="w-full" selected={d.warnings.includes(w.code)} onClick={() => patchC({ warnings: d.warnings.includes(w.code) ? d.warnings.filter((x) => x !== w.code) : [...d.warnings, w.code] })}>
              {w.label}
            </Chip>
          ))}
        </StepBody>
      </FlowShell>
    );
  }

  if (s === 'quick') {
    return (
      <FlowShell {...shell}>
        <StepTitle kicker={qn(4)} sub="Quick signs never change your result.">
          {m.concern.quick.question}
        </StepTitle>
        <StepBody>
          <div role="radiogroup" aria-label={m.concern.quick.label} className="grid gap-3">
            {QUICK_OPTIONS.map((o) => (
              <ChoiceCard
                key={o.id}
                selected={d.quick === o.id}
                title={o.label}
                onClick={() => {
                  patchC({ quick: o.id });
                  auto(next);
                }}
              />
            ))}
          </div>
        </StepBody>
      </FlowShell>
    );
  }

  if (s === 'photos') {
    const views = m.concern.views.filter((v) => m.tracker.views.includes(v.id));
    const noFirst = Object.keys(m.firsts).length === 0;
    const take = async (view: string, mode: 'camera' | 'gallery') => {
      const v = views.find((x) => x.id === view)!;
      const first = m.firsts[view];
      const res = await capturePhoto({ title: v.label, tip: v.tip, mode, ghostId: first?.id, firstBrightness: first?.brightness });
      if (!res) return;
      const rest = (cdraft?.photos ?? []).filter((p) => {
        if (p.view === view) URL.revokeObjectURL(p.processed.previewUrl);
        return p.view !== view;
      });
      patchC({ photos: [...rest, { view, processed: res.processed, lightDiffers: res.lightDiffers, source: res.source }] });
    };
    const count = d.photos.length;
    return (
      <FlowShell
        {...shell}
        footer={
          count ? (
            <Button size="lg" block loading={saving} onClick={() => save()}>
              Save check-in
            </Button>
          ) : (
            <Button size="lg" block variant="secondary" loading={saving} onClick={() => save()}>
              Skip photos this time
            </Button>
          )
        }
      >
        <StepTitle kicker="Photos · optional" sub={noFirst ? "You don't have first photos yet. These become your starting point." : 'Same spot and light as your first photos. Same Spot checks the light for you.'}>
          {noFirst ? 'Take your first photos?' : 'Matched photos'}
        </StepTitle>
        <StepBody className="grid gap-4 sm:grid-cols-2">
          {views.map((v) => {
            const p = d.photos.find((x) => x.view === v.id);
            return (
              <section key={v.id} className="card p-4" aria-label={v.label}>
                <h2 className="font-semibold text-ink">{v.label}</h2>
                <div className="relative mt-3 aspect-[3/4] overflow-hidden rounded-[18px] border border-line bg-grey-50">
                  {p ? <img src={p.processed.previewUrl} alt={`${v.label}, today`} className="h-full w-full object-cover" /> : <ViewGuide view={v.id} className="absolute inset-0 h-full w-full p-5 opacity-70" />}
                  {p ? (
                    <>
                      <span className={cx('absolute left-2 top-2 rounded-lg px-2 py-1 text-[0.75rem] font-bold', p.lightDiffers ? 'bg-[#FFF8E1] text-[#5C4300]' : 'bg-[#E7F3F1] text-[#0F5E52]')}>
                        {p.lightDiffers ? 'Light differs' : 'Ready'}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove photo: ${v.label}`}
                        onClick={() => {
                          URL.revokeObjectURL(p.processed.previewUrl);
                          patchC({ photos: d.photos.filter((x) => x.view !== v.id) });
                        }}
                        className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-card/90 shadow"
                      >
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
        <p className="mt-4 text-center text-[0.9rem] text-ink2">If looking at your photos makes you feel worse, it's fine to skip.</p>
      </FlowShell>
    );
  }

  return <Saved trackerId={m.tracker.id} savedId={d.savedId!} note={d.note} />;
}

function Saved({ trackerId, savedId, note }: { trackerId: string; savedId: string; note: string }) {
  const m = useModel(trackerId);
  const nav = useNavigate();
  const day = useToday();
  const [text, setText] = useState(note);
  const [noted, setNoted] = useState(false);
  if (!m) return <Spinner />;
  const close = () => void finishFlow(nav, null, '/');
  const ready = m.pending?.ready && !m.warnings.length;
  return (
    <FlowShell
      onClose={close}
      footer={
        ready ? (
          <>
            <Button size="lg" block iconRight={ArrowRight} onClick={() => void finishFlow(nav, null, `/t/${trackerId}/look`)}>
              Start your {LOOK_NAMES[m.pending!.kind]}
            </Button>
            <Button variant="ghost" block onClick={close}>
              Later
            </Button>
          </>
        ) : (
          <Button size="lg" block onClick={close}>
            Done
          </Button>
        )
      }
    >
      <div className="mt-6 grid h-16 w-16 place-items-center rounded-[20px] bg-mint-50 text-mint-ink">
        <CircleCheck className="h-8 w-8" aria-hidden />
      </div>
      <StepTitle sub={`Next check-in: ${formatDate(m.nextCheckin, { ref: day })}.`}>Check-in saved</StepTitle>
      {ready ? (
        <Panel tone="accent" icon={Flag} className="mb-4">
          <b>Your {LOOK_NAMES[m.pending!.kind]} is ready.</b> You've had about {m.clock.wholeWeeks} weeks of real use.
        </Panel>
      ) : null}
      <section className="card p-4">
        <label htmlFor="note" className="font-semibold text-ink">
          Add a note <span className="font-normal text-ink2">(optional)</span>
        </label>
        <textarea
          id="note"
          value={text}
          maxLength={140}
          onChange={(e) => {
            setText(e.target.value);
            setNoted(false);
          }}
          rows={3}
          placeholder="Anything you'd like to remember"
          className="mt-2 w-full rounded-btn border border-line bg-card p-3 text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[0.85rem] text-ink2">{text.length}/140</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={!text.trim() || noted}
            onClick={async () => {
              await updateCheckin(savedId, { note: text.trim().slice(0, 140) });
              patchC({ note: text });
              setNoted(true);
              toast('Note saved.');
            }}
          >
            {noted ? 'Saved' : 'Save note'}
          </Button>
        </div>
      </section>
    </FlowShell>
  );
}
