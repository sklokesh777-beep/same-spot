// IndexedDB on this phone only. Nothing here ever leaves the device.
// Stores: meta, records, checkins, photos (small metadata) and images
// (the JPEG bytes, kept apart so lists stay light on low-memory phones).
// Bytes are stored as ArrayBuffers, not Blobs, because Safari has had a
// bug reading Blobs back from IndexedDB.

const DB_NAME = 'samespot';
const DB_VERSION = 1;
let dbPromise = null;

export class StoreError extends Error {
  constructor(code, cause) {
    super(code);
    this.code = code;
    this.cause = cause;
  }
}

function classify(err) {
  if (!err) return new StoreError('unknown');
  if (err instanceof StoreError) return err;
  const name = err.name || '';
  if (name === 'QuotaExceededError' || /quota/i.test(err.message || '')) return new StoreError('quota', err);
  return new StoreError('failed', err);
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StoreError('unavailable'));
      return;
    }
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(new StoreError('unavailable', e));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('checkins')) {
        db.createObjectStore('checkins', { keyPath: 'id' }).createIndex('recordId', 'recordId');
      }
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' }).createIndex('recordId', 'recordId');
      }
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(new StoreError('unavailable', req.error));
    req.onblocked = () => reject(new StoreError('blocked'));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(classify(tx.error));
    tx.onerror = () => reject(classify(tx.error));
  });
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(classify(req.error));
  });
}

export async function get(store, key) {
  const db = await openDB();
  return request(db.transaction(store).objectStore(store).get(key));
}

export async function getAll(store) {
  const db = await openDB();
  return request(db.transaction(store).objectStore(store).getAll());
}

/** Write several values across stores in one transaction. entries: [[store, value], ...] */
export async function putMany(entries) {
  if (!entries.length) return;
  const db = await openDB();
  const names = [...new Set(entries.map(([s]) => s))];
  let tx;
  try {
    tx = db.transaction(names, 'readwrite');
    for (const [store, value] of entries) tx.objectStore(store).put(value);
  } catch (e) {
    throw classify(e);
  }
  return done(tx);
}

export function put(store, value) {
  return putMany([[store, value]]);
}

/** Delete several keys across stores in one transaction. entries: [[store, key], ...] */
export async function deleteMany(entries) {
  if (!entries.length) return;
  const db = await openDB();
  const names = [...new Set(entries.map(([s]) => s))];
  const tx = db.transaction(names, 'readwrite');
  for (const [store, key] of entries) tx.objectStore(store).delete(key);
  return done(tx);
}

export async function clearStores(names) {
  const db = await openDB();
  const tx = db.transaction(names, 'readwrite');
  for (const n of names) tx.objectStore(n).clear();
  return done(tx);
}

export const ALL_STORES = ['meta', 'records', 'checkins', 'photos', 'images'];

/** Remove the whole database. */
export async function destroy() {
  try {
    const db = await openDB();
    db.close();
  } catch {
    /* already gone */
  }
  dbPromise = null;
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}
