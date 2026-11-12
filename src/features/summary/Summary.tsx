import { ArrowLeft, Printer } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../../components/art';
import { PhotoThumb } from '../../components/blocks';
import { Button, Spinner, Switch } from '../../components/ui';
import { changeOf, warningOf } from '../../content/concerns';
import { QUICK_BY_ID, RESULTS, USE_BY_ID } from '../../content/copy';
import { useModel } from '../../data/hooks';
import { goBackOr } from '../../data/flows';
import { sortByDate } from '../../engine/clock';
import { formatDate } from '../../engine/dates';
import { latestPhotos } from '../../engine/rules';

export default function Summary() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const m = useModel(id);
  const [photos, setPhotos] = useState(false);
  if (m === undefined) return <Spinner />;
  if (m === null) return <Navigate to="/" replace />;
  const t = m.tracker;
  const y = (d: string) => formatDate(d, { year: true });
  const checkins = sortByDate(m.data.checkins);
  const lookByDate = new Map(m.looks.filter((l) => l.ev.code).map((l) => [l.look.date, RESULTS[l.ev.code!].title]));
  const latest = latestPhotos(t, m.data.photos, m.today);
  const warnings = [
    ...m.data.checkins.flatMap((c) => c.warnings.map((w) => ({ date: c.date, code: w }))),
    ...m.data.events.filter((e) => e.type === 'warning' && e.code).map((e) => ({ date: e.date, code: e.code! })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  const closings = [
    ...m.data.checkins.filter((c) => c.followUp === 'settled' || c.followUp === 'doctor').map((c) => ({ date: c.date, how: c.followUp })),
    ...m.data.events.filter((e) => e.type === 'warningClosed').map((e) => ({ date: e.date, how: e.how })),
  ];
  const status = t.status === 'closed' ? (t.closedReason === 'stopped' ? 'Closed, stopped using it' : 'Closed') : m.clock.paused ? 'Paused' : 'Active';
  const kv = (k: string, v: string) => (
    <div className="grid grid-cols-[42%_1fr] gap-3 border-b border-line py-2.5">
      <dt className="text-ink2">{k}</dt>
      <dd className="font-semibold text-ink">{v}</dd>
    </div>
  );

  return (
    <main id="main" tabIndex={-1} className="min-h-dvh bg-bg pb-10 pt-[var(--safe-t)] focus:outline-none">
      <div className="no-print mx-auto flex max-w-[760px] items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => void goBackOr(nav, '/')} aria-label="Back" className="grid h-12 w-12 place-items-center rounded-full text-navy hover:bg-primary/10">
          <ArrowLeft className="h-6 w-6" aria-hidden />
        </button>
        <span className="font-semibold text-navy">Summary for a dermatologist</span>
      </div>
      <div className="no-print mx-auto grid max-w-[760px] gap-3 px-5">
        <label className="card flex min-h-[60px] items-center justify-between gap-3 px-5 py-3">
          <span className="font-semibold">Include first and latest photos</span>
          <Switch checked={photos} onChange={setPhotos} label="Include first and latest photos" />
        </label>
        <Button size="lg" icon={Printer} onClick={() => window.print()}>
          Print or save as PDF
        </Button>
        <p className="text-[0.9rem] text-ink2">Show this on your phone or print it. It has no name or contact details.</p>
      </div>
      <article className="print-sheet card mx-5 mt-5 max-w-[760px] p-6 lg:mx-auto">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-bold text-navy">Same Spot · tracker summary</span>
          </div>
          <span className="text-[0.85rem] text-ink2">Made {y(m.today)}</span>
        </header>
        <h1 className="mt-4 font-serif text-[1.9rem] leading-tight text-navy">
          {m.name}: {t.productName}
        </h1>
        <dl className="mt-4">
          {kv('Started using it', y(t.startDate))}
          {kv('Tracker started', y(t.createdDate))}
          {kv('Weeks of real use', `About ${m.clock.wholeWeeks} (${Math.floor(m.clock.calendarWeeks)} calendar weeks). Early look at ${m.windows.early}, full look at ${m.windows.full}.`)}
          {kv('Status', status)}
          {kv('Latest result', m.lastLook?.ev.code ? `${RESULTS[m.lastLook.ev.code].title} (${y(m.lastLook.look.date)})` : 'No look yet')}
        </dl>

        <h2 className="mt-6 text-[0.82rem] font-bold uppercase tracking-[0.08em] text-ink2">Check-ins</h2>
        {checkins.length ? (
          <div className="mt-2 overflow-x-auto rounded-lg focus-visible:outline-2" tabIndex={0} role="region" aria-label="Check-ins table">
            <table className="w-full min-w-[560px] border-collapse text-left text-[0.88rem]">
              <thead>
                <tr className="text-ink2">
                  {['Date', 'Use since last', 'Changes', 'Warning signs', m.concern.quick.label, 'Result'].map((h) => (
                    <th key={h} className="border-b border-line py-2 pr-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checkins.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="border-b border-line py-2 pr-3">{formatDate(c.date, { short: true, year: true })}</td>
                    <td className="border-b border-line py-2 pr-3">{USE_BY_ID[c.use].label}</td>
                    <td className="border-b border-line py-2 pr-3">{c.changes.map((x) => changeOf(t.concern, x)?.label).filter(Boolean).join(', ') || 'Nothing new'}</td>
                    <td className="border-b border-line py-2 pr-3">{c.warnings.map((x) => warningOf(t.concern, x)?.label).filter(Boolean).join(', ') || 'None'}</td>
                    <td className="border-b border-line py-2 pr-3">{c.quick ? QUICK_BY_ID[c.quick].label : ''}</td>
                    <td className="border-b border-line py-2 pr-3">{lookByDate.get(c.date) ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-ink2">No check-ins yet.</p>
        )}

        <h2 className="mt-6 text-[0.82rem] font-bold uppercase tracking-[0.08em] text-ink2">Warning signs</h2>
        {warnings.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((w, k) => (
              <li key={k}>
                {warningOf(t.concern, w.code)?.label} ({y(w.date)})
              </li>
            ))}
            {closings.map((c, k) => (
              <li key={`c${k}`}>
                Marked {c.how === 'doctor' ? 'seen a doctor' : 'settled'} ({y(c.date)})
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">None reported.</p>
        )}

        {photos ? (
          <>
            <h2 className="mt-6 text-[0.82rem] font-bold uppercase tracking-[0.08em] text-ink2">First and latest photos</h2>
            <div className="mt-3 grid gap-4">
              {m.concern.views
                .filter((v) => m.firsts[v.id])
                .map((v) => (
                  <div key={v.id}>
                    <p className="mb-2 font-semibold">{v.label}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <PhotoThumb id={m.firsts[v.id].id} alt={`${v.label}, first photo`} label="First" sub={formatDate(m.firsts[v.id].date, { short: true, year: true })} />
                      {latest[v.id] && latest[v.id].id !== m.firsts[v.id].id ? (
                        <PhotoThumb id={latest[v.id].id} alt={`${v.label}, latest photo`} label="Latest" sub={formatDate(latest[v.id].date, { short: true, year: true })} />
                      ) : (
                        <p className="self-center text-ink2">No later photo.</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        ) : null}

        <p className="mt-6 border-t border-dashed border-line pt-3 text-[0.82rem] text-ink2">
          This record was kept by the person using the product, with Same Spot. It is not a medical assessment. Weeks of real use count most-days weeks in full, about-half weeks as half, and once-in-a-while weeks as a quarter. These weights are an estimate.
        </p>
      </article>
    </main>
  );
}
