// The result rules. They run in a fixed order and the first match decides,
// so two rules can never contradict each other.

import { CONCERNS } from '../content/concerns';
import {
  changesBetween, computeClock, openWarnings, projectDate, reached, sortByDate, windowsOf,
  type Clock, type LoggedChange, type OpenWarning,
} from './clock';
import { addDays, daysBetween, formatDate, minDate } from './dates';
import type { Look, LookKind, LookPick, Photo, QuickId, Tracker, TrackerData } from './types';

export type ResultCode =
  | 'CHECK_FIRST'
  | 'UNEVEN'
  | 'TOO_EARLY'
  | 'TOO_MUCH'
  | 'SENSE_ONLY'
  | 'TOO_EARLY_PHOTOS'
  | 'CANT_COMPARE'
  | 'BETTER_SO_FAR'
  | 'BETTER_SO_FAR_CHANGED'
  | 'NO_CLEAR_YET'
  | 'BETTER_WHILE_USING'
  | 'BETTER_CHANGED'
  | 'NO_CLEAR_FULL'
  | 'LOOKS_WORSE';

/** Photos stay "recent" for a look this many days. */
export const RECENT_DAYS = 14;

export interface CheckItem {
  ok: boolean;
  label: string;
}

export interface Evaluation {
  code: ResultCode | null;
  needs?: 'sense' | 'photos' | 'picks';
  /** Views whose first photo is old enough but whose latest photo is not recent. */
  staleViews: string[];
  /** Views that can be compared now. */
  compareViews: string[];
  checks: CheckItem[];
  stage: 'early' | 'full';
  clock: Clock;
  windows: { early: number; full: number };
  warnings: OpenWarning[];
  changes: LoggedChange[];
  changesSinceFirst: LoggedChange[];
  firstDate: string | null;
  photoReadyDate: string | null;
  earlyDate: string | null;
  fullDate: string | null;
  latest: number;
  first: number;
  pairs: number;
  lightDiffers: boolean;
  sense?: QuickId;
  today: string;
}

// ---------- photos ----------

export function photosOf(tracker: Tracker, photos: Photo[]): Photo[] {
  return sortByDate(photos.filter((p) => tracker.views.includes(p.view)));
}

/** The first photo of each view: the one taken earliest. */
export function firstPhotos(tracker: Tracker, photos: Photo[]): Record<string, Photo> {
  const out: Record<string, Photo> = {};
  for (const p of photosOf(tracker, photos)) if (!out[p.view]) out[p.view] = p;
  return out;
}

/** The latest photo of each view up to a date (it can be the first photo). */
export function latestPhotos(tracker: Tracker, photos: Photo[], upTo: string): Record<string, Photo> {
  const out: Record<string, Photo> = {};
  for (const p of photosOf(tracker, photos)) if (p.date <= upTo) out[p.view] = p;
  return out;
}

/** The latest photo of each view that is newer than the first and taken in the last 14 days. */
export function currentPhotos(tracker: Tracker, photos: Photo[], today: string): Record<string, Photo> {
  const first = firstPhotos(tracker, photos);
  const latest = latestPhotos(tracker, photos, today);
  const out: Record<string, Photo> = {};
  for (const v of tracker.views) {
    const l = latest[v];
    if (!l || !first[v] || l.id === first[v].id) continue;
    const age = daysBetween(l.date, today);
    if (age >= 0 && age <= RECENT_DAYS) out[v] = l;
  }
  return out;
}

export function pickMeaning(p: LookPick): 'latest' | 'first' | 'same' {
  if (p.pick === 'same') return 'same';
  return (p.pick === 'A') === p.latestOnLeft ? 'latest' : 'first';
}

const changeText = (c: LoggedChange) => `${c.phrase} (week ${c.week})`;

function listText(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// ---------- evaluation ----------

export interface EvalInput {
  data: TrackerData;
  today: string;
  picks?: LookPick[];
  sense?: QuickId;
  skippedPhotos?: boolean;
}

export function evaluate({ data, today, picks, sense, skippedPhotos }: EvalInput): Evaluation {
  const { tracker, checkins, events, photos } = data;
  const clock = computeClock(tracker, checkins, events, today);
  const windows = windowsOf(tracker);
  const warnings = openWarnings(tracker, checkins, events, today);
  const changes = changesBetween(tracker, checkins, events, tracker.startDate, today);
  const stage: 'early' | 'full' = reached(clock, windows.full) ? 'full' : 'early';
  const checks: CheckItem[] = [];
  const base: Evaluation = {
    code: null,
    staleViews: [],
    compareViews: [],
    checks,
    stage,
    clock,
    windows,
    warnings,
    changes,
    changesSinceFirst: [],
    firstDate: null,
    photoReadyDate: null,
    earlyDate: projectDate(clock, windows.early, today).date,
    fullDate: projectDate(clock, windows.full, today).date,
    latest: 0,
    first: 0,
    pairs: 0,
    lightDiffers: false,
    sense,
    today,
  };
  const done = (code: ResultCode, extra: Partial<Evaluation> = {}): Evaluation => ({ ...base, ...extra, code });

  // Rule 1. A warning sign comes before any "keep going".
  if (warnings.length) {
    checks.push({ ok: false, label: `Warning sign: ${listText(warnings.map((w) => w.phrase))}` });
    return done('CHECK_FIRST');
  }
  checks.push({ ok: true, label: 'No warning signs' });

  // Rule 2. A cap, so light use can't keep her waiting for ever.
  if (clock.activeCalendarWeeks >= 2 * windows.full && !reached(clock, windows.full)) {
    checks.push({ ok: false, label: `${clock.wholeWeeks} weeks of real use in ${Math.floor(clock.activeCalendarWeeks)} calendar weeks` });
    return done('UNEVEN');
  }

  // Rule 3. Judging too early invites a false "no change".
  if (!reached(clock, windows.early)) {
    checks.push({ ok: false, label: `${clock.wholeWeeks} of ${windows.early} weeks of real use for the early look` });
    return done('TOO_EARLY');
  }
  const target = stage === 'full' ? windows.full : windows.early;
  checks.push({
    ok: true,
    label:
      clock.wholeWeeks > target
        ? `${clock.wholeWeeks} weeks of real use (the ${stage} look is at ${target})`
        : `${clock.wholeWeeks} of ${target} weeks of real use`,
  });

  // Rule 4. Too much else changed to tell what helped.
  const causes = changes.filter((c) => c.type !== 'photo');
  const major = tracker.concern === 'hair' ? causes.filter((c) => c.type === 'major') : [];
  if (major.length || causes.length >= 3) {
    checks.push({ ok: false, label: `${causes.length} other change${causes.length === 1 ? '' : 's'}: ${listText(causes.map(changeText))}` });
    return done('TOO_MUCH');
  }
  checks.push({
    ok: true,
    label: causes.length ? `${causes.length} other change${causes.length === 1 ? '' : 's'}: ${listText(causes.map(changeText))}` : 'No other changes logged',
  });

  // Rule 5. The photos must be able to show a change.
  const firsts = firstPhotos(tracker, photos);
  const firstViews = tracker.views.filter((v) => firsts[v]);
  if (!firstViews.length) {
    checks.push({ ok: false, label: 'No first photos' });
    if (!sense) return { ...base, needs: 'sense' };
    return done('SENSE_ONLY');
  }
  const earliestFirst = firstViews.map((v) => firsts[v].date).reduce(minDate);
  const oldEnough = firstViews.filter((v) => daysBetween(firsts[v].date, today) >= windows.early * 7);
  if (!oldEnough.length) {
    const ready = firstViews.map((v) => addDays(firsts[v].date, windows.early * 7)).reduce(minDate);
    checks.push({ ok: false, label: `First photos from ${formatDate(earliestFirst, { ref: today })}, need ${windows.early} weeks` });
    return done('TOO_EARLY_PHOTOS', { firstDate: earliestFirst, photoReadyDate: ready });
  }
  const firstDate = oldEnough.map((v) => firsts[v].date).reduce(minDate);
  checks.push({ ok: true, label: `First photos from ${formatDate(firstDate, { ref: today })}` });
  const changesSinceFirst = causes.filter((c) => c.date >= firstDate);
  const photoById = new Map(photos.map((p) => [p.id, p]));

  let compareViews: string[];
  let usedPicks: LookPick[] = [];
  if (picks && picks.length) {
    usedPicks = picks.filter((p) => tracker.views.includes(p.view));
    compareViews = usedPicks.map((p) => p.view);
  } else {
    const current = currentPhotos(tracker, photos, today);
    compareViews = oldEnough.filter((v) => current[v]);
    const staleViews = oldEnough.filter((v) => !current[v]);
    if (staleViews.length && !skippedPhotos) {
      return { ...base, needs: 'photos', staleViews, compareViews, firstDate, changesSinceFirst };
    }
    if (!compareViews.length) {
      checks.push({ ok: false, label: 'No recent photo to compare' });
      return done('CANT_COMPARE', { firstDate, changesSinceFirst });
    }
    return { ...base, needs: 'picks', compareViews, staleViews, firstDate, changesSinceFirst };
  }
  if (!usedPicks.length) {
    checks.push({ ok: false, label: 'No recent photo to compare' });
    return done('CANT_COMPARE', { firstDate, changesSinceFirst });
  }
  checks.push({ ok: true, label: `${usedPicks.length} of ${oldEnough.length} views compared` });

  // Rule 6. The comparison without dates.
  const meanings = usedPicks.map(pickMeaning);
  const latest = meanings.filter((m) => m === 'latest').length;
  const first = meanings.filter((m) => m === 'first').length;
  const pairs = usedPicks.length;
  const lightDiffers = usedPicks.some((p) => photoById.get(p.firstId)?.lightDiffers || photoById.get(p.latestId)?.lightDiffers);
  checks.push({ ok: latest === pairs, label: `Newer photo picked in ${latest} of ${pairs} pair${pairs === 1 ? '' : 's'}` });
  const extra = { firstDate, changesSinceFirst, latest, first, pairs, lightDiffers, compareViews };
  const changed = changesSinceFirst.length > 0;
  if (latest === pairs) {
    if (stage === 'full') return done(changed ? 'BETTER_CHANGED' : 'BETTER_WHILE_USING', extra);
    return done(changed ? 'BETTER_SO_FAR_CHANGED' : 'BETTER_SO_FAR', extra);
  }
  if (first === pairs) return done('LOOKS_WORSE', extra);
  return done(stage === 'full' ? 'NO_CLEAR_FULL' : 'NO_CLEAR_YET', extra);
}

// ---------- looks ----------

/** Results that end a look. The others ask her to come back. */
const RETRY: (ResultCode | null)[] = [null, 'TOO_EARLY_PHOTOS', 'CANT_COMPARE', 'CHECK_FIRST'];

export interface EvaluatedLook {
  look: Look;
  ev: Evaluation;
}

export function evaluateLooks(data: TrackerData): EvaluatedLook[] {
  return sortByDate(data.looks).map((look) => {
    const upTo: TrackerData = {
      ...data,
      checkins: data.checkins.filter((c) => c.date <= look.date),
      events: data.events.filter((e) => e.date <= look.date),
      photos: data.photos.filter((p) => p.date <= look.date),
    };
    return {
      look,
      ev: evaluate({ data: upTo, today: look.date, picks: look.picks, sense: look.sense, skippedPhotos: look.skippedPhotos }),
    };
  });
}

export interface PendingLook {
  kind: LookKind;
  ready: boolean;
  waitUntil: string | null;
}

export function pendingLook(data: TrackerData, today: string, looks: EvaluatedLook[] = evaluateLooks(data)): PendingLook | null {
  const { tracker } = data;
  if (tracker.status !== 'active') return null;
  const clock = computeClock(tracker, data.checkins, data.events, today);
  const w = windowsOf(tracker);
  const counted = (kind: LookKind) =>
    looks.some((l) => l.look.kind === kind && !RETRY.includes(l.ev.code) && (kind !== 'extra' || !tracker.extraSetDate || l.look.date >= tracker.extraSetDate));

  let kind: LookKind | null = null;
  if (reached(clock, w.full) && !counted('full')) kind = 'full';
  else if (reached(clock, w.early) && !counted('early') && !counted('full')) kind = 'early';
  else if (tracker.extraLookWeeks && reached(clock, tracker.extraLookWeeks) && !counted('extra')) kind = 'extra';
  if (!kind) return null;

  const attempts = looks.filter((l) => l.look.kind === kind);
  const last = attempts[attempts.length - 1];
  if (last && last.ev.code === 'TOO_EARLY_PHOTOS' && last.ev.photoReadyDate && today < last.ev.photoReadyDate) {
    return { kind, ready: false, waitUntil: last.ev.photoReadyDate };
  }
  return { kind, ready: true, waitUntil: null };
}

export const LOOK_NAMES: Record<LookKind, string> = { early: 'early look', full: 'full look', extra: 'next look' };

export function concernWindowsText(tracker: Tracker): string {
  const w = windowsOf(tracker);
  return `Early look at ${w.early} weeks, full look at ${w.full}`;
}

export { CONCERNS };
