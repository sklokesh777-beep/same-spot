// Calendar dates are "YYYY-MM-DD" strings in local time. All arithmetic
// runs on whole-day numbers. Never use new Date("YYYY-MM-DD"): it is read
// as UTC midnight and can shift the day in India.

const MS_PER_DAY = 86_400_000;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function dayNum(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNum(n: number): string {
  const dt = new Date(n * MS_PER_DAY);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function isDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return fromDayNum(dayNum(s)) === s;
}

export function addDays(s: string, n: number): string {
  return fromDayNum(dayNum(s) + Math.round(n));
}

/** Days from a to b, positive when b is later. */
export function daysBetween(a: string, b: string): number {
  return dayNum(b) - dayNum(a);
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

/** Today's local calendar date from a Date (defaults to now). */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2 March 2027"; the year is left out when it matches the reference year, unless year is true. */
export function formatDate(s: string | null | undefined, opts: { ref?: string; year?: boolean; short?: boolean } = {}): string {
  if (!s || !isDateStr(s)) return '';
  const [y, m, d] = s.split('-').map(Number);
  const month = opts.short ? MONTHS[m - 1].slice(0, 3) : MONTHS[m - 1];
  const refYear = opts.ref ? Number(opts.ref.slice(0, 4)) : y;
  const showYear = opts.year === true || (opts.year !== false && y !== refYear);
  return showYear ? `${d} ${month} ${y}` : `${d} ${month}`;
}

export function formatShort(s: string | null | undefined, ref?: string): string {
  return formatDate(s, { ref, short: true });
}

/** Week of use for a date: days 1 to 7 are week 1, days 8 to 14 week 2, and so on. */
export function weekOf(start: string, date: string): number {
  return Math.max(1, Math.ceil(daysBetween(start, date) / 7));
}

export function compactDate(s: string): string {
  return s.replace(/-/g, '');
}
