// Concern settings, products and on-screen wording.
// Windows and evidence lines follow the Same Spot blueprint (section 6f).
// Product directions are paraphrased from Be Bodywise product pages,
// checked in November 2026. The app never invents a waiting time.

export const LIMITS = {
  maxActiveRecords: 3,
  packDaysMin: 7,
  packDaysMax: 180,
  packDaysDefault: 30,
  maxStartYearsBack: 2,
  // Flag a check-in photo when its brightness is outside this ratio of the first photo.
  brightnessRatioLow: 0.75,
  brightnessRatioHigh: 1.33,
  // A current photo must be this recent to be compared at a checkpoint.
  recentPhotoDays: 14,
  // Gaps between check-ins longer than this lower confidence.
  longGapDays: 56,
  // "Keep tracking" adds one more look after this many weeks of regular use.
  extraLookWeeks: 12,
  // Show the pack banner this many days before the estimated finish date.
  packBannerDays: 5,
};

// How each "how often" answer counts toward the real-use clock.
// Quarters keep the arithmetic exact: most days = 4/4 of a week.
export const USE_OPTIONS = [
  { id: 'most', label: 'Most days', quarters: 4, phrase: 'most days', counts: 'a full week' },
  { id: 'half', label: 'About half the days', quarters: 2, phrase: 'about half the days', counts: 'half a week' },
  { id: 'few', label: 'A few times', quarters: 1, phrase: 'a few times', counts: 'a quarter of a week' },
  { id: 'none', label: 'Not at all', setupLabel: "I've stopped", quarters: 0, phrase: 'not at all', counts: 'nothing' },
];

export const USE_BY_ID = Object.fromEntries(USE_OPTIONS.map((o) => [o.id, o]));

export const FAST_ANSWERS = [
  { id: 'better', label: 'Better', line: 'better since you started' },
  { id: 'same', label: 'About the same', line: 'about the same as before' },
  { id: 'worse', label: 'Worse', line: 'worse than before' },
  { id: 'unsure', label: 'Not sure', line: 'not sure yet' },
];
export const FAST_BY_ID = Object.fromEntries(FAST_ANSWERS.map((o) => [o.id, o]));

// Shared change chips.
const PHONE = {
  code: 'phone', type: 'photo', label: 'New phone or camera',
  verb: 'switched to a new phone or camera', noun: 'a new phone or camera',
};
const OTHER = {
  code: 'other', type: 'cause', label: 'Something else',
  verb: 'changed something else', noun: 'another change',
};
const PREGNANCY_SKIN = {
  code: 'pregnancy', type: 'cause', label: 'Pregnancy, delivery or breastfeeding',
  verb: 'logged pregnancy, delivery or breastfeeding', noun: 'pregnancy, delivery or breastfeeding',
};

// Shared warning signs.
const W_BURNING = { code: 'burning', group: 'skin', label: 'Burning that lasts', phrase: 'burning that lasts' };
const W_BLISTERS = { code: 'blisters', group: 'skin', label: 'Blisters or broken skin', phrase: 'blisters or broken skin' };
const W_SUDDEN_DARK = {
  code: 'suddenDark', group: 'pigment',
  label: 'Darkening that appeared suddenly or is spreading', phrase: 'appeared suddenly or is spreading',
};
const W_VELVETY = { code: 'velvety', group: 'pigment', label: 'Skin that feels thick or velvety', phrase: 'feels thick or velvety' };

const SRC = {
  rosemaryTrial: { label: 'Rosemary oil vs minoxidil 2%, randomised trial (2015)', url: 'https://pubmed.ncbi.nlm.nih.gov/25842469/' },
  minoxidilLabel: { label: "Women's minoxidil label: some women need at least 4 months (DailyMed)", url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=4d659f8f-b721-cf3b-e063-6394a90a50f6' },
  redensyl: { label: 'The only Redensyl trial tested a blend (2020)', url: 'https://pubmed.ncbi.nlm.nih.gov/32473084' },
  biotin: { label: 'Review of biotin for hair loss (2017)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5582478' },
  biotinLab: { label: 'FDA: biotin can affect lab tests', url: 'https://www.fda.gov/medical-devices/in-vitro-diagnostics/biotin-interference-troponin-lab-tests-assays-subject-biotin-interference' },
  shedding: { label: 'AAD: hair shedding and when fullness returns', url: 'https://www.aad.org/public/diseases/hair-loss/insider/shedding' },
  seasons: { label: 'Seasonal hair shedding in 823 women (2009)', url: 'https://pubmed.ncbi.nlm.nih.gov/19407435/' },
  underarmReview: { label: 'Systematic review of underarm darkening treatments (2025)', url: 'https://pubmed.ncbi.nlm.nih.gov/40843925' },
  underarmTrial: { label: 'Trial in 24 women judged at 9 weeks (2013)', url: 'https://pubmed.ncbi.nlm.nih.gov/23355788/' },
  underarmTretinoin: { label: 'Split-side trial: change by week 8 (2025)', url: 'https://pubmed.ncbi.nlm.nih.gov/39833642/' },
  neckReview: { label: 'Review of 7 trials on velvety neck and underarm darkening (2025)', url: 'https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2025.1641322/full' },
  pih: { label: 'Darkening after irritation can last 6 to 12 months', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8565877/' },
  aha: { label: 'FDA: acids raise sun sensitivity', url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-labeling-cosmetics-containing-alpha-hydroxy-acids' },
  an: { label: 'AAD: when darker, velvety skin needs a doctor', url: 'https://www.aad.org/public/diseases/a-z/acanthosis-nigricans-symptoms' },
};
export const SOURCES = SRC;

export const CONCERNS = {
  hair: {
    id: 'hair',
    label: 'Hair fall or thinning',
    short: 'Hair',
    area: 'hair',
    early: 12,
    full: 24,
    evidenceLevel: 'Low to medium',
    evidenceLine:
      'In one trial of rosemary oil, changes showed at 6 months, not 3. Little evidence exists for Redensyl alone. Biotin helps mainly people who lack it.',
    sources: [SRC.rosemaryTrial, SRC.minoxidilLabel, SRC.redensyl, SRC.biotin, SRC.shedding],
    earlySign: 'Less hair on the comb or in the shower',
    lateSign: 'Fuller hair along the parting',
    fastSign: { question: 'Hair fall in the shower or on your comb, compared with before', label: 'Hair fall' },
    views: [
      { id: 'parting', label: 'Parting, from above', tip: 'Part your hair the same way each time and shoot from straight above.', question: 'Which shows fuller hair along the parting?' },
      { id: 'hairline', label: 'Front hairline', tip: 'Pull hair back gently and keep your head level.', question: 'Which shows fuller hair along the hairline?' },
    ],
    photoGuide: 'Hair clean and dry, parted the same way.',
    changes: [
      { code: 'hairProduct', type: 'cause', label: 'New hair oil, serum or shampoo', verb: 'started a new hair oil, serum or shampoo', noun: 'a new hair oil, serum or shampoo' },
      { code: 'salon', type: 'cause', label: 'Colouring, straightening or salon treatment', verb: 'had colouring, straightening or a salon treatment', noun: 'colouring, straightening or a salon treatment' },
      { code: 'supplement', type: 'cause', label: 'New supplement', verb: 'started a new supplement', noun: 'a new supplement' },
      { code: 'stress', type: 'cause', label: 'Very stressful time', verb: 'went through a very stressful time', noun: 'a very stressful time' },
      { code: 'fever', type: 'major', label: 'Illness with fever', verb: 'had an illness with fever', noun: 'an illness with fever' },
      { code: 'pregnancy', type: 'major', label: 'Pregnancy, delivery or breastfeeding', verb: 'logged pregnancy, delivery or breastfeeding', noun: 'pregnancy, delivery or breastfeeding' },
      { code: 'medicine', type: 'major', label: 'Started or stopped a medicine, including hormonal ones', verb: 'started or stopped a medicine', noun: 'a medicine change' },
      { code: 'diet', type: 'major', label: 'Big diet change or fast weight loss', verb: 'had a big diet change or fast weight loss', noun: 'a big diet change or fast weight loss' },
      PHONE,
      OTHER,
    ],
    warnings: [
      { code: 'suddenLoss', group: 'hair', label: 'Sudden or patchy hair loss', phrase: 'sudden or patchy hair loss' },
      { code: 'scalp', group: 'hair', label: 'A painful, red, scaly or irritated scalp', phrase: 'a painful, red or scaly scalp' },
    ],
    notes: ['Hair shedding rises and falls with the seasons.'],
    noteSources: [SRC.seasons],
    stopIf: 'Sudden or patchy hair loss, or a painful, red, scaly or irritated scalp.',
    isSkin: false,
    products: [
      {
        id: 'redensyl-serum',
        name: 'Hair Growth Serum Roll-On (Redensyl)',
        short: 'hair growth roll-on',
        directions: [
          'Use it at least once a day, ideally in the late evening or at night.',
          "It's a leave-in. Don't wash it off, and don't apply it just before washing your hair.",
          'The product page says using it less than daily may slow new growth.',
        ],
        source: 'https://bebodywise.com/product/hair-growth-serum-roll-on-xp5',
        packDays: 30,
      },
      {
        id: 'rosemary-serum',
        name: 'Rosemary Hair Growth Serum Roll-On',
        short: 'rosemary hair roll-on',
        directions: ['Follow the directions on your pack.'],
        packDays: 30,
      },
      {
        id: 'biotin-gummies',
        name: 'Biotin Hair Gummies',
        short: 'hair gummies',
        directions: [
          'Eat 1 gummy a day after a meal.',
          "If you're breastfeeding, check with your doctor before taking any supplement.",
        ],
        extraNote: 'Biotin can affect some blood test results. Tell your doctor before a test.',
        extraNoteSource: SRC.biotinLab,
        source: 'https://bebodywise.com/product/hair-health-gummies',
        packDays: 30,
      },
    ],
  },

  underarm: {
    id: 'underarm',
    label: 'Underarm darkening',
    short: 'Underarm',
    area: 'skin',
    early: 8,
    full: 12,
    evidenceLevel: 'Low',
    evidenceLine:
      'Small studies of other ingredients judged results at 8 to 9 weeks. No study of this exact product type was found.',
    sources: [SRC.underarmReview, SRC.underarmTrial, SRC.underarmTretinoin, SRC.pih],
    earlySign: 'Odour and feel, within days or weeks',
    lateSign: 'A less noticeable patch, over months',
    fastSign: { question: 'Odour during the day, compared with before', label: 'Odour' },
    views: [
      { id: 'left', label: 'Left underarm, arm raised', tip: 'Raise your arm the same height each time. Photograph before applying the product.', question: 'In which photo does the patch look less noticeable?' },
      { id: 'right', label: 'Right underarm, arm raised', tip: 'Keep the same distance from the camera as your first photo.', question: 'In which photo does the patch look less noticeable?' },
    ],
    photoGuide: 'Before applying the product, and not on a shaving day.',
    changes: [
      { code: 'removal', type: 'cause', label: 'Changed shaving, waxing or hair removal', verb: 'changed how you remove underarm hair', noun: 'a change in hair removal' },
      { code: 'deodorant', type: 'cause', label: 'New deodorant or antiperspirant', verb: 'started a new deodorant or antiperspirant', noun: 'a new deodorant or antiperspirant' },
      { code: 'underarmProduct', type: 'cause', label: 'Another new underarm product', verb: 'started another underarm product', noun: 'another new underarm product' },
      { code: 'friction', type: 'cause', label: 'Tighter clothes or more friction', verb: 'had tighter clothes or more friction', noun: 'tighter clothes or more friction' },
      PREGNANCY_SKIN,
      PHONE,
      OTHER,
    ],
    warnings: [
      W_BURNING,
      W_BLISTERS,
      { code: 'swelling', group: 'skin', label: 'Swelling or peeling', phrase: 'swelling or peeling' },
      W_SUDDEN_DARK,
      W_VELVETY,
    ],
    notes: [],
    stopIf: 'Burning that lasts, blisters or broken skin, swelling or peeling, or darkening that appears suddenly, spreads, or feels thick or velvety.',
    isSkin: true,
    products: [
      {
        id: 'aha-bha-6',
        name: '6% AHA BHA Underarm Roll On',
        short: 'underarm roll-on',
        directions: [
          'Roll it evenly on clean underarm skin, let it dry fully, and use it daily.',
          "Don't apply it on broken or irritated skin.",
        ],
        shaving:
          'Be Bodywise suggests waiting 10 to 15 minutes after shaving and 6 to 12 hours after waxing before you apply it.',
        shavingSource: 'https://bebodywise.com/blog/dark-underarms-what-actually-helps/',
        patch:
          'Patch test first: put a little on your arm or the bend of your elbow, keep it dry and leave it 12 to 24 hours. If you see redness, itching or irritation, don\u2019t use it.',
        source: 'https://bebodywise.com/product/6-aha-bha-underarm-roll-on-xp',
        packDays: 30,
      },
      {
        id: 'aha-bha-4',
        name: '4% AHA BHA Underarm Roll On',
        short: 'underarm roll-on',
        directions: ['Apply it on clean, dry skin and let it absorb before dressing.'],
        shaving:
          'Be Bodywise suggests waiting 10 to 15 minutes after shaving and 6 to 12 hours after waxing before you apply it.',
        shavingSource: 'https://bebodywise.com/blog/dark-underarms-what-actually-helps/',
        source: 'https://bebodywise.com/blog/dark-underarms-what-actually-helps/',
        packDays: 30,
      },
    ],
  },

  neckElbow: {
    id: 'neckElbow',
    label: 'Neck or elbow darkening',
    short: 'Neck or elbow',
    area: 'skin',
    early: 8,
    full: 12,
    evidenceLevel: 'Low for the neck, very low for elbows',
    evidenceLine: 'Studies looked at about 8 weeks, mostly with prescription creams.',
    sources: [SRC.neckReview, SRC.pih, SRC.aha, SRC.an],
    earlySign: 'Smoother, softer skin',
    lateSign: 'A less noticeable patch',
    fastSign: { question: 'How smooth the skin feels, compared with before', label: 'Smoothness' },
    views: [
      { id: 'neck', label: 'Back or side of neck', tip: 'Tie your hair up and keep your head straight. Ask someone to help if you can.', question: 'In which photo does the patch look less noticeable?' },
      { id: 'elbow', label: 'Elbow, outer side', tip: 'Bend your arm the same amount each time.', question: 'In which photo does the patch look less noticeable?' },
    ],
    photoGuide: 'Clean, dry skin, before you apply the cream.',
    changes: [
      { code: 'skincare', type: 'cause', label: 'New skincare on the area', verb: 'started new skincare on the area', noun: 'new skincare on the area' },
      { code: 'sun', type: 'cause', label: 'More time in the sun', verb: 'spent more time in the sun', noun: 'more time in the sun' },
      { code: 'weight', type: 'cause', label: 'Big weight change', verb: 'had a big weight change', noun: 'a big weight change' },
      { code: 'medicine', type: 'cause', label: 'Started or stopped a medicine', verb: 'started or stopped a medicine', noun: 'a medicine change' },
      PREGNANCY_SKIN,
      PHONE,
      OTHER,
    ],
    warnings: [
      W_BURNING,
      W_BLISTERS,
      { code: 'rash', group: 'skin', label: "A rash that's spreading", phrase: "a rash that's spreading" },
      W_SUDDEN_DARK,
      W_VELVETY,
    ],
    notes: [
      'If the darker skin feels thick or velvety, or appeared quickly, a doctor can check for common causes.',
      'Acids can make skin more sensitive to sun.',
    ],
    noteSources: [SRC.an, SRC.aha],
    stopIf: "Burning that lasts, blisters or broken skin, a rash that's spreading, or darkening that appears suddenly, spreads, or feels thick or velvety.",
    isSkin: true,
    products: [
      {
        id: 'pigmentation-cream',
        name: 'Pigmentation Repair Cream',
        short: 'pigmentation cream',
        directions: [
          'Cleanse the area and pat it dry, then apply a pea-sized amount.',
          "It's a leave-in cream. The product page suggests applying it after your morning shower.",
        ],
        patch:
          'Patch test first: put a little on your arm or the bend of your elbow, keep it dry and leave it 12 to 24 hours. If you see redness, itching or irritation, don\u2019t use it.',
        source: 'https://bebodywise.com/product/pigmentation-repair-cream',
        packDays: 30,
      },
    ],
  },
};

export const CONCERN_ORDER = ['hair', 'underarm', 'neckElbow'];

export const OTHER_PRODUCT = {
  id: 'other',
  name: 'Other product',
  short: 'product',
  directions: ['Follow the directions on your pack.'],
  generalWindows: 'These are general windows for this kind of product.',
  packDays: 30,
};

export function concernOf(id) {
  return CONCERNS[id] || null;
}

export function productOf(concernId, productId) {
  const c = CONCERNS[concernId];
  if (!c) return null;
  return c.products.find((p) => p.id === productId) || (productId === 'other' ? OTHER_PRODUCT : null);
}

export function changeOf(concern, code) {
  return concern.changes.find((c) => c.code === code) || null;
}

export function warningOf(concern, code) {
  return concern.warnings.find((w) => w.code === code) || null;
}

// Verdict titles, in the blueprint's exact words.
export const VERDICT_TITLES = {
  CHECK_FIRST: 'Please check this first',
  CANT_TELL_UNEVEN: "Can't tell: use was too uneven",
  TOO_EARLY: 'Too early to judge',
  CANT_TELL_CHANGED: "Can't tell: too much changed",
  SENSE_ONLY: 'Your sense only',
  TOO_EARLY_PHOTOS: 'Too early for your photos',
  CANT_COMPARE: "Can't compare these photos yet",
  BETTER_SO_FAR: 'Looks better so far',
  BETTER_SO_FAR_CHANGED: 'Looks better so far, but other things changed too',
  NO_CLEAR_YET: 'No clear change yet',
  BETTER_WHILE_USING: 'Looks better while using it',
  BETTER_BUT_CHANGED: 'Looks better, but other things changed too',
  NO_CLEAR_FULL: 'No clear change after a full trial',
  LOOKS_WORSE: 'Looks worse to you',
};

// Visual family for each verdict. Meaning never depends on colour alone:
// every family also has its own icon and title.
export const VERDICT_FAMILY = {
  CHECK_FIRST: 'safety',
  CANT_TELL_UNEVEN: 'unclear',
  TOO_EARLY: 'wait',
  CANT_TELL_CHANGED: 'unclear',
  SENSE_ONLY: 'unclear',
  TOO_EARLY_PHOTOS: 'wait',
  CANT_COMPARE: 'unclear',
  BETTER_SO_FAR: 'positive',
  BETTER_SO_FAR_CHANGED: 'mixed',
  NO_CLEAR_YET: 'neutral',
  BETTER_WHILE_USING: 'positive',
  BETTER_BUT_CHANGED: 'mixed',
  NO_CLEAR_FULL: 'neutral',
  LOOKS_WORSE: 'negative',
};

export const VERDICT_FOOTER = 'This is your view of your own photos, not a medical assessment.';

export const COPY = {
  appName: 'Same Spot',
  tagline: 'Can you tell yet?',
  madeFor: 'Made for Be Bodywise customers',
  landingLine:
    "Can you tell yet whether it's working? Same Spot counts the weeks you really used it, notes what else changed, and only gives a verdict when your before and after can honestly be compared.",
  staysOnPhone: 'Your photos and answers stay on this phone.',
  howItWorks: [
    'Tell Same Spot what you use and how often, honestly.',
    'Take two private photos at the start, in the same spot and light. Photos are optional.',
    'Every 4 weeks, answer four quick questions. It takes about 30 seconds.',
    'Only the weeks you really used it count toward the waiting time.',
    'At your early and full look, you compare photos without dates, so hope doesn\u2019t decide.',
    'You get a plain verdict, or an honest "too early" or "can\u2019t tell". A warning sign always comes first.',
  ],
  privateTab: 'Private tab: anything you save will be lost when you close it. You can still try the example.',
  safariRisk: 'Your record could be deleted by Safari.',
  notice: [
    "What's saved: your answers, dates and any photos you take. Where: only in this browser on this phone. Nobody at Be Bodywise or Mosaic can see them.",
    'You can delete everything at any time in Privacy and data.',
    'Same Spot is not a medical tool. It shows you your own record so you can decide.',
  ],
  under18: "Same Spot is for adults only, so we can't start a record for you.",
  lessOftenNote:
    "Studies tested use as the label says. Nobody knows how using it less often changes this, so we count your weeks as part-weeks. That's a cautious guess.",
  photoSupport: "If looking at your photos makes you feel worse, it's fine to pause.",
  notMedical: 'Not a medical device. If you have pain, bleeding, a spreading rash, or sudden hair loss, see a doctor.',
  sampleBanner: 'Example with made-up data. Nothing is saved.',
  illustration: 'Illustration, not a photo',
  harmFollow: 'If you see a doctor, you can show them your record. Same Spot makes a one-page summary for a dermatologist.',
};

export const SCENARIO_TABS = [
  { id: 'too-early', label: 'Too early' },
  { id: 'no-clear-yet', label: 'No clear change yet' },
  { id: 'other-changes', label: 'Other things changed' },
  { id: 'full-trial', label: 'Full trial: no clear change' },
  { id: 'check-this', label: 'Please check this' },
];
