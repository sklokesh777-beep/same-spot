import type { ConcernId } from '../engine/types';

export type Tone = 'blue' | 'lav' | 'mint' | 'sand' | 'rose' | 'coral' | 'grey';
export type ChangeType = 'cause' | 'major' | 'photo';
export type WarningGroup = 'skin' | 'hair' | 'pigment' | 'other';

export interface ViewDef {
  id: string;
  label: string;
  question: string;
  tip: string;
}

export interface ChangeDef {
  code: string;
  label: string;
  type: ChangeType;
  /** Lower-case form used inside sentences. */
  phrase: string;
}

export interface WarningDef {
  code: string;
  label: string;
  group: WarningGroup;
  phrase: string;
}

export interface Source {
  label: string;
  url: string;
}

export interface ConcernDef {
  id: ConcernId;
  label: string;
  short: string;
  tone: Tone;
  early: number;
  full: number;
  quick: { question: string; label: string };
  views: ViewDef[];
  changes: ChangeDef[];
  warnings: WarningDef[];
  changesFirst: { first: string; later: string };
  evidence: { dots: 1 | 2 | 3; label: string; line: string };
  sources: Source[];
  weeks: string[];
  isSkin: boolean;
}

export const SOURCES = {
  rosemary: { label: 'Rosemary oil vs minoxidil 2%, randomised trial', url: 'https://pubmed.ncbi.nlm.nih.gov/25842469/' },
  redensyl: { label: 'The only Redensyl trial tested a blend', url: 'https://pubmed.ncbi.nlm.nih.gov/32473084' },
  seasons: { label: 'Seasonal hair shedding in 823 women', url: 'https://pubmed.ncbi.nlm.nih.gov/19407435/' },
  underarmReview: { label: 'Systematic review of underarm darkening treatments', url: 'https://pubmed.ncbi.nlm.nih.gov/40843925' },
  underarmTrial: { label: 'Trial of niacinamide and desonide for underarm darkening', url: 'https://pubmed.ncbi.nlm.nih.gov/23355788/' },
  pih: { label: 'Darkening after irritation can last 6 to 12 months', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8565877/' },
  aad: { label: 'AAD: when darker, velvety skin needs a doctor', url: 'https://www.aad.org/public/diseases/a-z/acanthosis-nigricans-symptoms' },
} satisfies Record<string, Source>;

const change = (code: string, label: string, type: ChangeType = 'cause', phrase?: string): ChangeDef => ({
  code,
  label,
  type,
  phrase: phrase ?? label.charAt(0).toLowerCase() + label.slice(1),
});

const PHONE = change('phone', 'New phone or camera', 'photo', 'a new phone or camera');
const OTHER_CHANGE = change('other', 'Something else', 'cause', 'another change');

const BURNING: WarningDef = { code: 'burning', label: 'Burning that lasts', group: 'skin', phrase: 'burning that lasts' };
const BLISTERS: WarningDef = { code: 'blisters', label: 'Blisters or broken skin', group: 'skin', phrase: 'blisters or broken skin' };
const RASH: WarningDef = { code: 'rash', label: 'A spreading rash', group: 'skin', phrase: 'a spreading rash' };
const SUDDEN_DARK: WarningDef = {
  code: 'suddenDark',
  label: 'Darkening that appeared suddenly or is spreading',
  group: 'pigment',
  phrase: 'darkening that appeared suddenly or is spreading',
};
const VELVETY: WarningDef = { code: 'velvety', label: 'Skin that feels thick or velvety', group: 'pigment', phrase: 'skin that feels thick or velvety' };

export const CONCERNS: Record<ConcernId, ConcernDef> = {
  hair: {
    id: 'hair',
    label: 'Hair fall or thinning',
    short: 'Hair',
    tone: 'lav',
    early: 12,
    full: 24,
    quick: { question: 'Hair fall in the shower or on your comb, compared with before', label: 'Hair fall' },
    views: [
      {
        id: 'parting',
        label: 'Parting, from above',
        question: 'Which shows fuller hair along the parting?',
        tip: 'Part your hair the same way each time and shoot straight from above, with clean, dry hair.',
      },
      {
        id: 'hairline',
        label: 'Front hairline',
        question: 'Which shows fuller hair along the hairline?',
        tip: 'Pull your hair back gently and keep your head level.',
      },
    ],
    changes: [
      change('hairProduct', 'New hair oil, serum or shampoo'),
      change('salon', 'Colouring, straightening or a salon treatment'),
      change('supplement', 'A new supplement'),
      change('stress', 'A very stressful time'),
      change('fever', 'Illness with fever', 'major', 'an illness with fever'),
      change('pregnancy', 'Pregnancy, delivery or breastfeeding', 'major', 'pregnancy, delivery or breastfeeding'),
      change('medicine', 'Started or stopped a medicine, including hormonal ones', 'major', 'a medicine change'),
      change('diet', 'A big diet change or fast weight loss', 'major'),
      PHONE,
      OTHER_CHANGE,
    ],
    warnings: [
      { code: 'suddenLoss', label: 'Sudden or patchy hair loss', group: 'hair', phrase: 'sudden or patchy hair loss' },
      { code: 'scalp', label: 'A painful, red, scaly or irritated scalp', group: 'skin', phrase: 'a painful, red, scaly or irritated scalp' },
    ],
    changesFirst: { first: 'Less hair on the comb or in the shower', later: 'Fuller hair along the parting' },
    evidence: { dots: 2, label: 'Low to medium', line: 'A few small studies of similar products, not of your exact product. Hair grows slowly, so they judge results after months.' },
    sources: [SOURCES.rosemary, SOURCES.redensyl, SOURCES.seasons],
    weeks: [
      'Weeks 1 to 4: settle into a steady routine.',
      'Weeks 4 to 12: hair fall on your comb may change first.',
      'Week 12 of real use: your early look.',
      'Week 24 of real use: your full look.',
    ],
    isSkin: false,
  },
  underarm: {
    id: 'underarm',
    label: 'Underarm darkening',
    short: 'Underarm',
    tone: 'blue',
    early: 8,
    full: 12,
    quick: { question: 'Odour during the day, compared with before', label: 'Odour' },
    views: [
      {
        id: 'left',
        label: 'Left underarm, arm raised',
        question: 'In which photo does the patch look less noticeable?',
        tip: 'Raise your arm to the same height and distance. Before applying the product, not on a shaving day.',
      },
      {
        id: 'right',
        label: 'Right underarm, arm raised',
        question: 'In which photo does the patch look less noticeable?',
        tip: 'Keep the same distance and angle as your first photo.',
      },
    ],
    changes: [
      change('removal', 'Changed shaving, waxing or hair removal', 'cause', 'a change in hair removal'),
      change('deodorant', 'New deodorant or antiperspirant'),
      change('underarmProduct', 'Another new underarm product'),
      change('friction', 'Tighter clothes or more friction'),
      change('pregnancy', 'Pregnancy, delivery or breastfeeding', 'cause', 'pregnancy, delivery or breastfeeding'),
      PHONE,
      OTHER_CHANGE,
    ],
    warnings: [
      BURNING,
      BLISTERS,
      { code: 'swelling', label: 'Swelling or peeling', group: 'skin', phrase: 'swelling or peeling' },
      SUDDEN_DARK,
      VELVETY,
    ],
    changesFirst: { first: 'Odour and feel, within days or weeks', later: 'A less noticeable patch, over months' },
    evidence: { dots: 1, label: 'Low', line: 'Small studies of other ingredients, not of your exact product.' },
    sources: [SOURCES.underarmReview, SOURCES.underarmTrial, SOURCES.pih],
    weeks: [
      'Weeks 1 to 2: odour and feel may change first.',
      'Weeks 2 to 8: keep the routine steady.',
      'Week 8 of real use: your early look.',
      'Week 12 of real use: your full look.',
    ],
    isSkin: true,
  },
  neck: {
    id: 'neck',
    label: 'Neck or elbow darkening',
    short: 'Neck or elbow',
    tone: 'mint',
    early: 8,
    full: 12,
    quick: { question: 'How smooth the skin feels, compared with before', label: 'Smoothness' },
    views: [
      {
        id: 'neck',
        label: 'Back or side of neck',
        question: 'In which photo does the patch look less noticeable?',
        tip: 'Tie your hair up and keep your head straight. Ask someone to help if you can.',
      },
      {
        id: 'elbow',
        label: 'Outer elbow',
        question: 'In which photo does the patch look less noticeable?',
        tip: 'Bend your arm the same amount each time.',
      },
    ],
    changes: [
      change('skincare', 'New skincare on the area'),
      change('sun', 'More time in the sun'),
      change('weight', 'A big weight change'),
      change('medicine', 'Started or stopped a medicine', 'cause', 'a medicine change'),
      change('pregnancy', 'Pregnancy, delivery or breastfeeding', 'cause', 'pregnancy, delivery or breastfeeding'),
      PHONE,
      OTHER_CHANGE,
    ],
    warnings: [BURNING, BLISTERS, RASH, SUDDEN_DARK, VELVETY],
    changesFirst: { first: 'Smoother skin', later: 'A less noticeable patch' },
    evidence: { dots: 1, label: 'Low', line: 'A few small studies, mostly of prescription creams, not of your exact product.' },
    sources: [SOURCES.aad, SOURCES.pih],
    weeks: [
      'Weeks 1 to 4: the skin may feel smoother first.',
      'Weeks 4 to 8: keep the routine steady.',
      'Week 8 of real use: your early look.',
      'Week 12 of real use: your full look.',
    ],
    isSkin: true,
  },
  other: {
    id: 'other',
    label: 'Something else',
    short: 'Other',
    tone: 'sand',
    early: 8,
    full: 12,
    quick: { question: 'How it seems to you, compared with before', label: 'How it seems' },
    views: [
      { id: 'close', label: 'Close-up', question: 'Which looks better to you?', tip: 'Fill the frame with the area, in the same spot and light.' },
      { id: 'wide', label: 'Wider view', question: 'Which looks better to you?', tip: 'Step back so the area and what is around it show.' },
    ],
    changes: [
      change('newProduct', 'A new product on the area'),
      change('sun', 'More sun'),
      change('illness', 'Illness'),
      change('stress', 'Stress'),
      change('medicine', 'A medicine change'),
      PHONE,
      OTHER_CHANGE,
    ],
    warnings: [
      BURNING,
      BLISTERS,
      RASH,
      { code: 'worry', label: 'A sudden change that worries you', group: 'other', phrase: 'a sudden change that worries you' },
    ],
    changesFirst: { first: 'How it feels', later: 'How it looks' },
    evidence: { dots: 1, label: 'General starting point', line: 'These are general windows, not from studies of your product. Change the full look if your pack says something different.' },
    sources: [],
    weeks: ['Week 8 of real use: your early look.', 'Week 12 of real use: your full look.', 'These are general starting points.'],
    isSkin: true,
  },
};

export const CONCERN_ORDER: ConcernId[] = ['hair', 'underarm', 'neck', 'other'];

export function concernOf(id: ConcernId): ConcernDef {
  return CONCERNS[id];
}

export function changeOf(concern: ConcernId, code: string): ChangeDef | undefined {
  return CONCERNS[concern].changes.find((c) => c.code === code);
}

export function warningOf(concern: ConcernId, code: string): WarningDef | undefined {
  return CONCERNS[concern].warnings.find((w) => w.code === code);
}

export function viewOf(concern: ConcernId, id: string): ViewDef | undefined {
  return CONCERNS[concern].views.find((v) => v.id === id);
}
