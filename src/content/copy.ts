// Every sentence a result can show. Tone rules: numbers and dates, no blame,
// "no clear change in your photos" rather than "not working".

import type { ResultCode, Evaluation } from '../engine/rules';
import type { QuickId, UseId } from '../engine/types';
import { addDays, formatDate } from '../engine/dates';
import { CONCERNS } from './concerns';
import type { Tone } from './concerns';

export type Family = 'safety' | 'wait' | 'unclear' | 'positive' | 'mixed' | 'neutral' | 'negative' | 'ready' | 'paused';

export const FAMILY_TONE: Record<Family, Tone | 'accent'> = {
  safety: 'rose',
  wait: 'blue',
  unclear: 'sand',
  positive: 'mint',
  mixed: 'lav',
  neutral: 'grey',
  negative: 'coral',
  ready: 'accent',
  paused: 'grey',
};

export const RESULTS: Record<ResultCode, { title: string; family: Family }> = {
  CHECK_FIRST: { title: 'Please check this first', family: 'safety' },
  UNEVEN: { title: "Can't tell: use was too uneven", family: 'unclear' },
  TOO_EARLY: { title: 'Too early to judge', family: 'wait' },
  TOO_MUCH: { title: "Can't tell: too much changed", family: 'unclear' },
  SENSE_ONLY: { title: 'Your sense only', family: 'unclear' },
  TOO_EARLY_PHOTOS: { title: 'Too early for your photos', family: 'wait' },
  CANT_COMPARE: { title: "Can't compare these photos yet", family: 'unclear' },
  BETTER_SO_FAR: { title: 'Looks better so far', family: 'positive' },
  BETTER_SO_FAR_CHANGED: { title: 'Looks better so far, but other things changed too', family: 'mixed' },
  NO_CLEAR_YET: { title: 'No clear change yet', family: 'neutral' },
  BETTER_WHILE_USING: { title: 'Looks better while using it', family: 'positive' },
  BETTER_CHANGED: { title: 'Looks better, but other things changed too', family: 'mixed' },
  NO_CLEAR_FULL: { title: 'No clear change after a full trial', family: 'neutral' },
  LOOKS_WORSE: { title: 'Looks worse to you', family: 'negative' },
};

export const RESULT_FOOTER = 'This is your view of your own photos, not a medical assessment.';

export const USE_OPTIONS: { id: UseId; label: string; sub: string; phrase: string }[] = [
  { id: 'most', label: 'Most days', sub: '6 to 7 days a week', phrase: 'most days' },
  { id: 'half', label: 'About half the days', sub: '3 to 5 days a week', phrase: 'about half the days' },
  { id: 'few', label: 'Once in a while', sub: '1 to 2 days a week', phrase: 'once in a while' },
  { id: 'none', label: 'Not at all right now', sub: 'Your clock waits for you', phrase: 'not at all' },
];

export const USE_BY_ID = Object.fromEntries(USE_OPTIONS.map((u) => [u.id, u])) as Record<UseId, (typeof USE_OPTIONS)[number]>;

export const QUICK_OPTIONS: { id: QuickId; label: string }[] = [
  { id: 'better', label: 'Better' },
  { id: 'same', label: 'About the same' },
  { id: 'worse', label: 'Worse' },
  { id: 'unsure', label: 'Not sure' },
];

export const QUICK_BY_ID = Object.fromEntries(QUICK_OPTIONS.map((q) => [q.id, q])) as Record<QuickId, (typeof QUICK_OPTIONS)[number]>;

export function listText(items: string[], joiner = 'and'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${joiner} ${items[items.length - 1]}`;
}

function dateOr(date: string | null, today: string, sentence: (d: string) => string, fallback: string): string {
  return date ? sentence(formatDate(date, { ref: today })) : fallback;
}

/** The safety message for a set of warning signs. */
export function safetyParagraphs(warnings: { phrase: string; group: string }[]): string[] {
  const by = (g: string) => warnings.filter((w) => w.group === g).map((w) => w.phrase);
  const out: string[] = [];
  const skin = by('skin');
  const hair = by('hair');
  const pigment = by('pigment');
  const other = by('other');
  if (skin.length) {
    out.push(`You said you have ${listText(skin)}. Stop using the product and follow your pack's directions. If it doesn't settle in a few days, or you're worried, see a dermatologist.`);
  }
  if (hair.length) out.push(`You said you have ${listText(hair)}. This isn't something to wait out. Please see a dermatologist.`);
  if (pigment.length) out.push(`You said you have ${listText(pigment)}. A doctor can check for common causes. Please book a visit.`);
  if (other.length) out.push(`You said you have ${listText(other)}. Stop using the product and follow your pack's directions. If you're worried, see a doctor.`);
  return out;
}

export interface ResultCopy {
  code: ResultCode;
  title: string;
  family: Family;
  paragraphs: string[];
}

export function resultCopy(ev: Evaluation, concernId: keyof typeof CONCERNS): ResultCopy {
  const code = ev.code as ResultCode;
  const t = ev.today;
  const whole = ev.clock.wholeWeeks;
  const { early, full } = ev.windows;
  const p: string[] = [];
  const changeList = (list: Evaluation['changes']) => listText(list.map((c) => `${c.phrase} (week ${c.week})`));
  const fullSentence = dateOr(ev.fullDate, t, (d) => `Your full look is on ${d}.`, 'Your full look date will be set when you use it again.');

  switch (code) {
    case 'CHECK_FIRST':
      p.push(...safetyParagraphs(ev.warnings));
      break;
    case 'UNEVEN':
      p.push(`In ${Math.floor(ev.clock.activeCalendarWeeks)} weeks you've had about ${whole} weeks of real use. That isn't a full test. You can restart with steadier use, or decide without a result.`);
      break;
    case 'TOO_EARLY':
      p.push(
        `You've had about ${whole} of the ${full} weeks this kind of product usually needs. No visible change yet is normal. ${dateOr(ev.earlyDate, t, (d) => `Your early look is on ${d}.`, 'Your early look date will be set when you use it again.')}`,
      );
      break;
    case 'TOO_MUCH':
      p.push(`You logged ${changeList(ev.changes.filter((c) => c.type !== 'photo'))}. With this much changing, your record can't tell what helped. You can restart when things settle.`);
      break;
    case 'SENSE_ONLY': {
      const lookDate = formatDate(addDays(t, early * 7), { ref: t });
      p.push(`Without a first photo, memory is easy to misjudge. Take photos today and your photo look will be on ${lookDate}.`);
      if (ev.sense) p.push(`How it seems to you: ${QUICK_BY_ID[ev.sense].label.toLowerCase()}.`);
      break;
    }
    case 'TOO_EARLY_PHOTOS':
      p.push(
        `Your first photos are from ${formatDate(ev.firstDate, { ref: t })}. Photos need ${early} weeks to show a change. Your photo look is on ${formatDate(ev.photoReadyDate, { ref: t })}.`,
      );
      break;
    case 'CANT_COMPARE':
      p.push("There's no recent photo to compare. Take one in the same spot and light.");
      break;
    case 'BETTER_SO_FAR':
      p.push(`Without dates, you picked your newer photos as looking better. It's still early: ${whole} of ${full} weeks. ${fullSentence}`);
      break;
    case 'BETTER_SO_FAR_CHANGED':
      p.push(
        `Your newer photos look better to you, but you also logged ${ev.changesSinceFirst.length === 1 ? 'a change' : 'other changes'}: ${changeList(ev.changesSinceFirst)}. We can't tell which helped. ${fullSentence}`,
      );
      break;
    case 'NO_CLEAR_YET':
      p.push(`Your photos don't show a clear difference yet. That's common at ${whole} weeks. Photos can miss small changes. ${fullSentence}`);
      break;
    case 'BETTER_WHILE_USING':
      p.push(
        `After ${whole} weeks of real use, you picked your newer photos as looking better, and nothing else changed. We can't prove the product caused it, but this is the change you were looking for.`,
      );
      break;
    case 'BETTER_CHANGED':
      p.push(
        `Your photos look better to you after ${whole} weeks, but you also logged ${ev.changesSinceFirst.length === 1 ? 'a change' : 'other changes'}: ${changeList(ev.changesSinceFirst)}. We can't tell which helped.`,
      );
      break;
    case 'NO_CLEAR_FULL':
      p.push(
        `After ${whole} weeks of real use, your photos don't show a clear change. Photos can miss small changes, so this doesn't prove it isn't working. It's a reasonable point to decide what's next.`,
      );
      if (CONCERNS[concernId].isSkin) p.push('Darkening after irritation can take months to fade.');
      break;
    case 'LOOKS_WORSE':
      p.push(
        "Without dates, you picked your first photos as looking better. If you have itching, soreness or burning, stop and check your pack's directions. A dermatologist can help if you're worried.",
      );
      break;
  }
  if (ev.lightDiffers && ev.pairs) p.push('The light was different in one photo, so this result is less certain.');
  return { code, title: RESULTS[code].title, family: RESULTS[code].family, paragraphs: p };
}

// ---------- what's next ----------

export type NextAction =
  | 'keep'
  | 'calendar'
  | 'firstPhotos'
  | 'keepNoPhotos'
  | 'photosNow'
  | 'later'
  | 'restart'
  | 'keepTracker'
  | 'derm'
  | 'keepTracking'
  | 'close'
  | 'pause'
  | 'stop';

export interface NextStep {
  id: NextAction;
  label: string;
}

export interface NextSteps {
  note?: string;
  grid: boolean;
  steps: NextStep[];
}

export function nextSteps(ev: Evaluation): NextSteps {
  const fullText = ev.fullDate ? `Keep going. Your full look is on ${formatDate(ev.fullDate, { ref: ev.today })}.` : 'Keep going when you can.';
  const four: NextStep[] = [
    { id: 'keep', label: 'Keep going' },
    { id: 'pause', label: 'Pause and decide later' },
    { id: 'derm', label: 'Talk to a dermatologist' },
    { id: 'stop', label: 'Stop using it' },
  ];
  switch (ev.code) {
    case 'TOO_EARLY':
    case 'BETTER_SO_FAR':
    case 'BETTER_SO_FAR_CHANGED':
    case 'NO_CLEAR_YET':
      return {
        note: ev.code === 'TOO_EARLY' ? (ev.earlyDate ? `Keep going. Your early look is on ${formatDate(ev.earlyDate, { ref: ev.today })}.` : 'Keep going when you can.') : fullText,
        grid: false,
        steps: [
          { id: 'keep', label: 'Keep going' },
          { id: 'calendar', label: 'Add check-ins to my calendar' },
        ],
      };
    case 'TOO_EARLY_PHOTOS':
      return {
        note: ev.photoReadyDate ? `Your photo look is on ${formatDate(ev.photoReadyDate, { ref: ev.today })}.` : undefined,
        grid: false,
        steps: [
          { id: 'keep', label: 'Keep going' },
          { id: 'calendar', label: 'Add check-ins to my calendar' },
        ],
      };
    case 'SENSE_ONLY':
      return {
        grid: false,
        steps: [
          { id: 'firstPhotos', label: 'Take my first photos today' },
          { id: 'keepNoPhotos', label: 'Keep going without photos' },
        ],
      };
    case 'CANT_COMPARE':
      return {
        grid: false,
        steps: [
          { id: 'photosNow', label: 'Take new photos now' },
          { id: 'later', label: 'Later' },
        ],
      };
    case 'TOO_MUCH':
    case 'UNEVEN':
      return {
        grid: false,
        steps: [
          { id: 'restart', label: 'Restart my tracker' },
          { id: 'keepTracker', label: 'Keep this tracker going' },
          { id: 'derm', label: 'Talk to a dermatologist' },
        ],
      };
    case 'BETTER_WHILE_USING':
    case 'BETTER_CHANGED':
      return {
        note: 'Your full look is done. Keep tracking for one more look after 12 more weeks of real use, or close the tracker.',
        grid: true,
        steps: [
          { id: 'keepTracking', label: 'Keep tracking' },
          { id: 'close', label: 'Close the tracker' },
        ],
      };
    case 'NO_CLEAR_FULL':
    case 'LOOKS_WORSE':
      return { note: 'Four equal choices. None of them is wrong.', grid: true, steps: four };
    case 'CHECK_FIRST':
      return { grid: false, steps: [{ id: 'derm', label: 'Summary for a dermatologist' }] };
    default:
      return { grid: false, steps: [{ id: 'keep', label: 'Done' }] };
  }
}
