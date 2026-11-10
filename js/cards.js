// The record card used on Home and in the example.

import { html, raw } from './html.js';
import { icon, FAMILY_ICON } from './icons.js';
import { CONCERNS, VERDICT_FAMILY, VERDICT_TITLES } from './config.js';
import { formatDate, daysBetween } from './dates.js';
import { computeClock, liveStatus, projectLook, nextDueDate, packStatus, isPaused } from './engine.js';
import { statusTitle, fastSignLine } from './copy.js';
import { clockBar, concernBadge, btn } from './ui.js';

export function recordModel(record, checkins, photos, today) {
  const cfg = CONCERNS[record.concern];
  const clock = computeClock(record, checkins, today);
  const status = liveStatus(record, checkins, photos, today);
  const nextDue = nextDueDate(record, checkins);
  const fast = [...checkins].reverse().find((c) => c.fastSign);
  const paused = isPaused(record, today) || record.status === 'paused';
  return {
    record,
    cfg,
    clock,
    status,
    title: statusTitle(status),
    family: status.kind === 'look-ready' ? 'ready' : VERDICT_FAMILY[status.code] || 'neutral',
    dates: {
      earlyLook: projectLook(record, checkins, today, cfg.early),
      fullLook: projectLook(record, checkins, today, cfg.full),
    },
    done: record.checkpointsDone || {},
    nextDue,
    due: !paused && today >= nextDue,
    late: !paused && daysBetween(nextDue, today) > 7,
    pack: record.status === 'closed' ? null : packStatus(record, today),
    harm: (record.harmOpen || []).length > 0,
    paused,
    closed: record.status === 'closed',
    fastLine: fast ? fastSignLine(cfg, fast.fastSign) : null,
    noBaseline: !photos.some((p) => p.role === 'baseline'),
    pendingLook: record.pendingLook,
    lastVerdict: record.lastVerdict,
    today,
  };
}

/**
 * opts: { sample, checkinHref, recordHref, lookHref, compact }
 */
export function recordCard(m, opts = {}) {
  const { cfg, clock, record, today } = m;
  const statusIcon = m.family === 'ready' ? 'flag' : FAMILY_ICON[m.family] || 'info';
  const lookName = m.status.kind === 'look-ready' ? m.status.look : null;
  const nextLine = m.closed
    ? html`Closed${record.closedOn ? html` on ${formatDate(record.closedOn, { ref: today })}` : ''}`
    : m.paused
      ? 'Paused. Your clock is stopped.'
      : m.due
        ? html`Check-in due${m.late ? ' since ' : ' '}${m.late ? formatDate(m.nextDue, { ref: today }) : 'now'}`
        : html`Next check-in: ${formatDate(m.nextDue, { ref: today })}`;

  let primary = '';
  if (!m.closed && !opts.hideActions) {
    if (m.pendingLook && opts.lookHref) {
      primary = btn('Finish your look', { href: opts.lookHref, iconName: 'eye', variant: 'primary', size: 'sm' });
    } else if (m.paused) {
      primary = btn('Resume', { action: opts.resumeAction || 'resume', variant: 'secondary', size: 'sm', iconName: 'play', attrs: `data-id="${record.id}"` });
    } else if (opts.checkinHref) {
      primary = btn(m.due ? 'Check in now' : 'Check in early', {
        href: opts.checkinHref,
        variant: m.due ? 'primary' : 'secondary',
        size: 'sm',
      });
    }
  }

  return html`<article class="rcard ${opts.sample ? 'rcard-sample' : ''}" data-family="${m.family}">
    <header class="rcard-head">
      ${concernBadge(record.concern, 44)}
      <div class="rcard-id">
        <span class="rcard-concern">${cfg.label}</span>
        <span class="rcard-product">${record.productName}</span>
      </div>
      ${opts.recordHref ? html`<a class="icon-btn icon-btn-soft" href="${opts.recordHref}" aria-label="Open my record">${icon('chevron')}</a>` : ''}
    </header>
    ${clockBar({ clock, cfg, dates: m.dates, done: m.done, today })}
    <div class="rcard-status">
      <span class="status-chip" data-family="${m.family}">${icon(statusIcon, { size: 18 })}<span>${m.title}</span></span>
      ${m.fastLine ? html`<span class="rcard-fast">${icon('drop', { size: 16 })}${m.fastLine}</span>` : ''}
    </div>
    <footer class="rcard-foot">
      <span class="rcard-next ${m.due ? 'is-due' : ''}">${icon(m.paused ? 'pause' : 'calendar', { size: 18 })}<span>${nextLine}</span></span>
      ${primary}
    </footer>
    ${lookName && !m.pendingLook ? html`<p class="rcard-note">Your ${lookName === 'photo' ? 'first photo' : lookName} look opens at your next check-in.</p>` : ''}
  </article>`;
}

export { VERDICT_TITLES, raw };
