# Same Spot

**Can you tell yet whether it's working?**

Same Spot is a private browser app for Be Bodywise customers using slow-acting hair and skin products. It counts the weeks you really used the product, notes what else changed, and only gives a verdict when your before and after photos can honestly be compared.

**Live app:** https://sklokesh777-beep.github.io/same-spot/
**Straight to the 60-second example:** https://sklokesh777-beep.github.io/same-spot/?demo=1

Built for Part 2 of the Mosaic Wellness Fellowship Builder Challenge.

## The problem

In customer interviews (Part 1), four of five customers could not tell, after weeks or months, whether a product was doing the slower job they bought it for. Three causes kept coming up:

1. **No record of the start.** Memory of how things looked fades and shifts.
2. **Other things changed too.** A new deodorant, hair oil, illness or stress can explain a difference.
3. **Waiting times assume daily use.** Labels and studies assume use as directed. Real use is often a few nights a week, so nobody knew when to expect a change.

## What Same Spot does

| Cause | Same Spot's answer |
| --- | --- |
| No record of the start | Two matched first photos, kept only on the phone. Later photos are checked for light against the first ones. |
| Other things changed | Every check-in asks "Anything new since last time?" A major trigger (for hair) or 3 or more changes gives "Can't tell: too much changed" instead of credit to the product. |
| Waiting assumes daily use | A **real-use clock**: most days counts as a full week, about half the days as half, a few times as a quarter. Look dates move with honest answers, and the arithmetic is shown. |

The main loop:

1. **Set up (about 2 minutes):** pick the concern (hair fall or thinning, underarm darkening, neck or elbow darkening), the product, the start date, how often you really use it, and how long a pack lasts. See what to expect and by when, with the pack's directions and the evidence level.
2. **First photos (optional):** two views, same spot and light. A dashed guide shows the framing.
3. **Check-ins (about 30 seconds):** week 2, then every 4 weeks. Four questions: how often you used it, anything new, any warning signs, and one quick sign (hair fall, odour or smoothness).
4. **Early and full look:** compare first and latest photos **without dates**, in random order, labelled only A and B. "Looks better" needs the newer photo picked in every pair. You can hand the phone to someone else to choose.
5. **Verdict:** a plain answer with a number, a date and a reason, including honest "too early" and "can't tell" results.

## The verdict rules

Rules run in a fixed order and the first match decides, so two rules can never contradict each other:

1. **Warning sign open:** "Please check this first". Safety comes before any "keep going".
2. **Twice the full window passed without a full trial:** "Can't tell: use was too uneven".
3. **Before the early look:** "Too early to judge".
4. **Too much else changed:** "Can't tell: too much changed".
5. **Photos must be able to show it:** no first photo (your sense only), first photos too recent, or light too different.
6. **The comparison without dates:** better so far, no clear change, looks worse, or better but other things changed too.

Open the example on a laptop to see the **Under the hood** panel, which traces each rule for the case on screen.

## Features

- **Five example cases** on made-up data, run through the real engine: too early, no clear change yet, other things changed, a full trial with no clear change, and a warning sign. The first four have a playable photo check on drawn illustrations (no real or stock photos).
- **Real-use clock** with the arithmetic shown, and a what-if table showing how use frequency moves the dates.
- **Light check** on new photos against the first ones, with retake or keep options. A **live camera with a faint copy of the first photo** to line up with, where the browser allows it. The phone camera through a file input always works.
- **Ask someone else to choose:** hand the phone over for the comparison without dates.
- **Pack running out:** four equal choices (keep going, pause, talk to a dermatologist, stop). No prices and no buy links.
- **Summary for a dermatologist:** a one-page record to show or print, with optional first and latest photos. No name or contact details.
- **Calendar reminders:** Google Calendar links and an .ics file. Events just say "Same Spot check-in".
- **Backup:** export and import one JSON file with records and photos.
- **App lock:** an optional 4-digit code for shared phones (a deterrent, not encryption).
- **Works offline** and can be added to the home screen (PWA). On iPhone, Same Spot explains why adding it to the Home Screen protects the record from Safari's clean-up.

## Privacy

- No server, no account, no analytics, no third-party requests. Everything is stored in IndexedDB in the browser on the phone.
- Photos are resized on the phone, saved as JPEG inside the app, and never written to the gallery.
- The app contains no customer names, phone numbers or other personal information. The examples use made-up data.
- "Delete everything" removes every record and photo.
- Not a medical device. Warning signs always point to the pack's directions or a dermatologist.

## Design

The look follows the Be Bodywise site: its primary blue `#005995`, navy `#143461`, yellow `#FDDC69` accent and pastel panels, with Inter for text (the site's fallback font) and Instrument Serif for headings. Both fonts are self-hosted under the SIL Open Font License (see `fonts/`). Each verdict family has its own colour, icon and title, so meaning never depends on colour alone. The main screens pass an axe-core scan (WCAG 2.1 A and AA rules) with no violations.

Wording rules: numbers and dates instead of impressions, "no clear change in your photos" rather than "not working", and no skin-colour words.

## Tech

- Plain HTML, CSS and JavaScript modules. No framework, no build step, no dependencies.
- `js/engine.js`: the real-use clock, schedule and verdict rules (pure functions).
- `js/copy.js`: the exact wording for each verdict.
- `js/config.js`: concerns, products, directions, look windows and sources.
- `js/state.js` and `js/store.js`: IndexedDB storage with 5 stores (meta, records, check-ins, photo details, image data).
- `js/screens/`: one module per screen, behind a small hash router in `js/app.js`.
- `sw.js`: a network-first service worker for offline use. It caches only the app's own files.

Run it locally (any static server works):

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

Run the tests (Node 20 or later):

```sh
npm test
```

The 30 engine tests cover the blueprint's 8 worked examples, every verdict rule and their order, the check-in schedule, pauses, look-date projections, and checks that no verdict wording uses skin-colour words or calls a product "not working".

## Evidence

Look windows come from published studies and product labels, and the app says how strong the evidence is for each concern:

- **Hair fall or thinning:** early look at 12 weeks, full look at 24 weeks of regular use. Evidence: low to medium.
- **Underarm darkening:** early look at 8 weeks, full look at 12. Evidence: low.
- **Neck or elbow darkening:** early look at 8 weeks, full look at 12. Evidence: low for the neck, very low for elbows.

Every source is linked in the app under "Why these dates" and on the How it works page. Product directions are paraphrased from the Be Bodywise product pages, checked in November 2026, and the app says to follow the pack if it differs.

## Limits

- Tested in Chromium (desktop and mobile sizes) and in an iPhone emulation. It has not yet been tested with real phone cameras or on a real iPhone.
- On iPhone, Safari can clear site data after 7 days without a visit unless Same Spot is opened from the Home Screen. The app explains this and offers a backup.
- The app lock hides the record from casual access. It does not encrypt data.

## AI tools used

Built with Kiro, an AI coding agent, working from the Part 1 research and the Same Spot blueprint.
