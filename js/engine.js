// The Same Spot engine. Pure functions only: no DOM, no storage, no clock
// reads. Every function takes "today" as an argument so it can be tested.
//
// 1. The real-use clock counts only the weeks she really used the product.
// 2. The schedule sets check-ins at week 2, then every 4 weeks.
// 3. The verdict rules run in a fixed order. The first rule that matches
//    decides, so two rules can never contradict each other.

import { addDays, dayNum, daysBetween, maxDate } from './dates.js';
import { CONCERNS, LIMITS, USE_BY_ID, changeOf } from './config.js';

const quartersOf = (use) => (USE_BY_ID[use] ? USE_BY_ID[use].quarters : 0);

export function sortCheckins(checkins = []) {
  return [...checkins].sort((a, b) =>
    a.date === b.date ? String(a.createdAt || '').localeCompare(String(b.createdAt || '')) : a.date < b.date ? -1 : 1,
  );
}

function pausedDaysWithin(pauses, fromDay, toDay, today) {
  let total = 0;
  for (const p of pauses || []) {
    const ps = dayNum(p.start);
    const pe = p.end ? dayNum(p.end) : dayNum(today);
    const s = Math.max(fromDay, ps);
    const e = Math.min(toDay, pe);
    if (e > s) total += e - s;
  }
  return total;
}

export function isPaused(record, today) {
  return (record.pauses || []).some((p) => p.start <= today && (!p.end || p.end > today));
}

/**
 * The real-use clock.
 * Periods: product start to record start (setup answer); each check-in
 * covers the time since the one before (its own "since last time" answer);
 * the last check-in to today uses the latest answer, provisionally.
 * Each answer counts as most days = 1, about half = 0.5, a few times = 0.25,
 * not at all = 0 weeks per calendar week. Paused days count as zero.
 * Arithmetic runs in "quarter-days" so results like 12.25 weeks are exact.
 */
export function computeClock(record, checkins, today) {
  const list = sortCheckins(checkins).filter((c) => c.date <= today && c.date >= record.recordStart);
  const periods = [];
  const add = (from, to, use, kind) => {
    const f = dayNum(from);
    const t = dayNum(to);
    if (t <= f) return;
    const days = t - f;
    const paused = pausedDaysWithin(record.pauses, f, t, today);
    const active = days - paused;
    const q = quartersOf(use);
    periods.push({ from, to, days, paused, active, use, quarters: q, weeks: (active * q) / 28, kind });
  };

  add(record.productStart, record.recordStart, record.setupUse, 'before');
  let prev = record.recordStart;
  for (const c of list) {
    add(prev, c.date, c.use, 'checkin');
    prev = c.date;
  }
  const latestUse = list.length ? list[list.length - 1].use : record.setupUse;
  add(prev, today, latestUse, 'provisional');

  const calendarDays = Math.max(0, daysBetween(record.productStart, today));
  const pausedTotal = pausedDaysWithin(record.pauses, dayNum(record.productStart), dayNum(today), today);
  const rawQuarterDays = periods.reduce((s, p) => s + p.active * p.quarters, 0);
  // The clock can never pass calendar time.
  const quarterDays = Math.min(rawQuarterDays, calendarDays * 4);

  return {
    quarterDays,
    weeks: quarterDays / 28,
    wholeWeeks: Math.floor(quarterDays / 28),
    calendarDays,
    calendarWeeks: calendarDays / 7,
    activeCalendarDays: calendarDays - pausedTotal,
    activeCalendarWeeks: (calendarDays - pausedTotal) / 7,
    latestUse,
    periods,
  };
}

export function hasReached(clock, weeks) {
  return clock.quarterDays >= Math.round(weeks * 28);
}

export function stageOf(clock, concern) {
  if (hasReached(clock, concern.full)) return 'full';
  if (hasReached(clock, concern.early)) return 'early';
  return 'before';
}

// ---------- schedule ----------

/** Snap a date forward to the check-in schedule: week 2, then weeks 4, 8, 12 ... */
export function snapToSchedule(recordStart, date) {
  const d = daysBetween(recordStart, date);
  if (d <= 14) return addDays(recordStart, 14);
  return addDays(recordStart, 28 * Math.ceil(d / 28));
}

/** The next check-in date. Check-ins less than a week apart never double up. */
export function nextDueDate(record, checkins) {
  const list = sortCheckins(checkins);
  const last = list.length ? list[list.length - 1].date : null;
  const threshold = last ? daysBetween(record.recordStart, last) + 6 : 0;
  if (14 > threshold) return addDays(record.recordStart, 14);
  const k = Math.max(1, Math.floor(threshold / 28) + 1);
  return addDays(record.recordStart, 28 * k);
}

export function checkinKind(record, checkins, date) {
  const prior = sortCheckins(checkins).filter((c) => c.date <= date);
  if (prior.length === 0 && daysBetween(record.recordStart, date) < 21) return 'week2';
  return 'regular';
}

/** Which look, if any, this check-in opens. */
export function lookDueAt(record, clock, date) {
  const cfg = CONCERNS[record.concern];
  const done = record.checkpointsDone || {};
  if (!done.full && hasReached(clock, cfg.full)) return 'full';
  if (!done.early && hasReached(clock, cfg.early)) return 'early';
  if (record.keepTracking && record.extraLookAt != null && !done.extra && hasReached(clock, record.extraLookAt)) return 'extra';
  if (record.photoLookDue && !done.photo && date >= record.photoLookDue) return 'photo';
  return null;
}

/**
 * When will the clock reach a number of weeks of regular use, at her latest
 * reported rhythm? The look itself happens at the first check-in on or after
 * that day. Returns null when the clock is stopped or paused.
 */
export function projectLook(record, checkins, today, targetWeeks) {
  const clock = computeClock(record, checkins, today);
  const nextDue = nextDueDate(record, checkins);
  if (hasReached(clock, targetWeeks)) return { date: maxDate(today, nextDue), reached: true };
  if (isPaused(record, today)) return { date: null, reason: 'paused' };
  const q = quartersOf(clock.latestUse);
  if (q === 0) return { date: null, reason: 'stopped' };
  const remaining = Math.round(targetWeeks * 28) - clock.quarterDays;
  const raw = addDays(today, Math.ceil(remaining / q));
  return { date: maxDate(snapToSchedule(record.recordStart, raw), nextDue), raw, reached: false };
}

export function photoLookDate(record, checkins, baselineDate) {
  const cfg = CONCERNS[record.concern];
  const raw = addDays(baselineDate, cfg.early * 7);
  return maxDate(snapToSchedule(record.recordStart, raw), nextDueDate(record, checkins));
}

export function longestGapDays(record, checkins, upTo) {
  const dates = [record.recordStart, ...sortCheckins(checkins).map((c) => c.date).filter((d) => d <= upTo)];
  let max = 0;
  for (let i = 1; i < dates.length; i++) max = Math.max(max, daysBetween(dates[i - 1], dates[i]));
  return max;
}

/** Week of the trial (since product start) for a date, at least 1. */
export function trialWeek(record, date) {
  return Math.max(1, Math.round(daysBetween(record.productStart, date) / 7));
}

// ---------- changes ----------

/** Distinct changes logged since a date, each with the first week it was logged. */
export function changesSince(record, checkins, sinceDate, upTo) {
  const cfg = CONCERNS[record.concern];
  const seen = new Map();
  for (const c of sortCheckins(checkins)) {
    if (c.date < sinceDate || c.date > upTo) continue;
    for (const code of c.changes || []) {
      if (seen.has(code)) continue;
      const def = changeOf(cfg, code);
      if (!def) continue;
      seen.set(code, { code, type: def.type, date: c.date, week: trialWeek(record, c.date) });
    }
  }
  return [...seen.values()];
}

// ---------- the verdict ----------

export const RULES = [
  { id: '1', label: 'Is a warning sign still open?' },
  { id: '2', label: 'Has twice the full window passed without a full trial?' },
  { id: '3', label: 'Is it before the early look?' },
  { id: '4', label: 'Did too much else change to tell what helped?' },
  { id: '5a', label: 'Is there a first photo to compare with?' },
  { id: '5b', label: 'Are the first photos old enough?' },
  { id: '5c', label: 'Is there a photo pair that can be compared?' },
  { id: '6', label: 'What did the comparison without dates show?' },
];

/**
 * decideVerdict runs the seven rules in strict order.
 * input: {
 *   concern, today, clock,
 *   harmOpen: [codes],
 *   changes: [{code,type,date,week}] logged since product start,
 *   changesSinceBaseline: same shape,
 *   baseline: { date, views: [viewId] } | null,
 *   current: { [viewId]: { date, flagged, flagReason } },
 *   comparison: [{ view, pick }] | null,
 *   sense: answer id | null,
 * }
 * When a rule needs an answer that has not been given yet, the result has
 * needs: 'sense' or 'comparison' and the views to compare.
 */
export function decideVerdict(input) {
  const cfg = CONCERNS[input.concern];
  const clock = input.clock;
  const trace = [];
  const data = {
    x: clock.wholeWeeks,
    n: Math.floor(clock.activeCalendarWeeks),
    early: cfg.early,
    full: cfg.full,
  };
  const stage = stageOf(clock, cfg);
  const done = (code, extra = {}) => ({ code, stage, trace, data: { ...data, ...extra } });
  const note = (id, matched, detail) => trace.push({ id, label: RULES.find((r) => r.id === id).label, matched, detail });

  // Rule 1. Safety comes before any "keep waiting" message.
  const harm = input.harmOpen || [];
  note('1', harm.length > 0, harm.length ? `${harm.length} open` : 'None open');
  if (harm.length) return done('CHECK_FIRST', { harm });

  // Rule 2. A cap so cautious counting can't keep her paying forever.
  const capMatched = clock.activeCalendarWeeks >= 2 * cfg.full && !hasReached(clock, cfg.full);
  note('2', capMatched, `${data.n} of ${2 * cfg.full} calendar weeks; ${data.x} of ${cfg.full} weeks of regular use`);
  if (capMatched) return done('CANT_TELL_UNEVEN');

  const changes = input.changes || [];
  const major = cfg.id === 'hair' ? changes.filter((c) => c.type === 'major') : [];

  // Rule 3. Judging early invites false "no change" verdicts.
  const early = !hasReached(clock, cfg.early);
  note('3', early, `${formatWeeks(clock.weeks)} of ${cfg.early} weeks of regular use`);
  if (early) return done('TOO_EARLY', { major });

  // Rule 4. A major trigger (hair), or three or more relevant changes.
  const causes = changes.filter((c) => c.type === 'cause' || c.type === 'major');
  const tooMuch = major.length > 0 || causes.length >= 3;
  note(
    '4',
    tooMuch,
    major.length ? 'A major trigger was logged' : `${causes.length} relevant change${causes.length === 1 ? '' : 's'} logged (3 or more blocks a verdict)`,
  );
  if (tooMuch) return done('CANT_TELL_CHANGED', { changes: causes, major });

  // Rule 5a. Without a first photo, the reading is her sense only.
  const baselineViews = input.baseline && input.baseline.views ? input.baseline.views : [];
  note('5a', baselineViews.length === 0, baselineViews.length ? `${baselineViews.length} first photo${baselineViews.length === 1 ? '' : 's'}` : 'No first photos');
  if (baselineViews.length === 0) {
    if (!input.sense) return { needs: 'sense', reason: 'no-baseline', stage, trace, data };
    return done('SENSE_ONLY', { sense: input.sense });
  }

  // Rule 5b. Photos need time to show a change, even if the product clock is further along.
  const baseAgeDays = daysBetween(input.baseline.date, input.today);
  const tooYoung = baseAgeDays < cfg.early * 7;
  note('5b', tooYoung, `First photos ${Math.floor(baseAgeDays / 7)} weeks old; the early look needs ${cfg.early}`);
  if (tooYoung) return done('TOO_EARLY_PHOTOS', { baselineDate: input.baseline.date });

  // Rule 5c. Light and hair condition change photos.
  const comparable = [];
  let lightReason = null;
  for (const v of cfg.views) {
    if (!baselineViews.includes(v.id)) continue;
    const cur = input.current && input.current[v.id];
    if (!cur) continue;
    if (daysBetween(cur.date, input.today) > LIMITS.recentPhotoDays) continue;
    if (cur.flagged) {
      if (!lightReason) lightReason = cur.flagReason || 'more-light';
      continue;
    }
    comparable.push(v.id);
  }
  note('5c', comparable.length === 0, `${comparable.length} of ${baselineViews.length} view${baselineViews.length === 1 ? '' : 's'} can be compared`);
  if (comparable.length === 0) {
    if (!input.sense) return { needs: 'sense', reason: 'cant-compare', stage, trace, data };
    return done('CANT_COMPARE', { sense: input.sense, lightReason, noNew: !lightReason });
  }

  // Rule 6. Requiring every pair to agree reduces lucky picks.
  const picks = (input.comparison || []).filter((p) => comparable.includes(p.view));
  if (picks.length < comparable.length) return { needs: 'comparison', views: comparable, stage, trace, data };
  const latest = picks.filter((p) => p.pick === 'latest').length;
  const first = picks.filter((p) => p.pick === 'first').length;
  const outcome = latest === picks.length ? 'better' : first === picks.length ? 'worse' : 'none';
  const sinceBase = (input.changesSinceBaseline || []).filter((c) => c.type === 'cause' || c.type === 'major');
  note('6', true, `Newer photo picked in ${latest} of ${picks.length} pair${picks.length === 1 ? '' : 's'}; first photo in ${first}`);
  const extra = { outcome, latest, first, pairs: picks.length, changes: sinceBase };
  if (outcome === 'worse') return done('LOOKS_WORSE', extra);
  if (stage === 'full') {
    if (outcome === 'better') return done(sinceBase.length ? 'BETTER_BUT_CHANGED' : 'BETTER_WHILE_USING', extra);
    return done('NO_CLEAR_FULL', extra);
  }
  if (outcome === 'better') return done(sinceBase.length ? 'BETTER_SO_FAR_CHANGED' : 'BETTER_SO_FAR', extra);
  return done('NO_CLEAR_YET', extra);
}

/** 12.25 stays "12.25"; 9 stays "9"; 9.142857 becomes "9.14". */
export function formatWeeks(w) {
  return String(Math.round(w * 100) / 100);
}

/**
 * Build the verdict input from stored data and run the rules.
 * record, checkins and photos are plain objects (photos without image data).
 * extra may carry comparison/sense answers collected at a checkpoint.
 */
export function evaluate(record, checkins, photos, today, extra = {}) {
  const cfg = CONCERNS[record.concern];
  const clock = computeClock(record, checkins, today);
  const harmOpen = (record.harmOpen || []).map((h) => h.code);
  const changes = changesSince(record, checkins, record.productStart, today);
  const baselinePhotos = (photos || []).filter((p) => p.role === 'baseline');
  const baselineDate = record.baselineDate || (baselinePhotos.length ? baselinePhotos[0].date : null);
  const baseline = baselinePhotos.length
    ? { date: baselineDate, views: [...new Set(baselinePhotos.map((p) => p.view))] }
    : null;
  const current = {};
  for (const p of photos || []) {
    if (p.role === 'baseline' || p.date > today) continue;
    const prev = current[p.view];
    if (!prev || p.date > prev.date || (p.date === prev.date && String(p.createdAt) > String(prev.createdAt))) current[p.view] = p;
  }
  const changesSinceBaseline = baseline ? changes.filter((c) => c.date >= baseline.date) : changes;
  const result = decideVerdict({
    concern: record.concern,
    today,
    clock,
    harmOpen,
    changes,
    changesSinceBaseline,
    baseline,
    current,
    comparison: extra.comparison || null,
    sense: extra.sense || null,
  });

  const dates = {
    earlyLook: projectLook(record, checkins, today, cfg.early),
    fullLook: projectLook(record, checkins, today, cfg.full),
    nextDue: nextDueDate(record, checkins),
    firstPhotoLook: photoLookDate(record, checkins, today),
    photoLook: baseline ? photoLookDate(record, checkins, baseline.date) : null,
  };
  const gap = longestGapDays(record, checkins, today);
  return { ...result, clock, dates, baseline, longGap: gap > LIMITS.longGapDays, cfg };
}

/**
 * The status shown on Home between looks. Rules 1 to 3 are live; after the
 * early look starts, Home shows the latest look's verdict.
 */
export function liveStatus(record, checkins, photos, today) {
  const cfg = CONCERNS[record.concern];
  const clock = computeClock(record, checkins, today);
  const harmOpen = (record.harmOpen || []).map((h) => h.code);
  const look = lookDueAt(record, clock, today);
  if (harmOpen.length) return { kind: 'verdict', code: 'CHECK_FIRST', clock };
  if (record.pendingLook) return { kind: 'look-ready', look: record.pendingLook.kind, clock };
  if (clock.activeCalendarWeeks >= 2 * cfg.full && !hasReached(clock, cfg.full)) return { kind: 'verdict', code: 'CANT_TELL_UNEVEN', clock };
  if (!hasReached(clock, cfg.early)) return { kind: 'verdict', code: 'TOO_EARLY', clock };
  if (look) return { kind: 'look-ready', look, clock };
  if (record.lastVerdict) return { kind: 'verdict', code: record.lastVerdict.code, clock, date: record.lastVerdict.date };
  return { kind: 'verdict', code: 'TOO_EARLY', clock };
}

/** Estimated pack finish date, and whether the pack banner should show. */
export function packStatus(record, today) {
  if (!record.packOpened || !record.packDays) return null;
  const finish = addDays(record.packOpened, record.packDays);
  const daysLeft = daysBetween(today, finish);
  const show = daysLeft <= LIMITS.packBannerDays && record.packDismissedFor !== finish;
  return { finish, daysLeft, show };
}
