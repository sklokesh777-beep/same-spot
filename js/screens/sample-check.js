// The photo check on illustrations: the comparison without dates (S12),
// played on an example case. Picks feed the real verdict rules.

import { html, icon, btn, topbar, verdictCard, shot, bindActions } from '../ui.js';
import { COPY, SCENARIO_TABS } from '../config.js';
import { photoCheckFor } from '../demo.js';
import { formatDate, formatDateShort } from '../dates.js';

function coin() {
  const a = new Uint8Array(1);
  (globalThis.crypto || { getRandomValues: (x) => ((x[0] = Math.floor(Math.random() * 256)), x) }).getRandomValues(a);
  return a[0] < 128;
}

export function toPick(letter, latestOnLeft) {
  if (letter === 'same') return 'same';
  const left = letter === 'A';
  return left === latestOnLeft ? 'latest' : 'first';
}

export default {
  title: 'Photo check',
  cls: 'screen-check',
  render(ctx) {
    const id = SCENARIO_TABS.some((t) => t.id === ctx.params.scenario) ? ctx.params.scenario : 'too-early';
    const pc = photoCheckFor(id);
    const L = ctx.local;
    if (!L.order || L.id !== id) {
      L.id = id;
      L.order = pc.pairs.map(() => coin());
      L.picks = [];
      L.step = 'intro';
      L.helper = false;
    }
    const today = ctx.today;
    const tab = SCENARIO_TABS.find((t) => t.id === id);
    const next = SCENARIO_TABS[SCENARIO_TABS.findIndex((t) => t.id === id) + 1];
    const header = topbar({ back: `#/sample/${id}`, title: 'Photo check', right: html`<a class="topbar-link" href="#/sample/${id}">Done</a>` });
    const bannerEl = html`<div class="sample-banner" role="note">${icon('info', { size: 18 })}<span>${COPY.sampleBanner}</span></div>`;

    if (!pc.pairs.length) {
      return html`${header}${bannerEl}<div class="pad"><h1 class="screen-title" tabindex="-1">No photo check here</h1>
        <p>There is no photo look at week 2, and while a warning sign is open, Same Spot doesn’t run one.</p>
        ${btn('Back to the example', { href: `#/sample/${id}`, variant: 'secondary' })}</div>`;
    }

    if (L.step === 'intro') {
      return html`${header}${bannerEl}<div class="pad flow">
        <p class="kicker">${tab.label} · ${pc.pairs.length} pairs</p>
        <h1 class="screen-title display-sm" tabindex="-1">Let’s look without dates, so hope doesn’t decide for you.</h1>
        <p>You’ll see two pictures at a time, labelled only A and B, in random order. Pick the one that looks better, or say they’re about the same.</p>
        ${pc.note ? html`<p class="callout">${icon('calendar', { size: 18 })}<span>${pc.note} That’s ${formatDate(pc.lookDate, { ref: today })}.</span></p>` : ''}
        <ul class="ticks">
          <li>${icon('check', { size: 18 })}<span>“Looks better” needs the newer picture picked in every pair. A lucky guess on two pairs is 1 in 4, not 1 in 2.</span></li>
          <li>${icon('check', { size: 18 })}<span>These are illustrations, not photos. In your own record you would see your own photos.</span></li>
        </ul>
        <div class="stack">
          ${btn('Start the photo check', { action: 'start', size: 'lg', cls: 'btn-block', iconRight: 'next' })}
          ${btn('Ask someone else to choose', { action: 'helper', variant: 'secondary', size: 'lg', cls: 'btn-block', iconName: 'users' })}
        </div>
      </div>`;
    }

    if (L.step === 'handoff' || L.step === 'handback') {
      const back = L.step === 'handback';
      return html`${header}${bannerEl}<div class="pad flow center handoff">
        <span class="handoff-icon">${icon('users', { size: 40 })}</span>
        <h1 class="screen-title" tabindex="-1">${back ? 'Thank you. Please hand the phone back.' : 'Hand the phone to someone you trust'}</h1>
        <p>${back ? 'Their picks are saved. You can see the dates now.' : 'They will see two pictures at a time, without dates, and pick the one that looks better. Someone who didn’t see the start is less swayed by hope.'}</p>
        ${btn(back ? 'I have the phone back' : 'I’m ready to choose', { action: back ? 'reveal' : 'begin', size: 'lg', cls: 'btn-block' })}
      </div>`;
    }

    if (L.step === 'pair') {
      const i = L.picks.length;
      const p = pc.pairs[i];
      const latestOnLeft = L.order[i];
      const left = latestOnLeft ? p.last : p.first;
      const right = latestOnLeft ? p.first : p.last;
      return html`${header}${bannerEl}<div class="pad flow">
        <div class="progress" role="img" aria-label="Pair ${i + 1} of ${pc.pairs.length}">${pc.pairs.map((_, k) => html`<span class="${k <= i ? 'on' : ''}"></span>`)}</div>
        <p class="kicker">Pair ${i + 1} of ${pc.pairs.length} · ${p.view.label}</p>
        <h1 class="screen-title question" tabindex="-1">${p.view.question}</h1>
        <div class="compare">
          <div class="compare-col">${shot({ desc: left.desc, label: 'Picture A', tag: 'A', size: 'l' })}</div>
          <div class="compare-col">${shot({ desc: right.desc, label: 'Picture B', tag: 'B', size: 'l' })}</div>
        </div>
        <div class="answer-row" role="group" aria-label="Your pick">
          <button type="button" class="answer" data-action="pick" data-v="A"><span class="answer-key">A</span><span>A looks better</span></button>
          <button type="button" class="answer" data-action="pick" data-v="B"><span class="answer-key">B</span><span>B looks better</span></button>
          <button type="button" class="answer answer-wide" data-action="pick" data-v="same">${icon('equal', { size: 20 })}<span>About the same</span></button>
        </div>
      </div>`;
    }

    // Reveal and verdict.
    const comparison = pc.pairs.map((p, i) => ({ view: p.view.id, pick: toPick(L.picks[i], L.order[i]) }));
    const { result, copy } = pc.verdictFor(comparison);
    return html`${header}${bannerEl}<div class="pad flow">
      <p class="kicker">The reveal</p>
      <h1 class="screen-title" tabindex="-1">Here are the dates</h1>
      ${pc.pairs.map((p, i) => {
        const latestOnLeft = L.order[i];
        const pick = L.picks[i];
        const A = latestOnLeft ? p.last : p.first;
        const B = latestOnLeft ? p.first : p.last;
        const tagFor = (x, letter) => `${letter} · ${x === p.first ? 'First' : 'Latest'}`;
        const subFor = (x) => formatDateShort(x.date, { ref: today });
        const who = L.helper ? 'They' : 'You';
        const said = pick === 'same'
          ? html`${who} said <b>about the same</b>, so this pair shows no difference.`
          : html`${who} picked <b>${pick}</b>: the ${comparison[i].pick === 'latest' ? 'newer' : 'first'} picture.`;
        return html`<div class="reveal-pair">
          <p class="pair-title">${p.view.label}</p>
          <div class="compare compare-sm">
            <div class="compare-col ${pick === 'A' ? 'is-picked' : ''}">${shot({ desc: A.desc, label: 'Picture A', tag: tagFor(A, 'A'), sub: subFor(A) })}</div>
            <div class="compare-col ${pick === 'B' ? 'is-picked' : ''}">${shot({ desc: B.desc, label: 'Picture B', tag: tagFor(B, 'B'), sub: subFor(B) })}</div>
          </div>
          <p class="reveal-said">${icon('check', { size: 18 })}<span>${said}</span></p>
        </div>`;
      })}
      ${verdictCard(copy, { kicker: id === 'too-early' ? 'Her early look' : 'With these picks', today, sample: true, openWhy: true })}
      <div class="stack">
        ${btn('Try again', { action: 'again', variant: 'secondary', iconName: 'refresh', cls: 'btn-block' })}
        ${next ? btn(`Next case: ${next.label}`, { href: `#/sample/${next.id}`, iconRight: 'next', cls: 'btn-block' }) : btn('Start my own record', { href: '#/start', cls: 'btn-block' })}
        ${btn('Back to the example', { href: `#/sample/${id}`, variant: 'tertiary', cls: 'btn-block' })}
      </div>
      ${result.trace.length
        ? html`<p class="small muted">Decided by rule ${result.trace[result.trace.length - 1].id}: ${result.trace[result.trace.length - 1].label} ${result.trace[result.trace.length - 1].detail}.</p>`
        : ''}
    </div>`;
  },
  mount(root, ctx) {
    const L = ctx.local;
    const go = (step) => {
      L.step = step;
      ctx.refresh();
      window.scrollTo(0, 0);
      const h = root.querySelector('h1');
      if (h) h.focus({ preventScroll: true });
    };
    return bindActions(root, {
      start: () => go('pair'),
      helper: () => {
        L.helper = true;
        go('handoff');
      },
      begin: () => go('pair'),
      reveal: () => go('reveal'),
      pick(el) {
        L.picks.push(el.dataset.v);
        const total = root.querySelectorAll('.progress span').length;
        if (L.picks.length >= total) go(L.helper ? 'handback' : 'reveal');
        else go('pair');
      },
      again() {
        L.order = null;
        ctx.refresh();
      },
    });
  },
};
