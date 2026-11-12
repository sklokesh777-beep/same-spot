// The new-tracker answers while the flow is open. Text answers survive a
// reload (sessionStorage); photos stay in memory until the tracker is saved.

import { useSyncExternalStore } from 'react';
import type { ConcernId, Photo, UseId } from '../../engine/types';
import type { ProcessedPhoto } from '../../data/photos';

export interface DraftPhoto {
  key: string;
  view: string;
  slot: 'older' | 'today';
  date: string;
  processed: ProcessedPhoto;
  source: Photo['source'];
  lightDiffers?: boolean;
}

export interface Draft {
  concern?: ConcernId;
  customName: string;
  productId?: string;
  productName: string;
  startChoice?: 'today' | 'earlier';
  startChip?: string;
  startDate?: string;
  setupUse?: UseId;
  packDays: number;
  packChoice: 'today' | 'earlier';
  packOpened?: string;
  interval: 14 | 28;
  restartFrom?: string;
  createdId?: string;
  photos: DraftPhoto[];
}

const KEY = 'samespot:draft';

const blank = (): Draft => ({ customName: '', productName: '', packDays: 30, packChoice: 'today', interval: 28, photos: [] });

function load(): Draft {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return { ...blank(), ...JSON.parse(raw), photos: [] };
  } catch {
    /* ignore */
  }
  return blank();
}

let draft: Draft = load();
const listeners = new Set<() => void>();

function save() {
  try {
    const { photos, ...rest } = draft;
    sessionStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function updateDraft(patch: Partial<Draft>) {
  draft = { ...draft, ...patch };
  save();
}

export function resetDraft(init: Partial<Draft> = {}) {
  for (const p of draft.photos) URL.revokeObjectURL(p.processed.previewUrl);
  draft = { ...blank(), ...init };
  save();
}

export function getDraft(): Draft {
  return draft;
}

export function useDraft(): Draft {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
  );
}
