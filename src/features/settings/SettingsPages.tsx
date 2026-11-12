import {
  ArrowLeft, ArrowRight, CalendarClock, CalendarPlus, CircleCheck, CirclePause, CirclePlay, Download, EyeOff, HardDrive, KeyRound, Lock, OctagonX,
  RefreshCw, RotateCcw, ShieldCheck, Sparkles, Trash2, Upload,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../../components/art';
import { ConcernBadge } from '../../components/blocks';
import { ask, confirmAsk, toast } from '../../components/overlay';
import { Button, Chip, ListRow, Panel, RowGroup, Segmented, Stepper, Switch, TextField, cx } from '../../components/ui';
import {
  closeTracker, deleteEverything, deleteTracker, pauseTracker, reopenTracker, resumeTracker, saveSettings, updateTracker,
} from '../../data/actions';
import { makeBackup } from '../../data/backup';
import { restoreFromBackup } from '../restore';
import { downloadFile } from '../../data/calendar';
import { hashPin } from '../../data/crypto';
import { useModel, useModels, useSettings, useStorageInfo } from '../../data/hooks';
import { setDateOverride, today, useDateOverride, useToday } from '../../data/today';
import { finishFlow, goBackOr } from '../../data/flows';
import { addDays, formatDate, isDateStr, localDateStr } from '../../engine/dates';
import { CalendarSheet } from '../common';
import { markUnlocked } from '../lock/Lock';

export const APP_VERSION = '2.0';

function SubPage({ title, children, back = '/settings' }: { title: string; children: ReactNode; back?: string }) {
  const nav = useNavigate();
  return (
    <div className="pb-tabbar">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 pt-[var(--safe-t)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[760px] items-center gap-2 px-2">
          <button type="button" onClick={() => void goBackOr(nav, back)} aria-label="Back" className="grid h-12 w-12 place-items-center rounded-full text-navy hover:bg-primary/10">
            <ArrowLeft className="h-6 w-6" aria-hidden />
          </button>
          <span className="font-semibold text-navy">Settings</span>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="focus:outline-none mx-auto max-w-[760px] px-5 pt-5">
        <h1 className="title mb-6">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export default function SettingsPages() {
  const { page, id } = useParams<{ page: string; id?: string }>();
  switch (page) {
    case 'tracker':
      return <TrackerSettings id={id!} />;
    case 'appearance':
      return <Appearance />;
    case 'reminders':
      return <Reminders />;
    case 'privacy':
      return <Privacy />;
    case 'data':
      return <Data />;
    case 'advanced':
      return <Advanced />;
    case 'about':
      return <About />;
    default:
      return <Navigate to="/settings" replace />;
  }
}

// ---------- one tracker ----------

function TrackerSettings({ id }: { id: string }) {
  const m = useModel(id);
  const nav = useNavigate();
  const [name, setName] = useState('');
  useEffect(() => {
    if (m) setName(m.tracker.productName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.tracker.id]);
  if (m === undefined) return null;
  if (m === null) return <Navigate to="/settings" replace />;
  const t = m.tracker;
  const active = t.status === 'active';
  const fullDefault = m.concern.full;

  return (
    <SubPage title="Tracker settings">
      <div className="mb-6 flex items-center gap-3">
        <ConcernBadge concern={t.concern} size={52} />
        <div>
          <p className="kicker">{m.name}</p>
          <p className="text-[1.1rem] font-semibold text-ink">{t.productName}</p>
        </div>
      </div>

      {active ? (
        <>
          <section className="card mb-4 grid gap-3 p-5">
            <TextField label="Product name" value={name} onChange={setName} maxLength={40} />
            <Button
              variant="secondary"
              disabled={!name.trim() || name.trim() === t.productName}
              onClick={async () => {
                await updateTracker(id, { productName: name.trim() });
                toast('Name saved.');
              }}
            >
              Save name
            </Button>
          </section>

          <section className="card mb-4 p-5">
            <h2 className="font-semibold text-ink">Photo views</h2>
            <p className="mt-1 text-[0.9rem] text-ink2">Choose at least one. Each look compares every view you use.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {m.concern.views.map((v) => {
                const on = t.views.includes(v.id);
                return (
                  <Chip
                    key={v.id}
                    selected={on}
                    onClick={async () => {
                      const next = on ? t.views.filter((x) => x !== v.id) : [...t.views, v.id];
                      if (!next.length) return toast('Keep at least one photo view.');
                      await updateTracker(id, { views: m.concern.views.map((x) => x.id).filter((x) => next.includes(x)) });
                    }}
                  >
                    {v.label}
                  </Chip>
                );
              })}
            </div>
          </section>

          <section className="card mb-4 grid gap-5 p-5">
            <div>
              <h2 className="mb-2 font-semibold text-ink">Check-ins every</h2>
              <Segmented
                label="Check-ins every"
                value={String(t.interval)}
                onChange={(v) => updateTracker(id, { interval: Number(v) as 14 | 28 })}
                options={[
                  { id: '14', label: '2 weeks' },
                  { id: '28', label: '4 weeks' },
                ]}
              />
            </div>
            <div>
              <h2 className="mb-2 font-semibold text-ink">One pack lasts about</h2>
              <div className="flex flex-wrap gap-2">
                {[30, 45, 60, 90].map((n) => (
                  <Chip key={n} selected={t.packDays === n} onClick={() => updateTracker(id, { packDays: n })}>
                    {n} days
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-1 font-semibold text-ink">Full look at</h2>
              <p className="mb-3 text-[0.9rem] text-ink2">Change this only if your pack says something different. Starting point: {fullDefault} weeks.</p>
              <Stepper value={m.windows.full} min={4} max={52} unit="weeks" label="Full look window" onChange={(v) => updateTracker(id, { fullWeeks: v === fullDefault ? undefined : v })} />
            </div>
          </section>

          <RowGroup>
            <ListRow
              icon={m.clock.paused ? CirclePlay : CirclePause}
              label={m.clock.paused ? 'Resume tracking' : 'Pause tracking'}
              sub={m.clock.paused ? 'Start your clock again' : 'Your clock stops while paused'}
              onClick={async () => {
                if (m.clock.paused) {
                  const r = await ask({ title: 'When did you start using it again?', input: { label: 'Date', type: 'date' }, confirmLabel: 'Resume tracking' });
                  if (!r.ok) return;
                  await resumeTracker(id, isDateStr(r.value) && r.value <= today() ? r.value : today());
                  toast('Your clock is running again.');
                } else {
                  await pauseTracker(id);
                  toast('Tracking paused.');
                }
              }}
            />
            <ListRow
              icon={RefreshCw}
              label="Restart with new first photos"
              sub="Closes this tracker and starts a fresh one"
              onClick={async () => {
                if (await confirmAsk({ title: 'Restart this tracker?', body: 'This one closes and keeps its history. A new one starts today, with new first photos.', confirmLabel: 'Restart' })) nav(`/new?restart=${id}`);
              }}
            />
            <ListRow
              icon={CircleCheck}
              label="Close the tracker"
              sub="Keeps its history, read-only"
              onClick={async () => {
                if (!(await confirmAsk({ title: 'Close this tracker?', body: 'Its history stays on this device, read-only.', confirmLabel: 'Close the tracker' }))) return;
                await closeTracker(id, 'done');
                toast('Tracker closed.');
              }}
            />
          </RowGroup>
        </>
      ) : (
        <>
          <Panel tone="grey" className="mb-4">
            Closed {formatDate(t.closedDate, { year: true })}
            {t.closedReason === 'stopped' ? ', after you stopped using it' : ''}. Its history stays here, read-only.
          </Panel>
          <RowGroup>
            <ListRow icon={RotateCcw} label="Reopen this tracker" onClick={async () => { await reopenTracker(id); toast('Tracker reopened.'); }} />
            <ListRow icon={Sparkles} label="See its progress" to={`/progress?t=${id}`} />
          </RowGroup>
        </>
      )}
      <RowGroup>
        <ListRow
          icon={Trash2}
          danger
          label="Delete this tracker"
          sub="Removes its check-ins and photos from this device"
          onClick={async () => {
            if (!(await confirmAsk({ title: 'Delete this tracker?', body: "Its check-ins, looks and photos are removed from this device. This can't be undone.", confirmLabel: 'Delete tracker', danger: true }))) return;
            await deleteTracker(id);
            toast('Tracker deleted.');
            await finishFlow(nav, null, '/settings');
          }}
        />
      </RowGroup>
    </SubPage>
  );
}

// ---------- appearance ----------

function Appearance() {
  const s = useSettings();
  if (!s) return null;
  return (
    <SubPage title="Appearance">
      <section className="card mb-4 grid gap-5 p-5">
        <div>
          <h2 className="mb-2 font-semibold text-ink">Theme</h2>
          <Segmented
            label="Theme"
            value={s.theme}
            onChange={(v) => saveSettings({ theme: v })}
            options={[
              { id: 'system', label: 'System' },
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
            ]}
          />
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-ink">Text size</h2>
          <Segmented
            label="Text size"
            value={s.textSize}
            onChange={(v) => saveSettings({ textSize: v })}
            options={[
              { id: 'default', label: 'Default' },
              { id: 'large', label: 'Large' },
              { id: 'xl', label: 'Extra large' },
            ]}
          />
        </div>
      </section>
      <RowGroup>
        <ListRow icon={Sparkles} label="Reduce motion" sub="Fewer animations and no confetti" right={<Switch checked={s.reduceMotion} onChange={(v) => saveSettings({ reduceMotion: v })} label="Reduce motion" />} />
      </RowGroup>
      <section className="card p-5">
        <p className="kicker">Preview</p>
        <p className="title mt-2">Can you tell yet?</p>
        <p className="mt-2 text-ink2">This is how text looks with your settings.</p>
      </section>
    </SubPage>
  );
}

// ---------- reminders ----------

function Reminders() {
  const s = useSettings();
  const models = useModels();
  const [cal, setCal] = useState<string | null>(null);
  if (!s || !models) return null;
  const chosen = models.active.find((m) => m.tracker.id === cal);
  return (
    <SubPage title="Reminders">
      <p className="-mt-3 mb-5 text-ink2">Same Spot can't send notifications, so it puts check-ins in your calendar and shows what's due on Home.</p>
      {models.active.length ? (
        <RowGroup title="Add to your calendar">
          {models.active.map((m) => (
            <ListRow key={m.tracker.id} icon={CalendarPlus} label={m.tracker.productName} sub={`Next check-in: ${formatDate(m.nextCheckin, { ref: m.today })}`} onClick={() => setCal(m.tracker.id)} />
          ))}
        </RowGroup>
      ) : null}
      <section className="card mb-6 grid gap-5 p-5">
        <div>
          <h2 className="mb-1 font-semibold text-ink">Check-ins every</h2>
          <p className="mb-3 text-[0.9rem] text-ink2">For new trackers. Change one tracker in its own settings.</p>
          <Segmented
            label="Default check-in interval"
            value={String(s.defaultInterval)}
            onChange={(v) => saveSettings({ defaultInterval: Number(v) as 14 | 28 })}
            options={[
              { id: '14', label: '2 weeks' },
              { id: '28', label: '4 weeks' },
            ]}
          />
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-ink">Backup reminder</h2>
          <Segmented
            label="Backup reminder"
            value={s.backupReminder}
            onChange={(v) => saveSettings({ backupReminder: v })}
            options={[
              { id: 'off', label: 'Off' },
              { id: 'monthly', label: 'Monthly' },
            ]}
          />
        </div>
      </section>
      <RowGroup>
        <ListRow icon={EyeOff} label="Discreet calendar titles" sub={`Events say "Same Spot check-in"${s.discreetTitles ? '' : ' plus the concern'}`} right={<Switch checked={s.discreetTitles} onChange={(v) => saveSettings({ discreetTitles: v })} label="Discreet calendar titles" />} />
      </RowGroup>
      {chosen ? <CalendarSheet m={chosen} open onClose={() => setCal(null)} /> : null}
    </SubPage>
  );
}

// ---------- privacy ----------

async function askPin(title: string): Promise<string | null> {
  const r = await ask({ title, input: { label: '4-digit code', type: 'password', inputMode: 'numeric', maxLength: 4 }, confirmLabel: 'Continue' });
  if (!r.ok) return null;
  if (!/^\d{4}$/.test(r.value)) {
    toast('Use exactly 4 digits.');
    return null;
  }
  return r.value;
}

function Privacy() {
  const s = useSettings();
  if (!s) return null;
  const locked = !!s.lockHash;
  const setLock = async () => {
    const a = await askPin('Choose a 4-digit code');
    if (!a) return;
    const b = await askPin('Type it again');
    if (!b) return;
    if (a !== b) return toast("The codes didn't match. Try again.");
    const { hash, salt } = await hashPin(a);
    await saveSettings({ lockHash: hash, lockSalt: salt });
    markUnlocked();
    toast('Same Spot now asks for your code.');
  };
  return (
    <SubPage title="Privacy">
      <Panel tone="mint" icon={ShieldCheck} className="mb-5">
        No account, no server, no analytics. Your answers and photos stay in this browser on this device. Photos are re-saved on the device, which removes location data, and never go to your gallery.
      </Panel>
      <RowGroup title="Photos">
        <ListRow icon={EyeOff} label="Blur photo previews" sub="Tap a photo to show it" right={<Switch checked={s.blurPreviews} onChange={(v) => saveSettings({ blurPreviews: v })} label="Blur photo previews" />} />
      </RowGroup>
      <RowGroup title="App lock">
        {locked ? (
          <>
            <ListRow icon={KeyRound} label="Change code" onClick={setLock} />
            <ListRow
              icon={Lock}
              label="Turn off the lock"
              onClick={async () => {
                if (!(await confirmAsk({ title: 'Turn off the lock?', body: 'Anyone who opens Same Spot on this device will see your record.', confirmLabel: 'Turn off' }))) return;
                await saveSettings({ lockHash: undefined, lockSalt: undefined });
                toast('Lock turned off.');
              }}
            />
          </>
        ) : (
          <ListRow icon={Lock} label="Set a 4-digit code" sub="For shared phones" onClick={setLock} />
        )}
      </RowGroup>
      <p className="-mt-3 px-1 text-[0.88rem] text-ink2">The lock is a privacy screen, not encryption. A forgotten code can't be recovered: the lock screen offers to erase all data instead.</p>
    </SubPage>
  );
}

// ---------- data ----------

function size(n: number | null): string {
  if (n === null) return 'Not reported';
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Data() {
  const s = useSettings();
  const models = useModels();
  const info = useStorageInfo();
  const nav = useNavigate();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  if (!s || !models) return null;
  const photos = [...models.active, ...models.closed].reduce((n, m) => n + m.data.photos.length, 0);
  const trackers = models.active.length + models.closed.length;

  const exportIt = async () => {
    const r = await ask({
      title: 'Protect the backup with a password?',
      body: 'Anyone with the file can see your photos. A password keeps it private. Leave it empty for no password.',
      input: { label: 'Password (optional)', type: 'password' },
      confirmLabel: 'Make backup',
    });
    if (!r.ok) return;
    setBusy('export');
    try {
      const blob = await makeBackup(r.value || undefined);
      downloadFile(blob, `same-spot-backup-${localDateStr()}.json`);
      toast('Backup ready. Keep it somewhere private.');
    } catch {
      toast("The backup couldn't be made. Please try again.");
    }
    setBusy(null);
  };

  const importIt = async () => {
    setBusy('import');
    const done = await restoreFromBackup();
    setBusy(null);
    if (done) await finishFlow(nav, null, '/');
  };

  return (
    <SubPage title="Data">
      <section className="card mb-6 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-blue-50 text-blue-ink">
            <HardDrive className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-ink">On this device</p>
            <p className="text-[0.9rem] text-ink2">
              {trackers} tracker{trackers === 1 ? '' : 's'} · {photos} photo{photos === 1 ? '' : 's'} · {size(info.usage)}
            </p>
          </div>
        </div>
        <div className={cx('mt-4 flex items-start gap-2 rounded-[14px] p-3 text-[0.92rem]', info.persisted ? 'bg-mint-50 text-mint-ink' : 'bg-sand-50 text-sand-ink')}>
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>{info.persisted ? 'Protected: the browser keeps this data unless you delete it.' : 'Not protected yet: the browser may clear it if your device runs low on space.'}</span>
        </div>
        {!info.persisted ? (
          <Button
            variant="secondary"
            block
            className="mt-3"
            onClick={async () => {
              const ok = await navigator.storage?.persist?.().catch(() => false);
              info.refresh();
              toast(ok ? 'Your data is protected.' : 'The browser decides this. Adding Same Spot to your home screen helps.');
            }}
          >
            Ask the browser to protect it
          </Button>
        ) : null}
      </section>
      <RowGroup title="Backup">
        <ListRow icon={Download} label="Export backup" sub={s.lastBackup ? `Last backup: ${formatDate(s.lastBackup, { year: true })}` : 'One file with everything, photos included'} onClick={busy ? undefined : exportIt} />
        <ListRow icon={Upload} label="Import backup" sub="Replaces what is on this device" onClick={busy ? undefined : importIt} />
      </RowGroup>
      <RowGroup title="Delete">
        <ListRow
          icon={OctagonX}
          danger
          label="Delete everything"
          sub="Every tracker and photo on this device"
          onClick={async () => {
            const r = await ask({
              title: 'Delete everything?',
              body: "Every tracker, check-in and photo on this device is removed. This can't be undone. Backups you exported are not affected.",
              input: { label: 'Type DELETE to confirm', mustEqual: 'DELETE' },
              confirmLabel: 'Delete everything',
              danger: true,
            });
            if (!r.ok) return;
            await deleteEverything();
            setDateOverride(null);
            toast('Everything is deleted.');
            nav('/welcome', { replace: true });
          }}
        />
      </RowGroup>
    </SubPage>
  );
}

// ---------- advanced: change today's date ----------

function Advanced() {
  const day = useToday();
  const override = useDateOverride();
  const real = localDateStr();
  const [picked, setPicked] = useState(day);
  useEffect(() => setPicked(day), [day]);
  const set = (d: string) => {
    if (!isDateStr(d)) return;
    setDateOverride(d);
    toast(d === real ? 'Back to today.' : `Today is now ${formatDate(d, { year: true })} in Same Spot.`);
  };
  return (
    <SubPage title="Advanced">
      <section className="card p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-sand-50 text-sand-ink">
            <CalendarClock className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Change today's date</h2>
            <p className="text-[0.9rem] text-ink2">Move time forward to see your later check-ins and looks.</p>
          </div>
        </div>
        <p className="mt-4 rounded-[14px] bg-grey-50 p-3 font-semibold text-ink" aria-live="polite">
          Same Spot's date: {formatDate(day, { year: true })}
          {override ? ' (changed)' : ' (today)'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => set(addDays(day, 7))}>
            +1 week
          </Button>
          <Button variant="secondary" onClick={() => set(addDays(day, 28))}>
            +4 weeks
          </Button>
        </div>
        <div className="mt-4 grid gap-2.5">
          <TextField label="Or pick a date" type="date" value={picked} min={addDays(real, -730)} max={addDays(real, 730)} onChange={setPicked} />
          <Button disabled={!isDateStr(picked) || picked === day} onClick={() => set(picked)}>
            Use this date
          </Button>
          {override ? (
            <Button variant="ghost" onClick={() => set(real)}>
              Back to today
            </Button>
          ) : null}
        </div>
        <p className="mt-4 text-[0.88rem] text-ink2">Check-ins and photos you add are saved with the date shown here. A small pill at the top reminds you while it's changed.</p>
      </section>
    </SubPage>
  );
}

// ---------- about ----------

function About() {
  return (
    <SubPage title="About Same Spot">
      <section className="card mb-4 flex items-center gap-4 p-5">
        <Logo size={56} />
        <div>
          <p className="text-[1.2rem] font-bold text-navy">Same Spot</p>
          <p className="text-[0.9rem] text-ink2">Version {APP_VERSION}</p>
          <p className="text-[0.9rem] font-semibold text-primary">Made for Be Bodywise customers</p>
        </div>
      </section>
      <section className="mb-4 rounded-card border border-accent bg-sand-50 p-5">
        <p className="kicker text-sand-ink">Try it in 2 minutes</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink">
          <li>Start a tracker for underarm darkening.</li>
          <li>Choose "Earlier: 3 months ago" and "Most days".</li>
          <li>Add any two photos as your first (older) and latest (today) photos.</li>
          <li>Your full look is ready on Home: compare without dates and see your result.</li>
          <li>Then use Settings &gt; Advanced &gt; Change today's date to see later check-ins.</li>
        </ol>
        <Button className="mt-4" to="/new" iconRight={ArrowRight}>
          Start a tracker
        </Button>
      </section>
      <RowGroup>
        <ListRow label="Built for the Mosaic Wellness Fellowship Builder Challenge" />
        <ListRow label="Not a medical device" sub="It shows you your own record so you can decide. It never diagnoses." />
        <ListRow label="Private by design" sub="No server, no accounts, no analytics, no ads." />
        <ListRow label="Fonts" sub="Inter and Instrument Serif, both under the SIL Open Font License 1.1." />
        <ListRow label="Icons" sub="Lucide, under the ISC License." />
      </RowGroup>
    </SubPage>
  );
}
