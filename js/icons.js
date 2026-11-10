// Inline line icons, 24 by 24. Drawn for Same Spot.
import { raw } from './html.js';

const P = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  hourglass:
    '<path d="M7 3.5h10M7 20.5h10M8 3.5V6a4 4 0 0 0 1.6 3.2L12 11l2.4-1.8A4 4 0 0 0 16 6V3.5M8 20.5V18a4 4 0 0 1 1.6-3.2L12 13l2.4 1.8A4 4 0 0 1 16 18v2.5"/>',
  camera:
    '<path d="M4 8h3l1.8-2.5h6.4L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.2" r="3.4"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.6"/><path d="M20.5 15.5l-5-5-9.5 9"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3l7 3v5.2c0 4.4-2.9 8.3-7 9.8-4.1-1.5-7-5.4-7-9.8V6l7-3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  alert: '<path d="M12 4.2l8.8 15.3H3.2L12 4.2z"/><path d="M12 10v4.2M12 17.1v.01"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>',
  question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8v.01"/>',
  layers: '<path d="M12 4l8 4-8 4-8-4 8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.7 3.5M6.5 7.3C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  sprout: '<path d="M12 20.5V12"/><path d="M12 12c0-4.2 3-6.8 7.2-6.8 0 4.2-3 6.8-7.2 6.8z"/><path d="M12 14.5c0-3.2-2.5-5.3-6-5.3 0 3.2 2.5 5.3 6 5.3z"/>',
  equal: '<path d="M6 9.5h12M6 14.5h12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10.2 11v5.5M13.8 11v5.5"/>',
  pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>',
  play: '<path d="M7.5 5.2l11 6.8-11 6.8z"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 13.5l5-5 5 5M5 4h14"/>',
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4M7 11H5.5v9.5h13V11H17"/>',
  home: '<path d="M4 11l8-7 8 7v9.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z"/>',
  printer: '<path d="M7 9V4h10v5M6.5 17.5H4V10.5a1.5 1.5 0 0 1 1.5-1.5h13a1.5 1.5 0 0 1 1.5 1.5v7h-2.5"/><rect x="7" y="14" width="10" height="6.5" rx="1"/>',
  users:
    '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.2 3-5.2 6-5.2s5.4 2 6 5.2"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.6c1.8.7 3 2.3 3.5 4.9"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  flag: '<path d="M5.5 21V4"/><path d="M5.5 4.5h11.5l-2.2 4 2.2 4H5.5"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  external: '<path d="M14 4.5h5.5V10M19.5 4.5L11 13M17.5 14v4.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1H10"/>',
  pack: '<path d="M4 8l8-4 8 4v8.5l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8.5"/>',
  doctor:
    '<path d="M6.5 3.5v4.5a4 4 0 0 0 8 0V3.5"/><path d="M10.5 12v2.8a4.7 4.7 0 0 0 9.4 0V13"/><circle cx="19.9" cy="11.2" r="1.8"/>',
  stop: '<path d="M8.3 3.5h7.4l5.3 5.3v7.4l-5.3 5.3H8.3L3 16.2V8.8z"/><path d="M8.5 12h7"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12.2l8.5-8.5M16.5 6.5l2.5 2.5M14.3 8.7l2 2"/>',
  drop: '<path d="M12 3.5s6 6.2 6 10.6a6 6 0 0 1-12 0C6 9.7 12 3.5 12 3.5z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  scale: '<path d="M12 4v16M5 20h14M5.5 8h13M5.5 8l-2.5 6a2.5 2.5 0 0 0 5 0zM18.5 8L16 14a2.5 2.5 0 0 0 5 0z"/>',
  target:
    '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/><circle cx="12" cy="12" r="2.6"/>',
  // Concern glyphs
  hair: '<path d="M12 3.5c-4 2.5-6.5 7.5-6.5 17M12 3.5c-1.6 4-2 10.5-1.6 17M12 3.5c1.6 4 2 10.5 1.6 17M12 3.5c4 2.5 6.5 7.5 6.5 17"/>',
  rollon: '<circle cx="12" cy="5.6" r="2.6"/><path d="M8.6 9.2h6.8v10.3a1.5 1.5 0 0 1-1.5 1.5h-3.8a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M8.6 13h6.8"/>',
  tube: '<path d="M8.5 3.5h7v2.2l-1 1.3V20a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V7l-1-1.3z"/><path d="M9.5 10.5h5"/>',
  gummy: '<path d="M8 5.5a3 3 0 0 1 4-1.5 3 3 0 0 1 4 1.5c1.3 1.6 1.4 3.6 1 5.4l-1 6.6a3 3 0 0 1-3 2.5h-2a3 3 0 0 1-3-2.5l-1-6.6c-.4-1.8-.3-3.8 1-5.4z"/>',
};

export function icon(name, { size = 24, cls = '', label = '', stroke = 1.75 } = {}) {
  const body = P[name] || P.info;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return raw(
    `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`,
  );
}

/** The Same Spot mark: a viewfinder around one spot. */
export function logoMark(size = 32) {
  return raw(`<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <rect width="48" height="48" rx="13" fill="#005995"/>
    <path d="M12 19v-5.5A1.5 1.5 0 0 1 13.5 12H19M29 12h5.5a1.5 1.5 0 0 1 1.5 1.5V19M36 29v5.5a1.5 1.5 0 0 1-1.5 1.5H29M19 36h-5.5a1.5 1.5 0 0 1-1.5-1.5V29" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="4.6" fill="#FDDC69"/>
  </svg>`);
}

export const FAMILY_ICON = {
  safety: 'alert',
  wait: 'hourglass',
  unclear: 'question',
  positive: 'sprout',
  mixed: 'layers',
  neutral: 'equal',
  negative: 'eye',
};

export const CONCERN_ICON = { hair: 'hair', underarm: 'rollon', neckElbow: 'tube' };
