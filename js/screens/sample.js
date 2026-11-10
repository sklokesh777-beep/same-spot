// S1. Sample mode: five fictional records, run through the real engine.
// Never asks for the camera, never writes to storage.

import { html, raw, icon, btn, topbar, verdictCard, ruleTrace, clockMath, shot, bindActions } from '../ui.js';
import { recordModel, recordCard } from '../cards.js';
import { COPY, SCENARIO_TABS, USE_OPTIONS, USE_BY_ID, changeOf, warningOf, FAST_BY_ID } from '../config.js';
import { buildScenario, photoCheckFor } from '../demo.js';
import { computeClock, projectLook, trialWeek, formatWeeks } from '../engine.js';
import { addDays, formatDate, formatDateShort } from '../dates.js';
import { harmParagraphs } from '../copy.js';

function useTable(sc, today) {
  const cfg = sc.cfg;
  const rows = USE_OPTIONS.filter((u) => u.id !== 'none').map((u) => {
    const record = { ...sc.record, setupUse: u.id };
    const checkins = sc.checkins.map((c) => ({ ...c, use: u.id }));
    const clock = computeClock(record, checkins, today);
    const early = projectLook(record, checkins, today, cfg.early);
    const full = projectLook(record, checkins, today, cfg.full);
    const cap = addDays(record.productStart, cfg.full * 2 * 7);
    const fullText = full.date && full.date > cap ? 'Cap reached first' : full.date ? formatDateShort(full.date, { ref: today }) : 'Not set';
    const earlyText = clock.weeks >= cfg.early ? 'Ready now' : early.date ? formatDateShort(early.date, { ref: today }) : 'Not set';
    const hers = u.id === sc.record.setupUse;
    return html`<li class="whatif-row ${hers ? 'is-hers' : ''}">
      <div class="whatif-top"><b>${u.label}</b>${hers ? html`<span class="tag">Her answer</span>` : ''}
        <span class="whatif-weeks"><b>${formatWeeks(clock.weeks)}</b> weeks counted</span></div>
      <dl class="whatif-dates">
        <div><dt>Early look</dt><dd>${earlyText}</dd></div>
        <div><dt>Full look</dt><dd>${fullText}</dd></div>
      </dl>
    </li>`;
  });
  return html`<section class="card card-soft what-if" aria-labelledby="whatif-title">
    <h3 id="whatif-title" class="card-title">${icon('clock')}<span>How often she uses it moves the dates</span></h3>
    <p class="small">The same ${Math.round(computeClock(sc.record, sc.checkins, today).calendarWeeks)} calendar weeks, counted three ways.</p>
    <ul class="whatif">${rows}</ul>
    <p class="small muted">${COPY.lessOftenNote} After twice the full window (${cfg.full * 2} weeks), Same Spot stops waiting and says the use was too uneven to tell.</p>
  </section>`;
}

function packPreview(sc, local, today) {
  const choices = [
    { id: 'keep', label: 'Keep going', icon: 'play', after: 'Her record continues.' },
    { id: 'pause', label: 'Pause and decide later', icon: 'pause', after: 'Her clock pauses until she starts again.' },
    { id: 'derm', label: 'Talk to a dermatologist', icon: 'doctor', after: 'She can show them her record. It’s in My record.' },
    { id: 'stop', label: 'Stop using it', icon: 'stop', after: 'Her record stays on her phone. She can look at it any time.' },
  ];
  const picked = choices.find((c) => c.id === local.pack);
  const finish = addDays(sc.record.packOpened, sc.record.packDays);
  return html`<section class="card pack-preview" aria-labelledby="pack-title">
    <h3 id="pack-title" class="card-title">${icon('pack')}<span>When her pack runs out</span></h3>
    <p>Her pack may run out around <b>${formatDate(finish, { ref: today })}</b>. Here’s where her record stands: <b>${sc.copy.title}</b>, after ${sc.result.clock.wholeWeeks} of ${sc.cfg.full} weeks.</p>
    <div class="choice-grid" role="group" aria-label="Four equal choices">
      ${choices.map((c) => html`<button type="button" class="choice ${local.pack === c.id ? 'is-picked' : ''}" data-action="pack" data-choice="${c.id}" aria-pressed="${String(local.pack === c.id)}">${icon(c.icon)}<span>${c.label}</span></button>`)}
    </div>
    ${picked ? html`<p class="choice-after" role="status">${icon('check', { size: 18 })}<span>${picked.after}</span></p>` : html`<p class="small muted">Four choices of equal size. No prices, no links to buy.</p>`}
  </section>`;
}

function harmPreview(sc) {
  return html`<section class="card harm-preview" aria-labelledby="harm-title">
    <h3 id="harm-title" class="card-title">${icon('alert')}<span>What she sees right after ticking it</span></h3>
    ${harmParagraphs(sc.cfg, ['burning']).map((p) => html`<p>${p}</p>`)}
    <p>${COPY.harmFollow}</p>
    <p class="small muted">This message stays on her Home screen until a later check-in, when she can mark it “It has settled” or “I’ve seen a doctor”. Until then, Same Spot never says “keep going”.</p>
  </section>`;
}

function checkinList(sc, today) {
  const cfg = sc.cfg;
  return html`<ol class="mini-timeline">
    <li><span class="mt-date">${formatDateShort(sc.record.recordStart, { ref: today })}</span><span class="mt-body"><b>Record started</b><span>First photos taken. ${USE_BY_ID[sc.record.setupUse].label}.</span></span></li>
    ${sc.checkins.map((c) => {
      const changes = (c.changes || []).map((code) => (changeOf(cfg, code) || {}).label).filter(Boolean);
      const harm = (c.harm || []).map((code) => (warningOf(cfg, code) || {}).label).filter(Boolean);
      return html`<li class="${harm.length ? 'is-harm' : c.kind === 'checkpoint' ? 'is-look' : ''}"><span class="mt-date">${formatDateShort(c.date, { ref: today })}</span>
        <span class="mt-body"><b>Week ${trialWeek(sc.record, c.date)} ${c.kind === 'checkpoint' ? (c.lookKind === 'full' ? '· full look' : '· early look') : 'check-in'}</b>
        <span>Used it ${USE_BY_ID[c.use].phrase}.${changes.length ? ` New: ${changes.join(', ')}.` : ''}${harm.length ? ` Warning: ${harm.join(', ')}.` : ''}${c.fastSign ? ` ${cfg.fastSign.label}: ${FAST_BY_ID[c.fastSign].label.toLowerCase()}.` : ''}</span></span></li>`;
    })}
  </ol>`;
}

function photosToggle(sc, local, today) {
  const cfg = sc.cfg;
  if (!local.showPhotos) {
    return html`<button type="button" class="reveal-btn" data-action="photos">${icon('eye')}<span>Show her photos</span><span class="small muted">Try the photo check first. Dates give it away.</span></button>`;
  }
  const latest = {};
  for (const p of sc.photos) if (p.role !== 'baseline') latest[p.view] = p;
  return html`<div class="photo-pairs">
    ${cfg.views.map((v) => {
      const first = sc.photos.find((p) => p.role === 'baseline' && p.view === v.id);
      const last = latest[v.id];
      return html`<div class="photo-pair"><p class="pair-title">${v.label}</p><div class="pair-row">
        ${first ? shot({ desc: first.desc, label: `${v.label}, first photo`, tag: 'First', sub: formatDateShort(first.date, { ref: today }) }) : ''}
        ${last ? shot({ desc: last.desc, label: `${v.label}, latest photo`, tag: 'Latest', sub: formatDateShort(last.date, { ref: today }) }) : html`<p class="small muted pair-none">No new photos yet. The week-2 check-in has no photos.</p>`}
      </div></div>`;
    })}
    <button type="button" class="link-btn" data-action="photos">${icon('eyeOff', { size: 18 })}<span>Hide photos</span></button>
  </div>`;
}

export default {
  title: 'Example',
  cls: 'screen-sample',
  render(ctx) {
    const id = SCENARIO_TABS.some((t) => t.id === ctx.params.scenario) ? ctx.params.scenario : 'too-early';
    const local = ctx.local;
    if (local.id !== id) {
      local.id = id;
      local.pack = null;
      local.showPhotos = false;
    }
    const sc = buildScenario(id);
    const today = sc.today;
    const index = SCENARIO_TABS.findIndex((t) => t.id === id);
    const next = SCENARIO_TABS[index + 1];
    const model = recordModel(sc.record, sc.checkins, sc.photos, today);
    const pc = photoCheckFor(id);
    const isHarm = sc.result.code === 'CHECK_FIRST';

    return html`
      ${topbar({ back: '#/', title: 'Example', right: html`<a class="topbar-link" href="#/">Exit example</a>` })}
      <div class="sample-banner" role="note">${icon('info', { size: 18 })}<span>${COPY.sampleBanner}</span></div>
      <nav class="tabs" aria-label="Example cases">
        <div class="tabs-track">
          ${SCENARIO_TABS.map(
            (t, i) => html`<a class="tab ${t.id === id ? 'is-active' : ''}" href="#/sample/${t.id}" ${t.id === id ? raw('aria-current="page"') : ''}><span class="tab-n">${i + 1}</span>${t.label}</a>`,
          )}
        </div>
      </nav>
      <div class="sample-layout">
        <div class="sample-main">
          <p class="case-count">Case ${index + 1} of ${SCENARIO_TABS.length}</p>
          <h1 class="screen-title" tabindex="-1">${SCENARIO_TABS[index].label}</h1>
          <p class="sample-intro">${sc.intro}</p>

          ${recordCard(model, { sample: true, hideActions: true })}

          ${verdictCard(sc.copy, {
            kicker: isHarm ? 'Week 2 check-in' : sc.record.lastVerdict ? 'Latest look' : 'Today',
            date: today,
            today,
            sample: true,
            openWhy: true,
          })}

          ${id === 'too-early' ? useTable(sc, today) : ''}
          ${id === 'full-trial' ? packPreview(sc, local, today) : ''}
          ${isHarm ? harmPreview(sc) : ''}
          ${sc.pastLooks && sc.pastLooks.length
            ? html`<p class="small muted past-look">${icon('flag', { size: 16 })}<span>At her early look on ${formatDate(sc.pastLooks[0].date, { ref: today })}, the verdict was “${sc.pastLooks[0].title}”.</span></p>`
            : ''}

          <div class="sample-actions">
            ${pc.pairs.length
              ? btn('Try the photo check', { href: `#/sample/${id}/check`, iconName: 'eye', size: 'lg', cls: 'btn-block' })
              : html`<p class="small muted center">There is no photo look at week 2, and with a warning sign open, Same Spot doesn’t run one.</p>`}
            ${next
              ? btn(`Next: ${next.label}`, { href: `#/sample/${next.id}`, variant: 'secondary', iconRight: 'next', size: 'lg', cls: 'btn-block' })
              : btn('Start my own record', { href: '#/start', variant: 'secondary', size: 'lg', cls: 'btn-block' })}
          </div>

          <section class="sample-photos" aria-label="Her photos">${photosToggle(sc, local, today)}</section>
        </div>

        <aside class="hood" aria-labelledby="hood-title">
          <div class="hood-inner">
            <p class="hood-kicker">${icon('grid', { size: 16 })}<span>Under the hood</span></p>
            <h2 id="hood-title" class="hood-title">How the verdict was decided</h2>
            ${ruleTrace(sc.result.trace)}
            <details class="hood-more" open>
              <summary>How the weeks were counted</summary>
              ${clockMath(sc.result.clock, today)}
            </details>
            <details class="hood-more">
              <summary>Her check-ins</summary>
              ${checkinList(sc, today)}
            </details>
          </div>
        </aside>
      </div>
      <div class="sample-foot">
        ${btn('Start my own record', { href: '#/start', variant: 'tertiary' })}
        ${btn('Exit example', { href: '#/', variant: 'tertiary' })}
      </div>`;
  },
  mount(root, ctx) {
    const active = root.querySelector('.tab.is-active');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
    return bindActions(root, {
      pack(el) {
        ctx.local.pack = el.dataset.choice;
        ctx.refresh();
      },
      photos() {
        ctx.local.showPhotos = !ctx.local.showPhotos;
        ctx.refresh();
      },
    });
  },
};
