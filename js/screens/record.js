// S14 Please check this, S15 Pack running out, S16 My record,
// the dermatologist summary, and photos taken outside a check-in.

import { html, raw, icon, btn, topbar, banner, bindActions, verdictCard, toast, confirmDialog, dialog, clockMath, clockBar } from '../ui.js';
import { COPY, CONCERNS, USE_BY_ID, FAST_BY_ID, VERDICT_TITLES, VERDICT_FAMILY, changeOf, warningOf, productOf } from '../config.js';
import {
  S, recordById, checkinsFor, photosFor, baselineOf, latestPhotos, closeHarm, choosePackOption, openedNewPack,
  pauseRecord, resumeRecord, closeRecord, reopenRecord, deleteRecord, addBaseline, addCheckinPhotos, restartDraftFrom, imageURL,
} from '../state.js';
import { computeClock, projectLook, packStatus, trialWeek, isPaused } from '../engine.js';
import { harmParagraphs, packLine } from '../copy.js';
import { formatDate, formatDateShort, todayStr } from '../dates.js';
import { recordModel } from '../cards.js';
import { captureSlots, captureHandlers, photoGuideCard, expectContent } from './onboarding.js';
import { LOOK_NAME } from './look.js';

// ---------- S14 ----------

export const harm = {
  title: 'Please check this first',
  cls: 'screen-harm',
  guard(ctx) {
    const rec = recordById(ctx.params.id);
    if (!rec) return '/home';
    if (!(rec.harmOpen || []).length && !ctx.local.closedNow) return `/r/${rec.id}`;
    return null;
  },
  render(ctx) {
    const rec = recordById(ctx.params.id);
    const cfg = CONCERNS[rec.concern];
    const fresh = ctx.query.get('new') === '1';
    if (ctx.local.closedNow) {
      return html`${topbar({ back: '#/home', title: '' })}
        <div class="pad flow center"><span class="success-mark">${icon('check', { size: 28 })}</span>
        <h1 class="screen-title" tabindex="-1">Thank you for letting us know</h1>
        <p>Same Spot has closed the warning. Your next look can go ahead as planned.</p>
        ${btn('Back to my record', { href: '#/home', size: 'lg', cls: 'btn-block' })}</div>`;
    }
    const codes = rec.harmOpen.map((h) => h.code);
    const copy = {
      code: 'CHECK_FIRST',
      family: 'safety',
      title: VERDICT_TITLES.CHECK_FIRST,
      paragraphs: harmParagraphs(cfg, codes),
      below: [COPY.harmFollow],
      reasons: [],
      footer: 'This is your view of your own record, not a medical assessment.',
    };
    const since = rec.harmOpen[0].since;
    return html`${topbar({ back: '#/home', title: '' })}
      <div class="pad flow">
        <h1 class="visually-hidden" tabindex="-1">Please check this first</h1>
        ${verdictCard(copy, { kicker: 'Warning sign', date: since, today: ctx.today })}
        ${fresh
          ? html`<div class="stack">${btn('I’ve read this', { href: '#/home', size: 'lg', cls: 'btn-block' })}
              ${btn('Summary for a dermatologist', { href: `#/r/${rec.id}/summary`, variant: 'tertiary', iconName: 'printer', cls: 'btn-block' })}</div>
              <p class="small muted">This stays on your Home screen. At your next check-in you can say whether it has settled.</p>`
          : html`<div class="stack">
              ${btn('It has settled', { action: 'settled', size: 'lg', cls: 'btn-block' })}
              ${btn('I’ve seen a doctor', { action: 'doctor', variant: 'secondary', size: 'lg', cls: 'btn-block' })}
              ${btn('Summary for a dermatologist', { href: `#/r/${rec.id}/summary`, variant: 'tertiary', iconName: 'printer', cls: 'btn-block' })}
            </div>`}
      </div>`;
  },
  mount(root, ctx) {
    const rec = recordById(ctx.params.id);
    const close = async (how) => {
      await closeHarm(rec.id, how);
      ctx.local.closedNow = true;
      ctx.refresh();
    };
    return bindActions(root, { settled: () => close('settled'), doctor: () => close('doctor') });
  },
};

// ---------- S15 ----------

const PACK_AFTER = {
  keep: 'Your record continues.',
  pause: 'Your clock is paused.',
  derm: 'Show them your record. It’s in My record.',
  stop: 'Your record stays here. You can look at it any time.',
};

export const pack = {
  title: 'Your pack',
  cls: 'screen-pack',
  guard(ctx) {
    return recordById(ctx.params.id) ? null : '/home';
  },
  render(ctx) {
    const rec = recordById(ctx.params.id);
    const cfg = CONCERNS[rec.concern];
    const today = ctx.today;
    const m = recordModel(rec, checkinsFor(rec.id), photosFor(rec.id), today);
    const ps = packStatus(rec, today);
    const beforeFull = m.clock.weeks < cfg.full;
    const after = ctx.local.choice;
    const choices = [
      { id: 'keep', label: beforeFull ? 'Keep going to my full look' : 'Keep going', icon: 'play' },
      { id: 'pause', label: 'Pause and decide later', icon: 'pause' },
      { id: 'derm', label: 'Talk to a dermatologist', icon: 'doctor' },
      { id: 'stop', label: 'Stop using it', icon: 'stop' },
    ];
    return html`${topbar({ back: '#/home', title: '' })}
      <div class="pad flow">
        <p class="kicker">${rec.productName}</p>
        <h1 class="screen-title" tabindex="-1">${packLine(ps, today)}</h1>
        <p>Here’s where your record stands.</p>
        <section class="card card-plain stand">
          <span class="status-chip" data-family="${m.family}">${icon('flag', { size: 18 })}<span>${m.title}</span></span>
          ${clockBar({ clock: m.clock, cfg, dates: m.dates, done: m.done, today })}
          ${beforeFull
            ? html`<p>${ps.daysLeft >= 0
                ? html`To reach your full look without a gap, you’d need a new pack by <b>${formatDate(ps.finish, { ref: today })}</b>.`
                : html`To reach your full look, you’d need a new pack. Days without it count as zero on your clock.`}</p>`
            : ''}
        </section>
        <div class="choice-grid" role="group" aria-label="Four equal choices">
          ${choices.map(
            (c) => html`<button type="button" class="choice ${after === c.id ? 'is-picked' : ''}" data-action="choose" data-choice="${c.id}" ${after ? raw('disabled') : ''}>${icon(c.icon)}<span>${c.label}</span></button>`,
          )}
        </div>
        ${after
          ? html`<p class="choice-after" role="status">${icon('check', { size: 18 })}<span>${PACK_AFTER[after]}</span></p>
              <div class="stack">${after === 'derm' ? btn('Open my record summary', { href: `#/r/${rec.id}/summary`, variant: 'secondary', cls: 'btn-block', iconName: 'printer' }) : ''}
              ${btn('Done', { href: '#/home', size: 'lg', cls: 'btn-block' })}</div>`
          : html`<p class="small muted">Four choices of equal size. No prices, no links to buy.</p>
              <button type="button" class="link-btn" data-action="newpack">${icon('pack', { size: 18 })}<span>I’ve already opened a new pack</span></button>`}
      </div>`;
  },
  mount(root, ctx) {
    const rec = recordById(ctx.params.id);
    return bindActions(root, {
      async choose(el) {
        const choice = el.dataset.choice;
        if (choice === 'stop') {
          const ok = await confirmDialog({ title: 'Stop using it?', body: 'Your record stays here. You can look at it any time.', confirmLabel: 'Stop and close the record' });
          if (!ok) return;
        }
        await choosePackOption(rec.id, choice);
        ctx.local.choice = choice;
        ctx.refresh();
      },
      async newpack() {
        await openedNewPack(rec.id);
        toast('Got it. Your pack date is reset from today.');
        ctx.nav('/home');
      },
    });
  },
};

// ---------- S16 ----------

function historyItems(rec, today) {
  const cfg = CONCERNS[rec.concern];
  const items = [];
  items.push({
    date: rec.recordStart,
    title: 'Record started',
    lines: [
      rec.productStart < rec.recordStart ? `Started using it on ${formatDate(rec.productStart, { ref: today })}, ${USE_BY_ID[rec.setupUse].phrase}.` : `Use: ${USE_BY_ID[rec.setupUse].phrase}.`,
      baselineOf(rec.id).length ? `${baselineOf(rec.id).length} first photo${baselineOf(rec.id).length > 1 ? 's' : ''} taken.` : 'No first photos.',
    ],
    tone: 'start',
  });
  for (const c of checkinsFor(rec.id)) {
    const lines = [`Used it ${USE_BY_ID[c.use] ? USE_BY_ID[c.use].phrase : 'unknown'}.`];
    const ch = (c.changes || []).map((code) => (changeOf(cfg, code) || {}).label).filter(Boolean);
    lines.push(ch.length ? `New: ${ch.join(', ')}.` : 'Nothing new.');
    const hm = (c.harm || []).map((code) => (warningOf(cfg, code) || {}).label).filter(Boolean);
    if (hm.length) lines.push(`Warning sign: ${hm.join(', ')}.`);
    if (c.harmFollowUp) lines.push(c.harmFollowUp === 'still' ? 'Earlier warning sign: still there.' : `Earlier warning sign: ${c.harmFollowUp === 'doctor' ? 'seen a doctor' : 'settled'}.`);
    if (c.fastSign) lines.push(`${cfg.fastSign.label}: ${FAST_BY_ID[c.fastSign].label.toLowerCase()}.`);
    if ((c.photoIds || []).length) lines.push(`${c.photoIds.length} photo${c.photoIds.length > 1 ? 's' : ''}.`);
    items.push({
      date: c.date,
      title: `Week ${trialWeek(rec, c.date)} ${c.kind === 'checkpoint' ? `· ${LOOK_NAME[c.lookKind] || 'look'}` : c.kind === 'week2' ? 'check-in' : 'check-in'}`,
      lines,
      verdict: c.verdict ? { code: c.verdict, title: VERDICT_TITLES[c.verdict], checkinId: c.id } : null,
      tone: hm.length ? 'harm' : c.kind === 'checkpoint' ? 'look' : 'checkin',
      photoIds: c.photoIds || [],
    });
  }
  return items;
}

export const recordScreen = {
  title: 'My record',
  cls: 'screen-record',
  guard(ctx) {
    return recordById(ctx.params.id) ? null : '/home';
  },
  render(ctx) {
    const rec = recordById(ctx.params.id);
    const cfg = CONCERNS[rec.concern];
    const prod = productOf(rec.concern, rec.productId);
    const today = ctx.today;
    const m = recordModel(rec, checkinsFor(rec.id), photosFor(rec.id), today);
    const show = ctx.local.showPhotos;
    const items = historyItems(rec, today);
    const base = baselineOf(rec.id);
    const thumbs = (ids) =>
      show && ids.length
        ? html`<div class="thumbs">${ids.map((id) => html`<img data-photo="${id}" alt="Photo from this check-in" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">`)}</div>`
        : '';
    return html`${topbar({ back: '#/home', title: 'My record' })}
      <div class="pad flow">
        <header class="record-head">
          <p class="kicker">${cfg.label}</p>
          <h1 class="screen-title" tabindex="-1">${rec.productName}</h1>
          <p class="muted">Record started ${formatDate(rec.recordStart, { ref: today, year: true })}${rec.status === 'closed' ? html` · closed ${formatDate(rec.closedOn, { ref: today })}` : m.paused ? ' · paused' : ''}</p>
        </header>

        <section class="card card-plain">
          ${clockBar({ clock: m.clock, cfg, dates: m.dates, done: m.done, today })}
          <details class="sources"><summary>How we counted${icon('chevron', { size: 16, cls: 'why-chev' })}</summary>${clockMath(m.clock, today)}</details>
        </section>

        ${(rec.harmOpen || []).length ? html`<a class="banner banner-rose" href="#/r/${rec.id}/check-this"><span class="banner-icon">${icon('alert')}</span><span class="banner-text"><strong>Please check this first</strong><span>A warning sign is open.</span></span><span class="banner-go">${icon('chevron')}</span></a>` : ''}

        <section aria-labelledby="hist-title">
          <div class="section-row">
            <h2 id="hist-title" class="section-title-sm">Your check-ins</h2>
            <button type="button" class="link-btn" data-action="photos" aria-pressed="${String(!!show)}">${icon(show ? 'eyeOff' : 'eye', { size: 18 })}<span>${show ? 'Hide photos' : 'Show photos'}</span></button>
          </div>
          <ol class="history">
            ${items.map(
              (it, idx) => html`<li class="h-item h-${it.tone}">
                <span class="h-dot" aria-hidden="true"></span>
                <div class="h-body">
                  <p class="h-date">${formatDate(it.date, { ref: today })}</p>
                  <p class="h-title">${it.title}</p>
                  ${it.lines.map((l) => html`<p class="h-line">${l}</p>`)}
                  ${it.verdict && it.verdict.code !== 'CHECK_FIRST'
                    ? html`<a class="h-verdict" data-family="${VERDICT_FAMILY[it.verdict.code]}" href="#/r/${rec.id}/verdict/${it.verdict.checkinId}">${it.verdict.title}${icon('chevron', { size: 16 })}</a>`
                    : it.verdict ? html`<span class="h-verdict" data-family="safety">${it.verdict.title}</span>` : ''}
                  ${idx === 0 ? thumbs(base.map((p) => p.id)) : thumbs(it.photoIds || [])}
                </div>
              </li>`,
            )}
          </ol>
          ${show ? html`<p class="small muted">${COPY.photoSupport}</p>` : ''}
        </section>

        <section class="card card-plain record-actions">
          <h2 class="card-title">${icon('grid')}<span>Your record</span></h2>
          <div class="stack">
            ${btn('Summary for a dermatologist', { href: `#/r/${rec.id}/summary`, variant: 'secondary', iconName: 'printer', cls: 'btn-block' })}
            ${!base.length && rec.status !== 'closed' ? btn('Take my first photos', { href: `#/r/${rec.id}/photos?for=baseline`, variant: 'secondary', iconName: 'camera', cls: 'btn-block' }) : ''}
            ${rec.status === 'closed'
              ? btn('Reopen this record', { action: 'reopen', variant: 'secondary', iconName: 'play', cls: 'btn-block' })
              : m.paused
                ? btn('Resume this record', { action: 'resume', variant: 'secondary', iconName: 'play', cls: 'btn-block' })
                : btn('Pause this record', { action: 'pause', variant: 'secondary', iconName: 'pause', cls: 'btn-block' })}
            ${rec.status !== 'closed' ? btn('Restart this record', { action: 'restart', variant: 'secondary', iconName: 'refresh', cls: 'btn-block' }) : ''}
            ${rec.status !== 'closed' ? btn('Close this record', { action: 'close', variant: 'secondary', iconName: 'check', cls: 'btn-block' }) : ''}
            ${btn('Delete this record', { action: 'delete', variant: 'danger-soft', iconName: 'trash', cls: 'btn-block' })}
          </div>
        </section>

        <details class="card card-plain">
          <summary class="card-title">${icon('info')}<span>What to expect, again</span>${icon('chevron', { size: 16, cls: 'why-chev' })}</summary>
          ${expectContent(cfg, prod, rec, checkinsFor(rec.id), today, { forRecord: true })}
        </details>
      </div>`;
  },
  mount(root, ctx) {
    const rec = recordById(ctx.params.id);
    return bindActions(root, {
      photos() {
        ctx.local.showPhotos = !ctx.local.showPhotos;
        ctx.refresh();
      },
      async pause() {
        await pauseRecord(rec.id);
        toast('Paused. Your clock is stopped.');
        ctx.refresh();
      },
      async resume() {
        const p = (rec.pauses || []).slice(-1)[0];
        const today = todayStr();
        const date = await dialog({
          title: 'When did you start using it again?',
          content: html`<label class="text-field"><span>Date</span><input type="date" id="resume-date" min="${p ? p.start : rec.recordStart}" max="${today}" value="${today}"></label>`,
          buttons: [
            { label: 'Resume my record', value: (m) => m.querySelector('#resume-date').value || today, variant: 'primary' },
            { label: 'Cancel', value: null, variant: 'secondary' },
          ],
        });
        if (!date) return;
        await resumeRecord(rec.id, date);
        toast('Your clock is running again.');
        ctx.refresh();
      },
      async close() {
        const ok = await confirmDialog({ title: 'Close this record?', body: 'It stays on this phone, and you can reopen it.', confirmLabel: 'Close this record' });
        if (!ok) return;
        await closeRecord(rec.id, 'closed');
        toast('Record closed.');
        ctx.refresh();
      },
      async reopen() {
        await reopenRecord(rec.id);
        ctx.refresh();
      },
      async restart() {
        const ok = await confirmDialog({
          title: 'Restart this record?',
          body: 'This record will be closed and kept. A new one starts today with new first photos. Your start date and use stay the same.',
          confirmLabel: 'Restart',
        });
        if (!ok) return;
        restartDraftFrom(rec.id);
        ctx.nav('/new/expect');
      },
      async delete() {
        const ok = await confirmDialog({ title: 'Delete this record?', body: 'Delete this record and its photos? This can’t be undone.', confirmLabel: 'Delete', danger: true });
        if (!ok) return;
        await deleteRecord(rec.id);
        toast('Record deleted.');
        ctx.nav('/home');
      },
    });
  },
};

// ---------- Summary for a dermatologist ----------

export const summary = {
  title: 'Record summary',
  cls: 'screen-summary',
  guard(ctx) {
    return recordById(ctx.params.id) ? null : '/home';
  },
  render(ctx) {
    const rec = recordById(ctx.params.id);
    const cfg = CONCERNS[rec.concern];
    const today = ctx.today;
    const list = checkinsFor(rec.id);
    const clock = computeClock(rec, list, today);
    const withPhotos = ctx.local.withPhotos;
    const base = baselineOf(rec.id);
    const latest = latestPhotos(rec.id);
    const harmAll = [...(rec.harmLog || []), ...(rec.harmOpen || [])];
    return html`<div class="no-print">${topbar({ back: `#/r/${rec.id}`, title: 'Summary' })}</div>
      <div class="pad flow summary">
        <div class="no-print summary-tools">
          <label class="check-row"><input type="checkbox" data-change="withPhotos" ${withPhotos ? raw('checked') : ''}><span class="check-box" aria-hidden="true">${icon('check', { size: 18 })}</span><span>Include first and latest photos</span></label>
          ${btn('Print or save as PDF', { action: 'print', iconName: 'printer', cls: 'btn-block' })}
          <p class="small muted">Show this on your phone or print it. It includes no name or contact details.</p>
        </div>
        <article class="paper">
          <header class="paper-head"><p class="paper-brand">Same Spot · record summary</p><p class="muted">Made ${formatDate(today, { year: true })}</p></header>
          <h1 class="paper-title" tabindex="-1">${cfg.label}: ${rec.productName}</h1>
          <dl class="kv">
            <div><dt>Started using it</dt><dd>${formatDate(rec.productStart, { year: true })}</dd></div>
            <div><dt>Record started</dt><dd>${formatDate(rec.recordStart, { year: true })}</dd></div>
            <div><dt>Weeks of regular use</dt><dd>${clock.wholeWeeks > cfg.full
              ? `About ${clock.wholeWeeks} (${Math.floor(clock.calendarWeeks)} calendar weeks). The full look is at ${cfg.full}.`
              : `About ${clock.wholeWeeks} of ${cfg.full} (${Math.floor(clock.calendarWeeks)} calendar weeks)`}</dd></div>
            <div><dt>Status</dt><dd>${rec.status === 'closed' ? `Closed${rec.closedReason === 'stopped' ? ', stopped using it' : ''}` : isPaused(rec, today) ? 'Paused' : 'Active'}</dd></div>
            <div><dt>Latest verdict</dt><dd>${rec.lastVerdict ? `${VERDICT_TITLES[rec.lastVerdict.code]} (${formatDate(rec.lastVerdict.date, { year: true })})` : 'No look yet'}</dd></div>
          </dl>
          <h2 class="paper-h">Check-ins</h2>
          <table class="paper-table">
            <thead><tr><th>Date</th><th>Use since last</th><th>New</th><th>${cfg.fastSign.label}</th><th>Verdict</th></tr></thead>
            <tbody>${list.map(
              (c) => html`<tr><td>${formatDateShort(c.date, { year: true })}</td><td>${USE_BY_ID[c.use] ? USE_BY_ID[c.use].label : ''}</td>
                <td>${(c.changes || []).map((code) => (changeOf(cfg, code) || {}).label).join(', ') || 'Nothing new'}</td>
                <td>${c.fastSign ? FAST_BY_ID[c.fastSign].label : ''}</td><td>${c.verdict ? VERDICT_TITLES[c.verdict] : ''}</td></tr>`,
            )}</tbody>
          </table>
          <h2 class="paper-h">Warning signs</h2>
          <p>${harmAll.length ? harmAll.map((h) => `${(warningOf(cfg, h.code) || {}).label} (${formatDate(h.since, { year: true })}${h.closedOn ? `, ${h.how === 'doctor' ? 'seen a doctor' : 'settled'} ${formatDate(h.closedOn, { year: true })}` : ', still open'})`).join('; ') : 'None logged.'}</p>
          ${withPhotos
            ? html`<h2 class="paper-h">Photos</h2><div class="paper-photos">
                ${cfg.views.map((v) => {
                  const f = base.find((p) => p.view === v.id);
                  const l = latest[v.id];
                  return html`<div><p class="small"><b>${v.label}</b></p><div class="paper-pair">
                    ${f ? html`<figure><img data-photo="${f.id}" data-kind="full" alt="First photo" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><figcaption>First · ${formatDateShort(f.date, { year: true })}</figcaption></figure>` : ''}
                    ${l ? html`<figure><img data-photo="${l.id}" data-kind="full" alt="Latest photo" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><figcaption>Latest · ${formatDateShort(l.date, { year: true })}${l.flagged ? ' · light differs' : ''}</figcaption></figure>` : ''}
                  </div></div>`;
                })}</div>`
            : ''}
          <p class="paper-foot">This record was kept by the person using the product, with Same Spot. It is not a medical assessment. Weeks of regular use count most-days weeks in full, half-the-days weeks as half, and a-few-times weeks as a quarter.</p>
        </article>
      </div>`;
  },
  mount(root, ctx) {
    return bindActions(root, {
      withPhotos(el) {
        ctx.local.withPhotos = el.checked;
        ctx.refresh();
      },
      print: () => window.print(),
    });
  },
};

// ---------- Photos outside a check-in ----------

export const photosLater = {
  title: 'Photos',
  cls: 'screen-photos',
  guard(ctx) {
    const rec = recordById(ctx.params.id);
    if (!rec) return '/home';
    const mode = ctx.query.get('for') === 'look' ? 'look' : 'baseline';
    if (mode === 'look' && !rec.pendingLook) return `/r/${rec.id}`;
    if (mode === 'baseline' && baselineOf(rec.id).length) return `/r/${rec.id}`;
    return null;
  },
  render(ctx) {
    const rec = recordById(ctx.params.id);
    const cfg = CONCERNS[rec.concern];
    const mode = ctx.query.get('for') === 'look' ? 'look' : 'baseline';
    const L = ctx.local;
    L.photos = L.photos || {};
    L.notes = L.notes || {};
    const count = Object.keys(L.photos).length;
    const baseline = Object.fromEntries(baselineOf(rec.id).map((p) => [p.view, p]));
    return html`${topbar({ back: mode === 'look' ? '#/home' : `#/r/${rec.id}`, title: '' })}
      <div class="pad flow">
        <p class="kicker">${rec.productName}</p>
        <h1 class="screen-title" tabindex="-1">${mode === 'look' ? 'New photos for your look' : 'Your first photos'}</h1>
        <p>${mode === 'look'
          ? 'Use the same spot and light as your first photos, and Same Spot will look again.'
          : `These become your starting point. Your first photo look comes ${cfg.early} weeks later.`}</p>
        ${photoGuideCard(cfg)}
        ${captureSlots(cfg, L, mode === 'look' ? { baseline, checkLight: true } : {})}
        <p class="small muted center">${COPY.photoSupport}</p>
        <div class="stack sticky-actions">
          ${btn(mode === 'look' ? 'Look again' : 'Save my first photos', { action: 'save', size: 'lg', cls: 'btn-block', disabled: !count })}
          ${btn('Not now', { href: mode === 'look' ? '#/home' : `#/r/${rec.id}`, variant: 'tertiary', cls: 'btn-block' })}
        </div>
      </div>`;
  },
  mount(root, ctx) {
    const rec = recordById(ctx.params.id);
    const mode = ctx.query.get('for') === 'look' ? 'look' : 'baseline';
    const L = ctx.local;
    const bb = Object.fromEntries(baselineOf(rec.id).map((p) => [p.view, p.brightness]));
    return bindActions(root, {
      ...captureHandlers(root, ctx, L, {
        baselineBrightness: mode === 'look' ? bb : null,
        getGhost: (view) => {
          const b = baselineOf(rec.id).find((p) => p.view === view);
          return b ? imageURL(b.id, 'full') : null;
        },
      }),
      async save() {
        try {
          if (mode === 'look') {
            await addCheckinPhotos(rec.id, rec.pendingLook.checkinId, L.photos);
            ctx.nav(`/r/${rec.id}/look`);
          } else {
            const updated = await addBaseline(rec.id, L.photos);
            toast(`First photos saved. Your first photo look is on ${formatDate(updated.photoLookDue, { ref: ctx.today })}.`);
            ctx.nav(`/r/${rec.id}`);
          }
          Object.values(L.photos).forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
        } catch (e) {
          toast(e && e.code === 'quota' ? 'Your phone is out of space for photos. Free some space, or skip photos for now.' : 'Something went wrong saving. Please try again.');
        }
      },
    });
  },
};

export { banner, projectLook, restartDraftFrom, S };
