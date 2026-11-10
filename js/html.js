// A tiny, safe templating helper. Every interpolated value is escaped
// unless it is already trusted markup made by html`` or raw().

export class SafeHTML {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(v) {
  return String(v).replace(/[&<>"']/g, (c) => ESC[c]);
}

function part(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof SafeHTML) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  return esc(v);
}

export function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += part(values[i]);
  }
  return new SafeHTML(out);
}

export function raw(s) {
  return new SafeHTML(String(s));
}

/** Attribute helper: attrs({ 'data-x': 1, disabled: true, hidden: false }) */
export function attrs(map) {
  return raw(
    Object.entries(map)
      .filter(([, v]) => v !== false && v != null)
      .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`))
      .join(' '),
  );
}
