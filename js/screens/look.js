// S12 and S13. The look without dates, then the verdict card with next steps.

import { html, icon, btn, topbar, bindActions, verdictCard, toast, confirmDialog } from '../ui.js';
import { COPY, CONCERNS, FAST_ANSWERS, VERDICT_FAMILY } from '../config.js';
import {
  recordById, checkinById, checkinsFor, baselineOf, latestPhotos, previewLook, recordLook, keepTracking,
  closeRecord, pauseRecord, restartDraftFrom,
} from '../state.js';
import { formatDate, formatDateShort } from '../dates.js';
import { projectLook } from '../engine.js';
import { toPick } from './sample-check.js';

function coin() {
  const a = new Uint8Array(1);
  crypto.getRandomValues(a);
  return a[0] < 128;
}

const LOOK_NAME = { early: 'early look', full: 'full look', extra: 'next look', photo: 'first photo look' };

export const look = {
  title: 'Your look',
  cls: 'screen-look',
  guard(ctx) {
    const rec = recordById(ctx.params.id);
    if (!rec) return '/home';
    if (!rec.pendingLook) return `/r/${rec.id}`;
    return null;
  },
  render(ctx) {
    const rec = recordById(ctx.params.id);
    const cfg = CONCERNS[rec.concern];
    const L = ctx.local;
    const today = ctx.today;
    if (!L.init) {
      const probe = previewLook(rec.id);
      L.needs = probe.needs || 'none';
      L.reason = probe.reason || null;
      L.views = (probe.views || []).map((id) => cfg.views.find((v) => v.id === id));
      L.order = L.views.map(() => coin());
      L.picks = [];
      L.step = L.needs === 'comparison' ? 'intro' : L.needs === 'sense' ? 'sense' : 'none';
      L.helper = false;
      L.init = true;
    }
    const name = LOOK_NAME[rec.pendingLook.kind] || 'look';
    const head = topbar({ back: '#/home', title: `Your ${name}` });

    if (L.step === 'none') {
      return html`${head}<div class="pad flow center"><span class="big-icon spin">${icon('refresh', { size: 36 })}</span>
        <h1 class="screen-title" tabindex="-1">Working out your verdict</h1></div>`;
    }

    if (L.step === 'sense') {
      const why = L.reason === 'no-baseline'
        ? 'You don’t have first photos, so this reading is your sense only.'
        : 'Your new photos can’t be compared with your first ones yet, so Same Spot also asks how it seems to you.';
      return html`${head}<div class="pad flow">
        <p class="kicker">Your ${name} · ${cfg.short}</p>
        <h1 class="screen-title question" tabindex="-1">Compared with when you started, how does it seem to you?</h1>
        <p class="callout">${icon('info', { size: 18 })}<span>${why}</span></p>
        <div class="answer-list">${FAST_ANSWERS.map(
          (f) => html`<button type="button" class="answer-option" data-action="sense" data-v="${f.id}"><span class="radio-dot" aria-hidden="true"></span><span class="answer-label">${f.label}</span></button>`,
        )}</div>
      </div>`;
    }

    if (L.step === 'intro') {
      return html`${head}<div class="pad flow">
        <p class="kicker">Your ${name} · ${L.views.length} ${L.views.length === 1 ? 'pair' : 'pairs'}</p>
        <h1 class="screen-title display-sm" tabindex="-1">Let’s look without dates, so hope doesn’t decide for you.</h1>
        <p>You’ll see your first and latest photo side by side, in random order, labelled only A and B. Pick the one that looks better, or say they’re about the same.</p>
        <ul class="ticks">
          <li>${icon('check', { size: 18 })}<span>“Looks better” needs your newer photo picked in every pair.</span></li>
          <li>${icon('check', { size: 18 })}<span>Someone who didn’t see the start can choose for you.</span></li>
        </ul>
        <p class="small muted">${COPY.photoSupport}</p>
        <div class="stack">
          ${btn('Start', { action: 'start', size: 'lg', cls: 'btn-block', iconRight: 'next' })}
          ${btn('Ask someone else to choose', { action: 'helper', variant: 'secondary', size: 'lg', cls: 'btn-block', iconName: 'users' })}
        </div>
      </div>`;
    }

    if (L.step === 'handoff' || L.step === 'handback') {
      const back = L.step === 'handback';
      return html`${head}<div class="pad flow center handoff">
        <span class="handoff-icon">${icon('users', { size: 40 })}</span>
        <h1 class="screen-title" tabindex="-1">${back ? 'Thank you. Please hand the phone back.' : 'Hand your phone to someone you trust'}</h1>
        <p>${back ? 'Their picks are saved. You can see the dates now.' : 'They will see two photos at a time, without dates, and pick the one that looks better.'}</p>
        ${btn(back ? 'I have my phone back' : 'I’m ready to choose', { action: back ? 'reveal' : 'begin', size: 'lg', cls: 'btn-block' })}
      </div>`;
    }

    const base = Object.fromEntries(baselineOf(rec.id).map((p) => [p.view, p]));
    const latest = latestPhotos(rec.id);

    if (L.step === 'pair') {
      const i = L.picks.length;
      const v = L.views[i];
      const first = base[v.id];
      const last = latest[v.id];
      const left = L.order[i] ? last : first;
      const right = L.order[i] ? first : last;
      return html`${head}<div class="pad flow">
        <div class="progress" role="img" aria-label="Pair ${i + 1} of ${L.views.length}">${L.views.map((_, k) => html`<span class="${k <= i ? 'on' : ''}"></span>`)}</div>
        <p class="kicker">Pair ${i + 1} of ${L.views.length} · ${v.label}</p>
        <h1 class="screen-title question" tabindex="-1">${v.question}</h1>
        <div class="compare">
          <div class="compare-col"><figure class="shot shot-l"><div class="shot-media"><img data-photo="${left.id}" data-kind="full" alt="Photo A" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><span class="shot-label">A</span></div></figure></div>
          <div class="compare-col"><figure class="shot shot-l"><div class="shot-media"><img data-photo="${right.id}" data-kind="full" alt="Photo B" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><span class="shot-label">B</span></div></figure></div>
        </div>
        <div class="answer-row" role="group" aria-label="Your pick">
          <button type="button" class="answer" data-action="pick" data-v="A"><span class="answer-key">A</span><span>A looks better</span></button>
          <button type="button" class="answer" data-action="pick" data-v="B"><span class="answer-key">B</span><span>B looks better</span></button>
          <button type="button" class="answer answer-wide" data-action="pick" data-v="same">${icon('equal', { size: 20 })}<span>About the same</span></button>
        </div>
      </div>`;
    }

    // Reveal
    return html`${head}<div class="pad flow">
      <p class="kicker">The reveal</p>
      <h1 class="screen-title" tabindex="-1">Here are the dates</h1>
      ${L.views.map((v, i) => {
        const first = base[v.id];
        const last = latest[v.id];
        const A = L.order[i] ? last : first;
        const B = L.order[i] ? first : last;
        const pick = L.picks[i];
        const tag = (x, letter) => html`${letter} · ${x === first ? 'First' : 'Latest'}<span class="sub">${formatDateShort(x.date, { ref: today })}</span>`;
        const pk = toPick(pick, L.order[i]);
        const meaning = pk === 'latest' ? 'your newer photo' : pk === 'first' ? 'your first photo' : 'no clear difference';
        return html`<div class="reveal-pair">
          <p class="pair-title">${v.label}</p>
          <div class="compare compare-sm">
            <div class="compare-col ${pick === 'A' ? 'is-picked' : ''}"><figure class="shot"><div class="shot-media"><img data-photo="${A.id}" alt="Photo A" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><span class="shot-label">${tag(A, 'A')}</span></div></figure></div>
            <div class="compare-col ${pick === 'B' ? 'is-picked' : ''}"><figure class="shot"><div class="shot-media"><img data-photo="${B.id}" alt="Photo B" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><span class="shot-label">${tag(B, 'B')}</span></div></figure></div>
          </div>
          <p class="reveal-said">${icon('check', { size: 18 })}<span>${pick === 'same'
            ? html`${L.helper ? 'They' : 'You'} said <b>about the same</b>, so this pair shows no difference.`
            : html`${L.helper ? 'They' : 'You'} picked <b>${pick}</b>: ${meaning}.`}</span></p>
        </div>`;
      })}
      ${btn('See your verdict', { action: 'verdict', size: 'lg', cls: 'btn-block', iconRight: 'next' })}
    </div>`;
  },
  mount(root, ctx) {
    const rec = recordById(ctx.params.id);
    const L = ctx.local;
    const go = (step) => {
      L.step = step;
      ctx.refresh();
      window.scrollTo(0, 0);
      const h = root.querySelector('h1');
      if (h) h.focus({ preventScroll: true });
    };
    const finish = async (extra) => {
      if (L.saving) return;
      L.saving = true;
      try {
        const out = await recordLook(rec.id, rec.pendingLook.checkinId, extra);
        if (out.needs === 'sense') {
          L.saving = false;
          L.reason = out.result.reason;
          go('sense');
          return;
        }
        ctx.nav(`/r/${rec.id}/verdict/${rec.pendingLook.checkinId}`, { replace: true });
      } catch {
        L.saving = false;
        toast('Something went wrong saving. Please try again.');
      }
    };
    if (L.step === 'none') setTimeout(() => finish({}), 350);
    return bindActions(root, {
      start: () => go('pair'),
      helper() {
        L.helper = true;
        go('handoff');
      },
      begin: () => go('pair'),
      reveal: () => go('reveal'),
      pick(el) {
        L.picks.push(el.dataset.v);
        if (L.picks.length >= L.views.length) go(L.helper ? 'handback' : 'reveal');
        else go('pair');
      },
      sense: (el) => finish({ sense: el.dataset.v, comparison: L.picks.length ? L.views.map((v, i) => ({ view: v.id, pick: toPick(L.picks[i], L.order[i]) })) : null }),
      verdict: () =>
        finish({
          comparison: L.views.map((v, i) => ({ view: v.id, pick: toPick(L.picks[i], L.order[i]) })),
          chooser: L.helper ? 'someone else' : 'self',
        }),
    });
  },
};

// ---------- S13 ----------

function nextSteps(code, rec, today) {
  const cfg = CONCERNS[rec.concern];
  const checkins = checkinsFor(rec.id);
  const full = projectLook(rec, checkins, today, cfg.full);
  const fullDate = full.date ? formatDate(full.date, { ref: today }) : null;
  const four = {
    grid: true,
    items: [
      { action: 'keeptracking', label: 'Keep going', icon: 'play' },
      { action: 'pause', label: 'Pause and decide later', icon: 'pause' },
      { action: 'derm', label: 'Talk to a dermatologist', icon: 'doctor' },
      { action: 'stop', label: 'Stop using it', icon: 'stop' },
    ],
  };
  switch (code) {
    case 'TOO_EARLY':
    case 'BETTER_SO_FAR':
    case 'BETTER_SO_FAR_CHANGED':
    case 'NO_CLEAR_YET':
      return {
        note: fullDate ? `Keep going. Your full look is on ${fullDate}.` : 'Keep going when you’re ready.',
        items: [
          { action: 'home', label: 'Keep going', icon: 'play', primary: true },
          { action: 'reminders', label: 'Add check-in reminders', icon: 'calendar' },
          { action: 'derm', label: 'Talk to a dermatologist if you’re worried', icon: 'doctor' },
        ],
      };
    case 'TOO_EARLY_PHOTOS':
      return {
        note: rec.photoLookDue ? `Your first photo look is on ${formatDate(rec.photoLookDue, { ref: today })}.` : null,
        items: [
          { action: 'home', label: 'Keep going', icon: 'play', primary: true },
          { action: 'reminders', label: 'Add check-in reminders', icon: 'calendar' },
        ],
      };
    case 'SENSE_ONLY':
      return {
        items: [
          { action: 'firstphotos', label: 'Take my first photos today', icon: 'camera', primary: true },
          { action: 'home', label: 'Keep going without photos', icon: 'play' },
        ],
      };
    case 'CANT_COMPARE':
      return {
        items: [
          { action: 'retake', label: 'Take new photos now', icon: 'camera', primary: true },
          { action: 'home', label: 'Later this week', icon: 'calendar' },
        ],
      };
    case 'CANT_TELL_CHANGED':
      return {
        items: [
          { action: 'restart', label: 'Restart my record', icon: 'refresh', primary: true },
          { action: 'home', label: 'Keep this record going', icon: 'play' },
          { action: 'derm', label: 'Talk to a dermatologist', icon: 'doctor' },
        ],
      };
    case 'CANT_TELL_UNEVEN':
      return {
        note: 'You can restart with steadier use, or decide without a verdict.',
        items: [{ action: 'restart', label: 'Restart with steadier use', icon: 'refresh', primary: true }, ...four.items.slice(1)],
      };
    case 'BETTER_WHILE_USING':
    case 'BETTER_BUT_CHANGED':
      return {
        grid: true,
        note: 'Your full look is done. You can keep tracking for one more look after 12 more weeks of regular use, or close the record.',
        items: [
          { action: 'keeptracking', label: 'Keep tracking', icon: 'play' },
          { action: 'close', label: 'Close the record', icon: 'check' },
        ],
      };
    case 'NO_CLEAR_FULL':
      return { ...four, note: 'Four equal choices. Nothing here is a sales pitch.' };
    case 'LOOKS_WORSE':
      return {
        grid: true,
        items: [
          { action: 'derm', label: 'Talk to a dermatologist', icon: 'doctor' },
          { action: 'pause', label: 'Pause and decide later', icon: 'pause' },
          { action: 'stop', label: 'Stop using it', icon: 'stop' },
          { action: 'home', label: 'Keep going', icon: 'play' },
        ],
      };
    default:
      return { items: [{ action: 'home', label: 'OK', icon: 'check', primary: true }] };
  }
}

export const verdict = {
  title: 'Your verdict',
  cls: 'screen-verdict',
  guard(ctx) {
    const rec = recordById(ctx.params.id);
    const c = checkinById(ctx.params.cid);
    if (!rec || !c) return '/home';
    if (c.verdict === 'CHECK_FIRST') return `/r/${rec.id}/check-this`;
    if (!c.verdictText) return `/r/${rec.id}`;
    return null;
  },
  render(ctx) {
    const rec = recordById(ctx.params.id);
    const c = checkinById(ctx.params.cid);
    const t = c.verdictText;
    const copy = { ...t, code: c.verdict, family: VERDICT_FAMILY[c.verdict], footer: 'This is your view of your own photos, not a medical assessment.' };
    const steps = nextSteps(c.verdict, rec, ctx.today);
    const open = ctx.local.showSteps;
    return html`${topbar({ back: '#/home', title: '' })}
      <div class="pad flow verdict-screen">
        <p class="kicker">${rec.productName}</p>
        <h1 class="visually-hidden" tabindex="-1">Your verdict: ${t.title}</h1>
        ${verdictCard(copy, { kicker: c.lookKind ? `Your ${LOOK_NAME[c.lookKind] || 'look'}` : 'Verdict', date: c.verdictAt || c.date, today: ctx.today, openWhy: true })}
        ${c.chooser === 'someone else' ? html`<p class="small muted icon-line">${icon('users', { size: 16 })}<span>Someone else chose without dates.</span></p>` : ''}
        <div class="stack">
          ${btn('OK', { href: '#/home', size: 'lg', cls: 'btn-block' })}
          ${btn(open ? 'Hide next steps' : 'What now?', { action: 'steps', variant: 'secondary', size: 'lg', cls: 'btn-block' })}
        </div>
        ${open
          ? html`<section class="card card-plain next-steps" aria-labelledby="ns-title">
              <h2 id="ns-title" class="card-title">${icon('flag')}<span>What now?</span></h2>
              ${steps.note ? html`<p>${steps.note}</p>` : ''}
              <div class="${steps.grid ? 'choice-grid' : 'stack'}">
                ${steps.items.map((s) =>
                  steps.grid
                    ? html`<button type="button" class="choice" data-action="${s.action}">${icon(s.icon)}<span>${s.label}</span></button>`
                    : btn(s.label, { action: s.action, iconName: s.icon, variant: s.primary ? 'primary' : 'secondary', cls: 'btn-block' }),
                )}
              </div>
              ${ctx.local.after ? html`<p class="choice-after" role="status">${icon('check', { size: 18 })}<span>${ctx.local.after}</span></p>` : ''}
              ${ctx.local.derm ? btn('Open the summary for a dermatologist', { href: `#/r/${rec.id}/summary`, variant: 'secondary', iconName: 'printer', cls: 'btn-block' }) : ''}
            </section>`
          : ''}
      </div>`;
  },
  mount(root, ctx) {
    const rec = recordById(ctx.params.id);
    return bindActions(root, {
      steps() {
        ctx.local.showSteps = !ctx.local.showSteps;
        ctx.refresh();
      },
      home: () => ctx.nav('/home'),
      reminders: () => ctx.nav(`/r/${rec.id}/reminders`),
      retake: () => ctx.nav(`/r/${rec.id}/photos?for=look`),
      firstphotos: () => ctx.nav(`/r/${rec.id}/photos?for=baseline`),
      restart() {
        restartDraftFrom(rec.id);
        ctx.nav('/new/expect');
      },
      async keeptracking() {
        await keepTracking(rec.id);
        toast('One more look after 12 more weeks of regular use.');
        ctx.nav('/home');
      },
      async close() {
        const ok = await confirmDialog({ title: 'Close this record?', body: 'Your record stays on this phone. You can look at it any time.', confirmLabel: 'Close the record' });
        if (!ok) return;
        await closeRecord(rec.id, 'done');
        toast('Record closed. It stays on this phone.');
        ctx.nav('/home');
      },
      async pause() {
        await pauseRecord(rec.id);
        toast('Your clock is paused.');
        ctx.nav('/home');
      },
      derm() {
        ctx.local.after = 'Show them your record. The one-page summary can be printed or shown on your phone.';
        ctx.local.derm = true;
        ctx.refresh();
      },
      async stop() {
        const ok = await confirmDialog({ title: 'Stop using it?', body: 'Your record stays here. You can look at it any time.', confirmLabel: 'Stop and close the record' });
        if (!ok) return;
        await closeRecord(rec.id, 'stopped');
        toast('Your record stays here. You can look at it any time.');
        ctx.nav('/home');
      },
    });
  },
};

export { LOOK_NAME };
