// S9. Home: every active record, with due, pack and safety banners.

import { html, icon, btn, topbar, banner, bindActions, dialog, toast, logoMark } from '../ui.js';
import { recordModel, recordCard } from '../cards.js';
import { COPY, LIMITS, CONCERNS } from '../config.js';
import { S, activeRecords, closedRecords, checkinsFor, photosFor, resumeRecord, recordById } from '../state.js';
import { env } from '../env.js';
import { formatDate, todayStr, daysBetween } from '../dates.js';
import { packLine } from '../copy.js';

function bannersFor(m) {
  const id = m.record.id;
  const name = CONCERNS[m.record.concern].short;
  const out = [];
  if (m.harm) {
    out.push(banner({ tone: 'rose', iconName: 'alert', title: 'Please check this first', text: `${name}: you mentioned a warning sign.`, href: `#/r/${id}/check-this` }));
  }
  if (m.pendingLook) {
    const waiting = m.lastVerdict && m.lastVerdict.code === 'CANT_COMPARE' && m.lastVerdict.checkinId === m.pendingLook.checkinId;
    out.push(
      waiting
        ? banner({ tone: 'lav', iconName: 'camera', title: 'Take new photos so we can look again', text: `${name}: same spot and light as your first photos.`, href: `#/r/${id}/photos?for=look` })
        : banner({ tone: 'green', iconName: 'flag', title: 'Your look is ready', text: `${name}: compare your photos without dates.`, href: `#/r/${id}/look` }),
    );
  } else if (m.due && !m.harm) {
    out.push(banner({ tone: 'blue', iconName: 'calendar', title: 'Check-in due', text: `${name}: about 30 seconds.`, href: `#/r/${id}/checkin` }));
  }
  if (m.pack && m.pack.show && !m.paused) {
    out.push(banner({ tone: 'sand', iconName: 'pack', title: packLine(m.pack, m.today), text: `${name}: see where your record stands.`, href: `#/r/${id}/pack` }));
  }
  return out;
}

export default {
  title: 'Your records',
  cls: 'screen-home',
  render(ctx) {
    const today = ctx.today;
    const recs = activeRecords();
    const closed = closedRecords();
    const header = topbar({
      brand: true,
      right: html`<button type="button" class="icon-btn" data-action="menu" aria-label="Menu">${icon('menu')}</button>`,
    });
    if (!recs.length) {
      return html`${header}
        <div class="pad flow center empty">
          <span class="empty-art">${logoMark(72)}</span>
          <h1 class="screen-title" tabindex="-1">No records yet</h1>
          <p>Start one, or look at the example.</p>
          <div class="stack">
            ${btn('Start my own record', { href: '#/start', size: 'lg', cls: 'btn-block' })}
            ${btn('See the example', { href: '#/sample/too-early', variant: 'secondary', size: 'lg', cls: 'btn-block' })}
          </div>
          ${closed.length ? html`<a class="link" href="#/r/${closed[0].id}">See your closed record${closed.length > 1 ? 's' : ''}</a>` : ''}
        </div>`;
    }
    const models = recs.map((r) => recordModel(r, checkinsFor(r.id), photosFor(r.id), today));
    const allBanners = models.flatMap((m) => bannersFor(m));
    const safariRisk = env.iosSafariTab && S.meta.safariAnyway;
    return html`${header}
      <div class="pad flow home">
        <div class="home-head">
          <h1 class="screen-title" tabindex="-1">${recs.length === 1 ? 'Your record' : 'Your records'}</h1>
          <p class="muted">${formatDate(today, { year: true })}</p>
        </div>
        ${safariRisk ? banner({ tone: 'sand', iconName: 'alert', title: COPY.safariRisk, text: 'Add Same Spot to your Home Screen to keep it safer.', href: '#/start/iphone' }) : ''}
        ${allBanners.length ? html`<div class="banner-stack">${allBanners}</div>` : ''}
        ${models.map(
          (m) => html`${recordCard(m, {
            checkinHref: `#/r/${m.record.id}/checkin`,
            recordHref: `#/r/${m.record.id}`,
            lookHref: m.pendingLook && !(m.lastVerdict && m.lastVerdict.code === 'CANT_COMPARE') ? `#/r/${m.record.id}/look` : null,
            resumeAction: 'resume',
          })}
          ${m.noBaseline && !m.harm ? html`<a class="soft-link" href="#/r/${m.record.id}/photos?for=baseline">${icon('camera', { size: 18 })}<span>Take your first photos. Your first photo look comes ${CONCERNS[m.record.concern].early} weeks later.</span>${icon('chevron', { size: 16 })}</a>` : ''}`,
        )}
        <div class="home-more">
          ${recs.length < LIMITS.maxActiveRecords ? btn('Track something else', { href: '#/start', variant: 'secondary', iconName: 'plus', cls: 'btn-block' }) : html`<p class="small muted center">You can track up to 3 things at once.</p>`}
          ${closed.length
            ? html`<details class="closed-list"><summary>${closed.length} closed record${closed.length > 1 ? 's' : ''}</summary>
                <ul>${closed.map((r) => html`<li><a href="#/r/${r.id}">${r.productName}<span class="muted"> · closed ${formatDate(r.closedOn, { ref: today })}</span></a>
                  ${daysBetween(r.closedOn, today) > 365 ? html`<span class="tag">Delete when you’re done</span>` : ''}</li>`)}</ul></details>`
            : ''}
        </div>
        <p class="assure center">${icon('lock', { size: 18 })}<span>${COPY.staysOnPhone}</span></p>
        ${env.installPrompt ? html`<button type="button" class="soft-link" data-action="install">${icon('download', { size: 18 })}<span>Add Same Spot to your home screen</span>${icon('chevron', { size: 16 })}</button>` : ''}
      </div>`;
  },
  mount(root, ctx) {
    const onInstallable = () => ctx.refresh();
    document.addEventListener('samespot:installable', onInstallable);
    const off = bindActions(root, {
      async menu() {
        const content = html`<nav class="menu-list" aria-label="Menu">
          <a href="#/sample/too-early">${icon('play')}<span>See the example</span></a>
          <a href="#/about">${icon('info')}<span>How Same Spot works</span></a>
          <a href="#/privacy">${icon('shield')}<span>Privacy and data</span></a>
          ${activeRecords().length < LIMITS.maxActiveRecords ? html`<a href="#/start">${icon('plus')}<span>Track something else</span></a>` : ''}
          <a href="#/">${icon('home')}<span>Start page</span></a>
        </nav>`;
        await dialog({ title: 'Menu', content, buttons: [{ label: 'Close', value: false, variant: 'secondary' }] });
      },
      async resume(el) {
        const rec = recordById(el.dataset.id);
        const pause = (rec.pauses || []).slice(-1)[0];
        const min = pause ? pause.start : rec.recordStart;
        const today = todayStr();
        const date = await dialog({
          title: 'When did you start using it again?',
          content: html`<label class="text-field"><span>Date</span><input type="date" id="resume-date" min="${min}" max="${today}" value="${today}"></label>`,
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
      async install() {
        const p = env.installPrompt;
        if (!p) return;
        p.prompt();
        await p.userChoice.catch(() => null);
        env.installPrompt = null;
        ctx.refresh();
      },
    });
    return () => {
      off();
      document.removeEventListener('samespot:installable', onInstallable);
    };
  },
};
