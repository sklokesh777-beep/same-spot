import { CirclePause, CirclePlay, OctagonX, Package, Stethoscope } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Ring } from '../../components/art';
import { FAMILY_ICON, FlowShell, StepTitle, familyTone } from '../../components/blocks';
import { confirmAsk, toast } from '../../components/overlay';
import { StatusChip, Spinner } from '../../components/ui';
import { closeTracker, dismissPack, openedNewPack, pauseTracker } from '../../data/actions';
import { useModel } from '../../data/hooks';
import { exitFlow, finishFlow, goBackOr } from '../../data/flows';
import { formatDate } from '../../engine/dates';

export default function Pack() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const m = useModel(id);
  if (m === undefined) return <Spinner />;
  if (m === null) return <Navigate to="/" replace />;
  const p = m.pack;
  const when = formatDate(p.end, { ref: m.today });
  const title = p.daysLeft < 0 ? `Your pack may have run out around ${when}` : p.daysLeft === 0 ? 'Your pack may run out today' : `Your pack may run out around ${when}`;
  const beforeFull = m.clock.wholeWeeks < m.windows.full;
  const Icon = FAMILY_ICON[m.status.family];

  const choices = [
    {
      label: 'Keep going',
      icon: CirclePlay,
      run: async () => {
        await dismissPack(m.tracker.id, p.end);
        toast('Your tracker continues.');
        await finishFlow(nav, null, '/');
      },
    },
    {
      label: 'Pause and decide later',
      icon: CirclePause,
      run: async () => {
        await pauseTracker(m.tracker.id);
        await dismissPack(m.tracker.id, p.end);
        toast('Tracking paused. Your clock waits for you.');
        await finishFlow(nav, null, '/');
      },
    },
    { label: 'Talk to a dermatologist', icon: Stethoscope, run: () => nav(`/t/${m.tracker.id}/summary`) },
    {
      label: 'Stop using it',
      icon: OctagonX,
      run: async () => {
        if (!(await confirmAsk({ title: 'Stop using it?', body: 'Your tracker closes and its history stays on this device.', confirmLabel: 'Stop and close' }))) return;
        await closeTracker(m.tracker.id, 'stopped');
        toast('Tracker closed. Your history stays here.');
        await finishFlow(nav, null, '/');
      },
    },
  ];

  return (
    <FlowShell onBack={() => void goBackOr(nav, '/')} onClose={() => void exitFlow(nav, null, '/')}>
      <StepTitle kicker={m.tracker.productName} sub="Here's where you stand. All four choices are fine.">
        {title}
      </StepTitle>
      <section className="card flex flex-col items-center p-5 text-center">
        <Ring weeks={m.clock.weeks} full={m.windows.full} early={m.windows.early} size={176} tone={m.concern.tone} />
        <StatusChip tone={familyTone(m.status.family)} icon={Icon} className="mt-4">
          {m.status.title}
        </StatusChip>
        {beforeFull ? (
          <p className="mt-3 text-[0.95rem] text-ink2">
            {p.daysLeft >= 0
              ? `To reach your full look without a gap, you'd need a new pack by ${formatDate(p.end, { ref: m.today })}.`
              : 'To reach your full look, you would need a new pack. Days without it count as zero on your clock.'}
          </p>
        ) : null}
      </section>
      <div className="mt-5 grid grid-cols-2 gap-3" role="group" aria-label="Four equal choices">
        {choices.map((c) => (
          <button key={c.label} type="button" onClick={c.run} className="tap flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-[18px] border border-line bg-card px-3 py-4 text-center font-semibold text-navy hover:border-primary/40">
            <c.icon className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden />
            {c.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-[0.9rem] text-ink2">No prices, no links to buy.</p>
      <button
        type="button"
        onClick={async () => {
          await openedNewPack(m.tracker.id);
          toast('New pack noted from today.');
          await finishFlow(nav, null, '/');
        }}
        className="mx-auto mt-3 flex min-h-[48px] items-center gap-2 font-semibold text-primary"
      >
        <Package className="h-5 w-5" aria-hidden /> I've opened a new pack
      </button>
    </FlowShell>
  );
}
