// The one place the app asks "what day is it?". Settings > Advanced can set
// a different date so later check-ins and looks can be tried today.

import { useSyncExternalStore } from 'react';
import { isDateStr, localDateStr } from '../engine/dates';

const KEY = 'samespot:today';
const listeners = new Set<() => void>();
let lastReal = localDateStr();

function readOverride(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return isDateStr(v) ? v : null;
  } catch {
    return null;
  }
}

let override = readOverride();

function emit() {
  for (const l of listeners) l();
}

export function today(): string {
  return override ?? localDateStr();
}

export function dateOverride(): string | null {
  return override;
}

export function setDateOverride(date: string | null) {
  override = date && isDateStr(date) && date !== localDateStr() ? date : null;
  try {
    if (override) localStorage.setItem(KEY, override);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage not available */
  }
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// When the real date rolls over (phone left open overnight), refresh.
if (typeof document !== 'undefined') {
  const check = () => {
    const now = localDateStr();
    if (now !== lastReal) {
      lastReal = now;
      emit();
    }
  };
  document.addEventListener('visibilitychange', check);
  setInterval(check, 60_000);
}

export function useToday(): string {
  return useSyncExternalStore(subscribe, today, today);
}

export function useDateOverride(): string | null {
  return useSyncExternalStore(subscribe, dateOverride, dateOverride);
}
