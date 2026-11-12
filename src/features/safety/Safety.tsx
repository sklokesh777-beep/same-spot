import { CircleCheck, Printer, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FlowShell, ResultCard, StepTitle } from '../../components/blocks';
import { toast } from '../../components/overlay';
import { Button, Spinner } from '../../components/ui';
import { safetyParagraphs } from '../../content/copy';
import { closeWarnings } from '../../data/actions';
import { useModel } from '../../data/hooks';
import { exitFlow, finishFlow, goBackOr } from '../../data/flows';
import { formatDate } from '../../engine/dates';

export default function Safety() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const fresh = params.get('new') === '1';
  const nav = useNavigate();
  const m = useModel(id);
  const [closed, setClosed] = useState(false);
  if (m === undefined) return <Spinner />;
  if (m === null) return <Navigate to="/" replace />;

  if (closed || !m.warnings.length) {
    return (
      <FlowShell onClose={() => void exitFlow(nav, null, '/')} footer={<Button size="lg" block onClick={() => void finishFlow(nav, null, '/')}>Back to Home</Button>}>
        <div className="mt-8 grid h-16 w-16 place-items-center rounded-[20px] bg-mint-50 text-mint-ink">
          <CircleCheck className="h-8 w-8" aria-hidden />
        </div>
        <StepTitle sub="Same Spot has closed the warning. Your next look can go ahead as planned.">Thank you for letting us know</StepTitle>
      </FlowShell>
    );
  }

  const since = m.warnings.map((w) => w.date).sort()[0];
  const close = async (how: 'settled' | 'doctor') => {
    await closeWarnings(m.tracker.id, how);
    setClosed(true);
    toast(how === 'settled' ? 'Glad it has settled.' : 'Thank you. The warning is closed.');
  };

  return (
    <FlowShell
      onBack={() => void goBackOr(nav, '/')}
      onClose={() => void exitFlow(nav, null, '/')}
      footer={
        fresh ? (
          <>
            <Button size="lg" block onClick={() => void finishFlow(nav, null, '/')}>
              I've read this
            </Button>
            <Button size="lg" block variant="secondary" icon={Printer} to={`/t/${m.tracker.id}/summary`}>
              Summary for a dermatologist
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" block onClick={() => close('settled')}>
              It has settled
            </Button>
            <Button size="lg" block variant="secondary" icon={Stethoscope} onClick={() => close('doctor')}>
              I've seen a doctor
            </Button>
            <Button block variant="ghost" icon={Printer} to={`/t/${m.tracker.id}/summary`}>
              Summary for a dermatologist
            </Button>
          </>
        )
      }
    >
      <h1 className="sr-only">Please check this first</h1>
      <div className="mt-2">
        <ResultCard
          title="Please check this first"
          family="safety"
          kicker={`Warning sign · ${formatDate(since, { ref: m.today })}`}
          paragraphs={[...safetyParagraphs(m.warnings), 'If you see a doctor, you can show them your record. Same Spot makes a one-page summary for a dermatologist.']}
          footer="This is your view of your own record, not a medical assessment."
        />
      </div>
      <p className="mt-4 text-[0.92rem] text-ink2">
        {fresh ? 'This stays at the top of Home until your next check-in, or until you tell Same Spot it has settled.' : "Until then, Same Spot won't say \"keep going\"."}
      </p>
    </FlowShell>
  );
}
