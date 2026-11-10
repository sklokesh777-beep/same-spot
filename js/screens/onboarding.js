// S2 to S8: notice and age, iPhone step, concern, product and routine,
// what to expect, first photos, and check-in reminders.

import { html, raw, icon, btn, topbar, banner, bindActions, confirmDialog, toast, concernBadge } from '../ui.js';
import { COPY, CONCERNS, CONCERN_ORDER, USE_OPTIONS, USE_BY_ID, LIMITS, OTHER_PRODUCT, productOf } from '../config.js';
import {
  S, saveMeta, activeRecords, newDraft, saveDraft, clearDraft, draftAsRecord, createRecord, recordById,
} from '../state.js';
import { env, copyLink } from '../env.js';
import { addDays, formatDate, todayStr, isDateStr } from '../dates.js';
import { computeClock, projectLook, formatWeeks } from '../engine.js';
import { useAssumption } from '../copy.js';
import { pickImage, processFile, firstPhotoAdvice, liveCameraSupported, openLiveCamera, compareLight } from '../photos.js';
import { viewGuide } from '../illustrations.js';
import { checkinEvents, googleLink, icsText, downloadIcs } from '../calendar.js';

const appUrl = () => `${location.origin}${location.pathname}`;

function needsNotice() {
  return !S.meta.ageConfirmed;
}

// ---------- S2. Before you start ----------

export const notice = {
  title: 'Before you start',
  guard() {
    if (!needsNotice()) return activeRecords().length >= LIMITS.maxActiveRecords ? '/home' : '/new';
    return null;
  },
  render(ctx) {
    if (ctx.local.under18) {
      return html`${topbar({ back: '#/', title: '' })}
        <div class="pad flow center">
          <span class="big-icon">${icon('info', { size: 40 })}</span>
          <h1 class="screen-title" tabindex="-1">Same Spot is for adults</h1>
          <p>${COPY.under18}</p>
          ${btn('Back to example', { href: '#/sample/too-early', size: 'lg', cls: 'btn-block' })}
        </div>`;
    }
    const lines = [
      { i: 'lock', t: COPY.notice[0] },
      { i: 'trash', t: COPY.notice[1] },
      { i: 'info', t: COPY.notice[2] },
    ];
    return html`${topbar({ back: '#/', title: '' })}
      <div class="pad flow">
        <p class="kicker">Step 1 of 5</p>
        <h1 class="screen-title" tabindex="-1">Before you start</h1>
        <ul class="notice-list">${lines.map((l) => html`<li><span class="notice-icon">${icon(l.i)}</span><span>${l.t}</span></li>`)}</ul>
        ${!S.dbOk ? banner({ tone: 'sand', iconName: 'alert', title: 'This browser can’t save', text: COPY.privateTab }) : ''}
        <label class="check-row">
          <input type="checkbox" data-change="age" ${ctx.local.age ? raw('checked') : ''}>
          <span class="check-box" aria-hidden="true">${icon('check', { size: 18 })}</span>
          <span>I’m 18 or older</span>
        </label>
        <div class="stack">
          ${btn('Continue', { action: 'continue', size: 'lg', cls: 'btn-block', disabled: !ctx.local.age || !S.dbOk })}
          ${btn('Not now', { href: '#/', variant: 'tertiary', cls: 'btn-block' })}
        </div>
        <p class="center"><button type="button" class="link-btn" data-action="under18">I’m under 18</button></p>
      </div>`;
  },
  mount(root, ctx) {
    return bindActions(root, {
      age(el) {
        ctx.local.age = el.checked;
        root.querySelector('[data-action="continue"]').disabled = !el.checked || !S.dbOk;
      },
      under18() {
        ctx.local.under18 = true;
        ctx.refresh();
      },
      async continue() {
        if (!ctx.local.age) return;
        await saveMeta({ ageConfirmed: true, noticeVersion: 1, noticeAt: todayStr() });
        if (env.iosSafariTab && !S.meta.safariAnyway) ctx.nav('/start/iphone');
        else ctx.nav('/new');
      },
    });
  },
};

// ---------- S3. iPhone step ----------

export const iphone = {
  title: 'Add to Home Screen',
  render(ctx) {
    if (ctx.local.done) {
      return html`${topbar({ back: '#/start/iphone', title: '' })}
        <div class="pad flow center">
          <span class="big-icon">${icon('home', { size: 40 })}</span>
          <h1 class="screen-title" tabindex="-1">Now open Same Spot from your Home Screen</h1>
          <p>Close this Safari tab and tap the Same Spot icon. Your record will start there, where Safari can’t clear it after a week away.</p>
          ${btn('Continue here instead', { action: 'anyway', variant: 'secondary', cls: 'btn-block' })}
        </div>`;
    }
    return html`${topbar({ back: '#/', title: '' })}
      <div class="pad flow">
        <p class="kicker">Step 1 of 5 · iPhone</p>
        <h1 class="screen-title" tabindex="-1">On iPhone, add Same Spot to your Home Screen first</h1>
        <p>Safari can delete saved data from websites you haven’t opened for a while. Opening Same Spot from your Home Screen keeps your record safer.</p>
        <ol class="steps">
          <li><span class="step-n">1</span><span>Tap Share ${icon('share', { size: 20, label: 'the Share icon' })} at the bottom of Safari.</span></li>
          <li><span class="step-n">2</span><span>Choose <b>Add to Home Screen</b>.</span></li>
          <li><span class="step-n">3</span><span>Open Same Spot from your Home Screen.</span></li>
        </ol>
        <div class="stack">
          ${btn('I’ve done this', { action: 'done', size: 'lg', cls: 'btn-block' })}
          ${btn('Continue in Safari anyway', { action: 'anyway', variant: 'tertiary', cls: 'btn-block' })}
        </div>
      </div>`;
  },
  mount(root, ctx) {
    return bindActions(root, {
      done() {
        ctx.local.done = true;
        ctx.refresh();
      },
      async anyway() {
        await saveMeta({ safariAnyway: true });
        ctx.nav('/new');
      },
    });
  },
};

// ---------- S4. What are you tracking? ----------

export const concern = {
  title: 'What are you tracking?',
  guard() {
    if (needsNotice()) return '/start';
    return null;
  },
  render(ctx) {
    const full = activeRecords().length >= LIMITS.maxActiveRecords;
    if (!S.draft) newDraft();
    const d = S.draft;
    if (full) {
      return html`${topbar({ back: '#/home', title: '' })}
        <div class="pad flow center">
          <span class="big-icon">${icon('layers', { size: 40 })}</span>
          <h1 class="screen-title" tabindex="-1">You’re tracking 3 things</h1>
          <p>You can track up to 3 things at once. Close one to start another.</p>
          ${btn('Go to my records', { href: '#/home', cls: 'btn-block' })}
        </div>`;
    }
    return html`${topbar({ back: activeRecords().length ? '#/home' : '#/', title: '' })}
      <div class="pad flow">
        <p class="kicker">Step 2 of 5</p>
        <h1 class="screen-title" tabindex="-1">What are you tracking?</h1>
        <div class="option-cards" role="radiogroup" aria-label="Concern">
          ${CONCERN_ORDER.map((id) => {
            const c = CONCERNS[id];
            const sel = d.concern === id;
            return html`<button type="button" class="option-card ${sel ? 'is-selected' : ''}" role="radio" aria-checked="${String(sel)}" data-action="pick" data-id="${id}">
              ${concernBadge(id, 48)}
              <span class="option-card-body"><b>${c.label}</b><span>Early look at ${c.early} weeks, full look at ${c.full} weeks of regular use</span></span>
              <span class="radio-dot" aria-hidden="true"></span>
            </button>`;
          })}
        </div>
        <p class="small muted">Acne and cracked heels usually change fast enough to see without help, so Same Spot focuses on these three.</p>
        ${btn('Next', { action: 'next', size: 'lg', cls: 'btn-block', disabled: !d.concern, iconRight: 'next' })}
      </div>`;
  },
  mount(root, ctx) {
    return bindActions(root, {
      pick(el) {
        if (S.draft.concern !== el.dataset.id) {
          S.draft.concern = el.dataset.id;
          S.draft.productId = null;
        }
        saveDraft();
        ctx.refresh();
      },
      next() {
        if (S.draft.concern) ctx.nav('/new/product');
      },
    });
  },
};

// ---------- S5. Your product and routine ----------

export const product = {
  title: 'Your product and routine',
  guard() {
    if (needsNotice()) return '/start';
    if (!S.draft || !S.draft.concern) return '/new';
    return null;
  },
  render(ctx) {
    const d = S.draft;
    const cfg = CONCERNS[d.concern];
    const today = ctx.today;
    const minDate = addDays(today, -365 * LIMITS.maxStartYearsBack);
    const products = [...cfg.products, OTHER_PRODUCT];
    const err = ctx.local.err || {};
    const ready = d.productId && d.setupUse && (d.startChoice === 'today' || isDateStr(d.productStart)) && !err.date && !err.pack;
    return html`${topbar({ back: '#/new', title: '' })}
      <div class="pad flow">
        <p class="kicker">Step 3 of 5 · ${cfg.label}</p>
        <h1 class="screen-title" tabindex="-1">Your product and routine</h1>

        <fieldset class="field">
          <legend>Product</legend>
          <div class="radio-list">
            ${products.map(
              (p) => html`<label class="radio-row ${d.productId === p.id ? 'is-selected' : ''}">
                <input type="radio" name="product" value="${p.id}" data-change="product" ${d.productId === p.id ? raw('checked') : ''}>
                <span class="radio-dot" aria-hidden="true"></span><span>${p.name}</span></label>`,
            )}
          </div>
          ${d.productId === 'other'
            ? html`<label class="text-field"><span>Product name (optional)</span>
                <input type="text" maxlength="40" autocomplete="off" value="${d.otherName || ''}" data-change="otherName" placeholder="For example, a cream you already use"></label>
                <p class="small muted">${OTHER_PRODUCT.generalWindows}</p>`
            : ''}
        </fieldset>

        <fieldset class="field">
          <legend>When did you start using it?</legend>
          <div class="segmented" role="radiogroup" aria-label="Start">
            <button type="button" role="radio" aria-checked="${String(d.startChoice === 'today')}" class="seg ${d.startChoice === 'today' ? 'is-on' : ''}" data-action="start" data-v="today">Today</button>
            <button type="button" role="radio" aria-checked="${String(d.startChoice === 'earlier')}" class="seg ${d.startChoice === 'earlier' ? 'is-on' : ''}" data-action="start" data-v="earlier">I started earlier</button>
          </div>
          ${d.startChoice === 'earlier'
            ? html`<label class="text-field"><span>Start date</span>
                <input type="date" min="${minDate}" max="${today}" value="${d.productStart || ''}" data-change="date">
              </label>
              ${err.date ? html`<p class="field-error" role="alert">${err.date}</p>` : ''}`
            : ''}
        </fieldset>

        <fieldset class="field">
          <legend>How often do you use it, honestly?</legend>
          <div class="radio-list">
            ${USE_OPTIONS.map(
              (u) => html`<label class="radio-row ${d.setupUse === u.id ? 'is-selected' : ''}">
                <input type="radio" name="use" value="${u.id}" data-change="use" ${d.setupUse === u.id ? raw('checked') : ''}>
                <span class="radio-dot" aria-hidden="true"></span><span>${u.setupLabel || u.label}</span></label>`,
            )}
          </div>
          ${d.setupUse === 'none' ? html`<p class="field-note">${icon('pause', { size: 18 })}<span>You can still start a record. We’ll pause the clock until you use it again.</span></p>` : ''}
        </fieldset>

        <fieldset class="field">
          <legend>How long does one pack last you?</legend>
          <div class="stepper">
            <button type="button" class="icon-btn icon-btn-soft" data-action="pack" data-d="-1" aria-label="One day less">${icon('minus')}</button>
            <label class="stepper-input"><input type="number" inputmode="numeric" min="${LIMITS.packDaysMin}" max="${LIMITS.packDaysMax}" value="${d.packDays}" data-change="packDays" aria-label="Days one pack lasts"><span>days</span></label>
            <button type="button" class="icon-btn icon-btn-soft" data-action="pack" data-d="1" aria-label="One day more">${icon('plus')}</button>
          </div>
          ${err.pack ? html`<p class="field-error" role="alert">${err.pack}</p>` : html`<p class="small muted">We guessed ${LIMITS.packDaysDefault} days. Change it if yours lasts longer or shorter.</p>`}
        </fieldset>

        ${btn('Next', { action: 'next', size: 'lg', cls: 'btn-block', disabled: !ready, iconRight: 'next' })}
      </div>`;
  },
  mount(root, ctx) {
    const d = S.draft;
    const today = ctx.today;
    const validate = () => {
      const err = {};
      if (d.startChoice === 'earlier') {
        if (!isDateStr(d.productStart)) err.date = null;
        else if (d.productStart > today) err.date = 'Pick today or an earlier date.';
        else if (d.productStart < addDays(today, -365 * LIMITS.maxStartYearsBack)) err.date = 'Pick a date in the last 2 years.';
      }
      const n = Number(d.packDays);
      if (!Number.isFinite(n) || n < LIMITS.packDaysMin || n > LIMITS.packDaysMax) err.pack = `Choose between ${LIMITS.packDaysMin} and ${LIMITS.packDaysMax} days.`;
      ctx.local.err = err;
    };
    return bindActions(root, {
      product(el) {
        d.productId = el.value;
        const p = productOf(d.concern, d.productId);
        if (p && p.packDays) d.packDays = p.packDays;
        saveDraft();
        ctx.refresh();
      },
      otherName(el) {
        d.otherName = el.value.slice(0, 40);
        saveDraft();
      },
      start(el) {
        d.startChoice = el.dataset.v;
        if (d.startChoice === 'today') d.productStart = null;
        validate();
        saveDraft();
        ctx.refresh();
      },
      date(el, e) {
        if (e.type === 'input' && !isDateStr(el.value)) return;
        d.productStart = el.value;
        validate();
        saveDraft();
        ctx.refresh();
      },
      use(el) {
        d.setupUse = el.value;
        saveDraft();
        ctx.refresh();
      },
      packDays(el, e) {
        d.packDays = el.value;
        validate();
        saveDraft();
        if (e.type === 'change') ctx.refresh();
        else {
          const nextBtn = root.querySelector('[data-action="next"]');
          if (nextBtn) nextBtn.disabled = !!ctx.local.err.pack || !d.productId || !d.setupUse;
        }
      },
      pack(el) {
        const n = Math.round(Number(d.packDays) || LIMITS.packDaysDefault) + Number(el.dataset.d);
        d.packDays = Math.max(LIMITS.packDaysMin, Math.min(LIMITS.packDaysMax, n));
        validate();
        saveDraft();
        ctx.refresh();
      },
      next() {
        validate();
        if (ctx.local.err.date || ctx.local.err.pack) return ctx.refresh();
        ctx.nav('/new/expect');
      },
    });
  },
};

// ---------- S6. What to expect ----------

function evidenceMeter(level) {
  const n = /very low/i.test(level) ? 1 : /^low$/i.test(level) || /^low for/i.test(level) ? 1 : /low to medium/i.test(level) ? 2 : 3;
  return html`<span class="meter" aria-hidden="true">${[1, 2, 3].map((i) => html`<span class="${i <= n ? 'on' : ''}"></span>`)}</span>`;
}

export function expectContent(cfg, prod, rec, checkins, today, { forRecord = false } = {}) {
  const clock = computeClock(rec, checkins, today);
  const early = projectLook(rec, checkins, today, cfg.early);
  const full = projectLook(rec, checkins, today, cfg.full);
  const started = rec.productStart < rec.recordStart;
  const lookText = (p) => (p.date ? formatDate(p.date, { ref: today }) : p.reason === 'paused' ? 'When you start again' : 'When you use it again');
  const assumption = useAssumption(rec.setupUse);
  const pieces = [];
  pieces.push(html`<section class="expect-hero">
    <p class="expect-lead">Products like this usually need about <b>${cfg.full} weeks</b> of regular use before a change shows.</p>
    <div class="look-tiles">
      <div class="look-tile"><span class="look-k">Early look</span><span class="look-d">${lookText(early)}</span><span class="look-w">week ${cfg.early} of use</span></div>
      <div class="look-tile look-tile-full"><span class="look-k">Full look</span><span class="look-d">${lookText(full)}</span><span class="look-w">week ${cfg.full} of use</span></div>
    </div>
    ${started
      ? html`<p class="small">You started on ${formatDate(rec.productStart, { ref: today })}. Using it ${USE_BY_ID[rec.setupUse].phrase}, that’s about <b>${formatWeeks(clock.weeks)} weeks</b> of regular use so far.</p>`
      : ''}
  </section>`);
  if (rec.setupUse && rec.setupUse !== 'most') {
    pieces.push(html`<p class="callout callout-blue">${icon('clock', { size: 18 })}<span>${COPY.lessOftenNote}${assumption ? ` ${assumption}` : ''}</span></p>`);
  }
  if (prod && prod.id === 'other') pieces.push(html`<p class="small muted">${OTHER_PRODUCT.generalWindows}</p>`);
  pieces.push(html`<section class="card card-plain">
    <h2 class="card-title">${icon('scale')}<span>How strong is this?</span>${evidenceMeter(cfg.evidenceLevel)}</h2>
    <p><b>${cfg.evidenceLevel}:</b> ${cfg.evidenceLine}</p>
    <details class="sources"><summary>Why these dates${icon('chevron', { size: 16, cls: 'why-chev' })}</summary>
      <ul>${cfg.sources.map((s) => html`<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}${icon('external', { size: 14 })}</a></li>`)}</ul>
    </details>
  </section>`);
  pieces.push(html`<section class="card card-plain">
    <h2 class="card-title">${icon('sprout')}<span>What usually changes first</span></h2>
    <div class="signs"><div><span class="sign-k">Usually first</span><span>${cfg.earlySign}</span></div><div><span class="sign-k">Later</span><span>${cfg.lateSign}</span></div></div>
    <p class="small muted">Quick signs are worth noticing, but only your photos at the early and full look decide the verdict.</p>
  </section>`);
  const dirs = prod ? prod.directions : [];
  pieces.push(html`<section class="card card-plain">
    <h2 class="card-title">${icon('drop')}<span>Directions and cautions from the pack</span></h2>
    <ul class="dot-list">${dirs.map((t) => html`<li>${t}</li>`)}
      ${prod && prod.shaving ? html`<li><b>Shaving and waxing:</b> ${prod.shaving}</li>` : ''}
      ${prod && prod.patch ? html`<li>${prod.patch}</li>` : ''}
      ${prod && prod.extraNote ? html`<li>${prod.extraNote}</li>` : ''}
    </ul>
    ${prod && prod.source ? html`<p class="small muted">From the Be Bodywise product page, checked November 2026. If your pack says something different, follow your pack. <a class="nowrap" href="${prod.source}" target="_blank" rel="noopener noreferrer">Product page${icon('external', { size: 14 })}</a></p>` : ''}
  </section>`);
  pieces.push(html`<section class="card card-rose">
    <h2 class="card-title">${icon('alert')}<span>Stop and check if</span></h2>
    <p>${cfg.stopIf}</p>
    <p class="small">If any of these happen, Same Spot shows “Please check this first” before anything else.</p>
  </section>`);
  if (cfg.notes.length) {
    pieces.push(html`<section class="card card-plain"><h2 class="card-title">${icon('info')}<span>Good to know</span></h2>
      <ul class="dot-list">${cfg.notes.map((n) => html`<li>${n}</li>`)}</ul></section>`);
  }
  if (!forRecord) {
    pieces.push(html`<p class="small muted icon-line">${icon('camera', { size: 16 })}<span>Photos can miss small changes. A change usually has to be large before it shows in photos.</span></p>`);
  }
  return html`${pieces}`;
}

export const expect = {
  title: 'What to expect',
  guard() {
    if (needsNotice()) return '/start';
    if (!S.draft || !S.draft.concern) return '/new';
    if (!S.draft.productId || !S.draft.setupUse) return '/new/product';
    return null;
  },
  render(ctx) {
    const d = S.draft;
    const cfg = CONCERNS[d.concern];
    const prod = productOf(d.concern, d.productId);
    const rec = draftAsRecord(d, ctx.today);
    return html`${topbar({ back: '#/new/product', title: '' })}
      <div class="pad flow">
        <p class="kicker">Step 4 of 5 · ${prod.id === 'other' ? d.otherName || prod.name : prod.name}</p>
        <h1 class="screen-title" tabindex="-1">What to expect</h1>
        ${expectContent(cfg, prod, rec, [], ctx.today)}
        <div class="stack sticky-actions">
          ${btn('Take my first photos', { href: '#/new/photos', size: 'lg', cls: 'btn-block', iconName: 'camera' })}
          ${btn('Skip photos', { action: 'skip', variant: 'tertiary', cls: 'btn-block' })}
        </div>
      </div>`;
  },
  mount(root, ctx) {
    return bindActions(root, {
      async skip() {
        const ok = await confirmDialog({
          title: 'Skip photos?',
          body: 'Without photos, your verdicts will rely on how it seems to you, and memory is easy to misjudge. Skip anyway?',
          confirmLabel: 'Skip anyway',
          cancelLabel: 'Take photos',
        });
        if (!ok) return;
        try {
          const rec = await createRecord({ ...S.draft, photos: {} });
          clearDraft();
          ctx.nav(`/r/${rec.id}/reminders`);
        } catch (e) {
          toast(e && e.code === 'quota' ? 'Your phone is out of space. Free some space and try again.' : 'Something went wrong saving your record. Please try again.');
        }
      },
    });
  },
};

// ---------- S7. First photos ----------

export function photoGuideCard(cfg) {
  return html`<section class="guide-card">
    <h2 class="card-title">${icon('sun')}<span>Same spot, same light, every time</span></h2>
    <ul class="ticks">
      <li>${icon('check', { size: 18 })}<span>Same spot, by a window, in daylight.</span></li>
      <li>${icon('check', { size: 18 })}<span>Flash off, no beauty mode or filters.</span></li>
      <li>${icon('check', { size: 18 })}<span>Plain background.</span></li>
      <li>${icon('check', { size: 18 })}<span>${cfg.photoGuide}</span></li>
    </ul>
  </section>`;
}

/**
 * Photo capture slots shared by first photos and check-in photos.
 * state: { photos: { [viewId]: processed }, notes: {}, stall: bool }
 * baseline: { [viewId]: photoMeta } for "Match this" references.
 */
export function captureSlots(cfg, state, { baseline = null, checkLight = null } = {}) {
  return html`<div class="slots">
    ${cfg.views.map((v) => {
      const p = state.photos[v.id];
      const note = state.notes ? state.notes[v.id] : null;
      const ref = baseline && baseline[v.id];
      return html`<section class="slot ${p ? 'has-photo' : ''}" aria-label="${v.label}">
        <div class="slot-head"><h3>${v.label}</h3>${p ? html`<span class="pill pill-positive">${icon('check', { size: 14 })}Saved</span>` : ''}</div>
        <p class="small muted">${v.tip}</p>
        <div class="slot-media">
          ${p
            ? html`<img src="${p.previewUrl}" alt="${v.label}, your new photo">`
            : html`<div class="slot-empty">${raw(viewGuide(v.id))}<span>${icon('camera')}</span></div>`}
          ${ref ? html`<div class="slot-ref"><img data-photo="${ref.id}" alt="Your first photo of this view" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><span>Match this</span></div>` : ''}
        </div>
        ${note ? html`<p class="slot-note slot-note-${note.tone}" role="status">${icon(note.tone === 'ok' ? 'check' : 'sun', { size: 18 })}<span>${note.text}</span></p>` : ''}
        <div class="slot-actions">
          ${p && note && note.tone === 'warn' && checkLight
            ? html`${btn('Retake', { action: 'shoot', variant: 'primary', size: 'sm', iconName: 'camera', attrs: `data-view="${v.id}"` })}
                ${btn(note.kept ? 'Kept anyway' : 'Keep it anyway', { action: 'keep', variant: 'secondary', size: 'sm', attrs: `data-view="${v.id}"`, disabled: !!note.kept })}`
            : html`${btn(p ? 'Retake' : 'Take photo', { action: 'shoot', variant: p ? 'secondary' : 'primary', size: 'sm', iconName: 'camera', attrs: `data-view="${v.id}"` })}
                ${btn('Choose from gallery', { action: 'gallery', variant: 'secondary', size: 'sm', iconName: 'image', attrs: `data-view="${v.id}"` })}`}
          ${liveCameraSupported() && ref ? btn('Line it up live', { action: 'live', variant: 'tertiary', size: 'sm', iconName: 'target', attrs: `data-view="${v.id}"` }) : ''}
        </div>
      </section>`;
    })}
  </div>
  ${state.stall
    ? html`<div class="callout callout-sand" role="alert">${icon('alert', { size: 18 })}<span>Your camera didn’t open. If you’re inside Instagram or WhatsApp, open this page in Chrome or Safari. You can also choose a photo from your gallery.</span>
        <button type="button" class="btn btn-secondary btn-sm" data-action="copylink">${icon('copy', { size: 18 })}<span>Copy link</span></button></div>`
    : ''}`;
}

/**
 * Handlers for captureSlots. onPhoto(viewId, processed) decides notes.
 */
export function captureHandlers(root, ctx, state, { baselineBrightness = null, getGhost = null } = {}) {
  const handle = async (viewId, file, source) => {
    if (!file) return;
    try {
      const processed = file.data ? file : await processFile(file);
      if (source) processed.source = source;
      state.photos[viewId] = processed;
      state.notes = state.notes || {};
      if (baselineBrightness && baselineBrightness[viewId]) {
        const cmp = compareLight(processed, baselineBrightness[viewId]);
        processed.flagged = cmp.flagged;
        processed.flagReason = cmp.reason || null;
        state.notes[viewId] = cmp.flagged
          ? { tone: 'warn', text: `This photo has much ${cmp.reason === 'more-light' ? 'more' : 'less'} light than your first one. Try the same spot and time of day.` }
          : { tone: 'ok', text: 'The light is close to your first photo.' };
      } else {
        const advice = firstPhotoAdvice(processed);
        state.notes[viewId] = advice ? { tone: 'tip', text: advice } : null;
      }
      state.stall = false;
      ctx.refresh();
    } catch (e) {
      if (e && e.message === 'not-image') toast('That file isn’t a photo. Choose a photo instead.');
      else toast('That photo couldn’t be read. Please try another.');
    }
  };
  return {
    async shoot(el) {
      const v = el.dataset.view;
      const file = await pickImage({
        capture: true,
        onStall: () => {
          state.stall = true;
          ctx.refresh();
        },
      });
      handle(v, file, 'camera');
    },
    async gallery(el) {
      const file = await pickImage({ capture: false });
      handle(el.dataset.view, file, 'gallery');
    },
    async live(el) {
      const v = el.dataset.view;
      const ghost = getGhost ? await getGhost(v) : null;
      try {
        const processed = await openLiveCamera({ ghostUrl: ghost, title: 'Line it up with your first photo', tip: 'Move until the faint outline matches.' });
        if (processed) handle(v, processed, 'live');
      } catch {
        toast('The live camera isn’t available here. Use Take photo instead.');
      }
    },
    keep(el) {
      const v = el.dataset.view;
      if (state.notes && state.notes[v]) state.notes[v] = { ...state.notes[v], kept: true, text: 'Kept. This photo is marked as a different light, so it may not be compared.' };
      ctx.refresh();
    },
    async copylink() {
      const ok = await copyLink(appUrl());
      toast(ok ? 'Link copied. Open it in Chrome or Safari.' : 'Copy this page’s address from the menu.');
    },
  };
}

export const firstPhotos = {
  title: 'Your first photos',
  guard() {
    if (needsNotice()) return '/start';
    if (!S.draft || !S.draft.concern || !S.draft.productId || !S.draft.setupUse) return '/new';
    return null;
  },
  render(ctx) {
    const d = S.draft;
    const cfg = CONCERNS[d.concern];
    const L = ctx.local;
    L.photos = d.photos;
    const count = Object.keys(d.photos).length;
    return html`${topbar({ back: '#/new/expect', title: '' })}
      <div class="pad flow">
        <p class="kicker">Step 5 of 5 · optional</p>
        <h1 class="screen-title" tabindex="-1">Your first photos</h1>
        <p>Two photos from today become your starting point. They stay only on this phone and never go to your gallery.</p>
        ${env.iosSafariTab ? banner({ tone: 'sand', iconName: 'alert', title: 'Safari can clear saved photos', text: 'Add Same Spot to your Home Screen to keep them safer.' }) : ''}
        ${photoGuideCard(cfg)}
        ${captureSlots(cfg, L)}
        <p class="small muted center">${COPY.photoSupport}</p>
        <div class="stack sticky-actions">
          ${btn(count ? `Done, save ${count === 1 ? '1 photo' : `${count} photos`}` : 'Done', { action: 'done', size: 'lg', cls: 'btn-block', disabled: !count })}
          ${btn('Skip photos', { action: 'skip', variant: 'tertiary', cls: 'btn-block' })}
        </div>
      </div>`;
  },
  mount(root, ctx) {
    const L = ctx.local;
    const save = async (photos) => {
      try {
        const rec = await createRecord({ ...S.draft, photos });
        Object.values(S.draft.photos).forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
        clearDraft();
        ctx.nav(`/r/${rec.id}/reminders`);
      } catch (e) {
        toast(e && e.code === 'quota' ? 'Your phone is out of space for photos. Free some space, or skip photos for now.' : 'Something went wrong saving. Please try again.');
      }
    };
    return bindActions(root, {
      ...captureHandlers(root, ctx, L),
      done: () => save(S.draft.photos),
      async skip() {
        const ok = await confirmDialog({
          title: 'Skip photos?',
          body: 'Without photos, your verdicts will rely on how it seems to you, and memory is easy to misjudge. Skip anyway?',
          confirmLabel: 'Skip anyway',
          cancelLabel: 'Take photos',
        });
        if (ok) save({});
      },
    });
  },
};

// ---------- S8. Add check-in dates ----------

export const reminders = {
  title: 'Add check-in dates',
  guard(ctx) {
    if (!recordById(ctx.params.id)) return '/home';
    return null;
  },
  render(ctx) {
    const rec = recordById(ctx.params.id);
    const week2 = addDays(rec.recordStart, 14);
    const androidFirst = !env.ios;
    const events = checkinEvents(rec);
    const g = (ev) => googleLink(ev, appUrl());
    const google = html`<div class="cal-option">
      <p class="cal-title">${icon('calendar', { size: 18 })}<span>Google Calendar</span></p>
      <div class="cal-buttons">
        <a class="btn btn-${androidFirst ? 'primary' : 'secondary'} btn-sm" href="${g(events[0])}" target="_blank" rel="noopener noreferrer">${icon('plus', { size: 18 })}<span>First check-in</span></a>
        <a class="btn btn-${androidFirst ? 'primary' : 'secondary'} btn-sm" href="${g(events[1])}" target="_blank" rel="noopener noreferrer">${icon('plus', { size: 18 })}<span>Every 4 weeks after</span></a>
      </div>
    </div>`;
    const apple = html`<div class="cal-option">
      <p class="cal-title">${icon('calendar', { size: 18 })}<span>iPhone Calendar</span></p>
      <div class="cal-buttons">${btn('Add to iPhone Calendar', { action: 'ics', variant: androidFirst ? 'secondary' : 'primary', size: 'sm', iconName: 'download' })}</div>
    </div>`;
    return html`${topbar({ back: '#/home', title: '' })}
      <div class="pad flow">
        <span class="success-mark">${icon('check', { size: 28 })}</span>
        <h1 class="screen-title" tabindex="-1">Your record is saved</h1>
        <p class="lead-sm">Your check-ins: <b>${formatDate(week2, { ref: ctx.today })}</b>, then every 4 weeks. Each takes about 30 seconds.</p>
        <section class="card card-plain">
          <h2 class="card-title">${icon('calendar')}<span>Add check-in dates</span></h2>
          ${androidFirst ? html`${google}${apple}` : html`${apple}${google}`}
          <p class="small muted">We can’t send you notifications. Same Spot also shows a banner when a check-in is due. Calendar events just say “Same Spot check-in”.</p>
        </section>
        ${btn('Go to my record', { href: '#/home', size: 'lg', cls: 'btn-block', iconRight: 'next' })}
      </div>`;
  },
  mount(root, ctx) {
    return bindActions(root, {
      ics() {
        const rec = recordById(ctx.params.id);
        downloadIcs(icsText(checkinEvents(rec), appUrl()), 'same-spot-check-ins.ics');
        toast('Calendar file ready. Open it to add your check-ins.');
      },
    });
  },
};

export { needsNotice, appUrl };
