// Date helpers. Every date in Same Spot is a local "YYYY-MM-DD" string.
// All maths runs on whole day numbers, never on Date objects parsed from
// date-only strings (new Date("2026-03-02") is read as UTC midnight and can
// shift the day in India or anywhere else).

const MS_PER_DAY = 86400000;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

const pad = (n) => String(n).padStart(2, '0');

export function isDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  return fromDayNum(dayNum(s)) === s;
}

/** Whole days since 1970-01-01 for a date string, independent of time zone. */
export function dayNum(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNum(n) {
  const dt = new Date(n * MS_PER_DAY);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(s, n) {
  return fromDayNum(dayNum(s) + Math.round(n));
}

export function addWeeks(s, w) {
  return addDays(s, Math.round(w * 7));
}

/** Days from a to b (positive when b is later). */
export function daysBetween(a, b) {
  return dayNum(b) - dayNum(a);
}

export function minDate(a, b) {
  return a <= b ? a : b;
}

export function maxDate(a, b) {
  return a >= b ? a : b;
}

/** Today's local calendar date. A test hook can pin "today" for QA. */
export function todayStr(now) {
  const override = typeof globalThis !== 'undefined' ? globalThis.__SAMESPOT_TODAY__ : undefined;
  if (!now && isDateStr(override)) return override;
  const d = now || new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * "2 March", or "2 March 2027" when the year differs from the reference date.
 * Indian and British style: day before month, no ordinal suffix.
 */
export function formatDate(s, { ref, year, short } = {}) {
  if (!isDateStr(s)) return '';
  const [y, m, d] = s.split('-').map(Number);
  const refYear = Number((ref || todayStr()).slice(0, 4));
  const month = short ? MONTHS_SHORT[m - 1] : MONTHS[m - 1];
  const showYear = year === true || (year !== false && y !== refYear);
  return showYear ? `${d} ${month} ${y}` : `${d} ${month}`;
}

export function formatDateShort(s, opts = {}) {
  return formatDate(s, { ...opts, short: true });
}

/** "20261124" for calendar files and links. */
export function compactDate(s) {
  return s.replace(/-/g, '');
}

/** Whole calendar weeks between two dates, rounded down. */
export function weeksBetween(a, b) {
  return Math.floor(daysBetween(a, b) / 7);
}
