// App state and every action that changes saved data.
// All writes go to IndexedDB on this phone; the in-memory copy mirrors it.

import * as db from './store.js';
import { todayStr, addDays, daysBetween, isDateStr } from './dates.js';
import { CONCERNS, productOf, LIMITS } from './config.js';
import {
  computeClock, checkinKind, lookDueAt, evaluate, sortCheckins, photoLookDate, packStatus,
} from './engine.js';
import { verdictCopy } from './copy.js';

export const S = {
  dbOk: false,
  dbError: null,
  meta: { key: 'settings' },
  records: [],
  checkins: [],
  photos: [],
  draft: null,
  unlocked: false,
  quota: null,
  usage: null,
  usageIncludesApp: true,
  persisted: null,
  privateLikely: false,
};

export function uid(prefix) {
  const c = globalThis.crypto;
  const r = c && c.randomUUID ? c.randomUUID().replace(/-/g, '').slice(0, 14) : Math.random().toString(36).slice(2, 16);
  return `${prefix}_${r}`;
}

const nowIso = () => new Date().toISOString();

export async function init() {
  try {
    await db.openDB();
    const [meta, records, checkins, photos] = await Promise.all([
      db.get('meta', 'settings'),
      db.getAll('records'),
      db.getAll('checkins'),
      db.getAll('photos'),
    ]);
    S.meta = meta || { key: 'settings' };
    S.records = records || [];
    S.checkins = checkins || [];
    S.photos = photos || [];
    S.dbOk = true;
  } catch (e) {
    S.dbOk = false;
    S.dbError = e;
  }
  await refreshStorageInfo();
  S.privateLikely = !S.dbOk || (S.quota != null && S.quota < 120 * 1024 * 1024);
  restoreDraft();
}

export async function refreshStorageInfo() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      S.quota = est.quota ?? null;
      // Chrome reports what the records and photos use apart from the app's
      // own offline files. Other browsers give one total, which includes them.
      const idb = est.usageDetails && est.usageDetails.indexedDB;
      S.usage = idb ?? est.usage ?? null;
      S.usageIncludesApp = idb == null;
    }
    if (navigator.storage && navigator.storage.persisted) S.persisted = await navigator.storage.persisted();
  } catch {
    /* not reported by this browser */
  }
}

export async function saveMeta(patch) {
  S.meta = { ...S.meta, ...patch, key: 'settings' };
  if (S.dbOk) await db.put('meta', S.meta);
}

// ---------- reading ----------

export const recordById = (id) => S.records.find((r) => r.id === id) || null;
export const activeRecords = () =>
  S.records.filter((r) => r.status !== 'closed').sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
export const closedRecords = () =>
  S.records.filter((r) => r.status === 'closed').sort((a, b) => (a.closedOn < b.closedOn ? 1 : -1));
export const checkinsFor = (id) => sortCheckins(S.checkins.filter((c) => c.recordId === id));
export const checkinById = (id) => S.checkins.find((c) => c.id === id) || null;
export const photosFor = (id) =>
  S.photos
    .filter((p) => p.recordId === id)
    .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1));
export const baselineOf = (id) => photosFor(id).filter((p) => p.role === 'baseline');

/** Latest check-in photo per view, not the baseline. */
export function latestPhotos(id) {
  const out = {};
  for (const p of photosFor(id)) if (p.role !== 'baseline') out[p.view] = p;
  return out;
}

export function latestFastSign(id) {
  const list = checkinsFor(id).filter((c) => c.fastSign);
  return list.length ? list[list.length - 1].fastSign : null;
}

// ---------- images ----------

const urlCache = new Map();

export async function imageURL(photoId, kind = 'thumb') {
  const key = `${photoId}:${kind}`;
  if (urlCache.has(key)) return urlCache.get(key);
  const rec = await db.get('images', photoId);
  if (!rec) return null;
  const buf = kind === 'full' ? rec.data : rec.thumb || rec.data;
  const url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
  urlCache.set(key, url);
  return url;
}

export function releaseImageURLs() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}

function photoEntry(recordId, view, processed, { role, date, checkinId = null }) {
  const id = uid('p');
  return {
    meta: {
      id,
      recordId,
      view,
      date,
      role,
      checkinId,
      mime: 'image/jpeg',
      width: processed.width,
      height: processed.height,
      brightness: processed.brightness,
      flagged: !!processed.flagged,
      flagReason: processed.flagReason || null,
      source: processed.source || 'file',
      createdAt: nowIso(),
    },
    image: { id, data: processed.data, thumb: processed.thumb },
  };
}

// ---------- the new-record draft ----------

const DRAFT_KEY = 'samespot:draft';

export function newDraft(seed = {}) {
  S.draft = {
    concern: null,
    productId: null,
    otherName: '',
    startChoice: 'today',
    productStart: null,
    setupUse: null,
    packDays: LIMITS.packDaysDefault,
    photos: {},
    ...seed,
  };
  saveDraft();
  return S.draft;
}

export function saveDraft() {
  if (!S.draft) return;
  try {
    const { photos, ...rest } = S.draft;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
  } catch {
    /* session storage off */
  }
}

function restoreDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw && !S.draft) S.draft = { ...JSON.parse(raw), photos: {} };
  } catch {
    S.draft = null;
  }
}

export function clearDraft() {
  S.draft = null;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** A record-shaped object from the draft, for previews before saving. */
export function draftAsRecord(draft = S.draft, today = todayStr()) {
  const productStart = draft.startChoice === 'earlier' && isDateStr(draft.productStart) ? draft.productStart : today;
  return {
    id: 'draft',
    concern: draft.concern,
    productId: draft.productId,
    productStart,
    recordStart: today,
    setupUse: draft.setupUse || 'most',
    pauses: [],
    checkpointsDone: {},
    harmOpen: [],
    packDays: draft.packDays,
    packOpened: today,
  };
}

// ---------- writing ----------

async function requestPersist() {
  if (S.meta.persistAsked) return;
  let granted = false;
  try {
    if (navigator.storage && navigator.storage.persist) granted = await navigator.storage.persist();
  } catch {
    granted = false;
  }
  await saveMeta({ persistAsked: true, persistGranted: !!granted });
  S.persisted = !!granted;
}

export async function createRecord(draft) {
  const today = todayStr();
  const product = productOf(draft.concern, draft.productId);
  const productStart = draft.startChoice === 'earlier' && isDateStr(draft.productStart) ? draft.productStart : today;
  const packDays = Number(draft.packDays) || LIMITS.packDaysDefault;
  const packOpened = daysBetween(productStart, today) < packDays ? productStart : today;
  const rec = {
    id: uid('r'),
    concern: draft.concern,
    productId: draft.productId,
    productName: draft.productId === 'other' ? (draft.otherName || '').trim() || 'Other product' : product.name,
    productStart,
    recordStart: today,
    setupUse: draft.setupUse,
    packDays,
    packOpened,
    packDismissedFor: null,
    packLog: [],
    baselineDate: null,
    status: 'active',
    pauses: [],
    checkpointsDone: { early: false, full: false, extra: false, photo: false },
    harmOpen: [],
    harmLog: [],
    pendingLook: null,
    lastVerdict: null,
    photoLookDue: null,
    keepTracking: false,
    extraLookAt: null,
    restartedFrom: draft.restartedFrom || null,
    createdAt: nowIso(),
  };
  const entries = [];
  const metas = [];
  for (const [view, ph] of Object.entries(draft.photos || {})) {
    const p = photoEntry(rec.id, view, ph, { role: 'baseline', date: today });
    entries.push(['photos', p.meta], ['images', p.image]);
    metas.push(p.meta);
  }
  if (metas.length) rec.baselineDate = today;
  await db.putMany([['records', rec], ...entries]);
  S.records.push(rec);
  S.photos.push(...metas);
  if (draft.restartedFrom) await closeRecord(draft.restartedFrom, 'restarted');
  requestPersist();
  return rec;
}

export async function updateRecord(id, patch) {
  const rec = recordById(id);
  if (!rec) return null;
  const updated = { ...rec, ...patch };
  await db.put('records', updated);
  S.records = S.records.map((r) => (r.id === id ? updated : r));
  return updated;
}

/** First photos added after the start (she skipped them, or her record started months in). */
export async function addBaseline(recordId, photosByView) {
  const rec = recordById(recordId);
  const today = todayStr();
  const entries = [];
  const metas = [];
  for (const [view, ph] of Object.entries(photosByView)) {
    const p = photoEntry(recordId, view, ph, { role: 'baseline', date: today });
    entries.push(['photos', p.meta], ['images', p.image]);
    metas.push(p.meta);
  }
  if (!metas.length) return rec;
  const updated = {
    ...rec,
    baselineDate: today,
    photoLookDue: photoLookDate(rec, checkinsFor(recordId), today),
    checkpointsDone: { ...rec.checkpointsDone, photo: false },
  };
  await db.putMany([['records', updated], ...entries]);
  S.records = S.records.map((r) => (r.id === recordId ? updated : r));
  S.photos.push(...metas);
  requestPersist();
  return updated;
}

/** Extra photos for a check-in that is waiting for a comparable pair. */
export async function addCheckinPhotos(recordId, checkinId, photosByView) {
  const today = todayStr();
  const c = checkinById(checkinId);
  const entries = [];
  const metas = [];
  for (const [view, ph] of Object.entries(photosByView)) {
    const p = photoEntry(recordId, view, ph, { role: 'checkin', date: today, checkinId });
    entries.push(['photos', p.meta], ['images', p.image]);
    metas.push(p.meta);
  }
  const updatedC = c ? { ...c, photoIds: [...(c.photoIds || []), ...metas.map((m) => m.id)] } : null;
  if (updatedC) entries.unshift(['checkins', updatedC]);
  await db.putMany(entries);
  S.photos.push(...metas);
  if (updatedC) S.checkins = S.checkins.map((x) => (x.id === checkinId ? updatedC : x));
}

/**
 * Save a check-in. Returns whether it opened a look (checkpoint) and
 * whether a warning sign is open.
 */
export async function addCheckin(recordId, answers, photosByView = {}) {
  const rec = recordById(recordId);
  const today = todayStr();
  const prior = checkinsFor(recordId);
  const c = {
    id: uid('c'),
    recordId,
    date: today,
    kind: checkinKind(rec, prior, today),
    lookKind: null,
    use: answers.use,
    changes: answers.changes || [],
    harm: answers.harm || [],
    harmFollowUp: answers.harmFollowUp || null,
    fastSign: answers.fastSign || null,
    sense: null,
    photoIds: [],
    comparison: null,
    verdict: null,
    verdictText: null,
    createdAt: nowIso(),
  };

  let harmOpen = [...(rec.harmOpen || [])];
  const harmLog = [...(rec.harmLog || [])];
  if (harmOpen.length && answers.harmFollowUp && answers.harmFollowUp !== 'still') {
    for (const h of harmOpen) harmLog.push({ ...h, closedOn: today, how: answers.harmFollowUp });
    harmOpen = [];
  }
  for (const code of c.harm) {
    if (!harmOpen.some((h) => h.code === code)) harmOpen.push({ code, since: today, checkinId: c.id });
  }

  const entries = [];
  const metas = [];
  for (const [view, ph] of Object.entries(photosByView)) {
    const p = photoEntry(recordId, view, ph, { role: 'checkin', date: today, checkinId: c.id });
    entries.push(['photos', p.meta], ['images', p.image]);
    metas.push(p.meta);
    c.photoIds.push(p.meta.id);
  }

  const patch = { harmOpen, harmLog };
  const clock = computeClock(rec, [...prior, c], today);
  let look = null;
  if (!harmOpen.length) look = lookDueAt(rec, clock, today);
  if (look) {
    c.kind = 'checkpoint';
    c.lookKind = look;
    patch.pendingLook = { checkinId: c.id, kind: look, date: today };
  }
  if (harmOpen.length) {
    patch.lastVerdict = { code: 'CHECK_FIRST', date: today, checkinId: c.id };
    c.verdict = 'CHECK_FIRST';
  }
  const updated = { ...rec, ...patch };
  await db.putMany([['checkins', c], ['records', updated], ...entries]);
  S.checkins.push(c);
  S.records = S.records.map((r) => (r.id === recordId ? updated : r));
  S.photos.push(...metas);
  return { checkin: c, look, harmOpen: harmOpen.length > 0 };
}

/** Evaluate the pending look with her answers. Returns needs when more input is required. */
export function previewLook(recordId, extra = {}) {
  const rec = recordById(recordId);
  return evaluate(rec, checkinsFor(recordId), photosFor(recordId), todayStr(), extra);
}

/** Store the verdict of a look and move the checkpoints on. */
export async function recordLook(recordId, checkinId, extra = {}) {
  const rec = recordById(recordId);
  const today = todayStr();
  const result = evaluate(rec, checkinsFor(recordId), photosFor(recordId), today, extra);
  if (result.needs) return { needs: result.needs, result };
  const c = checkinById(checkinId);
  const text = verdictCopy(result, { today, fastSign: latestFastSign(recordId) });
  const updatedC = {
    ...c,
    comparison: extra.comparison || null,
    sense: extra.sense || null,
    chooser: extra.chooser || 'self',
    verdict: result.code,
    verdictAt: today,
    verdictText: { title: text.title, paragraphs: text.paragraphs, below: text.below, reasons: text.reasons, fastLine: text.fastLine },
    trace: result.trace,
  };
  const done = { ...(rec.checkpointsDone || {}) };
  const patch = { lastVerdict: { code: result.code, date: today, checkinId } };
  const consumed = !['CHECK_FIRST', 'CANT_COMPARE'].includes(result.code);
  if (consumed && rec.pendingLook) {
    const k = rec.pendingLook.kind;
    if (k === 'full') {
      done.full = true;
      done.early = true;
    } else if (k === 'early') done.early = true;
    else if (k === 'extra') done.extra = true;
    else if (k === 'photo') done.photo = true;
    patch.pendingLook = null;
  }
  if (result.code === 'TOO_EARLY_PHOTOS') {
    patch.photoLookDue = result.dates.photoLook;
    done.photo = false;
  }
  patch.checkpointsDone = done;
  const updated = { ...rec, ...patch };
  await db.putMany([['checkins', updatedC], ['records', updated]]);
  S.checkins = S.checkins.map((x) => (x.id === checkinId ? updatedC : x));
  S.records = S.records.map((r) => (r.id === recordId ? updated : r));
  return { result, text, checkin: updatedC };
}

export async function closeHarm(recordId, how) {
  const rec = recordById(recordId);
  const today = todayStr();
  const harmLog = [...(rec.harmLog || []), ...(rec.harmOpen || []).map((h) => ({ ...h, closedOn: today, how }))];
  return updateRecord(recordId, { harmOpen: [], harmLog });
}

export async function pauseRecord(id) {
  const rec = recordById(id);
  if (rec.status === 'paused') return rec;
  return updateRecord(id, { status: 'paused', pauses: [...(rec.pauses || []), { start: todayStr(), end: null }] });
}

export async function resumeRecord(id, date) {
  const rec = recordById(id);
  const pauses = [...(rec.pauses || [])];
  const last = pauses[pauses.length - 1];
  if (last && !last.end) {
    const end = isDateStr(date) && date >= last.start && date <= todayStr() ? date : todayStr();
    pauses[pauses.length - 1] = { ...last, end };
  }
  return updateRecord(id, { status: 'active', pauses });
}

export async function closeRecord(id, reason = 'closed') {
  const rec = recordById(id);
  if (!rec) return null;
  const pauses = [...(rec.pauses || [])];
  const last = pauses[pauses.length - 1];
  if (last && !last.end) pauses[pauses.length - 1] = { ...last, end: todayStr() };
  return updateRecord(id, { status: 'closed', closedOn: todayStr(), closedReason: reason, pauses });
}

export async function reopenRecord(id) {
  return updateRecord(id, { status: 'active', closedOn: null, closedReason: null });
}

export async function deleteRecord(id) {
  const entries = [['records', id]];
  for (const c of S.checkins.filter((x) => x.recordId === id)) entries.push(['checkins', c.id]);
  for (const p of S.photos.filter((x) => x.recordId === id)) entries.push(['photos', p.id], ['images', p.id]);
  await db.deleteMany(entries);
  S.records = S.records.filter((r) => r.id !== id);
  S.checkins = S.checkins.filter((c) => c.recordId !== id);
  S.photos = S.photos.filter((p) => p.recordId !== id);
}

export async function keepTracking(id) {
  const rec = recordById(id);
  const clock = computeClock(rec, checkinsFor(id), todayStr());
  return updateRecord(id, {
    keepTracking: true,
    extraLookAt: Math.ceil(clock.weeks) + LIMITS.extraLookWeeks,
    checkpointsDone: { ...rec.checkpointsDone, extra: false },
  });
}

export async function choosePackOption(id, choice) {
  const rec = recordById(id);
  const today = todayStr();
  const pack = packStatus(rec, today);
  const patch = {
    packLog: [...(rec.packLog || []), { date: today, choice }],
    packDismissedFor: pack ? pack.finish : null,
  };
  await updateRecord(id, patch);
  if (choice === 'pause') await pauseRecord(id);
  if (choice === 'stop') await closeRecord(id, 'stopped');
  return recordById(id);
}

export async function openedNewPack(id) {
  return updateRecord(id, { packOpened: todayStr(), packDismissedFor: null });
}

export function restartDraftFrom(id) {
  const rec = recordById(id);
  const list = checkinsFor(id);
  const latestUse = list.length ? list[list.length - 1].use : rec.setupUse;
  return newDraft({
    concern: rec.concern,
    productId: rec.productId,
    otherName: rec.productId === 'other' ? rec.productName : '',
    startChoice: 'earlier',
    productStart: rec.productStart,
    setupUse: latestUse === 'none' ? 'most' : latestUse,
    packDays: rec.packDays,
    restartedFrom: id,
  });
}

export async function deleteEverything() {
  releaseImageURLs();
  await db.destroy();
  S.records = [];
  S.checkins = [];
  S.photos = [];
  S.meta = { key: 'settings' };
  S.unlocked = false;
  clearDraft();
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  await db.openDB().then(() => (S.dbOk = true)).catch(() => (S.dbOk = false));
}

// ---------- backup ----------

function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) s += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  return btoa(s);
}

function fromB64(str) {
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export async function exportBackup() {
  const images = await db.getAll('images');
  return {
    app: 'samespot',
    format: 1,
    exportedAt: nowIso(),
    meta: { ageConfirmed: !!S.meta.ageConfirmed, noticeVersion: S.meta.noticeVersion || 1 },
    records: S.records,
    checkins: S.checkins,
    photos: S.photos,
    images: images.map((i) => ({ id: i.id, data: toB64(i.data), thumb: i.thumb ? toB64(i.thumb) : null })),
  };
}

export function validateBackup(obj) {
  if (!obj || obj.app !== 'samespot' || obj.format !== 1) return 'This file is not a Same Spot backup.';
  for (const k of ['records', 'checkins', 'photos', 'images']) if (!Array.isArray(obj[k])) return 'This backup is incomplete.';
  for (const r of obj.records) {
    if (!r.id || !CONCERNS[r.concern] || !isDateStr(r.productStart) || !isDateStr(r.recordStart)) return 'This backup has a record Same Spot cannot read.';
  }
  return null;
}

export async function importBackup(obj) {
  const problem = validateBackup(obj);
  if (problem) throw new Error(problem);
  releaseImageURLs();
  await db.clearStores(['records', 'checkins', 'photos', 'images']);
  const entries = [
    ...obj.records.map((r) => ['records', r]),
    ...obj.checkins.map((c) => ['checkins', c]),
    ...obj.photos.map((p) => ['photos', p]),
    ...obj.images.map((i) => ['images', { id: i.id, data: fromB64(i.data), thumb: i.thumb ? fromB64(i.thumb) : null }]),
  ];
  // Write in batches so one transaction never holds too much.
  for (let i = 0; i < entries.length; i += 40) await db.putMany(entries.slice(i, i + 40));
  S.records = obj.records;
  S.checkins = obj.checkins;
  S.photos = obj.photos;
  await saveMeta({ ageConfirmed: true, noticeVersion: 1 });
}

// ---------- app lock ----------

const enc = new TextEncoder();

async function derive(code, saltB64, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toB64(bits);
}

export const lockSupported = () => !!(globalThis.crypto && crypto.subtle && globalThis.isSecureContext);

export async function setLock(code) {
  const salt = toB64(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const iterations = 150000;
  const hash = await derive(code, salt, iterations);
  await saveMeta({ lock: { enabled: true, salt, hash, iterations } });
  S.unlocked = true;
}

export async function checkLock(code) {
  const l = S.meta.lock;
  if (!l || !l.enabled) return true;
  const hash = await derive(code, l.salt, l.iterations);
  return hash === l.hash;
}

export async function removeLock() {
  await saveMeta({ lock: null });
}

export const lockEnabled = () => !!(S.meta.lock && S.meta.lock.enabled);

export function storageDays(rec, today = todayStr()) {
  return daysBetween(rec.recordStart, today);
}

export { addDays };
