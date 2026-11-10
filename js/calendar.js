// Reminders without a server: a Google Calendar link (Android) and an .ics
// file (iPhone). The in-app "Check-in due" banner is the backup, because
// Google ignores alarms in .ics files and the web cannot schedule its own
// notifications. Event titles stay neutral for shared phones.

import { addDays, compactDate } from './dates.js';

const TITLE = 'Same Spot check-in';

export function checkinEvents(record) {
  const week2 = addDays(record.recordStart, 14);
  const week4 = addDays(record.recordStart, 28);
  return [
    { uid: `${record.id}-w2`, date: week2, title: TITLE, note: 'Your week-2 check-in. Four quick questions, no photos.' },
    { uid: `${record.id}-4w`, date: week4, title: TITLE, note: 'Four quick questions and two optional photos. About 30 seconds.', recur: 'FREQ=WEEKLY;INTERVAL=4;COUNT=12' },
  ];
}

export function googleLink(ev, appUrl) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${compactDate(ev.date)}/${compactDate(addDays(ev.date, 1))}`,
    details: `${ev.note}\nOpen Same Spot on this phone: ${appUrl}`,
  });
  if (ev.recur) params.set('recur', `RRULE:${ev.recur}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Lines longer than 75 octets must be folded.
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

export function icsText(events, appUrl) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Same Spot//Check-ins//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const ev of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}@samespot`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(ev.date)}`,
      `DTEND;VALUE=DATE:${compactDate(addDays(ev.date, 1))}`,
      `SUMMARY:${icsEscape(ev.title)}`,
      `DESCRIPTION:${icsEscape(`${ev.note} Open Same Spot on this phone: ${appUrl}`)}`,
      `URL:${appUrl}`,
    );
    if (ev.recur) lines.push(`RRULE:${ev.recur}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(ev.title)}`, 'TRIGGER:PT10H', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

export function downloadIcs(text, filename = 'same-spot-check-ins.ics') {
  // Typed as text/calendar so iPhone offers "Add to Calendar" when opened.
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
