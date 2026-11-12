import { BellRing, BookOpen, Database, Info, Lock, Palette, Plus, RotateCcw, Wrench } from 'lucide-react';
import { ConcernBadge, Page } from '../../components/blocks';
import { ListRow, RowGroup } from '../../components/ui';
import { useModels, useSettings } from '../../data/hooks';
import { useDateOverride } from '../../data/today';
import { formatDate } from '../../engine/dates';

const THEME = { system: 'System', light: 'Light', dark: 'Dark' } as const;

export default function Settings() {
  const models = useModels();
  const s = useSettings();
  const override = useDateOverride();
  if (!models || !s) return null;
  return (
    <Page title="Settings">
      <RowGroup title="Your trackers">
        {models.active.map((m) => (
          <ListRow key={m.tracker.id} leading={<ConcernBadge concern={m.tracker.concern} size={40} />} label={m.tracker.productName} sub={`${m.name} · ${m.status.title}`} to={`/settings/tracker/${m.tracker.id}`} />
        ))}
        {models.active.length < 3 ? <ListRow icon={Plus} label="New tracker" sub="Follow another product, up to 3 at once" to="/new" /> : null}
        {models.closed.map((m) => (
          <ListRow key={m.tracker.id} leading={<ConcernBadge concern={m.tracker.concern} size={40} />} label={m.tracker.productName} sub={`Closed ${formatDate(m.tracker.closedDate, { year: true })} · history kept`} to={`/settings/tracker/${m.tracker.id}`} />
        ))}
      </RowGroup>
      {models.active.length || models.closed.length ? (
        <p className="-mt-4 mb-6 px-1 text-[0.85rem] text-ink2">
          {models.active.length} active{models.closed.length ? `, ${models.closed.length} closed` : ''}.
        </p>
      ) : null}

      <RowGroup title="App">
        <ListRow icon={Palette} label="Appearance" sub="Theme, text size, motion" value={THEME[s.theme]} to="/settings/appearance" tone="lav" />
        <ListRow icon={BellRing} label="Reminders" sub="Calendar, check-in interval, backups" to="/settings/reminders" tone="sand" />
        <ListRow icon={Lock} label="Privacy" sub="App lock, blur photo previews" value={s.lockHash ? 'Locked' : undefined} to="/settings/privacy" tone="mint" />
        <ListRow icon={Database} label="Data" sub="Storage, backup, delete everything" to="/settings/data" tone="blue" />
        <ListRow icon={Wrench} label="Advanced" sub={override ? `Date set to ${formatDate(override, { short: true, year: true })}` : "Change today's date"} to="/settings/advanced" tone="grey" />
      </RowGroup>

      <RowGroup title="Help">
        <ListRow icon={BookOpen} label="Guide and questions" sub="Photo tips, how results work, sources" to="/guide" />
        <ListRow icon={RotateCcw} label="Replay the intro" to="/welcome/intro?replay=1" />
        <ListRow icon={Info} label="About Same Spot" sub="Try it in 2 minutes, version, licences" to="/settings/about" />
      </RowGroup>
    </Page>
  );
}
