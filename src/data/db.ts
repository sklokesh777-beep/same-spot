import Dexie, { type Table } from 'dexie';
import type { Checkin, Look, Photo, Tracker, TrackerEvent } from '../engine/types';

export interface Settings {
  id: 'app';
  onboarded: boolean;
  ageConfirmed: boolean;
  safariAnyway: boolean;
  theme: 'system' | 'light' | 'dark';
  textSize: 'default' | 'large' | 'xl';
  reduceMotion: boolean;
  blurPreviews: boolean;
  discreetTitles: boolean;
  defaultInterval: 14 | 28;
  backupReminder: 'off' | 'monthly';
  lastBackup?: string;
  backupNudgeDismissed?: string;
  lockHash?: string;
  lockSalt?: string;
}

export interface PhotoFile {
  id: string;
  full: Blob;
  thumb: Blob;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  onboarded: false,
  ageConfirmed: false,
  safariAnyway: false,
  theme: 'system',
  textSize: 'default',
  reduceMotion: false,
  blurPreviews: false,
  discreetTitles: true,
  defaultInterval: 28,
  backupReminder: 'monthly',
};

class SameSpotDB extends Dexie {
  settings!: Table<Settings, string>;
  trackers!: Table<Tracker, string>;
  checkins!: Table<Checkin, string>;
  events!: Table<TrackerEvent, string>;
  photos!: Table<Photo, string>;
  files!: Table<PhotoFile, string>;
  looks!: Table<Look, string>;

  constructor() {
    super('same-spot');
    this.version(1).stores({
      settings: 'id',
      trackers: 'id, status, createdAt',
      checkins: 'id, trackerId, date',
      events: 'id, trackerId, date, type',
      photos: 'id, trackerId, view, date',
      files: 'id',
      looks: 'id, trackerId, date',
    });
  }
}

export const db = new SameSpotDB();

export const ALL_TABLES = ['settings', 'trackers', 'checkins', 'events', 'photos', 'files', 'looks'] as const;

/** Resolves to false when this browser can't save (for some private windows). */
export const dbReady: Promise<boolean> = db
  .open()
  .then(() => true)
  .catch(() => false);

export function uid(prefix: string): string {
  const raw = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${raw.slice(0, 16)}`;
}
