// Drawn-in-code illustrations for the example and the photo guides.
// They are deliberately abstract: ink lines and stipple on pale paper, no
// faces, no stock photos, no AI images and no skin colour. Every use is
// labelled "Illustration, not a photo".

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 400;
const H = 300;
const INK = '#1C2B4A';
const PAPER = '#EDF3F9';
const HAIR_BASE = '#2F4266';
const SCALP = '#F4EDE6';
const FORM = '#F4F1FA';
const CONTOUR = '#5B5579';
const PATCH = '#4A3A6E';

const f = (n) => Math.round(n * 10) / 10;

function frame(inner, label, id) {
  return `<svg class="illus" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">
    <defs><clipPath id="clip-${id}"><rect width="${W}" height="${H}" rx="0"/></clipPath>
    <radialGradient id="vig-${id}" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#0B1630" stop-opacity=".16"/></radialGradient></defs>
    <g clip-path="url(#clip-${id})">${inner}<rect width="${W}" height="${H}" fill="url(#vig-${id})"/></g>
  </svg>`;
}

let counter = 0;
const nextId = () => `i${++counter}`;

/** Top view of a parting. density 0..1: higher means fuller hair and a narrower parting. */
export function hairParting({ density = 0.5, seed = 1, label = 'Illustration of a hair parting, seen from above' } = {}) {
  const r = rng(seed);
  const id = nextId();
  const half = 4 + (1 - density) * 17;
  const pts = [];
  for (let y = -10; y <= 310; y += 20) {
    const wob = Math.sin(y / 37 + seed) * 2.2;
    pts.push([y, half * (0.82 + 0.18 * Math.sin(y / 53)) + wob * 0.5]);
  }
  const band = `M ${pts.map(([y, w]) => `${f(200 - w)} ${y}`).join(' L ')} L ${pts
    .slice()
    .reverse()
    .map(([y, w]) => `${f(200 + w)} ${y}`)
    .join(' L ')} Z`;
  const strands = [];
  const n = Math.round(110 + density * 170);
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const y0 = r() * 330 - 15;
      const x0 = 200 + side * (half * 0.92 + r() * 3);
      const x1 = 200 + side * (half + 26 + r() * 46);
      const y1 = y0 + 6 + r() * 16;
      const x2 = 200 + side * (130 + r() * 120);
      const y2 = y0 + 26 + r() * 62;
      strands.push(
        `<path d="M${f(x0)} ${f(y0)} Q${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)}" stroke="${INK}" stroke-opacity="${f(0.32 + r() * 0.5)}" stroke-width="${f(0.8 + r() * 1.1)}" fill="none" stroke-linecap="round"/>`,
      );
    }
  }
  const inner = `<rect width="${W}" height="${H}" fill="${PAPER}"/>
    <ellipse cx="200" cy="165" rx="230" ry="215" fill="${HAIR_BASE}" fill-opacity=".9"/>
    <path d="${band}" fill="${SCALP}"/>
    ${strands.join('')}`;
  return frame(inner, label, id);
}

/** Front hairline. density 0..1: higher means fuller temples and more fine hairs. */
export function hairline({ density = 0.5, seed = 2, label = 'Illustration of a front hairline' } = {}) {
  const r = rng(seed);
  const id = nextId();
  const recess = (1 - density) * 46;
  const lineY = (x) =>
    132 + 26 * ((x - 200) / 200) ** 2 - recess * Math.exp(-(((x - 112) / 42) ** 2)) - recess * Math.exp(-(((x - 288) / 42) ** 2));
  const top = [];
  for (let x = -10; x <= 410; x += 10) top.push(`${x} ${f(lineY(x))}`);
  const hairArea = `M -10 -10 L 410 -10 L ${top.slice().reverse().join(' L ')} Z`;
  const strands = [];
  const n = Math.round(150 + density * 200);
  for (let i = 0; i < n; i++) {
    const x0 = r() * 420 - 10;
    const y0 = lineY(x0) + r() * 4;
    const lean = (x0 - 200) * 0.18;
    const x1 = x0 + (r() - 0.5) * 26;
    const y1 = y0 - 36 - r() * 44;
    const x2 = x0 + lean + (r() - 0.5) * 44;
    const y2 = y0 - 120 - r() * 120;
    strands.push(
      `<path d="M${f(x0)} ${f(y0)} Q${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)}" stroke="${INK}" stroke-opacity="${f(0.3 + r() * 0.5)}" stroke-width="${f(0.8 + r() * 1.1)}" fill="none" stroke-linecap="round"/>`,
    );
  }
  const baby = [];
  const nb = Math.round(density * 70);
  for (let i = 0; i < nb; i++) {
    const x0 = 40 + r() * 320;
    const y0 = lineY(x0) + 2 + r() * 6;
    const len = 7 + r() * 12;
    baby.push(
      `<path d="M${f(x0)} ${f(y0)} q${f((r() - 0.5) * 6)} ${f(-len / 2)} ${f((r() - 0.5) * 8)} ${f(-len)}" stroke="${INK}" stroke-opacity="${f(0.25 + r() * 0.35)}" stroke-width=".8" fill="none" stroke-linecap="round"/>`,
    );
  }
  const inner = `<rect width="${W}" height="${H}" fill="${SCALP}"/>
    <path d="${hairArea}" fill="${HAIR_BASE}" fill-opacity=".92"/>
    ${strands.join('')}${baby.join('')}
    <path d="M 70 300 Q 200 262 330 300" stroke="${CONTOUR}" stroke-opacity=".25" stroke-width="2" fill="none"/>`;
  return frame(inner, label, id);
}

function stipple(r, { cx, cy, rx, ry, rot = 0, intensity }) {
  const dots = [];
  const n = Math.round(60 + intensity * 360);
  const cos = Math.cos((rot * Math.PI) / 180);
  const sin = Math.sin((rot * Math.PI) / 180);
  let made = 0;
  let guard = 0;
  while (made < n && guard < n * 6) {
    guard++;
    const u = r() * 2 - 1;
    const v = r() * 2 - 1;
    const d = u * u + v * v;
    if (d > 1) continue;
    // Denser toward the centre, softer at the edge.
    if (r() > 1 - d * 0.75) continue;
    const x = cx + (u * rx * cos - v * ry * sin);
    const y = cy + (u * rx * sin + v * ry * cos);
    dots.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.9 + r() * 1.3)}" fill="${PATCH}" fill-opacity="${f(0.22 + r() * 0.42)}"/>`);
    made++;
  }
  return dots.join('');
}

const FORMS = {
  underarm: {
    shape: 'M -20 40 C 90 60 170 92 214 128 C 252 160 300 182 420 190 L 420 320 L -20 320 Z',
    contours: [
      'M -10 34 C 96 54 176 88 218 124 C 254 156 302 178 410 186',
      'M 120 150 C 160 156 196 172 224 196',
      'M 168 132 C 188 140 206 152 220 166',
    ],
    patch: { cx: 205, cy: 162, rx: 92, ry: 50, rot: 24 },
    guide: 'M 30 60 C 110 80 180 104 218 136 C 250 162 296 182 372 190',
  },
  neck: {
    shape: 'M 104 -20 C 112 90 104 170 72 240 L 40 320 L 360 320 L 328 240 C 296 170 288 90 296 -20 Z',
    contours: ['M 108 -10 C 116 92 108 172 76 242', 'M 292 -10 C 284 92 292 172 324 242', 'M 150 248 C 184 236 216 236 250 248'],
    patch: { cx: 200, cy: 150, rx: 104, ry: 46, rot: 0 },
    hair: true,
    guide: 'M 112 30 C 118 110 112 176 84 236 M 288 30 C 282 110 288 176 316 236',
  },
  elbow: {
    shape: 'M -20 210 C 90 196 170 196 220 204 C 270 210 300 170 318 110 C 330 66 336 30 344 -20 L 420 -20 L 420 320 L -20 320 Z',
    contours: [
      'M -10 204 C 92 190 172 190 222 198 C 268 204 296 166 314 108 C 326 66 332 32 338 -10',
      'M 236 226 C 252 214 262 200 268 186',
      'M 222 236 C 244 226 258 210 266 198',
    ],
    patch: { cx: 246, cy: 216, rx: 66, ry: 48, rot: -30 },
    guide: 'M 30 214 C 110 202 176 202 222 208 C 266 212 292 176 308 120 C 318 82 324 50 330 20',
  },
};

/** A body area with a stippled patch. intensity 0..1: lower means a less noticeable patch. */
export function skinArea({ area = 'underarm', intensity = 0.5, seed = 3, mirror = false, label } = {}) {
  const r = rng(seed);
  const id = nextId();
  const form = FORMS[area] || FORMS.underarm;
  const hair = form.hair
    ? Array.from({ length: 90 }, () => {
        const x = 100 + r() * 200;
        return `<path d="M${f(x)} -5 q${f((r() - 0.5) * 10)} 14 ${f((r() - 0.5) * 12)} ${f(22 + r() * 18)}" stroke="${INK}" stroke-opacity="${f(0.3 + r() * 0.4)}" stroke-width="${f(0.8 + r() * 0.8)}" fill="none" stroke-linecap="round"/>`;
      }).join('')
    : '';
  const haze = `<ellipse cx="${form.patch.cx}" cy="${form.patch.cy}" rx="${form.patch.rx * 0.95}" ry="${form.patch.ry * 0.9}" transform="rotate(${form.patch.rot} ${form.patch.cx} ${form.patch.cy})" fill="${PATCH}" fill-opacity="${f(intensity * 0.16)}" filter="url(#soft-${id})"/>`;
  const inner = `<defs><filter id="soft-${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>
    <rect width="${W}" height="${H}" fill="${PAPER}"/>
    <g ${mirror ? `transform="translate(${W} 0) scale(-1 1)"` : ''}>
      <path d="${form.shape}" fill="${FORM}"/>
      ${haze}
      ${stipple(r, { ...form.patch, intensity })}
      ${form.contours.map((d) => `<path d="${d}" stroke="${CONTOUR}" stroke-opacity=".5" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join('')}
      ${hair}
    </g>`;
  return frame(inner, label || `Illustration of the ${area === 'neckElbow' ? 'neck' : area} area with a patch`, id);
}

/** Dashed framing outline shown on an empty photo slot. */
export function viewGuide(viewId) {
  const dashed = (d) =>
    `<path d="${d}" fill="none" stroke="#005995" stroke-opacity=".55" stroke-width="3" stroke-dasharray="9 9" stroke-linecap="round"/>`;
  let body = '';
  if (viewId === 'parting') {
    body = `<ellipse cx="200" cy="170" rx="150" ry="140" fill="none" stroke="#005995" stroke-opacity=".35" stroke-width="3" stroke-dasharray="9 9"/>${dashed('M 200 40 L 200 290')}`;
  } else if (viewId === 'hairline') {
    body = dashed('M 20 170 C 70 120 110 96 140 112 C 170 128 230 128 260 112 C 290 96 330 120 380 170') + dashed('M 90 300 Q 200 250 310 300');
  } else if (viewId === 'left' || viewId === 'right') {
    const g = FORMS.underarm.guide;
    body = viewId === 'right' ? `<g transform="translate(400 0) scale(-1 1)">${dashed(g)}</g>` : dashed(g);
  } else if (viewId === 'neck') {
    body = dashed(FORMS.neck.guide);
  } else {
    body = dashed(FORMS.elbow.guide);
  }
  return `<svg class="guide" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** The illustration for a demo photo descriptor. */
export function illustrationFor(desc) {
  if (!desc) return '';
  if (desc.kind === 'parting') return hairParting(desc);
  if (desc.kind === 'hairline') return hairline(desc);
  return skinArea(desc);
}
