// Turns an engine result into the exact words on a verdict card.
// Wording follows the blueprint (section 6e). Rules for tone:
// numbers and dates, no blame, "no clear change in your photos" rather than
// "not working", and no skin-colour words.

import {
  CONCERNS, VERDICT_TITLES, VERDICT_FAMILY, VERDICT_FOOTER, FAST_BY_ID, USE_BY_ID, changeOf, warningOf,
} from './config.js';
import { formatDate } from './dates.js';

export function joinList(items, conj = 'and') {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join('');
  if (list.length === 2) return `${list[0]} ${conj} ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} ${conj} ${list[list.length - 1]}`;
}

export function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function lookSentence(proj, which, ref, short = false) {
  const name = which === 'early' ? 'early look' : which === 'full' ? 'full look' : 'first photo look';
  if (proj && proj.date) {
    return short ? `${capitalise(name)}: ${formatDate(proj.date, { ref })}.` : `Your ${name} is on ${formatDate(proj.date, { ref })}.`;
  }
  if (proj && proj.reason === 'paused') return `Your clock is paused, so your ${name} date will be set when you start again.`;
  return `Your ${name} date will be set when you use it again.`;
}

function changeVerbs(cfg, changes) {
  return joinList(
    changes.map((c) => {
      const def = changeOf(cfg, c.code);
      return def ? `${def.verb}${c.week ? ` (logged in week ${c.week})` : ''}` : '';
    }),
  );
}

function changeNouns(cfg, changes) {
  return joinList(
    changes.map((c) => {
      const def = changeOf(cfg, c.code);
      return def ? `${def.noun}${c.week ? ` in week ${c.week}` : ''}` : '';
    }),
  );
}

export function harmParagraphs(cfg, codes) {
  const groups = { skin: [], hair: [], pigment: [] };
  for (const code of codes) {
    const w = warningOf(cfg, code);
    if (w) groups[w.group].push(w.phrase);
  }
  const out = [];
  if (groups.skin.length) {
    out.push(
      `You said you have ${joinList(groups.skin)}. Stop using the product and follow the pack's directions. If it doesn't settle in a few days, or you're worried, see a dermatologist.`,
    );
  }
  if (groups.hair.length) {
    out.push(`You said you have ${joinList(groups.hair)}. This isn't something to wait out. Please see a dermatologist.`);
  }
  if (groups.pigment.length) {
    out.push(`You said the darker skin ${joinList(groups.pigment)}. A doctor can check for common causes. Please book a visit.`);
  }
  return out;
}

export function fastSignLine(cfg, answer) {
  if (!answer || !FAST_BY_ID[answer]) return null;
  return `${cfg.fastSign.label}: ${FAST_BY_ID[answer].line}`;
}

export function useAssumption(useId) {
  const u = USE_BY_ID[useId];
  if (!u || useId === 'most') return null;
  if (useId === 'none') return 'Weeks you didn\u2019t use it count as nothing.';
  return `Weeks you used it ${u.phrase} count as ${u.counts}.`;
}

/**
 * result: output of engine.evaluate (with code).
 * ctx: { today, fastSign }
 */
export function verdictCopy(result, ctx = {}) {
  const cfg = result.cfg || CONCERNS[ctx.concern];
  const ref = ctx.today;
  const d = result.data || {};
  const code = result.code;
  const p = [];
  const below = [];

  switch (code) {
    case 'CHECK_FIRST':
      p.push(...harmParagraphs(cfg, d.harm || []));
      break;
    case 'CANT_TELL_UNEVEN':
      p.push(
        `In ${d.n} weeks you've had about ${d.x} weeks of regular use. That isn't a full test of this product as the pack directs. You can restart with steadier use, or decide without a verdict.`,
      );
      break;
    case 'TOO_EARLY':
      p.push(
        `You've had about ${d.x} of the ${d.full} weeks this kind of product usually needs. No visible change yet is normal now. ${lookSentence(result.dates.earlyLook, 'early', ref)}`,
      );
      if (d.major && d.major.length) p.push(`You also logged ${changeNouns(cfg, d.major)}. That can affect results for months.`);
      break;
    case 'CANT_TELL_CHANGED': {
      let s = `You logged ${changeNouns(cfg, d.changes || [])}.`;
      if (cfg.id === 'hair' && d.major && d.major.length) {
        s += ' Illness, childbirth or a big diet change can cause shedding about 3 months later, which settles over 6 to 9 months.';
      }
      s += " With this much changing, your record can't tell what helped. You can restart your record when things settle.";
      p.push(s);
      break;
    }
    case 'SENSE_ONLY': {
      const sense = d.sense;
      if (sense === 'better') p.push("You feel it's better. Without a first photo we can't compare, and memory of the start is easy to misjudge.");
      else if (sense === 'worse') p.push("You feel it's worse. If you have irritation, stop and check the pack's directions.");
      else p.push("You don't see a clear change. Without a first photo, we can't check.");
      p.push(`Take photos today, and your first photo look will be on ${formatDate(result.dates.firstPhotoLook, { ref })}.`);
      break;
    }
    case 'TOO_EARLY_PHOTOS':
      p.push(
        `You've used it for about ${d.x} weeks, but your first photos are from ${formatDate(d.baselineDate, { ref })}. ${lookSentence({ date: result.dates.photoLook }, 'photo', ref)}`,
      );
      break;
    case 'CANT_COMPARE': {
      const reason = d.lightReason === 'less-light'
        ? 'Your new photo has much less light than your first one.'
        : d.lightReason === 'more-light'
          ? 'Your new photo has much more light than your first one.'
          : "You haven't taken new photos.";
      p.push(`${reason} Take new photos in the same spot and light within the next week, and we'll look again.`);
      if (d.sense && FAST_BY_ID[d.sense]) below.push(`How it seems to you: ${FAST_BY_ID[d.sense].label.toLowerCase()}.`);
      break;
    }
    case 'BETTER_SO_FAR':
      p.push(
        `Without dates, you picked your newer photos as looking better. It's still early: ${d.x} of ${d.full} weeks. ${lookSentence(result.dates.fullLook, 'full', ref)}`,
      );
      break;
    case 'BETTER_SO_FAR_CHANGED':
      p.push(
        `Your newer photos look better to you, but you also ${changeVerbs(cfg, d.changes || [])}. We can't tell which helped. ${lookSentence(result.dates.fullLook, 'full', ref, true)}`,
      );
      break;
    case 'NO_CLEAR_YET':
      p.push(
        `Without dates, your photos don't show a clear difference yet. That's common at ${d.x} weeks. Photos can miss small changes. ${lookSentence(result.dates.fullLook, 'full', ref)}`,
      );
      break;
    case 'BETTER_WHILE_USING':
      p.push(
        `After ${d.x} weeks of regular use, you picked your newer photos as looking better, and nothing else changed. We can't prove the product caused it, but this is the change you were looking for.`,
      );
      break;
    case 'BETTER_BUT_CHANGED':
      p.push(`Your photos look better to you after ${d.x} weeks, but you also ${changeVerbs(cfg, d.changes || [])}. We can't tell which helped.`);
      break;
    case 'NO_CLEAR_FULL':
      p.push(
        `After ${d.x} weeks of regular use, your photos don't show a clear change. Photos can miss small changes, so this doesn't prove it isn't working. It is a reasonable point to decide what to do next.`,
      );
      if (cfg.isSkin) p.push('Darkening after irritation can take months to fade.');
      break;
    case 'LOOKS_WORSE':
      p.push(
        "Without dates, you picked your first photos as looking better. If you have itching, soreness or burning, stop and check the pack's directions. A dermatologist can help if you're worried.",
      );
      break;
    default:
      break;
  }

  if (result.longGap && code !== 'CHECK_FIRST') below.push('Long gap, so this is less certain.');

  return {
    code,
    title: VERDICT_TITLES[code],
    family: VERDICT_FAMILY[code],
    paragraphs: p,
    below,
    reasons: reasonsFor(result, cfg),
    fastLine: fastSignLine(cfg, ctx.fastSign),
    footer: VERDICT_FOOTER,
  };
}

/** The "Why we say this" list. */
export function reasonsFor(result, cfg) {
  const d = result.data || {};
  const clock = result.clock;
  const out = [];
  const useNote = clock ? useAssumption(clock.latestUse) : null;
  if (clock) {
    out.push({
      icon: 'clock',
      label: 'Weeks of regular use',
      value: clock.wholeWeeks > cfg.full ? `About ${clock.wholeWeeks} (full look at ${cfg.full})` : `About ${clock.wholeWeeks} of ${cfg.full}`,
      hint: useNote || 'Weeks you used it most days count in full.',
    });
  }
  if (result.code === 'CHECK_FIRST') {
    const labels = (d.harm || []).map((c) => (warningOf(cfg, c) || {}).label).filter(Boolean);
    out.unshift({ icon: 'alert', label: 'Warning sign', value: labels.join(', '), hint: 'A warning sign comes before any "keep waiting" message.' });
    return out;
  }
  const changes = d.changes || [];
  out.push({
    icon: 'layers',
    label: 'Other changes logged',
    value: changes.length
      ? changes.map((c) => `${(changeOf(cfg, c.code) || {}).label}${c.week ? `, week ${c.week}` : ''}`).join('; ')
      : 'None',
    hint: changes.length ? 'Anything else that changed can explain a difference too.' : null,
  });
  if (['SENSE_ONLY'].includes(result.code)) {
    out.push({ icon: 'camera', label: 'Photo match', value: 'No first photos', hint: 'Memory of the start is easy to misjudge.' });
  } else if (result.code === 'TOO_EARLY_PHOTOS') {
    out.push({ icon: 'camera', label: 'Photo match', value: 'First photos too recent', hint: `Photos need ${cfg.early} weeks to show a change.` });
  } else if (result.code === 'CANT_COMPARE') {
    out.push({
      icon: 'camera',
      label: 'Photo match',
      value: d.lightReason ? 'Light too different from your first photo' : 'No new photos in the last 2 weeks',
      hint: 'Light and hair condition change photos more than weeks of use.',
    });
  } else if (d.pairs) {
    out.push({ icon: 'camera', label: 'Photo match', value: `${d.pairs} of ${cfg.views.length} views compared`, hint: null });
    out.push({
      icon: 'eye',
      label: 'Your picks without dates',
      value: `Newer photo looked better in ${d.latest} of ${d.pairs}`,
      hint: '"Looks better" needs the newer photo picked in every pair.',
    });
  }
  return out;
}

/** "Your pack may run out around 19 November", in the right tense. */
export function packLine(ps, today) {
  if (!ps) return '';
  if (ps.daysLeft === 0) return 'Your pack may run out today';
  const when = formatDate(ps.finish, { ref: today });
  return ps.daysLeft < 0 ? `Your pack may have run out around ${when}` : `Your pack may run out around ${when}`;
}

/** Short status line for Home cards and the landing sample. */
export function statusTitle(status) {
  if (status.kind === 'look-ready') {
    const name = { early: 'early look', full: 'full look', extra: 'next look', photo: 'first photo look' }[status.look] || 'look';
    return `Your ${name} is ready`;
  }
  return VERDICT_TITLES[status.code];
}
