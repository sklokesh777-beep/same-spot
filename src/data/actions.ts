// Everything that writes to the device's database.

import { addDays } from '../engine/dates';
import type { Checkin, ConcernId, EventType, FollowUp, Look, Photo, QuickId, Tracker, UseId } from '../engine/types';
import { CONCERNS } from '../content/concerns';
import { db, DEFAULT_SETTINGS, uid, type Settings } from './db';
import type { ProcessedPhoto } from './photos';
import { today } from './today';

// ---------- settings ----------

// Set the moment onboarding finishes, before the saved setting reaches the
// screens, so the first tracker screen isn't sent back to the welcome screen.
let onboardedThisSession = false;
export const markOnboarded = () => {
  onboardedThisSession = true;
};
export const isOnboardedThisSession = () => onboardedThisSession;

const APPEARANCE_KEY = 'samespot:appearance';

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await db.settings.get('app')) ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const next = { ...(await getSettings()), ...patch, id: 'app' as const };
  await db.settings.put(next);
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ theme: next.theme, textSize: next.textSize, reduceMotion: next.reduceMotion }));
  } catch {
    /* not available */
  }
}

export function cachedAppearance(): Pick<Settings, 'theme' | 'textSize' | 'reduceMotion'> {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

// ---------- photos ----------

export interface NewPhoto {
  view: string;
  date: string;
  processed: ProcessedPhoto;
  source: Photo['source'];
  lightDiffers?: boolean;
}

async function writePhoto(trackerId: string, p: NewPhoto, checkinId?: string): Promise<string> {
  const id = uid('p');
  const photo: Photo = {
    id,
    trackerId,
    view: p.view,
    date: p.date,
    brightness: p.processed.brightness,
    width: p.processed.width,
    height: p.processed.height,
    lightDiffers: p.lightDiffers || undefined,
    source: p.source,
    checkinId,
    createdAt: Date.now(),
  };
  await db.photos.put(photo);
  await db.files.put({ id, full: p.processed.full, thumb: p.processed.thumb });
  return id;
}

export async function savePhotos(trackerId: string, photos: NewPhoto[], checkinId?: string): Promise<string[]> {
  const ids: string[] = [];
  await db.transaction('rw', db.photos, db.files, async () => {
    for (const p of photos) ids.push(await writePhoto(trackerId, p, checkinId));
  });
  return ids;
}

export async function deletePhoto(id: string): Promise<void> {
  await db.transaction('rw', db.photos, db.files, async () => {
    await db.photos.delete(id);
    await db.files.delete(id);
  });
}

export async function photoBlob(id: string, kind: 'full' | 'thumb'): Promise<Blob | null> {
  const f = await db.files.get(id);
  return f ? f[kind] : null;
}

// ---------- trackers ----------

export interface TrackerDraft {
  concern: ConcernId;
  customName?: string;
  productId: string;
  productName: string;
  startDate: string;
  setupUse: UseId;
  packDays: number;
  packOpened: string;
  interval: 14 | 28;
  photos: NewPhoto[];
}

export async function createTracker(d: TrackerDraft): Promise<string> {
  const id = uid('t');
  const t: Tracker = {
    id,
    concern: d.concern,
    customName: d.concern === 'other' ? d.customName?.trim() || undefined : undefined,
    productId: d.productId,
    productName: d.productName.trim() || 'My product',
    startDate: d.startDate,
    createdDate: today(),
    setupUse: d.setupUse,
    packDays: d.packDays,
    packOpened: d.packOpened,
    views: CONCERNS[d.concern].views.map((v) => v.id),
    interval: d.interval,
    status: 'active',
    createdAt: Date.now(),
  };
  await db.trackers.put(t);
  if (d.photos.length) await savePhotos(id, d.photos);
  if (d.setupUse === 'none') await addEvent(id, 'pause', undefined, today());
  return id;
}

export async function updateTracker(id: string, patch: Partial<Tracker>): Promise<void> {
  await db.trackers.update(id, patch);
}

export async function deleteTracker(id: string): Promise<void> {
  await db.transaction('rw', [db.trackers, db.checkins, db.events, db.photos, db.files, db.looks], async () => {
    const photoIds = (await db.photos.where('trackerId').equals(id).primaryKeys()) as string[];
    await db.files.bulkDelete(photoIds);
    await db.photos.where('trackerId').equals(id).delete();
    await db.checkins.where('trackerId').equals(id).delete();
    await db.events.where('trackerId').equals(id).delete();
    await db.looks.where('trackerId').equals(id).delete();
    await db.trackers.delete(id);
  });
}

export async function closeTracker(id: string, reason: 'done' | 'stopped'): Promise<void> {
  await db.trackers.update(id, { status: 'closed', closedDate: today(), closedReason: reason });
}

export async function reopenTracker(id: string): Promise<void> {
  await db.trackers.update(id, { status: 'active', closedDate: undefined, closedReason: undefined });
}

// ---------- check-ins ----------

export interface CheckinAnswers {
  use: UseId;
  changes: string[];
  warnings: string[];
  followUp?: FollowUp;
  quick?: QuickId;
  note?: string;
}

export async function addCheckin(trackerId: string, a: CheckinAnswers, photos: NewPhoto[] = [], date = today()): Promise<string> {
  const id = uid('c');
  const c: Checkin = {
    id,
    trackerId,
    date,
    use: a.use,
    changes: a.changes,
    warnings: a.warnings,
    followUp: a.followUp,
    quick: a.quick,
    note: a.note?.trim() ? a.note.trim().slice(0, 140) : undefined,
    createdAt: Date.now(),
  };
  await db.checkins.put(c);
  if (photos.length) await savePhotos(trackerId, photos, id);
  return id;
}

export async function updateCheckin(id: string, patch: Partial<Checkin>): Promise<void> {
  await db.checkins.update(id, patch);
}

export async function deleteCheckin(id: string): Promise<void> {
  await db.checkins.delete(id);
}

// ---------- events ----------

export async function addEvent(trackerId: string, type: EventType, code?: string, date = today(), how?: 'settled' | 'doctor'): Promise<string> {
  const id = uid('e');
  await db.events.put({ id, trackerId, date, type, code, how, createdAt: Date.now() });
  return id;
}

export async function deleteEvent(id: string): Promise<void> {
  await db.events.delete(id);
}

export async function pauseTracker(trackerId: string, date = today()): Promise<string> {
  return addEvent(trackerId, 'pause', undefined, date);
}

export async function resumeTracker(trackerId: string, date = today()): Promise<string> {
  return addEvent(trackerId, 'resume', undefined, date);
}

export async function openedNewPack(trackerId: string, date = today()): Promise<string> {
  await db.trackers.update(trackerId, { packOpened: date, packDismissedFor: undefined });
  return addEvent(trackerId, 'pack', undefined, date);
}

export async function dismissPack(trackerId: string, end: string): Promise<void> {
  await db.trackers.update(trackerId, { packDismissedFor: end });
}

export async function closeWarnings(trackerId: string, how: 'settled' | 'doctor'): Promise<string> {
  return addEvent(trackerId, 'warningClosed', undefined, today(), how);
}

// ---------- looks ----------

export async function saveLook(look: Omit<Look, 'id' | 'createdAt'>): Promise<string> {
  const id = uid('l');
  await db.looks.put({ ...look, id, createdAt: Date.now() });
  return id;
}

export async function keepTracking(trackerId: string, wholeWeeksNow: number): Promise<void> {
  await db.trackers.update(trackerId, { extraLookWeeks: wholeWeeksNow + 12, extraSetDate: addDays(today(), 1) });
}

// ---------- everything ----------

export async function deleteEverything(): Promise<void> {
  onboardedThisSession = false;
  await db.transaction('rw', [db.settings, db.trackers, db.checkins, db.events, db.photos, db.files, db.looks], async () => {
    await Promise.all([db.settings.clear(), db.trackers.clear(), db.checkins.clear(), db.events.clear(), db.photos.clear(), db.files.clear(), db.looks.clear()]);
  });
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('samespot:')) localStorage.removeItem(k);
    for (const k of Object.keys(sessionStorage)) if (k.startsWith('samespot:')) sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
