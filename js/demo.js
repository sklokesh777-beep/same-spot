// The example: five fictional records built in memory, run through the real
// engine. Nothing here touches storage or the camera. Dates are relative to
// today so the example never looks stale.

import { addDays, todayStr } from './dates.js';
import { CONCERNS, productOf } from './config.js';
import { evaluate, nextDueDate } from './engine.js';
import { verdictCopy } from './copy.js';

function photo(view, date, role, desc, i) {
  return { id: `demo-${view}-${role}-${i}`, view, date, role, flagged: false, createdAt: `${date}T0${i % 10}:00:00Z`, desc };
}

function checkin(date, use, more = {}) {
  return { id: `demo-c-${date}`, date, use, changes: [], harm: [], fastSign: null, createdAt: `${date}T09:00:00Z`, ...more };
}

function baseRecord(id, concern, productId, rs, over = {}) {
  return {
    id: `demo-${id}`,
    concern,
    productId,
    productName: productOf(concern, productId).name,
    productStart: rs,
    recordStart: rs,
    setupUse: 'most',
    packDays: 30,
    packOpened: rs,
    pauses: [],
    checkpointsDone: {},
    harmOpen: [],
    status: 'active',
    baselineDate: rs,
    createdAt: `${rs}T08:00:00Z`,
    ...over,
  };
}

const at = (list, date) => list.filter((x) => x.date <= date);

/** Evaluate as if "today" were a past or future date. */
export function evalAt(sc, date, extra = {}) {
  return evaluate(sc.record, at(sc.checkins, date), at(sc.photos, date), date, extra);
}

const BUILDERS = {
  'too-early': (T, opts = {}) => {
    const use = opts.use || 'half';
    const rs = addDays(T, -126);
    const record = baseRecord('too-early', 'hair', 'rosemary-serum', rs, { setupUse: use, packOpened: addDays(T, -20) });
    const days = [14, 28, 56, 84, 112];
    const fast = { 14: 'unsure', 28: 'same', 112: 'same' };
    const checkins = days.map((d) => checkin(addDays(rs, d), use, { fastSign: fast[d] || 'same' }));
    const photos = [
      photo('parting', rs, 'baseline', { kind: 'parting', density: 0.4, seed: 11 }, 1),
      photo('hairline', rs, 'baseline', { kind: 'hairline', density: 0.42, seed: 12 }, 2),
      photo('parting', addDays(rs, 112), 'checkin', { kind: 'parting', density: 0.41, seed: 13 }, 3),
      photo('hairline', addDays(rs, 112), 'checkin', { kind: 'hairline', density: 0.43, seed: 14 }, 4),
    ];
    return {
      id: 'too-early',
      intro:
        'She uses her hair roll-on about half the days. Same Spot counts only the weeks she really used it, so 18 calendar weeks count as about 9 weeks of regular use.',
      record,
      checkins,
      photos,
      today: T,
      lookAt: T,
      comparisonDefault: null,
    };
  },

  'no-clear-yet': (T) => {
    const rs = addDays(T, -84);
    const record = baseRecord('no-clear-yet', 'hair', 'redensyl-serum', rs, { packOpened: addDays(T, -14) });
    const checkins = [
      checkin(addDays(rs, 14), 'most', { fastSign: 'same' }),
      checkin(addDays(rs, 28), 'most', { fastSign: 'better' }),
      checkin(addDays(rs, 56), 'most', { fastSign: 'better' }),
      checkin(addDays(rs, 84), 'most', { fastSign: 'better', kind: 'checkpoint', lookKind: 'early' }),
    ];
    const photos = [
      photo('parting', rs, 'baseline', { kind: 'parting', density: 0.47, seed: 21 }, 1),
      photo('hairline', rs, 'baseline', { kind: 'hairline', density: 0.48, seed: 22 }, 2),
      photo('parting', addDays(rs, 84), 'checkin', { kind: 'parting', density: 0.47, seed: 23 }, 3),
      photo('hairline', addDays(rs, 84), 'checkin', { kind: 'hairline', density: 0.48, seed: 24 }, 4),
    ];
    return {
      id: 'no-clear-yet',
      intro:
        'Twelve weeks of regular use, and her early look compared photos without dates. Both pairs looked about the same. That is normal this early for hair.',
      record: { ...record, checkpointsDone: { early: true } },
      checkins,
      photos,
      today: T,
      lookAt: T,
      comparisonDefault: [
        { view: 'parting', pick: 'same' },
        { view: 'hairline', pick: 'same' },
      ],
    };
  },

  'other-changes': (T) => {
    const rs = addDays(T, -84);
    const record = baseRecord('other-changes', 'underarm', 'aha-bha-6', rs, { packOpened: addDays(T, -12) });
    const checkins = [
      checkin(addDays(rs, 14), 'most', { fastSign: 'better', changes: ['deodorant'] }),
      checkin(addDays(rs, 28), 'most', { fastSign: 'better' }),
      checkin(addDays(rs, 56), 'most', { fastSign: 'better', kind: 'checkpoint', lookKind: 'early' }),
      checkin(addDays(rs, 84), 'most', { fastSign: 'better', kind: 'checkpoint', lookKind: 'full' }),
    ];
    const photos = [
      photo('left', rs, 'baseline', { kind: 'skin', area: 'underarm', intensity: 0.66, seed: 31 }, 1),
      photo('right', rs, 'baseline', { kind: 'skin', area: 'underarm', intensity: 0.62, seed: 32, mirror: true }, 2),
      photo('left', addDays(rs, 56), 'checkin', { kind: 'skin', area: 'underarm', intensity: 0.56, seed: 33 }, 3),
      photo('right', addDays(rs, 56), 'checkin', { kind: 'skin', area: 'underarm', intensity: 0.53, seed: 34, mirror: true }, 4),
      photo('left', addDays(rs, 84), 'checkin', { kind: 'skin', area: 'underarm', intensity: 0.44, seed: 35 }, 5),
      photo('right', addDays(rs, 84), 'checkin', { kind: 'skin', area: 'underarm', intensity: 0.42, seed: 36, mirror: true }, 6),
    ];
    return {
      id: 'other-changes',
      intro:
        'She picked her newer photos as looking better in both pairs. But she also switched to a new deodorant in week 2, so Same Spot cannot credit the roll-on.',
      record: { ...record, checkpointsDone: { early: true, full: true } },
      checkins,
      photos,
      today: T,
      lookAt: T,
      comparisonDefault: [
        { view: 'left', pick: 'latest' },
        { view: 'right', pick: 'latest' },
      ],
      history: [{ date: addDays(rs, 56), comparison: [{ view: 'left', pick: 'latest' }, { view: 'right', pick: 'latest' }] }],
    };
  },

  'full-trial': (T) => {
    const rs = addDays(T, -84);
    const record = baseRecord('full-trial', 'neckElbow', 'pigmentation-cream', rs, { packOpened: addDays(T, -27), packDays: 30 });
    const checkins = [
      checkin(addDays(rs, 14), 'most', { fastSign: 'better' }),
      checkin(addDays(rs, 28), 'most', { fastSign: 'better' }),
      checkin(addDays(rs, 56), 'most', { fastSign: 'better', kind: 'checkpoint', lookKind: 'early' }),
      checkin(addDays(rs, 84), 'most', { fastSign: 'better', kind: 'checkpoint', lookKind: 'full' }),
    ];
    const photos = [
      photo('neck', rs, 'baseline', { kind: 'skin', area: 'neck', intensity: 0.56, seed: 41 }, 1),
      photo('elbow', rs, 'baseline', { kind: 'skin', area: 'elbow', intensity: 0.5, seed: 42 }, 2),
      photo('neck', addDays(rs, 56), 'checkin', { kind: 'skin', area: 'neck', intensity: 0.56, seed: 43 }, 3),
      photo('elbow', addDays(rs, 56), 'checkin', { kind: 'skin', area: 'elbow', intensity: 0.5, seed: 44 }, 4),
      photo('neck', addDays(rs, 84), 'checkin', { kind: 'skin', area: 'neck', intensity: 0.55, seed: 45 }, 5),
      photo('elbow', addDays(rs, 84), 'checkin', { kind: 'skin', area: 'elbow', intensity: 0.5, seed: 46 }, 6),
    ];
    return {
      id: 'full-trial',
      intro:
        'Twelve weeks of nightly use and no clear change in her photos. Her skin feels smoother, which never changes the verdict. Her pack is about to run out, so she gets four equal choices, with no prices.',
      record: { ...record, checkpointsDone: { early: true, full: true } },
      checkins,
      photos,
      today: T,
      lookAt: T,
      comparisonDefault: [
        { view: 'neck', pick: 'same' },
        { view: 'elbow', pick: 'same' },
      ],
      history: [{ date: addDays(rs, 56), comparison: [{ view: 'neck', pick: 'same' }, { view: 'elbow', pick: 'same' }] }],
    };
  },

  'check-this': (T) => {
    const rs = addDays(T, -14);
    const record = baseRecord('check-this', 'underarm', 'aha-bha-6', rs, {
      harmOpen: [{ code: 'burning', since: T, checkinId: 'demo-c-w2' }],
      packOpened: rs,
    });
    const checkins = [checkin(T, 'most', { fastSign: 'better', harm: ['burning'], id: 'demo-c-w2', kind: 'week2' })];
    const photos = [
      photo('left', rs, 'baseline', { kind: 'skin', area: 'underarm', intensity: 0.6, seed: 51 }, 1),
      photo('right', rs, 'baseline', { kind: 'skin', area: 'underarm', intensity: 0.58, seed: 52, mirror: true }, 2),
    ];
    return {
      id: 'check-this',
      intro:
        'At her week-2 check-in she ticked "burning that lasts". A warning sign overrides every other message, including "keep waiting".',
      record,
      checkins,
      photos,
      today: T,
      lookAt: T,
      comparisonDefault: null,
    };
  },
};

export const SCENARIO_IDS = Object.keys(BUILDERS);

/** Build a scenario with its verdict. */
export function buildScenario(id, opts = {}) {
  const T = todayStr();
  const make = BUILDERS[id] || BUILDERS['too-early'];
  const sc = make(T, opts);
  const extra = sc.comparisonDefault ? { comparison: sc.comparisonDefault } : {};
  const result = evalAt(sc, sc.lookAt, extra);
  const fastSign = [...sc.checkins].reverse().find((c) => c.fastSign)?.fastSign || null;
  const copy = verdictCopy(result, { today: T, fastSign });
  sc.record = { ...sc.record, lastVerdict: sc.comparisonDefault ? { code: result.code, date: sc.lookAt } : null };
  // Earlier looks, for the record history.
  sc.pastLooks = (sc.history || []).map((h) => {
    const r = evalAt(sc, h.date, { comparison: h.comparison });
    return { date: h.date, code: r.code, title: verdictCopy(r, { today: T }).title };
  });
  return { ...sc, result, copy, fastSign, cfg: CONCERNS[sc.record.concern], nextDue: nextDueDate(sc.record, sc.checkins) };
}

/**
 * For the "Try the photo check" demo: the pairs to compare, and a function
 * that turns her picks into the verdict Same Spot would give at that look.
 */
export function photoCheckFor(id) {
  const sc = buildScenario(id);
  const cfg = sc.cfg;
  let lookDate = sc.lookAt;
  let ctx = sc;
  let note = null;
  if (id === 'too-early') {
    // Her early look is still ahead, so play it out at that date.
    const early = sc.result.dates.earlyLook.date;
    lookDate = early;
    const rs = sc.record.recordStart;
    const extraCheckins = [];
    for (let d = 140; addDays(rs, d) <= early; d += 28) extraCheckins.push(checkin(addDays(rs, d), 'half', { fastSign: 'same' }));
    const extraPhotos = [
      photo('parting', early, 'checkin', { kind: 'parting', density: 0.42, seed: 15 }, 7),
      photo('hairline', early, 'checkin', { kind: 'hairline', density: 0.43, seed: 16 }, 8),
    ];
    ctx = { ...sc, checkins: [...sc.checkins, ...extraCheckins], photos: [...sc.photos, ...extraPhotos] };
    note = 'Her early look is still ahead. This plays it out as if that day had come.';
  }
  const latest = {};
  for (const p of ctx.photos) if (p.role !== 'baseline' && p.date <= lookDate) latest[p.view] = p;
  const pairs = cfg.views
    .map((v) => {
      const first = ctx.photos.find((p) => p.role === 'baseline' && p.view === v.id);
      const last = latest[v.id];
      return first && last ? { view: v, first, last } : null;
    })
    .filter(Boolean);
  return {
    scenario: sc,
    lookDate,
    note,
    pairs,
    verdictFor(comparison) {
      const r = evalAt(ctx, lookDate, { comparison });
      return { result: r, copy: verdictCopy(r, { today: todayStr(), fastSign: sc.fastSign }) };
    },
  };
}
