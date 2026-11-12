// One object with everything a screen needs to know about a tracker today.

import { CONCERNS, type ConcernDef } from '../content/concerns';
import { RESULTS, type Family } from '../content/copy';
import {
  computeClock, nextCheckinDate, openWarnings, packStatus, projectDate, reached, windowsOf,
  type Clock, type OpenWarning, type PackStatus,
} from './clock';
import { daysBetween } from './dates';
import { evaluateLooks, firstPhotos, LOOK_NAMES, pendingLook, type EvaluatedLook, type PendingLook, type ResultCode } from './rules';
import type { Photo, Tracker, TrackerData } from './types';

export interface Status {
  code: ResultCode | 'LOOK_READY' | 'PAUSED' | 'CLOSED';
  title: string;
  family: Family;
}

export interface TrackerModel {
  data: TrackerData;
  tracker: Tracker;
  concern: ConcernDef;
  name: string;
  windows: { early: number; full: number };
  clock: Clock;
  warnings: OpenWarning[];
  pack: PackStatus;
  nextCheckin: string;
  due: boolean;
  pending: PendingLook | null;
  looks: EvaluatedLook[];
  lastLook: EvaluatedLook | null;
  earlyDone: EvaluatedLook | null;
  fullDone: EvaluatedLook | null;
  earlyDate: string | null;
  fullDate: string | null;
  firsts: Record<string, Photo>;
  status: Status;
  today: string;
}

const FINAL: (ResultCode | null)[] = [
  'UNEVEN', 'TOO_EARLY', 'TOO_MUCH', 'SENSE_ONLY', 'BETTER_SO_FAR', 'BETTER_SO_FAR_CHANGED', 'NO_CLEAR_YET',
  'BETTER_WHILE_USING', 'BETTER_CHANGED', 'NO_CLEAR_FULL', 'LOOKS_WORSE',
];

export function concernName(t: Tracker): string {
  return t.concern === 'other' && t.customName ? t.customName : CONCERNS[t.concern].label;
}

export function buildModel(data: TrackerData, today: string): TrackerModel {
  const { tracker, checkins, events } = data;
  const concern = CONCERNS[tracker.concern];
  const windows = windowsOf(tracker);
  const clock = computeClock(tracker, checkins, events, today);
  const warnings = openWarnings(tracker, checkins, events, today);
  const looks = evaluateLooks(data);
  const finals = looks.filter((l) => FINAL.includes(l.ev.code));
  const lastLook = finals.length ? finals[finals.length - 1] : null;
  const earlyDone = finals.find((l) => l.look.kind === 'early') ?? null;
  const fullDone = finals.find((l) => l.look.kind === 'full') ?? null;
  const pending = pendingLook(data, today, looks);
  const nextCheckin = nextCheckinDate(tracker, checkins);
  const pack = packStatus(tracker, today);

  let status: Status;
  if (tracker.status === 'closed') status = { code: 'CLOSED', title: 'Closed', family: 'paused' };
  else if (warnings.length) status = { code: 'CHECK_FIRST', ...RESULTS.CHECK_FIRST };
  else if (clock.paused) status = { code: 'PAUSED', title: 'Paused', family: 'paused' };
  else if (pending && pending.ready) status = { code: 'LOOK_READY', title: `Your ${LOOK_NAMES[pending.kind]} is ready`, family: 'ready' };
  else if (clock.activeCalendarWeeks >= 2 * windows.full && !reached(clock, windows.full)) status = { code: 'UNEVEN', ...RESULTS.UNEVEN };
  else if (!reached(clock, windows.early)) status = { code: 'TOO_EARLY', ...RESULTS.TOO_EARLY };
  else if (pending && !pending.ready) status = { code: 'TOO_EARLY_PHOTOS', ...RESULTS.TOO_EARLY_PHOTOS };
  else if (lastLook && lastLook.ev.code) status = { code: lastLook.ev.code, ...RESULTS[lastLook.ev.code] };
  else status = { code: 'TOO_EARLY', ...RESULTS.TOO_EARLY };

  return {
    data,
    tracker,
    concern,
    name: concernName(tracker),
    windows,
    clock,
    warnings,
    pack,
    nextCheckin,
    due: tracker.status === 'active' && !clock.paused && daysBetween(nextCheckin, today) >= 0,
    pending,
    looks,
    lastLook,
    earlyDone,
    fullDone,
    earlyDate: projectDate(clock, windows.early, today).date,
    fullDate: projectDate(clock, windows.full, today).date,
    firsts: firstPhotos(tracker, data.photos),
    status,
    today,
  };
}
