// How Same Spot works, why it exists, and what it leaves out on purpose.

import { html, icon, btn, topbar } from '../ui.js';
import { COPY, CONCERNS, CONCERN_ORDER } from '../config.js';

export default {
  title: 'How Same Spot works',
  cls: 'screen-about',
  render() {
    return html`${topbar({ back: '#/', title: '' })}
      <div class="pad flow about">
        <p class="kicker">How it works</p>
        <h1 class="screen-title display-sm" tabindex="-1">One question, answered honestly: can you tell yet?</h1>
        <ol class="howto-list howto-big">${COPY.howItWorks.map((l) => html`<li>${l}</li>`)}</ol>

        <section class="card card-soft">
          <h2 class="card-title">${icon('info')}<span>Why Same Spot exists</span></h2>
          <p>We spoke with five Be Bodywise customers using products for hair, underarm darkness, back acne and pigmentation. Four of them could not tell, after weeks or months, whether the product was doing the slower job they bought it for.</p>
          <p>The same three reasons kept coming up. There was no reliable record of how things looked at the start. Other parts of the routine changed at the same time, like a new deodorant or hair oil. And nobody knew what to expect, or by when, from the way they really used it, such as three nights a week instead of daily.</p>
          <p>The one customer who could see her result bought again. Others stopped, or kept paying without knowing whether the money was well spent.</p>
        </section>

        <section class="card card-plain">
          <h2 class="card-title">${icon('scale')}<span>The rules behind every verdict</span></h2>
          <ol class="rule-list">
            <li><b>A warning sign comes first.</b> Burning, broken skin or sudden hair loss overrides everything else.</li>
            <li><b>A cap.</b> After twice the full window without a full trial, Same Spot stops waiting and says use was too uneven.</li>
            <li><b>Too early.</b> Before the early look, no change is normal.</li>
            <li><b>Too much changed.</b> A fever, childbirth or three other changes mean the record can’t tell what helped.</li>
            <li><b>Photos must be able to show it.</b> No first photo, photos too recent, or very different light means no photo verdict.</li>
            <li><b>The comparison without dates.</b> “Looks better” needs the newer photo picked in every pair.</li>
          </ol>
          <p class="small muted">The first rule that matches decides, so two rules never contradict each other.</p>
        </section>

        <section class="card card-plain">
          <h2 class="card-title">${icon('calendar')}<span>The evidence behind the dates</span></h2>
          ${CONCERN_ORDER.map((id) => {
            const c = CONCERNS[id];
            return html`<div class="evidence-row">
              <p><b>${c.label}</b>: early look at ${c.early} weeks, full look at ${c.full} weeks of regular use.</p>
              <p class="small"><b>${c.evidenceLevel}.</b> ${c.evidenceLine}</p>
              <ul class="source-list">${c.sources.map((s) => html`<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}${icon('external', { size: 14 })}</a></li>`)}</ul>
            </div>`;
          })}
          <p class="small muted">No study was found on using these products less often than directed. Same Spot counts those weeks as part-weeks, which is a cautious guess.</p>
        </section>

        <section class="card card-plain">
          <h2 class="card-title">${icon('shield')}<span>What Same Spot leaves out on purpose</span></h2>
          <ul class="dot-list">
            <li><b>AI scores of your photos.</b> They are unreliable on phone photos and on darker skin.</li>
            <li><b>Accounts, servers and analytics.</b> Your photos never leave your phone.</li>
            <li><b>Streaks, badges and daily check-ins.</b> Slow change shows nothing new each day, and frequent checking can make people feel worse.</li>
            <li><b>Buy buttons, prices and offers.</b> A verdict tied to a sale would not be believed.</li>
            <li><b>Zoom, filters and sharing.</b> Your photos are for comparing, not scrutinising.</li>
          </ul>
        </section>

        <p class="note">${icon('info', { size: 18 })}<span>${COPY.notMedical}</span></p>
        <div class="stack">
          ${btn('See the example', { href: '#/sample/too-early', size: 'lg', cls: 'btn-block', iconRight: 'next' })}
          ${btn('Start my own record', { href: '#/start', variant: 'secondary', size: 'lg', cls: 'btn-block' })}
        </div>
      </div>`;
  },
};
