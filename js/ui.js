// Shared UI pieces: top bar, buttons, banners, the real-use clock bar,
// the verdict card, the decision trace, toasts and dialogs.

import { html, raw, esc } from './html.js';
import { icon, logoMark, FAMILY_ICON, CONCERN_ICON } from './icons.js';
import { CONCERNS, USE_BY_ID, VERDICT_FAMILY, COPY } from './config.js';
import { formatDate, formatDateShort, todayStr } from './dates.js';
import { formatWeeks, RULES } from './engine.js';
import { imageURL } from './state.js';
import { illustrationFor } from './illustrations.js';

export { html, raw, esc, icon, logoMark };

export function topbar({ back = null, title = '', right = null, brand = false, backLabel = 'Back' } = {}) {
  const backEl = back
    ? back.startsWith('#')
      ? html`<a class="icon-btn" href="${back}" aria-label="${backLabel}">${icon('back')}</a>`
      : html`<button type="button" class="icon-btn" data-action="${back}" aria-label="${backLabel}">${icon('back')}</button>`
    : html`<span class="icon-btn-spacer" aria-hidden="true"></span>`;
  const mid = brand
    ? html`<a class="brand" href="#/" aria-label="Same Spot, back to start">${logoMark(28)}<span>Same Spot</span></a>`
    : html`<span class="topbar-title">${title}</span>`;
  return html`<header class="topbar">${backEl}${mid}<div class="topbar-right">${right || ''}</div></header>`;
}

export function btn(label, { action, href, variant = 'primary', iconName, iconRight, cls = '', attrs = '', disabled = false, size = '' } = {}) {
  const c = `btn btn-${variant} ${size ? `btn-${size}` : ''} ${cls}`.trim();
  const inner = html`${iconName ? icon(iconName) : ''}<span>${label}</span>${iconRight ? icon(iconRight) : ''}`;
  if (href) return html`<a class="${c}" href="${href}" ${raw(attrs)}>${inner}</a>`;
  return html`<button type="button" class="${c}" ${action ? raw(`data-action="${esc(action)}"`) : ''} ${disabled ? raw('disabled') : ''} ${raw(attrs)}>${inner}</button>`;
}

export function banner({ tone = 'info', iconName = 'info', title, text = '', action = null, href = null, actionLabel = '' }) {
  const body = html`<span class="banner-icon">${icon(iconName)}</span>
    <span class="banner-text"><strong>${title}</strong>${text ? html`<span>${text}</span>` : ''}</span>
    ${action || href ? html`<span class="banner-go">${actionLabel ? html`<span>${actionLabel}</span>` : ''}${icon('chevron')}</span>` : ''}`;
  if (href) return html`<a class="banner banner-${tone}" href="${href}">${body}</a>`;
  if (action) return html`<button type="button" class="banner banner-${tone}" data-action="${action}">${body}</button>`;
  return html`<div class="banner banner-${tone}" role="note">${body}</div>`;
}

export function pill(text, tone = 'neutral', iconName = null) {
  return html`<span class="pill pill-${tone}">${iconName ? icon(iconName, { size: 16 }) : ''}${text}</span>`;
}

export function concernBadge(concernId, size = 40) {
  return html`<span class="concern-badge concern-${concernId}" style="--s:${size}px">${icon(CONCERN_ICON[concernId] || 'drop', { size: Math.round(size * 0.55) })}</span>`;
}

function lookDateLabel(proj, ref) {
  if (!proj) return '';
  if (proj.date) return formatDateShort(proj.date, { ref });
  return proj.reason === 'paused' ? 'Paused' : 'When you restart';
}

/** The real-use clock: weeks of regular use against the early and full look. */
export function clockBar({ clock, cfg, dates = null, done = {}, today = todayStr(), compact = false }) {
  const max = cfg.full;
  const pct = Math.max(0, Math.min(100, (clock.weeks / max) * 100));
  const earlyPct = (cfg.early / max) * 100;
  const over = clock.wholeWeeks > cfg.full;
  const label = `${clock.wholeWeeks} ${over ? '' : `of ${cfg.full} `}weeks of regular use. Early look at week ${cfg.early}, full look at week ${cfg.full}.`;
  return html`<div class="clock ${compact ? 'clock-compact' : ''}">
    <div class="clock-head">
      <span class="clock-num">${clock.wholeWeeks}</span>
      <span class="clock-of">${over
        ? html`weeks of regular use<br><span>past the ${cfg.full}-week full look</span>`
        : html`of ${cfg.full} weeks<br><span>of regular use</span>`}</span>
    </div>
    <div class="clock-track" role="img" aria-label="${label}">
      <span class="clock-fill" style="--p:${pct.toFixed(2)}%"></span>
      <span class="clock-mark" style="--at:${earlyPct.toFixed(2)}%" data-reached="${String(clock.weeks >= cfg.early)}"></span>
      <span class="clock-mark clock-mark-end" style="--at:100%" data-reached="${String(clock.weeks >= cfg.full)}"></span>
      <span class="clock-now" style="--p:${pct.toFixed(2)}%"></span>
    </div>
    ${dates
      ? html`<div class="clock-legend">
          <span class="legend-item"><b>Early look</b><span class="legend-date">${done.early ? 'Done' : lookDateLabel(dates.earlyLook, today)}</span><span>week ${cfg.early} of use</span></span>
          <span class="legend-item legend-end"><b>Full look</b><span class="legend-date">${done.full ? 'Done' : lookDateLabel(dates.fullLook, today)}</span><span>week ${cfg.full} of use</span></span>
        </div>`
      : ''}
  </div>`;
}

/** Plain-language arithmetic behind the clock. */
export function clockMath(clock, today) {
  const rows = clock.periods.map((p) => {
    const u = USE_BY_ID[p.use] || USE_BY_ID.none;
    const label = p.kind === 'before' ? 'Before this record' : p.kind === 'provisional' ? 'Since the last check-in' : 'Check-in period';
    return html`<li>
      <span class="ml-body">
        <b>${formatDateShort(p.from, { ref: today })} to ${formatDateShort(p.to, { ref: today })}</b>
        <span class="ml-meta">${label} · ${p.days} days${p.paused ? `, ${p.paused} paused` : ''} · ${u.phrase}</span>
      </span>
      <span class="ml-num">${formatWeeks(p.weeks)}</span>
    </li>`;
  });
  const capped = clock.quarterDays < clock.periods.reduce((s, p) => s + p.active * p.quarters, 0);
  return html`<div class="mathlist-head" aria-hidden="true"><span>Period</span><span>Weeks</span></div>
  <ol class="mathlist">${rows}</ol>
  <p class="mathlist-total"><span>Weeks of regular use</span><b>${formatWeeks(clock.weeks)}</b></p>
  <p class="small muted">Each day counts as a full, half or quarter of a regular day, depending on the answer for that period. Paused days count as zero.${capped ? ' The total can never pass the calendar time since you started.' : ''}</p>`;
}

/** The verdict card. copy comes from copy.verdictCopy. */
export function verdictCard(copy, { kicker = 'Verdict', date = null, today = todayStr(), sample = false, openWhy = false, compact = false } = {}) {
  const fam = copy.family || VERDICT_FAMILY[copy.code] || 'neutral';
  return html`<article class="verdict" data-family="${fam}" ${compact ? raw('data-compact') : ''}>
    <div class="verdict-top">
      <span class="verdict-icon">${icon(FAMILY_ICON[fam] || 'info', { size: 22 })}</span>
      <span class="verdict-kicker">${sample ? 'Sample · ' : ''}${kicker}${date ? html` · ${formatDate(date, { ref: today })}` : ''}</span>
    </div>
    <h2 class="verdict-title">${copy.title}</h2>
    ${copy.paragraphs.map((p) => html`<p class="verdict-text">${p}</p>`)}
    ${copy.below && copy.below.length ? copy.below.map((b) => html`<p class="verdict-below">${b}</p>`) : ''}
    ${copy.fastLine ? html`<p class="fast-line">${icon('drop', { size: 18 })}<span>${copy.fastLine}</span><span class="fast-note">Quick signs never change the verdict</span></p>` : ''}
    ${copy.reasons && copy.reasons.length
      ? html`<details class="why" ${openWhy ? raw('open') : ''}>
          <summary><span>Why we say this</span>${icon('chevron', { size: 18, cls: 'why-chev' })}</summary>
          <ul class="why-list">
            ${copy.reasons.map(
              (r) => html`<li><span class="why-icon">${icon(r.icon || 'info', { size: 18 })}</span>
                <span class="why-body"><span class="why-label">${r.label}</span><b>${r.value}</b>${r.hint ? html`<span class="why-hint">${r.hint}</span>` : ''}</span></li>`,
            )}
          </ul>
        </details>`
      : ''}
    <p class="verdict-foot">${copy.footer || ''}</p>
  </article>`;
}

/** Rule-by-rule trace of how the verdict was decided. */
export function ruleTrace(trace) {
  const rows = RULES.map((r) => {
    const t = trace.find((x) => x.id === r.id);
    if (!t) return html`<li class="rule rule-skip"><span class="rule-id">${r.id}</span><span class="rule-body"><span>${r.label}</span><em>Not checked. An earlier rule decided.</em></span></li>`;
    const decides = t.matched || (r.id === '6');
    return html`<li class="rule ${decides ? 'rule-hit' : 'rule-pass'}"><span class="rule-id">${r.id}</span>
      <span class="rule-body"><span>${r.label}</span><em>${t.detail}</em></span>
      <span class="rule-out">${decides ? (r.id === '6' ? 'Decides' : 'Yes, decides') : 'No'}</span></li>`;
  });
  return html`<ol class="rules" aria-label="Verdict rules, checked in order">${rows}</ol>
  <p class="small muted">Rules run in this fixed order and the first match decides, so two rules can never contradict each other.</p>`;
}

/** A photo or illustration in a fixed frame. Real photos load after render. */
export function shot({ photo = null, desc = null, label = '', tag = '', sub = '', size = 'm', previewUrl = null }) {
  let media;
  if (desc) media = raw(illustrationFor({ ...desc, label: label || 'Illustration' }));
  else if (previewUrl) media = html`<img src="${previewUrl}" alt="${label}">`;
  else if (photo) media = html`<img data-photo="${photo.id}" alt="${label}" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">`;
  else media = html`<span class="shot-empty">${icon('image')}</span>`;
  return html`<figure class="shot shot-${size}">
    <div class="shot-media">${media}${desc ? html`<span class="shot-tag"><span class="tag-full">${COPY.illustration}</span><span class="tag-short">Illustration</span></span>` : ''}${tag ? html`<span class="shot-label">${tag}${sub ? html`<span class="sub">${sub}</span>` : ''}</span>` : ''}</div>
  </figure>`;
}

/** Load real photo thumbnails into <img data-photo> elements. */
export async function hydratePhotos(root) {
  const imgs = root.querySelectorAll('img[data-photo]');
  for (const img of imgs) {
    const url = await imageURL(img.dataset.photo, img.dataset.kind || 'thumb').catch(() => null);
    if (url && img.isConnected) img.src = url;
  }
}

// ---------- toast and dialogs ----------

let toastTimer = null;
export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

/** A modal dialog. buttons: [{ label, value, variant }]. Resolves with the value. */
export function dialog({ title, body = '', buttons = [{ label: 'OK', value: true, variant: 'primary' }], content = null }) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = String(html`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title" class="modal-title">${title}</h2>
      ${body ? html`<p class="modal-body">${body}</p>` : ''}
      ${content || ''}
      <div class="modal-actions">${buttons.map(
        (b, i) => html`<button type="button" class="btn btn-${b.variant || 'secondary'} btn-block" data-i="${i}">${b.label}</button>`,
      )}</div>
    </div>`);
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    const modal = wrap.querySelector('.modal');
    const close = (v) => {
      wrap.remove();
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(undefined);
      if (e.key === 'Tab') {
        const f = [...modal.querySelectorAll('button, input, a[href], select')].filter((x) => !x.disabled);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) close(undefined);
      // A link inside the dialog (the menu) closes it and lets the link navigate.
      if (e.target.closest('a[href]')) {
        setTimeout(() => close(undefined), 0);
        return;
      }
      const b = e.target.closest('[data-i]');
      if (b) {
        const def = buttons[Number(b.dataset.i)];
        const v = typeof def.value === 'function' ? def.value(modal) : def.value;
        close(v);
      }
    });
    setTimeout(() => {
      const first = modal.querySelector('input, button');
      if (first) first.focus();
    }, 30);
  });
}

export function confirmDialog({ title, body, confirmLabel = 'Yes', cancelLabel = 'Cancel', danger = false }) {
  return dialog({
    title,
    body,
    buttons: [
      { label: confirmLabel, value: true, variant: danger ? 'danger' : 'primary' },
      { label: cancelLabel, value: false, variant: 'secondary' },
    ],
  }).then((v) => v === true);
}

/** Event delegation for data-action attributes inside a root element. */
export function bindActions(root, handlers) {
  const onClick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(el, e);
  };
  const onChange = (e) => {
    const el = e.target.closest('[data-change]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.change];
    if (fn) fn(el, e);
  };
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onChange);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    root.removeEventListener('input', onChange);
  };
}

export function useLabel(id, setup = false) {
  const u = USE_BY_ID[id];
  if (!u) return '';
  return setup && u.setupLabel ? u.setupLabel : u.label;
}

export function concernLabel(id) {
  return (CONCERNS[id] || {}).label || '';
}
