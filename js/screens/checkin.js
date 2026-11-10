// S10 and S11. The check-in: four quick questions, one per screen, then
// optional matched photos at the 4-weekly check-ins.

import { html, icon, btn, topbar, bindActions, toast } from '../ui.js';
import { COPY, CONCERNS, USE_OPTIONS, FAST_ANSWERS, warningOf } from '../config.js';
import {
  recordById, checkinsFor, baselineOf, addCheckin, addBaseline, imageURL,
} from '../state.js';
import { checkinKind, nextDueDate } from '../engine.js';
import { formatDate, daysBetween } from '../dates.js';
import { captureSlots, captureHandlers, photoGuideCard } from './onboarding.js';
import { joinList } from '../copy.js';

function chip(label, selected, action, value, tone = '') {
  return html`<button type="button" class="chip ${tone} ${selected ? 'is-on' : ''}" aria-pressed="${String(!!selected)}" data-action="${action}" data-v="${value}">
    <span class="chip-check" aria-hidden="true">${icon('check', { size: 16 })}</span><span>${label}</span></button>`;
}

function option(label, selected, action, value, extra = '') {
  return html`<button type="button" class="answer-option ${selected ? 'is-on' : ''}" aria-pressed="${String(!!selected)}" data-action="${action}" data-v="${value}">
    <span class="radio-dot" aria-hidden="true"></span><span class="answer-label">${label}${extra ? html`<span class="answer-sub">${extra}</span>` : ''}</span></button>`;
}

export default {
  title: 'Check-in',
  cls: 'screen-checkin',
  guard(ctx) {
    const rec = recordById(ctx.params.id);
    if (!rec || rec.status === 'closed') return '/home';
    return null;
  },
  render(ctx) {
    const rec = recordById(ctx.params.id);
    const cfg = CONCERNS[rec.concern];
    const prior = checkinsFor(rec.id);
    const today = ctx.today;
    const L = ctx.local;
    if (!L.steps) {
      L.kind = checkinKind(rec, prior, today);
      L.noBaseline = baselineOf(rec.id).length === 0;
      L.steps = [];
      if ((rec.harmOpen || []).length) L.steps.push('follow');
      L.steps.push('use', 'changes', 'harm', 'fast');
      if (L.kind !== 'week2') L.steps.push('photos');
      L.i = 0;
      L.a = { harmFollowUp: null, use: null, changes: [], harm: [], fastSign: null };
      L.photos = {};
      L.notes = {};
    }
    const step = L.steps[L.i];
    const qSteps = ['use', 'changes', 'harm', 'fast'];
    const qn = qSteps.indexOf(step) + 1;
    const back = L.i > 0 ? 'prev' : '#/home';
    const head = topbar({ back, title: 'Check-in', backLabel: L.i > 0 ? 'Previous question' : 'Back to home' });
    const progress = html`<div class="progress" aria-hidden="true">${L.steps.map((s, k) => html`<span class="${k <= L.i ? 'on' : ''}"></span>`)}</div>`;
    const kicker = qn ? `Question ${qn} of 4` : step === 'follow' ? 'First, a quick check' : 'Photos · optional';

    let body;
    if (step === 'follow') {
      const labels = rec.harmOpen.map((h) => (warningOf(cfg, h.code) || {}).label).filter(Boolean).map((s) => s.toLowerCase());
      body = html`<h1 class="screen-title question" tabindex="-1">Last time you mentioned ${joinList(labels)}. How is it now?</h1>
        <div class="answer-list">
          ${option('It has settled', L.a.harmFollowUp === 'settled', 'follow', 'settled')}
          ${option('I’ve seen a doctor', L.a.harmFollowUp === 'doctor', 'follow', 'doctor')}
          ${option('It’s still there', L.a.harmFollowUp === 'still', 'follow', 'still')}
        </div>`;
    } else if (step === 'use') {
      const nextDue = nextDueDate(rec, prior);
      const early = today < nextDue;
      const late = daysBetween(nextDue, today) > 7;
      const since = prior.length ? 'Since your last check-in' : `Since you started your record on ${formatDate(rec.recordStart, { ref: today })}`;
      body = html`${late ? html`<p class="callout callout-blue">${icon('info', { size: 18 })}<span>Welcome back. We’ll count from your last check-in.</span></p>` : early ? html`<p class="callout">${icon('calendar', { size: 18 })}<span>It’s a bit early, that’s fine. Your next check-in was ${formatDate(nextDue, { ref: today })}.</span></p>` : ''}
        <h1 class="screen-title question" tabindex="-1">${since}, how often did you use it as the pack says?</h1>
        <div class="answer-list">${USE_OPTIONS.map((u) => option(u.label, L.a.use === u.id, 'use', u.id))}</div>
        <p class="small muted">There’s no wrong answer. An honest answer keeps your dates honest too.</p>`;
    } else if (step === 'changes') {
      const none = L.a.changes.length === 0;
      body = html`<h1 class="screen-title question" tabindex="-1">Anything new since last time?</h1>
        <div class="chips" role="group" aria-label="Changes">
          ${chip('Nothing new', none, 'change', '__none')}
          ${cfg.changes.map((c) => chip(c.label, L.a.changes.includes(c.code), 'change', c.code))}
        </div>
        <p class="small muted">Other changes can explain a difference too. Same Spot won’t credit the product when it can’t tell.</p>
        ${btn('Next', { action: 'next', size: 'lg', cls: 'btn-block', iconRight: 'next' })}`;
    } else if (step === 'harm') {
      const none = L.a.harm.length === 0;
      body = html`<h1 class="screen-title question" tabindex="-1">Any of these since last time?</h1>
        <div class="chips chips-stack" role="group" aria-label="Warning signs">
          ${chip('None of these', none, 'harm', '__none')}
          ${cfg.warnings.map((w) => chip(w.label, L.a.harm.includes(w.code), 'harm', w.code, 'chip-rose'))}
        </div>
        ${btn('Next', { action: 'next', size: 'lg', cls: 'btn-block', iconRight: 'next' })}`;
    } else if (step === 'fast') {
      const last = L.i === L.steps.length - 1;
      body = html`<h1 class="screen-title question" tabindex="-1">${cfg.fastSign.question}</h1>
        <div class="answer-list">${FAST_ANSWERS.map((f) => option(f.label, L.a.fastSign === f.id, 'fast', f.id))}</div>
        <p class="small muted">A quick sign is worth noting. It never changes the verdict on its own.</p>
        ${last && L.a.fastSign ? btn('Done', { action: 'finish', size: 'lg', cls: 'btn-block' }) : ''}`;
    } else {
      const baseline = Object.fromEntries(baselineOf(rec.id).map((p) => [p.view, p]));
      const count = Object.keys(L.photos).length;
      body = L.noBaseline
        ? html`<h1 class="screen-title" tabindex="-1">Take your first photos now?</h1>
            <p>You don’t have first photos yet. If you take them now, they become your starting point, and your first photo look comes ${cfg.early} weeks later.</p>
            ${photoGuideCard(cfg)}
            ${captureSlots(cfg, L)}`
        : html`<h1 class="screen-title" tabindex="-1">Two photos, matched to your first ones</h1>
            <p>Use the same spot and light as your first photos. Same Spot checks the light for you.</p>
            ${captureSlots(cfg, L, { baseline, checkLight: true })}`;
      body = html`${body}
        <p class="small muted center">${COPY.photoSupport}</p>
        <div class="stack sticky-actions">
          ${count
            ? btn(`Done, save ${count === 1 ? '1 photo' : `${count} photos`}`, { action: 'finish', size: 'lg', cls: 'btn-block' })
            : btn('Skip photos this time', { action: 'finish', variant: 'secondary', size: 'lg', cls: 'btn-block' })}
        </div>`;
    }

    return html`${head}<div class="pad flow checkin">
      ${progress}
      <p class="kicker">${kicker} · ${cfg.short}</p>
      ${body}
    </div>`;
  },
  mount(root, ctx) {
    const rec = recordById(ctx.params.id);
    const L = ctx.local;
    const go = (d) => {
      L.i = Math.max(0, Math.min(L.steps.length - 1, L.i + d));
      ctx.refresh();
      window.scrollTo(0, 0);
      const h = root.querySelector('h1');
      if (h) h.focus({ preventScroll: true });
    };
    const finish = async () => {
      if (L.saving) return;
      if (!L.a.use || !L.a.fastSign) {
        L.i = L.steps.indexOf(!L.a.use ? 'use' : 'fast');
        ctx.refresh();
        return;
      }
      L.saving = true;
      try {
        const photos = L.noBaseline ? {} : L.photos;
        const out = await addCheckin(rec.id, L.a, photos);
        if (L.noBaseline && Object.keys(L.photos).length) await addBaseline(rec.id, L.photos);
        Object.values(L.photos).forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
        if (out.harmOpen) ctx.nav(`/r/${rec.id}/check-this?new=1`);
        else if (out.look) ctx.nav(`/r/${rec.id}/look`);
        else {
          const fresh = recordById(rec.id);
          toast(`Check-in saved. Next check-in: ${formatDate(nextDueDate(fresh, checkinsFor(rec.id)), { ref: ctx.today })}.`);
          ctx.nav('/home');
        }
      } catch (e) {
        L.saving = false;
        toast(e && e.code === 'quota' ? 'Your phone is out of space for photos. Free some space, or skip photos for now.' : 'Something went wrong saving. Please try again.');
      }
    };
    const toggle = (list, v) => {
      if (v === '__none') return [];
      return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
    };
    const baselineBrightness = Object.fromEntries(baselineOf(rec.id).map((p) => [p.view, p.brightness]));
    const cap = captureHandlers(root, ctx, L, {
      baselineBrightness: L.noBaseline ? null : baselineBrightness,
      getGhost: (view) => {
        const b = baselineOf(rec.id).find((p) => p.view === view);
        return b ? imageURL(b.id, 'full') : null;
      },
    });
    return bindActions(root, {
      ...cap,
      prev: () => go(-1),
      follow(el) {
        L.a.harmFollowUp = el.dataset.v;
        setTimeout(() => go(1), 140);
        el.classList.add('is-on');
      },
      use(el) {
        L.a.use = el.dataset.v;
        el.classList.add('is-on');
        setTimeout(() => go(1), 140);
      },
      change(el) {
        L.a.changes = toggle(L.a.changes, el.dataset.v);
        ctx.refresh();
      },
      harm(el) {
        L.a.harm = toggle(L.a.harm, el.dataset.v);
        ctx.refresh();
      },
      fast(el) {
        L.a.fastSign = el.dataset.v;
        el.classList.add('is-on');
        if (L.steps[L.steps.length - 1] === 'fast') ctx.refresh();
        else setTimeout(() => go(1), 140);
      },
      next: () => go(1),
      finish,
    });
  },
};
