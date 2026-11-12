// Reminders without a server: a Google Calendar link and an .ics file.
// Titles stay discreet by default, for shared phones.

import { addDays, compactDate } from '../engine/dates';
import type { Tracker } from '../engine/types';
import { nextCheckinDate } from '../engine/clock';
import { CONCERNS } from '../content/concerns';
import type { Checkin } from '../engine/types';

const appUrl = () => `${location.origin}${location.pathname}`;

function title(tracker: Tracker, discreet: boolean): string {
  return discreet ? 'Same Spot check-in' : `Same Spot check-in: ${CONCERNS[tracker.concern].short}`;
}

export function googleCalendarLink(tracker: Tracker, checkins: Checkin[], discreet: boolean): string {
  const date = nextCheckinDate(tracker, checkins);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title(tracker, discreet),
    dates: `${compactDate(date)}/${compactDate(addDays(date, 1))}`,
    details: `About 30 seconds. Open Same Spot on this phone: ${appUrl()}`,
    recur: `RRULE:FREQ=DAILY;INTERVAL=${tracker.interval};COUNT=12`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

export function icsText(tracker: Tracker, checkins: Checkin[], discreet: boolean): string {
  const date = nextCheckinDate(tracker, checkins);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Same Spot//Check-ins//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${tracker.id}-${compactDate(date)}@samespot`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(date)}`,
    `DTEND;VALUE=DATE:${compactDate(addDays(date, 1))}`,
    `SUMMARY:${esc(title(tracker, discreet))}`,
    `DESCRIPTION:${esc(`About 30 seconds. Open Same Spot on this phone: ${appUrl()}`)}`,
    `URL:${appUrl()}`,
    `RRULE:FREQ=DAILY;INTERVAL=${tracker.interval};COUNT=12`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title(tracker, discreet))}`,
    'TRIGGER:PT10H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadIcs(tracker: Tracker, checkins: Checkin[], discreet: boolean): void {
  downloadFile(new Blob([icsText(tracker, checkins, discreet)], { type: 'text/calendar;charset=utf-8' }), 'same-spot-check-ins.ics');
}
