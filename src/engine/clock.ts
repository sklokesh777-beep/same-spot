// The real-use clock, the check-in schedule, pauses, warning signs and
// logged changes. Pure functions: every one takes "today" as an argument.

import { CONCERNS, changeOf, warningOf, type ChangeType } from '../content/concerns';
import { addDays, dayNum, daysBetween, weekOf } from './dates';
import type { Checkin, Tracker, TrackerEvent, UseId } from './types';

/** Use per day in quarter-days, so sums stay exact: most days = 4/4 of a day. */
export const QUARTERS: Record<UseId, number> = { most: 4, half: 2, few: 1, none: 0 };

export function windowsOf(tracker: Tracker): { early: number; full: number } {
  const c = CONCERNS[tracker.concern];
  const full = tracker.fullWeeks && tracker.fullWeeks > 0 ? Math.round(tracker.fullWeeks) : c.full;
  return { early: Math.min(c.early, full), full };
}

export function sortByDate<T extends { date: string; createdAt: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
}

// ---------- pauses ----------

export interface Range {
  from: string;
  to: string | null;
}

export function pauseRanges(events: TrackerEvent[]): Range[] {
  const ranges: Range[] = [];
  let open: string | null = null;
  for (const e of sortByDate(events)) {
    if (e.type === 'pause' && open === null) open = e.date;
    else if (e.type === 'resume' && open !== null) {
      if (e.date > open) ranges.push({ from: open, to: e.date });
      open = null;
    }
  }
  if (open !== null) ranges.push({ from: open, to: null });
  return ranges;
}

export function isPausedOn(ranges: Range[], date: string): boolean {
  return ranges.some((r) => r.from <= date && (r.to === null || date < r.to));
}

function pausedDaysIn(ranges: Range[], from: number, to: number, today: number): number {
  let total = 0;
  for (const r of ranges) {
    const s = Math.max(from, dayNum(r.from));
    const e = Math.min(to, r.to ? dayNum(r.to) : today);
    if (e > s) total += e - s;
  }
  return total;
}

// ---------- the clock ----------

export interface Period {
  from: string;
  to: string;
  days: number;
  pausedDays: number;
  use: UseId;
  quarterDays: number;
  kind: 'before' | 'checkin' | 'since';
}

export interface Clock {
  quarterDays: number;
  /** Weeks of real use, exact. */
  weeks: number;
  wholeWeeks: number;
  calendarDays: number;
  calendarWeeks: number;
  pausedDays: number;
  activeCalendarDays: number;
  activeCalendarWeeks: number;
  periods: Period[];
  latestUse: UseId;
  paused: boolean;
  /** Quarter-days added per calendar day at the current rhythm (0 when paused). */
  rate: number;
  /** Share of active days counted, 0 to 1. */
  share: number;
}

export function computeClock(tracker: Tracker, checkins: Checkin[], events: TrackerEvent[], today: string): Clock {
  const ranges = pauseRanges(events.filter((e) => e.date <= today));
  const todayNum = dayNum(today);
  const list = sortByDate(checkins).filter((c) => c.date <= today);
  const periods: Period[] = [];

  const add = (from: string, to: string, use: UseId, kind: Period['kind']) => {
    const f = dayNum(from);
    const t = Math.min(dayNum(to), todayNum);
    if (t <= f) return;
    const days = t - f;
    const pausedDays = pausedDaysIn(ranges, f, t, todayNum);
    periods.push({ from, to, days, pausedDays, use, quarterDays: (days - pausedDays) * QUARTERS[use], kind });
  };

  const start = tracker.startDate;
  const created = tracker.createdDate > start ? tracker.createdDate : start;
  add(start, created, tracker.setupUse, 'before');
  let prev = created;
  let latestUse: UseId = tracker.setupUse;
  for (const c of list) {
    if (c.date < prev) continue;
    add(prev, c.date, c.use, 'checkin');
    prev = c.date;
    latestUse = c.use;
  }
  add(prev, today, latestUse, 'since');

  const calendarDays = Math.max(0, daysBetween(start, today));
  const pausedDays = pausedDaysIn(ranges, dayNum(start), todayNum, todayNum);
  const activeCalendarDays = Math.max(0, calendarDays - pausedDays);
  const raw = periods.reduce((s, p) => s + p.quarterDays, 0);
  // Real use can never be more than calendar time.
  const quarterDays = Math.min(raw, activeCalendarDays * 4);
  const paused = isPausedOn(ranges, today);

  return {
    quarterDays,
    weeks: quarterDays / 28,
    wholeWeeks: Math.floor(quarterDays / 28),
    calendarDays,
    calendarWeeks: calendarDays / 7,
    pausedDays,
    activeCalendarDays,
    activeCalendarWeeks: activeCalendarDays / 7,
    periods,
    latestUse,
    paused,
    rate: paused ? 0 : QUARTERS[latestUse],
    share: activeCalendarDays ? quarterDays / (activeCalendarDays * 4) : 0,
  };
}

export function reached(clock: Clock, weeks: number): boolean {
  return clock.quarterDays >= Math.round(weeks * 28);
}

/** When will the clock reach a window at her current rhythm? */
export function projectDate(clock: Clock, targetWeeks: number, today: string): { date: string | null; reached: boolean } {
  const need = Math.round(targetWeeks * 28) - clock.quarterDays;
  if (need <= 0) return { date: today, reached: true };
  if (clock.rate <= 0) return { date: null, reached: false };
  return { date: addDays(today, Math.ceil(need / clock.rate)), reached: false };
}

export function shareLabel(share: number): string {
  if (share >= 0.75) return 'used most days';
  if (share >= 0.4) return 'used about half the days';
  if (share > 0) return 'used once in a while';
  return 'not used yet';
}

// ---------- schedule ----------

export function lastCheckin(checkins: Checkin[], upTo?: string): Checkin | null {
  const list = sortByDate(checkins).filter((c) => !upTo || c.date <= upTo);
  return list.length ? list[list.length - 1] : null;
}

/** First check-in 14 days after the tracker starts, then every interval from the last one. */
export function nextCheckinDate(tracker: Tracker, checkins: Checkin[]): string {
  const last = lastCheckin(checkins);
  return last ? addDays(last.date, tracker.interval) : addDays(tracker.createdDate, 14);
}

// ---------- warning signs ----------

export interface OpenWarning {
  code: string;
  label: string;
  phrase: string;
  group: string;
  date: string;
}

export function openWarnings(tracker: Tracker, checkins: Checkin[], events: TrackerEvent[], upTo: string): OpenWarning[] {
  type Item = { date: string; createdAt: number; c?: Checkin; e?: TrackerEvent };
  const items: Item[] = [
    ...checkins.filter((c) => c.date <= upTo).map((c) => ({ date: c.date, createdAt: c.createdAt, c })),
    ...events
      .filter((e) => e.date <= upTo && (e.type === 'warning' || e.type === 'warningClosed'))
      .map((e) => ({ date: e.date, createdAt: e.createdAt, e })),
  ];
  const open = new Map<string, string>();
  for (const it of sortByDate(items)) {
    if (it.c) {
      if (it.c.followUp === 'settled' || it.c.followUp === 'doctor') open.clear();
      for (const w of it.c.warnings) if (!open.has(w)) open.set(w, it.c.date);
    } else if (it.e) {
      if (it.e.type === 'warningClosed') open.clear();
      else if (it.e.code && !open.has(it.e.code)) open.set(it.e.code, it.e.date);
    }
  }
  const out: OpenWarning[] = [];
  for (const [code, date] of open) {
    const w = warningOf(tracker.concern, code);
    if (w) out.push({ code, label: w.label, phrase: w.phrase, group: w.group, date });
  }
  return out;
}

// ---------- logged changes ----------

export interface LoggedChange {
  code: string;
  label: string;
  phrase: string;
  type: ChangeType;
  date: string;
  week: number;
}

/** Distinct changes logged between two dates, each with the week it was first logged. */
export function changesBetween(tracker: Tracker, checkins: Checkin[], events: TrackerEvent[], from: string, upTo: string): LoggedChange[] {
  const entries: { date: string; createdAt: number; codes: string[] }[] = [
    ...checkins.map((c) => ({ date: c.date, createdAt: c.createdAt, codes: c.changes })),
    ...events.filter((e) => e.type === 'change' && e.code).map((e) => ({ date: e.date, createdAt: e.createdAt, codes: [e.code as string] })),
  ];
  const seen = new Map<string, LoggedChange>();
  for (const en of sortByDate(entries)) {
    if (en.date < from || en.date > upTo) continue;
    for (const code of en.codes) {
      if (seen.has(code)) continue;
      const def = changeOf(tracker.concern, code);
      if (!def) continue;
      seen.set(code, { code, label: def.label, phrase: def.phrase, type: def.type, date: en.date, week: weekOf(tracker.startDate, en.date) });
    }
  }
  return [...seen.values()];
}

// ---------- pack ----------

export interface PackStatus {
  end: string;
  daysLeft: number;
  show: boolean;
}

export function packStatus(tracker: Tracker, today: string): PackStatus {
  const end = addDays(tracker.packOpened, tracker.packDays);
  const daysLeft = daysBetween(today, end);
  const show = tracker.status === 'active' && daysLeft <= 5 && tracker.packDismissedFor !== end;
  return { end, daysLeft, show };
}
