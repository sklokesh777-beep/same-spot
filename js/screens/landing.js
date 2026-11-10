// S0. Landing: the one sentence and a live sample verdict, before any tap.

import { html, icon, logoMark, btn, banner, clockBar } from '../ui.js';
import { COPY } from '../config.js';
import { S, activeRecords } from '../state.js';
import { buildScenario } from '../demo.js';
import { formatDate } from '../dates.js';
import { statusTitle } from '../copy.js';
import { liveStatus } from '../engine.js';

export default {
  title: 'Can you tell yet?',
  cls: 'screen-landing',
  render(ctx) {
    const sc = buildScenario('too-early');
    const hasRecord = activeRecords().length > 0;
    const status = liveStatus(sc.record, sc.checkins, sc.photos, sc.today);
    const early = sc.result.dates.earlyLook.date;
    const storageBanner = !S.dbOk
      ? banner({ tone: 'sand', iconName: 'alert', title: 'Private tab', text: 'Anything you save will be lost when you close it. You can still try the example.' })
      : S.privateLikely
        ? banner({ tone: 'sand', iconName: 'alert', title: 'Saving may not last here', text: 'This looks like a private tab, or your phone is almost out of space. You can still try the example.' })
        : '';

    return html`<div class="landing">
      <header class="landing-nav">
        <a class="brand" href="#/" aria-label="Same Spot">${logoMark(34)}<span>Same Spot</span></a>
        <nav class="landing-links" aria-label="About Same Spot">
          <a href="#/about">How it works</a>
          <a href="#/privacy">Privacy</a>
        </nav>
      </header>
      ${storageBanner ? html`<div class="landing-banner">${storageBanner}</div>` : ''}

      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">${COPY.madeFor}</p>
          <h1 id="hero-title" class="display" tabindex="-1">Can you tell <em>yet</em> whether it’s working?</h1>
          <p class="lead">Same Spot counts the weeks you really used it, notes what else changed, and only gives a verdict when your before and after can honestly be compared.</p>
          <div class="hero-ctas">
            ${btn('See a 60-second example', { href: '#/sample/too-early', iconRight: 'next', size: 'lg', cls: 'btn-block-mobile' })}
            ${hasRecord
              ? btn('Open my record', { href: '#/home', variant: 'secondary', size: 'lg', cls: 'btn-block-mobile' })
              : btn('Start my own record', { href: '#/start', variant: 'secondary', size: 'lg', cls: 'btn-block-mobile' })}
          </div>
          <p class="assure">${icon('lock', { size: 18 })}<span>${COPY.staysOnPhone}</span></p>
          <details class="howto">
            <summary>${icon('list', { size: 18 })}<span>How this works</span>${icon('chevron', { size: 18, cls: 'howto-chev' })}</summary>
            <ol class="howto-list">${COPY.howItWorks.map((l) => html`<li>${l}</li>`)}</ol>
          </details>
        </div>

        <div class="hero-visual" aria-label="A sample record">
          <div class="device">
            <div class="device-notch" aria-hidden="true"></div>
            <a class="sample-card" href="#/sample/too-early" aria-label="Open this sample in the example">
              <span class="sample-kicker"><span class="tag tag-sample">Sample</span> Rosemary hair roll-on</span>
              ${clockBar({ clock: sc.result.clock, cfg: sc.cfg, dates: sc.result.dates, done: {}, today: ctx.today, compact: true })}
              <span class="sample-verdict" data-family="wait">${icon('hourglass', { size: 20 })}<span>${statusTitle(status)}</span></span>
              <span class="sample-next">${icon('calendar', { size: 18 })}<span>Next look: <b>${formatDate(early, { ref: ctx.today })}</b></span></span>
              <span class="sample-why">She uses it about half the days, so ${Math.round(sc.result.clock.calendarWeeks)} weeks on the calendar count as ${sc.result.clock.wholeWeeks} weeks of regular use.</span>
            </a>
            <div class="device-float device-float-1" aria-hidden="true">${icon('eye', { size: 18 })}<span>Photos compared without dates</span></div>
            <div class="device-float device-float-2" aria-hidden="true">${icon('alert', { size: 18 })}<span>A warning sign comes first</span></div>
          </div>
        </div>
      </section>

      <section class="causes" aria-labelledby="causes-title">
        <h2 id="causes-title" class="section-title">Why it’s so hard to tell</h2>
        <p class="section-lead">Slow changes hide in plain sight. Three things get in the way, and Same Spot answers each one.</p>
        <div class="cause-grid">
          <article class="cause">
            <span class="cause-icon">${icon('camera')}</span>
            <h3>No record of the start</h3>
            <p>Memory quietly rewrites how things looked. Same Spot keeps two matched photos from day one, only on your phone, and checks the light against your first photo.</p>
          </article>
          <article class="cause">
            <span class="cause-icon">${icon('layers')}</span>
            <h3>Other things change too</h3>
            <p>A new deodorant, hair oil or a fever can explain a change. Same Spot asks what else changed, and says “can’t tell” rather than credit the product.</p>
          </article>
          <article class="cause">
            <span class="cause-icon">${icon('clock')}</span>
            <h3>Waiting times assume daily use</h3>
            <p>Same Spot counts only the weeks you really used it. Use it half the days and your look date moves back, with the arithmetic shown.</p>
          </article>
        </div>
      </section>

      <section class="honest" aria-labelledby="honest-title">
        <div class="honest-inner">
          <h2 id="honest-title" class="section-title">Honest by design</h2>
          <ul class="honest-list">
            <li>${icon('hourglass')}<span><b>It can say “too early” and “can’t tell”.</b> Every verdict comes with a number, a date and a reason.</span></li>
            <li>${icon('eye')}<span><b>You compare photos without dates.</b> So hope doesn’t decide for you.</span></li>
            <li>${icon('alert')}<span><b>A warning sign always comes first.</b> Burning or sudden hair loss overrides any “keep waiting”.</span></li>
            <li>${icon('shield')}<span><b>No AI scores, accounts or buy buttons.</b> When the pack runs out, stopping is an equal choice.</span></li>
          </ul>
          <div class="honest-cta">
            ${btn('See the five example cases', { href: '#/sample/too-early', variant: 'fancy', iconRight: 'next' })}
          </div>
        </div>
      </section>

      <footer class="landing-foot">
        <p>${icon('info', { size: 18 })}<span>${COPY.notMedical}</span></p>
        <p class="muted">${COPY.madeFor}. A prototype built for the Mosaic Wellness Fellowship Builder Challenge.</p>
        <nav class="foot-links" aria-label="More">
          <a href="#/about">Why Same Spot exists</a>
          <a href="#/privacy">Privacy and data</a>
          <a href="#/sample/check-this">Safety example</a>
        </nav>
      </footer>
    </div>`;
  },
};
