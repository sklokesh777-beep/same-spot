// Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';

import { addDays, dayNum, fromDayNum, formatDate, isDateStr, daysBetween } from '../js/dates.js';
import {
  computeClock, decideVerdict, evaluate, nextDueDate, snapToSchedule, projectLook, lookDueAt,
  checkinKind, liveStatus, packStatus, changesSince,
} from '../js/engine.js';
import { verdictCopy } from '../js/copy.js';
import { CONCERNS, COPY, VERDICT_TITLES } from '../js/config.js';

const D0 = '2026-01-05';

function record(over = {}) {
  return {
    id: 'r1', concern: 'hair', productId: 'redensyl-serum', productName: 'Hair roll-on',
    productStart: D0, recordStart: D0, setupUse: 'most', pauses: [], checkpointsDone: {},
    harmOpen: [], packDays: 30, packOpened: D0, ...over,
  };
}

// Check-ins on the real schedule (week 2, then every 4 weeks) up to a day.
function scheduleCheckins(rec, upToDay, use, extra = {}) {
  const days = [14];
  for (let k = 1; 28 * k <= upToDay; k++) days.push(28 * k);
  return days
    .filter((d) => d <= upToDay)
    .map((d, i) => ({ id: `c${i}`, recordId: rec.id, date: addDays(rec.recordStart, d), use, changes: [], harm: [], ...(extra[d] || {}) }));
}

function photo(view, date, role, more = {}) {
  return { id: `${view}-${date}-${role}`, view, date, role, flagged: false, createdAt: date, ...more };
}

// ---------- dates ----------

test('date strings round-trip through day numbers', () => {
  for (const s of ['2026-01-01', '2026-02-28', '2028-02-29', '2026-12-31', '2027-03-02']) {
    assert.equal(fromDayNum(dayNum(s)), s);
  }
  assert.equal(addDays('2026-12-25', 10), '2027-01-04');
  assert.equal(daysBetween('2026-03-01', '2026-03-29'), 28);
  assert.equal(isDateStr('2026-02-30'), false);
  assert.equal(isDateStr('2026-11-10'), true);
});

test('dates format the Indian way and only show the year when it differs', () => {
  assert.equal(formatDate('2027-03-02', { ref: '2027-01-10' }), '2 March');
  assert.equal(formatDate('2027-03-02', { ref: '2026-11-10' }), '2 March 2027');
  assert.equal(formatDate('2026-11-24', { ref: '2026-11-10', short: true }), '24 Nov');
});

// ---------- the real-use clock ----------

test('worked example 1: half the days, calendar week 20, clock 10, too early', () => {
  const rec = record({ setupUse: 'half' });
  const today = addDays(D0, 140);
  const cis = scheduleCheckins(rec, 140, 'half');
  const clock = computeClock(rec, cis, today);
  assert.equal(clock.weeks, 10);
  const r = evaluate(rec, cis, [], today);
  assert.equal(r.code, 'TOO_EARLY');
  assert.equal(r.data.x, 10);
  // Her early look comes at calendar week 24.
  assert.equal(r.dates.earlyLook.date, addDays(D0, 168));
  const copy = verdictCopy(r, { today });
  assert.match(copy.paragraphs[0], /about 10 of the 24 weeks/);
});

test('worked example 2: same person at week 48, one pair better and one the same, no clear change after a full trial', () => {
  const rec = record({ setupUse: 'half', checkpointsDone: { early: true } });
  const today = addDays(D0, 336);
  const cis = scheduleCheckins(rec, 336, 'half');
  const clock = computeClock(rec, cis, today);
  assert.equal(clock.weeks, 24);
  const photos = [
    photo('parting', D0, 'baseline'), photo('hairline', D0, 'baseline'),
    photo('parting', today, 'checkin'), photo('hairline', today, 'checkin'),
  ];
  const probe = evaluate(rec, cis, photos, today);
  assert.equal(probe.needs, 'comparison');
  assert.deepEqual(probe.views, ['parting', 'hairline']);
  const r = evaluate(rec, cis, photos, today, {
    comparison: [{ view: 'parting', pick: 'latest' }, { view: 'hairline', pick: 'same' }],
  });
  assert.equal(r.code, 'NO_CLEAR_FULL');
});

test('worked example 3: underarm, new deodorant at week 2, latest picked in both pairs, better but changed', () => {
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6', checkpointsDone: { early: true } });
  const today = addDays(D0, 84);
  const cis = scheduleCheckins(rec, 84, 'most', { 14: { changes: ['deodorant'] } });
  const photos = [
    photo('left', D0, 'baseline'), photo('right', D0, 'baseline'),
    photo('left', today, 'checkin'), photo('right', today, 'checkin'),
  ];
  const r = evaluate(rec, cis, photos, today, {
    comparison: [{ view: 'left', pick: 'latest' }, { view: 'right', pick: 'latest' }],
  });
  assert.equal(r.clock.weeks, 12);
  assert.equal(r.code, 'BETTER_BUT_CHANGED');
  const copy = verdictCopy(r, { today, fastSign: 'better' });
  assert.match(copy.paragraphs[0], /new deodorant/);
  assert.equal(copy.fastLine, 'Odour: better since you started');
});

test('worked example 4: neck cream at week 4 is too early, and the pack banner shows', () => {
  const rec = record({ concern: 'neckElbow', productId: 'pigmentation-cream', packDays: 30, packOpened: D0 });
  const today = addDays(D0, 28);
  const cis = scheduleCheckins(rec, 28, 'most');
  const r = evaluate(rec, cis, [], today);
  assert.equal(r.code, 'TOO_EARLY');
  const pack = packStatus(rec, today);
  assert.equal(pack.show, true);
  assert.equal(pack.finish, addDays(D0, 30));
});

test('worked example 5: burning that lasts at week 2 overrides everything', () => {
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6', harmOpen: [{ code: 'burning', since: addDays(D0, 14) }] });
  const today = addDays(D0, 14);
  const cis = scheduleCheckins(rec, 14, 'most', { 14: { harm: ['burning'] } });
  const r = evaluate(rec, cis, [], today);
  assert.equal(r.code, 'CHECK_FIRST');
  const copy = verdictCopy(r, { today });
  assert.match(copy.paragraphs[0], /burning that lasts/);
  assert.match(copy.paragraphs[0], /Stop using the product/);
});

test('worked example 6: hair, fever at week 6, week 13, too much changed', () => {
  const rec = record();
  const today = addDays(D0, 91);
  const cis = [
    { id: 'a', date: addDays(D0, 14), use: 'most', changes: [] },
    { id: 'b', date: addDays(D0, 42), use: 'most', changes: ['fever'] },
    { id: 'c', date: addDays(D0, 91), use: 'most', changes: [] },
  ];
  const r = evaluate(rec, cis, [], today);
  assert.equal(r.clock.weeks, 13);
  assert.equal(r.code, 'CANT_TELL_CHANGED');
  const copy = verdictCopy(r, { today });
  assert.match(copy.paragraphs[0], /an illness with fever in week 6/);
  assert.match(copy.paragraphs[0], /6 to 9 months/);
});

test('worked example 7: underarm used about 6 months, record started today, no photos, sense only', () => {
  const today = '2026-11-10';
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6', productStart: addDays(today, -182), recordStart: today });
  const probe = evaluate(rec, [], [], today);
  assert.equal(probe.clock.weeks, 26);
  assert.equal(probe.needs, 'sense');
  const r = evaluate(rec, [], [], today, { sense: 'same' });
  assert.equal(r.code, 'SENSE_ONLY');
  const copy = verdictCopy(r, { today });
  assert.match(copy.paragraphs.join(' '), /Take photos today/);
});

test('worked example 8: a few times at every check-in, week 49, use too uneven', () => {
  const rec = record({ setupUse: 'few' });
  const today = addDays(D0, 343);
  const cis = scheduleCheckins(rec, 343, 'few');
  const r = evaluate(rec, cis, [], today);
  assert.equal(r.clock.weeks, 12.25);
  assert.equal(r.code, 'CANT_TELL_UNEVEN');
});

// ---------- rule order and the other verdicts ----------

test('the cap comes before "too early", otherwise light use would read too early forever', () => {
  const rec = record({ setupUse: 'few' });
  const today = addDays(D0, 336);
  const r = evaluate(rec, scheduleCheckins(rec, 336, 'few'), [], today);
  assert.equal(r.clock.weeks, 12);
  assert.equal(r.code, 'CANT_TELL_UNEVEN');
});

test('a warning sign beats the cap and every other rule', () => {
  const rec = record({ setupUse: 'few', harmOpen: [{ code: 'suddenLoss' }] });
  const today = addDays(D0, 343);
  const r = evaluate(rec, scheduleCheckins(rec, 343, 'few'), [], today);
  assert.equal(r.code, 'CHECK_FIRST');
  assert.match(verdictCopy(r, { today }).paragraphs[0], /This isn't something to wait out/);
});

test('three relevant changes mean "can\'t tell" even without a major trigger', () => {
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6' });
  const today = addDays(D0, 56);
  const cis = scheduleCheckins(rec, 56, 'most', { 14: { changes: ['deodorant', 'removal'] }, 28: { changes: ['friction'] } });
  assert.equal(evaluate(rec, cis, [], today).code, 'CANT_TELL_CHANGED');
});

test('a new phone is a photo change, not a cause', () => {
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6' });
  const today = addDays(D0, 56);
  const cis = scheduleCheckins(rec, 56, 'most', { 14: { changes: ['deodorant', 'removal', 'phone'] } });
  const photos = [photo('left', D0, 'baseline'), photo('left', today, 'checkin')];
  const r = evaluate(rec, cis, photos, today, { comparison: [{ view: 'left', pick: 'latest' }] });
  assert.equal(r.code, 'BETTER_SO_FAR_CHANGED');
});

test('someone who started months ago gets "too early for your photos" until her photos are old enough', () => {
  const today = '2026-11-24';
  const recordStart = addDays(today, -14);
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6', productStart: addDays(today, -196), recordStart });
  const cis = [{ id: 'w2', date: today, use: 'half', changes: [] }];
  const photos = [photo('left', recordStart, 'baseline'), photo('right', recordStart, 'baseline')];
  const r = evaluate(rec, cis, photos, today);
  assert.equal(r.code, 'TOO_EARLY_PHOTOS');
  assert.equal(r.dates.photoLook, addDays(recordStart, 56));
});

test('photos with very different light cannot be compared, and her sense is shown second', () => {
  const rec = record({ concern: 'neckElbow', productId: 'pigmentation-cream' });
  const today = addDays(D0, 56);
  const cis = scheduleCheckins(rec, 56, 'most');
  const photos = [
    photo('neck', D0, 'baseline'),
    photo('neck', today, 'checkin', { flagged: true, flagReason: 'more-light' }),
  ];
  const probe = evaluate(rec, cis, photos, today);
  assert.equal(probe.needs, 'sense');
  const r = evaluate(rec, cis, photos, today, { sense: 'better' });
  assert.equal(r.code, 'CANT_COMPARE');
  const copy = verdictCopy(r, { today });
  assert.match(copy.paragraphs[0], /much more light/);
  assert.equal(copy.below[0], 'How it seems to you: better.');
});

test('no new photos in the last 14 days means "can\'t compare"', () => {
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6' });
  const today = addDays(D0, 84);
  const photos = [photo('left', D0, 'baseline'), photo('left', addDays(D0, 56), 'checkin')];
  const r = evaluate(rec, scheduleCheckins(rec, 84, 'most'), photos, today, { sense: 'unsure' });
  assert.equal(r.code, 'CANT_COMPARE');
  assert.equal(r.data.noNew, true);
});

test('"looks better" needs the newer photo picked in every pair', () => {
  const rec = record();
  const today = addDays(D0, 84);
  const cis = scheduleCheckins(rec, 84, 'most');
  const photos = [
    photo('parting', D0, 'baseline'), photo('hairline', D0, 'baseline'),
    photo('parting', today, 'checkin'), photo('hairline', today, 'checkin'),
  ];
  const both = evaluate(rec, cis, photos, today, { comparison: [{ view: 'parting', pick: 'latest' }, { view: 'hairline', pick: 'latest' }] });
  assert.equal(both.code, 'BETTER_SO_FAR');
  const one = evaluate(rec, cis, photos, today, { comparison: [{ view: 'parting', pick: 'latest' }, { view: 'hairline', pick: 'first' }] });
  assert.equal(one.code, 'NO_CLEAR_YET');
  const worse = evaluate(rec, cis, photos, today, { comparison: [{ view: 'parting', pick: 'first' }, { view: 'hairline', pick: 'first' }] });
  assert.equal(worse.code, 'LOOKS_WORSE');
});

test('a full trial with the newer photo picked and nothing else changed reads "looks better while using it"', () => {
  const rec = record({ checkpointsDone: { early: true } });
  const today = addDays(D0, 168);
  const cis = scheduleCheckins(rec, 168, 'most');
  const photos = [photo('parting', D0, 'baseline'), photo('parting', today, 'checkin')];
  const r = evaluate(rec, cis, photos, today, { comparison: [{ view: 'parting', pick: 'latest' }] });
  assert.equal(r.code, 'BETTER_WHILE_USING');
  assert.match(verdictCopy(r, { today }).paragraphs[0], /We can't prove the product caused it/);
});

test('skin verdicts after a full trial add the note about slow fading', () => {
  const rec = record({ concern: 'neckElbow', productId: 'pigmentation-cream' });
  const today = addDays(D0, 84);
  const photos = [photo('neck', D0, 'baseline'), photo('neck', today, 'checkin')];
  const r = evaluate(rec, scheduleCheckins(rec, 84, 'most'), photos, today, { comparison: [{ view: 'neck', pick: 'same' }] });
  assert.equal(r.code, 'NO_CLEAR_FULL');
  assert.match(verdictCopy(r, { today }).paragraphs.join(' '), /Darkening after irritation can take months to fade/);
});

// ---------- schedule, looks, pauses ----------

test('check-ins fall at week 2, then every 4 weeks, and never double up', () => {
  const rec = record();
  assert.equal(nextDueDate(rec, []), addDays(D0, 14));
  assert.equal(nextDueDate(rec, [{ date: addDays(D0, 14) }]), addDays(D0, 28));
  assert.equal(nextDueDate(rec, [{ date: addDays(D0, 14) }, { date: addDays(D0, 28) }]), addDays(D0, 56));
  // A late week-2 check-in on day 25 skips week 4 instead of asking again 3 days later.
  assert.equal(nextDueDate(rec, [{ date: addDays(D0, 25) }]), addDays(D0, 56));
  assert.equal(snapToSchedule(D0, addDays(D0, 3)), addDays(D0, 14));
  assert.equal(snapToSchedule(D0, addDays(D0, 57)), addDays(D0, 84));
});

test('the first check-in within three weeks is the photo-free week-2 check', () => {
  const rec = record();
  assert.equal(checkinKind(rec, [], addDays(D0, 14)), 'week2');
  assert.equal(checkinKind(rec, [{ date: addDays(D0, 14) }], addDays(D0, 28)), 'regular');
  assert.equal(checkinKind(rec, [], addDays(D0, 30)), 'regular');
});

test('looks open at the first check-in past the early and full windows', () => {
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6' });
  const at = (day) => computeClock(rec, scheduleCheckins(rec, day, 'most'), addDays(D0, day));
  assert.equal(lookDueAt(rec, at(28), addDays(D0, 28)), null);
  assert.equal(lookDueAt(rec, at(56), addDays(D0, 56)), 'early');
  assert.equal(lookDueAt({ ...rec, checkpointsDone: { early: true } }, at(84), addDays(D0, 84)), 'full');
  // Started long ago: the full look wins at the first check-in.
  const old = record({ concern: 'underarm', productStart: addDays(D0, -200) });
  assert.equal(lookDueAt(old, computeClock(old, [], addDays(D0, 14)), addDays(D0, 14)), 'full');
});

test('a pause stops the clock and does not count toward the cap', () => {
  const rec = record({ pauses: [{ start: addDays(D0, 28), end: addDays(D0, 56) }] });
  const today = addDays(D0, 84);
  const cis = scheduleCheckins(rec, 84, 'most');
  const clock = computeClock(rec, cis, today);
  assert.equal(clock.weeks, 8);
  assert.equal(clock.activeCalendarWeeks, 8);
});

test('projections follow her latest rhythm and stop when she stops', () => {
  const rec = record({ setupUse: 'half' });
  const cis = scheduleCheckins(rec, 126, 'half');
  const today = addDays(D0, 126); // calendar week 18, clock 9
  assert.equal(computeClock(rec, cis, today).weeks, 9);
  assert.equal(projectLook(rec, cis, today, 12).date, addDays(D0, 168));
  const stopped = [...cis, { id: 'x', date: today, use: 'none', changes: [] }];
  assert.equal(projectLook(rec, stopped, today, 12).date, null);
});

test('Home shows "too early" live, then that a look is ready', () => {
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6' });
  assert.equal(liveStatus(rec, [], [], addDays(D0, 20)).code, 'TOO_EARLY');
  const s = liveStatus(rec, scheduleCheckins(rec, 28, 'most'), [], addDays(D0, 60));
  assert.equal(s.kind, 'look-ready');
  assert.equal(s.look, 'early');
});

test('changes are listed once each, with the week they were first logged', () => {
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6' });
  const cis = scheduleCheckins(rec, 56, 'most', { 14: { changes: ['deodorant'] }, 28: { changes: ['deodorant', 'friction'] } });
  const list = changesSince(rec, cis, D0, addDays(D0, 56));
  assert.deepEqual(list.map((c) => [c.code, c.week]), [['deodorant', 2], ['friction', 4]]);
});

test('every rule path gives a different verdict code and the decision trace stops at the first match', () => {
  const rec = record({ setupUse: 'half' });
  const today = addDays(D0, 140);
  const r = evaluate(rec, scheduleCheckins(rec, 140, 'half'), [], today);
  assert.deepEqual(r.trace.map((t) => [t.id, t.matched]), [['1', false], ['2', false], ['3', true]]);
});

// ---------- wording rules ----------

const BANNED = /\b(fair|fairer|fairness|lighter|lighten|lightening|whiter|whiten|whitening|brighter|brighten|brightening|glow|glowing)\b/i;

function allStrings(obj, out = []) {
  if (typeof obj === 'string') out.push(obj);
  else if (Array.isArray(obj)) obj.forEach((v) => allStrings(v, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => allStrings(v, out));
  return out;
}

test('no on-screen text uses skin-colour words like fair, lighter, brighter or glow', () => {
  const strings = allStrings({ CONCERNS, COPY, VERDICT_TITLES }).filter((s) => !/^https?:/.test(s));
  for (const s of strings) assert.doesNotMatch(s, BANNED, s);
});

test('no verdict message uses "not working", "missed" or "failed" as a fact', () => {
  const rec = record({ concern: 'underarm', productId: 'aha-bha-6' });
  const today = addDays(D0, 84);
  const photos = [photo('left', D0, 'baseline'), photo('left', today, 'checkin')];
  for (const pick of ['latest', 'first', 'same']) {
    const r = evaluate(rec, scheduleCheckins(rec, 84, 'most'), photos, today, { comparison: [{ view: 'left', pick }] });
    const text = verdictCopy(r, { today }).paragraphs.join(' ');
    assert.doesNotMatch(text, /\bnot working\b|\bmissed\b|\bfailed\b/i, text);
    assert.doesNotMatch(text, BANNED, text);
    assert.doesNotMatch(text, /!/, text);
  }
});
