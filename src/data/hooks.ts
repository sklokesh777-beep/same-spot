import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { buildModel, type TrackerModel } from '../engine/model';
import type { Tracker, TrackerData } from '../engine/types';
import { db, DEFAULT_SETTINGS, type Settings } from './db';
import { useToday } from './today';

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...((await db.settings.get('app')) ?? {}) }), []);
}

export function useTrackers(): Tracker[] | undefined {
  return useLiveQuery(() => db.trackers.orderBy('createdAt').toArray(), []);
}

async function loadData(t: Tracker): Promise<TrackerData> {
  const [checkins, events, photos, looks] = await Promise.all([
    db.checkins.where('trackerId').equals(t.id).toArray(),
    db.events.where('trackerId').equals(t.id).toArray(),
    db.photos.where('trackerId').equals(t.id).toArray(),
    db.looks.where('trackerId').equals(t.id).toArray(),
  ]);
  return { tracker: t, checkins, events, photos, looks };
}

/** Live data for one tracker. undefined while loading, null when it doesn't exist. */
export function useTrackerData(id: string | undefined): TrackerData | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const t = await db.trackers.get(id);
    return t ? loadData(t) : null;
  }, [id]);
}

export function useAllData(): TrackerData[] | undefined {
  return useLiveQuery(async () => {
    const ts = await db.trackers.orderBy('createdAt').toArray();
    return Promise.all(ts.map(loadData));
  }, []);
}

export function useModel(id: string | undefined): TrackerModel | null | undefined {
  const data = useTrackerData(id);
  const day = useToday();
  return useMemo(() => (data ? buildModel(data, day) : data), [data, day]);
}

export function useModels(): { active: TrackerModel[]; closed: TrackerModel[] } | undefined {
  const all = useAllData();
  const day = useToday();
  return useMemo(() => {
    if (!all) return undefined;
    const models = all.map((d) => buildModel(d, day));
    return { active: models.filter((m) => m.tracker.status === 'active'), closed: models.filter((m) => m.tracker.status === 'closed') };
  }, [all, day]);
}

/** An object URL for a stored photo, revoked when the component unmounts. */
export function usePhotoUrl(id: string | undefined, kind: 'full' | 'thumb' = 'thumb'): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    if (!id) return;
    db.files.get(id).then((f) => {
      if (!alive || !f) return;
      made = URL.createObjectURL(f[kind]);
      setUrl(made);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id, kind]);
  return url;
}

export function useStorageInfo(): { usage: number | null; persisted: boolean | null; refresh: () => void } {
  const [usage, setUsage] = useState<number | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const est = await navigator.storage?.estimate?.();
        const details = (est as { usageDetails?: { indexedDB?: number } } | undefined)?.usageDetails;
        setUsage(details?.indexedDB ?? est?.usage ?? null);
        setPersisted((await navigator.storage?.persisted?.()) ?? null);
      } catch {
        setUsage(null);
      }
    })();
  }, [n]);
  return { usage, persisted, refresh: () => setN((x) => x + 1) };
}
