import { describe, expect, test } from 'vitest';
import { computeClock } from './clock';
import { addDays, daysBetween, formatDate } from './dates';
import { evaluate, pendingLook } from './rules';
import type { Checkin, LookPick, Photo, Tracker, TrackerData, TrackerEvent, UseId } from './types';

const TODAY = '2027-03-02';
let seq = 0;
const id = (p: string) => `${p}${++seq}`;

function tracker(over: Partial<Tracker> = {}): Tracker {
  const concern = over.concern ?? 'underarm';
  const views = concern === 'hair' ? ['parting', 'hairline'] : concern === 'neck' ? ['neck', 'elbow'] : ['left', 'right'];
  return {
    id: 't1',
    concern,
    productId: 'other',
    productName: 'Test product',
    startDate: TODAY,
    createdDate: TODAY,
    setupUse: 'most',
    packDays: 30,
    packOpened: TODAY,
    views,
    interval: 28,
    status: 'active',
    createdAt: 0,
    ...over,
  };
}

function checkin(date: string, use: UseId, over: Partial<Checkin> = {}): Checkin {
  return { id: id('c'), trackerId: 't1', date, use, changes: [], warnings: [], createdAt: seq, ...over };
}

function photo(view: string, date: string, over: Partial<Photo> = {}): Photo {
  return { id: id('p'), trackerId: 't1', view, date, brightness: 120, width: 1200, height: 1600, source: 'camera', createdAt: seq, ...over };
}

function data(t: Tracker, checkins: Checkin[] = [], photos: Photo[] = [], events: TrackerEvent[] = []): TrackerData {
  return { tracker: t, checkins, events, photos, looks: [] };
}

/** Picks where the newer photo is chosen (or not) in each pair. */
function picks(photos: Photo[], views: string[], choose: ('latest' | 'first' | 'same')[]): LookPick[] {
  return views.map((v, i) => {
    const list = photos.filter((p) => p.view === v).sort((a, b) => (a.date < b.date ? -1 : 1));
    const latestOnLeft = i % 2 === 0;
    const c = choose[i];
    const pick = c === 'same' ? 'same' : (c === 'latest') === latestOnLeft ? 'A' : 'B';
    return { view: v, firstId: list[0].id, latestId: list[list.length - 1].id, latestOnLeft, pick };
  });
}

/** Check-ins every 28 days from the tracker start up to today. */
function checkinsEvery(start: string, today: string, use: UseId, step = 28): Checkin[] {
  const out: Checkin[] = [];
  for (let d = addDays(start, step); d <= today; d = addDays(d, step)) out.push(checkin(d, use));
  return out;
}

describe('the real-use clock and the result rules', () => {
  test('1. hair, about half the days for 140 days: about 10 weeks, too early to judge', () => {
    const start = addDays(TODAY, -140);
    const t = tracker({ concern: 'hair', startDate: start, createdDate: start, setupUse: 'half' });
    const d = data(t, checkinsEvery(start, TODAY, 'half'));
    const ev = evaluate({ data: d, today: TODAY });
    expect(ev.clock.wholeWeeks).toBe(10);
    expect(ev.code).toBe('TOO_EARLY');
  });

  test('2. underarm, new deodorant in week 2, newer photo picked in both pairs: better, but other things changed', () => {
    const start = addDays(TODAY, -84);
    const t = tracker({ startDate: start, createdDate: start });
    const cs = [checkin(addDays(start, 14), 'most', { changes: ['deodorant'] }), ...checkinsEvery(addDays(start, 14), TODAY, 'most')];
    const ps = [photo('left', start), photo('right', start), photo('left', TODAY), photo('right', TODAY)];
    const d = data(t, cs, ps);
    const ev = evaluate({ data: d, today: TODAY, picks: picks(ps, ['left', 'right'], ['latest', 'latest']) });
    expect(ev.clock.wholeWeeks).toBe(12);
    expect(ev.changesSinceFirst.map((c) => c.week)).toEqual([2]);
    expect(ev.code).toBe('BETTER_CHANGED');
  });

  test('3. a warning sign at a check-in comes before every other rule', () => {
    const start = addDays(TODAY, -84);
    const t = tracker({ startDate: start, createdDate: start });
    const cs = [checkin(addDays(start, 14), 'most', { warnings: ['burning'] }), checkin(TODAY, 'most')];
    const ps = [photo('left', start), photo('right', start), photo('left', TODAY), photo('right', TODAY)];
    const ev = evaluate({ data: data(t, cs, ps), today: TODAY, picks: picks(ps, ['left', 'right'], ['latest', 'latest']) });
    expect(ev.code).toBe('CHECK_FIRST');
    // It stays open until she says it has settled.
    const settled = [...cs.slice(0, 1), checkin(TODAY, 'most', { followUp: 'settled' })];
    expect(evaluate({ data: data(t, settled, ps), today: TODAY, picks: picks(ps, ['left', 'right'], ['latest', 'latest']) }).code).toBe('BETTER_WHILE_USING');
  });

  test('4. hair, illness with fever at week 6, now at week 13: too much changed', () => {
    const start = addDays(TODAY, -91);
    const t = tracker({ concern: 'hair', startDate: start, createdDate: start });
    const cs = [checkin(addDays(start, 14), 'most'), checkin(addDays(start, 42), 'most', { changes: ['fever'] }), checkin(addDays(start, 70), 'most')];
    const ev = evaluate({ data: data(t, cs), today: TODAY });
    expect(ev.clock.wholeWeeks).toBe(13);
    expect(ev.changes[0].week).toBe(6);
    expect(ev.code).toBe('TOO_MUCH');
  });

  test('5. underarm, most days for 26 weeks, tracker created today, no photos: her sense only', () => {
    const t = tracker({ startDate: addDays(TODAY, -182), createdDate: TODAY });
    const first = evaluate({ data: data(t), today: TODAY });
    expect(first.needs).toBe('sense');
    expect(first.code).toBeNull();
    const ev = evaluate({ data: data(t), today: TODAY, sense: 'better' });
    expect(ev.clock.wholeWeeks).toBe(26);
    expect(ev.code).toBe('SENSE_ONLY');
  });

  test('6. hair, once in a while at every check-in for 49 weeks: use too uneven', () => {
    const start = addDays(TODAY, -343);
    const t = tracker({ concern: 'hair', startDate: start, createdDate: start, setupUse: 'few' });
    const ev = evaluate({ data: data(t, checkinsEvery(start, TODAY, 'few')), today: TODAY });
    expect(ev.clock.wholeWeeks).toBe(12);
    expect(ev.code).toBe('UNEVEN');
  });

  test('7. underarm, started 13 weeks ago, first photos today: too early for your photos', () => {
    const t = tracker({ startDate: addDays(TODAY, -91), createdDate: TODAY });
    const ps = [photo('left', TODAY), photo('right', TODAY)];
    const ev = evaluate({ data: data(t, [], ps), today: TODAY });
    expect(ev.code).toBe('TOO_EARLY_PHOTOS');
    expect(ev.photoReadyDate).toBe(addDays(TODAY, 56));
  });

  test('8. a 4-week pause adds no real use and does not count toward the cap', () => {
    const start = addDays(TODAY, -84);
    const t = tracker({ startDate: start, createdDate: start });
    const events: TrackerEvent[] = [
      { id: 'e1', trackerId: 't1', date: addDays(start, 28), type: 'pause', createdAt: 1 },
      { id: 'e2', trackerId: 't1', date: addDays(start, 56), type: 'resume', createdAt: 2 },
    ];
    const clock = computeClock(t, [], events, TODAY);
    expect(clock.pausedDays).toBe(28);
    expect(clock.wholeWeeks).toBe(8);
    expect(clock.activeCalendarWeeks).toBe(8);
    expect(clock.calendarWeeks).toBe(12);
  });

  test('9. dates add up the same in any time zone', () => {
    expect(addDays('2027-03-02', 1)).toBe('2027-03-03');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(formatDate('2027-03-02', { year: true })).toBe('2 March 2027');
  });
});

describe('looks and the two-minute path', () => {
  test('an older photo plus a photo today makes the full look ready on day one', () => {
    const start = addDays(TODAY, -91);
    const t = tracker({ startDate: start, createdDate: TODAY });
    const ps = [photo('left', start, { source: 'older' }), photo('right', start, { source: 'older' }), photo('left', TODAY), photo('right', TODAY)];
    const d = data(t, [], ps);
    expect(pendingLook(d, TODAY)).toEqual({ kind: 'full', ready: true, waitUntil: null });
    const needs = evaluate({ data: d, today: TODAY });
    expect(needs.needs).toBe('picks');
    expect(needs.compareViews).toEqual(['left', 'right']);
    const ev = evaluate({ data: d, today: TODAY, picks: picks(ps, ['left', 'right'], ['latest', 'same']) });
    expect(ev.code).toBe('NO_CLEAR_FULL');
  });

  test('stale photos are asked for, and skipping them means "can\'t compare"', () => {
    const start = addDays(TODAY, -70);
    const t = tracker({ startDate: start, createdDate: start });
    const ps = [photo('left', start), photo('right', start)];
    const d = data(t, checkinsEvery(start, TODAY, 'most'), ps);
    const ev = evaluate({ data: d, today: TODAY });
    expect(ev.needs).toBe('photos');
    expect(ev.staleViews).toEqual(['left', 'right']);
    expect(evaluate({ data: d, today: TODAY, skippedPhotos: true }).code).toBe('CANT_COMPARE');
  });

  test('the first photo picked in every pair reads "looks worse to you"', () => {
    const start = addDays(TODAY, -60);
    const t = tracker({ startDate: start, createdDate: start });
    const ps = [photo('left', start), photo('right', start), photo('left', TODAY), photo('right', TODAY)];
    const ev = evaluate({ data: data(t, checkinsEvery(start, TODAY, 'most'), ps), today: TODAY, picks: picks(ps, ['left', 'right'], ['first', 'first']) });
    expect(ev.stage).toBe('early');
    expect(ev.code).toBe('LOOKS_WORSE');
  });

  test('a "light differs" photo makes the result less certain', () => {
    const start = addDays(TODAY, -60);
    const t = tracker({ startDate: start, createdDate: start });
    const ps = [photo('left', start), photo('right', start), photo('left', TODAY, { lightDiffers: true }), photo('right', TODAY)];
    const ev = evaluate({ data: data(t, checkinsEvery(start, TODAY, 'most'), ps), today: TODAY, picks: picks(ps, ['left', 'right'], ['latest', 'latest']) });
    expect(ev.code).toBe('BETTER_SO_FAR');
    expect(ev.lightDiffers).toBe(true);
  });

  test('three different changes block a result for any concern; a new phone does not count', () => {
    const start = addDays(TODAY, -84);
    const t = tracker({ concern: 'neck', startDate: start, createdDate: start });
    const two = [checkin(addDays(start, 14), 'most', { changes: ['sun', 'phone'] }), checkin(addDays(start, 42), 'most', { changes: ['skincare'] })];
    expect(evaluate({ data: data(t, two), today: TODAY }).code).not.toBe('TOO_MUCH');
    const three = [...two, checkin(addDays(start, 70), 'most', { changes: ['weight'] })];
    expect(evaluate({ data: data(t, three), today: TODAY }).code).toBe('TOO_MUCH');
  });
});
