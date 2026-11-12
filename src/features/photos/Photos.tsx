import { Columns2, ImagePlus, SlidersHorizontal, SunMedium, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Page, PhotoThumb } from '../../components/blocks';
import { Sheet, confirmAsk, toast } from '../../components/overlay';
import { Button, Panel, Segmented, Switch, cx } from '../../components/ui';
import { deletePhoto } from '../../data/actions';
import { useModels, usePhotoUrl, useSettings } from '../../data/hooks';
import { formatDate, weekOf } from '../../engine/dates';
import type { TrackerModel } from '../../engine/model';
import { photosOf } from '../../engine/rules';
import type { Photo } from '../../engine/types';
import { NoTrackers, TrackerSwitch, useChosenTracker } from '../common';

export default function Photos() {
  const models = useModels();
  const { chosen: m, all, choose } = useChosenTracker(models);
  if (!models) return null;
  return (
    <Page title="Photos" right={m && m.tracker.status === 'active' ? <Button size="sm" variant="secondary" icon={ImagePlus} to={`/t/${m.tracker.id}/add-photos`}>Add</Button> : null}>
      {!m ? (
        <NoTrackers line="Your photos will appear here, only on this device, never in your gallery." />
      ) : (
        <>
          <TrackerSwitch all={all} chosen={m} choose={choose} />
          <PhotosBody key={m.tracker.id} m={m} />
        </>
      )}
    </Page>
  );
}

function labelFor(m: TrackerModel, p: Photo): string {
  return m.firsts[p.view]?.id === p.id ? 'First' : `Week ${weekOf(m.tracker.startDate, p.date)}`;
}

function PhotosBody({ m }: { m: TrackerModel }) {
  const s = useSettings();
  const views = m.concern.views.filter((v) => m.tracker.views.includes(v.id));
  const [view, setView] = useState<string>('all');
  const [open, setOpen] = useState<Photo | null>(null);
  const [compare, setCompare] = useState(false);
  const list = useMemo(() => photosOf(m.tracker, m.data.photos).filter((p) => view === 'all' || p.view === view).reverse(), [m, view]);
  const blur = !!s?.blurPreviews;
  const viewLabel = (id: string) => views.find((v) => v.id === id)?.label ?? id;

  return (
    <>
      <Segmented label="Photo view" value={view} onChange={setView} options={[{ id: 'all', label: 'All' }, ...views.map((v) => ({ id: v.id, label: v.label.split(',')[0] }))]} />
      {list.length ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[0.92rem] text-ink2">
              {list.length} photo{list.length === 1 ? '' : 's'} · only on this device
            </p>
            <Button size="sm" variant="secondary" icon={Columns2} onClick={() => setCompare(true)} disabled={list.length < 2}>
              Compare
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((p) => (
              <div key={p.id}>
                <PhotoThumb id={p.id} alt={`${viewLabel(p.view)}, ${formatDate(p.date, { year: true })}`} label={labelFor(m, p)} sub={formatDate(p.date, { ref: m.today, short: true })} blur={blur} onClick={() => setOpen(p)} />
                {view === 'all' ? <p className="mt-1.5 truncate text-[0.82rem] text-ink2">{viewLabel(p.view)}</p> : null}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card mt-4 p-6 text-center">
          <p className="font-semibold text-ink">No photos {view === 'all' ? 'yet' : 'of this view yet'}</p>
          <p className="mt-1 text-ink2">Your first photos are your starting point. Same spot, same light, every time.</p>
          {m.tracker.status === 'active' ? (
            <Button className="mt-4" icon={ImagePlus} to={`/t/${m.tracker.id}/add-photos${view !== 'all' ? `/${view}` : ''}`}>
              Add photos
            </Button>
          ) : null}
        </div>
      )}
      <Panel tone="blue" className="mt-6" icon={SunMedium}>
        For your result, use the look without dates. Comparing here with dates showing is easy to misjudge.
      </Panel>
      <PhotoSheet m={m} p={open} onClose={() => setOpen(null)} label={open ? `${viewLabel(open.view)} · ${labelFor(m, open)}` : ''} />
      <CompareSheet m={m} open={compare} onClose={() => setCompare(false)} startView={view === 'all' ? views[0]?.id : view} />
    </>
  );
}

function PhotoSheet({ m, p, onClose, label }: { m: TrackerModel; p: Photo | null; onClose: () => void; label: string }) {
  const url = usePhotoUrl(p?.id, 'full');
  return (
    <Sheet open={!!p} onClose={onClose} title={label} description={p ? formatDate(p.date, { year: true }) : undefined} wide>
      {p ? (
        <>
          <div className="overflow-hidden rounded-[20px] bg-[#0B1220]">
            {url ? <img src={url} alt={label} className="mx-auto max-h-[62dvh] w-auto object-contain" /> : <div className="h-[40dvh]" />}
          </div>
          {p.lightDiffers ? <p className="mt-3 text-[0.92rem] font-semibold text-sand-ink">The light differs from your first photo.</p> : null}
          {m.tracker.status === 'active' ? (
            <Button
              variant="secondary"
              block
              icon={Trash2}
              className="mt-4"
              onClick={async () => {
                if (!(await confirmAsk({ title: 'Delete this photo?', body: "It's removed from this device. This can't be undone.", confirmLabel: 'Delete photo', danger: true }))) return;
                await deletePhoto(p.id);
                toast('Photo deleted.');
                onClose();
              }}
            >
              Delete photo
            </Button>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

function CompareSheet({ m, open, onClose, startView }: { m: TrackerModel; open: boolean; onClose: () => void; startView?: string }) {
  const views = m.concern.views.filter((v) => m.tracker.views.includes(v.id));
  const [view, setView] = useState(startView ?? views[0]?.id ?? '');
  const [mode, setMode] = useState<'side' | 'slider'>('side');
  const [dates, setDates] = useState(false);
  const photos = useMemo(() => photosOf(m.tracker, m.data.photos).filter((p) => p.view === view), [m, view]);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  useEffect(() => {
    if (open && startView) setView(startView);
  }, [open, startView]);
  useEffect(() => {
    setA(photos[0]?.id ?? null);
    setB(photos[photos.length - 1]?.id ?? null);
  }, [photos]);
  const pa = photos.find((p) => p.id === a);
  const pb = photos.find((p) => p.id === b);
  return (
    <Sheet open={open} onClose={onClose} title="Compare" wide>
      <div className="grid gap-3">
        <Segmented label="Photo view" value={view} onChange={setView} options={views.map((v) => ({ id: v.id, label: v.label.split(',')[0] }))} />
        <div className="flex items-center justify-between gap-3">
          <Segmented
            label="Compare mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'side', label: 'Side by side' },
              { id: 'slider', label: 'Slider' },
            ]}
          />
          <label className="flex shrink-0 items-center gap-2 text-[0.92rem] font-semibold">
            Show dates
            <Switch checked={dates} onChange={setDates} label="Show dates" />
          </label>
        </div>
        {photos.length < 2 ? (
          <p className="rounded-[16px] bg-grey-50 p-4 text-ink2">This view needs at least two photos to compare.</p>
        ) : pa && pb ? (
          mode === 'side' ? (
            <div className="grid grid-cols-2 gap-3">
              <PhotoThumb id={pa.id} kind="full" alt="Left photo" label={dates ? formatDate(pa.date, { short: true, year: true }) : 'Left'} />
              <PhotoThumb id={pb.id} kind="full" alt="Right photo" label={dates ? formatDate(pb.date, { short: true, year: true }) : 'Right'} />
            </div>
          ) : (
            <Slider a={pa} b={pb} dates={dates} />
          )
        ) : null}
        {photos.length >= 2 ? (
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['Left', a, setA],
                ['Right', b, setB],
              ] as const
            ).map(([label, value, set]) => (
              <label key={label} className="text-[0.88rem] font-semibold text-ink">
                {label} photo
                <select value={value ?? ''} onChange={(e) => set(e.target.value)} className="mt-1 h-12 w-full rounded-btn border border-line bg-card px-3 font-normal text-ink">
                  {photos.map((p, k) => (
                    <option key={p.id} value={p.id}>
                      {k === 0 ? 'First' : `Week ${weekOf(m.tracker.startDate, p.date)}`} · {formatDate(p.date, { short: true, year: true })}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}
        <p className="text-[0.9rem] text-ink2">For your result, use the look without dates.</p>
      </div>
    </Sheet>
  );
}

function Slider({ a, b, dates }: { a: Photo; b: Photo; dates: boolean }) {
  const ua = usePhotoUrl(a.id, 'full');
  const ub = usePhotoUrl(b.id, 'full');
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[3/4] max-h-[62dvh] w-full overflow-hidden rounded-[20px] bg-grey-50 sm:mx-auto sm:max-w-[460px]">
      {ub ? <img src={ub} alt="Right photo" className="absolute inset-0 h-full w-full object-cover" /> : null}
      {ua ? <img src={ua} alt="Left photo" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} /> : null}
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} aria-hidden>
        <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-navy shadow">
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
        </span>
      </div>
      {dates ? (
        <>
          <span className="absolute left-2 top-2 rounded-lg bg-[#143461]/85 px-2 py-1 text-[0.78rem] font-bold text-white">{formatDate(a.date, { short: true, year: true })}</span>
          <span className="absolute right-2 top-2 rounded-lg bg-[#143461]/85 px-2 py-1 text-[0.78rem] font-bold text-white">{formatDate(b.date, { short: true, year: true })}</span>
        </>
      ) : null}
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Drag to move the divider between the two photos"
        className={cx('absolute inset-0 h-full w-full cursor-ew-resize opacity-0')}
      />
    </div>
  );
}
