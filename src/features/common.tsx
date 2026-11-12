import { CalendarPlus, Download, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { HeroArt } from '../components/art';
import { Sheet, toast } from '../components/overlay';
import { Button, Chip } from '../components/ui';
import { downloadIcs, googleCalendarLink } from '../data/calendar';
import { useSettings } from '../data/hooks';
import { formatDate } from '../engine/dates';
import type { TrackerModel } from '../engine/model';

export function CalendarSheet({ m, open, onClose }: { m: TrackerModel; open: boolean; onClose: () => void }) {
  const s = useSettings();
  const discreet = s?.discreetTitles ?? true;
  return (
    <Sheet open={open} onClose={onClose} title="Add check-ins to your calendar" description={`Next check-in: ${formatDate(m.nextCheckin, { ref: m.today })}, then every ${m.tracker.interval === 14 ? '2' : '4'} weeks.`}>
      <div className="grid gap-2.5">
        <Button icon={CalendarPlus} href={googleCalendarLink(m.tracker, m.data.checkins, discreet)}>
          Add to Google Calendar
        </Button>
        <Button
          variant="secondary"
          icon={Download}
          onClick={() => {
            downloadIcs(m.tracker, m.data.checkins, discreet);
            toast('Calendar file ready. Open it to add your check-ins.');
          }}
        >
          Add to calendar file (.ics)
        </Button>
      </div>
      <p className="mt-4 text-[0.9rem] text-ink2">Same Spot can't send notifications. Events just say "{discreet ? 'Same Spot check-in' : `Same Spot check-in: ${m.concern.short}`}". You can change this in Settings.</p>
    </Sheet>
  );
}

/** Picks the tracker shown on Progress and Photos (?t=id). */
export function useChosenTracker(models: { active: TrackerModel[]; closed: TrackerModel[] } | undefined): {
  chosen: TrackerModel | null;
  all: TrackerModel[];
  choose: (id: string) => void;
} {
  const [params, setParams] = useSearchParams();
  const all = models ? [...models.active, ...models.closed] : [];
  const want = params.get('t');
  const chosen = all.find((m) => m.tracker.id === want) ?? models?.active[0] ?? all[0] ?? null;
  return {
    chosen,
    all,
    choose: (id) => setParams((p) => {
      const n = new URLSearchParams(p);
      n.set('t', id);
      return n;
    }, { replace: true }),
  };
}

export function TrackerSwitch({ all, chosen, choose }: { all: TrackerModel[]; chosen: TrackerModel | null; choose: (id: string) => void }) {
  if (all.length < 2) return null;
  return (
    <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Choose a tracker">
      {all.map((m) => (
        <Chip key={m.tracker.id} selected={chosen?.tracker.id === m.tracker.id} onClick={() => choose(m.tracker.id)} className="shrink-0">
          {m.concern.short}
          {m.tracker.status === 'closed' ? ' · closed' : ''}
        </Chip>
      ))}
    </div>
  );
}

export function NoTrackers({ line }: { line: string }) {
  return (
    <section className="card p-6 text-center">
      <HeroArt variant={3} className="mx-auto w-full max-w-[260px]" />
      <h2 className="title mt-2">Nothing here yet</h2>
      <p className="mx-auto mt-2 max-w-[340px] text-ink2">{line}</p>
      <Button className="mt-5" icon={Plus} to="/new">
        Start a tracker
      </Button>
    </section>
  );
}
