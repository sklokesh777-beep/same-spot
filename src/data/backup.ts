// One backup file with every tracker, check-in and photo. It can be
// protected with a password (AES-GCM). Import checks the file first.

import { db, type PhotoFile } from './db';
import { decryptText, encryptText, fromBase64, toBase64 } from './crypto';
import { markOnboarded, saveSettings } from './actions';
import { today } from './today';

const FORMAT = 1;

interface Payload {
  settings: unknown[];
  trackers: unknown[];
  checkins: unknown[];
  events: unknown[];
  photos: unknown[];
  looks: unknown[];
  files: { id: string; full: string; thumb: string; type: string }[];
}

interface BackupFile {
  app: 'same-spot';
  format: number;
  exportedAt: string;
  locked: boolean;
  payload?: Payload;
  box?: { salt: string; iv: string; data: string };
}

async function blobToB64(b: Blob): Promise<string> {
  return toBase64(new Uint8Array(await b.arrayBuffer()));
}

export async function makeBackup(password?: string): Promise<Blob> {
  const [settings, trackers, checkins, events, photos, looks, files] = await Promise.all([
    db.settings.toArray(),
    db.trackers.toArray(),
    db.checkins.toArray(),
    db.events.toArray(),
    db.photos.toArray(),
    db.looks.toArray(),
    db.files.toArray(),
  ]);
  const payload: Payload = {
    // The lock code is never copied into a backup.
    settings: settings.map(({ lockHash, lockSalt, ...rest }) => rest),
    trackers,
    checkins,
    events,
    photos,
    looks,
    files: await Promise.all(files.map(async (f) => ({ id: f.id, full: await blobToB64(f.full), thumb: await blobToB64(f.thumb), type: f.full.type || 'image/jpeg' }))),
  };
  const file: BackupFile = { app: 'same-spot', format: FORMAT, exportedAt: new Date().toISOString(), locked: !!password };
  if (password) file.box = await encryptText(JSON.stringify(payload), password);
  else file.payload = payload;
  await saveSettings({ lastBackup: today() });
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export class BackupError extends Error {}

export function readBackupHeader(text: string): BackupFile {
  let obj: BackupFile;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not a Same Spot backup.');
  }
  if (!obj || obj.app !== 'same-spot') throw new BackupError('That file is not a Same Spot backup.');
  if (obj.format > FORMAT) throw new BackupError('This backup is from a newer version of Same Spot. Update the app and try again.');
  if (obj.locked ? !obj.box : !obj.payload) throw new BackupError('This backup file is incomplete.');
  return obj;
}

export async function openBackup(file: BackupFile, password?: string): Promise<Payload> {
  let payload: Payload;
  if (file.locked) {
    if (!password) throw new BackupError('This backup needs its password.');
    try {
      payload = JSON.parse(await decryptText(file.box!, password));
    } catch {
      throw new BackupError("That password doesn't open this backup.");
    }
  } else payload = file.payload!;
  for (const k of ['trackers', 'checkins', 'events', 'photos', 'looks', 'files'] as const) {
    if (!Array.isArray(payload[k])) throw new BackupError('This backup file is damaged.');
  }
  return payload;
}

export function summarise(p: Payload): { trackers: number; photos: number } {
  return { trackers: p.trackers.length, photos: p.photos.length };
}

export async function restoreBackup(p: Payload): Promise<void> {
  const files: PhotoFile[] = p.files.map((f) => ({
    id: f.id,
    full: new Blob([fromBase64(f.full)], { type: f.type }),
    thumb: new Blob([fromBase64(f.thumb)], { type: f.type }),
  }));
  const current = await db.settings.get('app');
  await db.transaction('rw', [db.settings, db.trackers, db.checkins, db.events, db.photos, db.files, db.looks], async () => {
    await Promise.all([db.trackers.clear(), db.checkins.clear(), db.events.clear(), db.photos.clear(), db.files.clear(), db.looks.clear()]);
    // Keep this device's lock and appearance; take the rest from the backup.
    const incoming = (p.settings[0] as Record<string, unknown> | undefined) ?? {};
    await db.settings.put({ ...(current ?? {}), ...incoming, lockHash: current?.lockHash, lockSalt: current?.lockSalt, id: 'app', onboarded: true, ageConfirmed: true } as never);
    await db.trackers.bulkPut(p.trackers as never[]);
    await db.checkins.bulkPut(p.checkins as never[]);
    await db.events.bulkPut(p.events as never[]);
    await db.photos.bulkPut(p.photos as never[]);
    await db.looks.bulkPut(p.looks as never[]);
    await db.files.bulkPut(files);
  });
  markOnboarded();
}
