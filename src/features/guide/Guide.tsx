import { Ban, Calendar, CircleHelp, Focus, MapPin, Package, Scale, ShieldAlert, Sun, ZapOff, type LucideIcon } from 'lucide-react';
import { ConcernBadge, Expandables, Page } from '../../components/blocks';
import { EvidenceMeter, SectionTitle, TONE_BG, TONE_INK, cx } from '../../components/ui';
import { CONCERNS, CONCERN_ORDER } from '../../content/concerns';
import { DIRECTIONS_LINE, PACK_WINS_LINE, PRODUCTS, productById } from '../../content/products';
import { useModels } from '../../data/hooks';

const PHOTO_RULES: { icon: LucideIcon; title: string; line: string }[] = [
  { icon: MapPin, title: 'The same spot', line: 'Stand in the same place each time, so the background matches.' },
  { icon: Sun, title: 'Daylight by a window', line: 'Soft daylight, facing the window. Avoid direct sun.' },
  { icon: ZapOff, title: 'Flash off', line: 'Flash changes how skin and hair look from photo to photo.' },
  { icon: Ban, title: 'No filters or beauty mode', line: 'Turn off anything that smooths or retouches.' },
  { icon: Focus, title: 'Same distance and angle', line: 'Use the faint copy of your first photo to line up.' },
];

const RULES = [
  ['A warning sign comes first.', 'Burning, broken skin or sudden hair loss overrides everything else, including "keep going".'],
  ['A cap on waiting.', 'After twice the full window without enough real use, Same Spot says use was too uneven to tell.'],
  ['Too early.', 'Before your early look, no visible change is normal, so there is no result yet.'],
  ['Too much changed.', 'For hair, one big trigger like an illness with fever; for any concern, three other changes. Then your record can\'t tell what helped.'],
  ['The photos must be able to show it.', 'No first photo, first photos younger than the early window, or no recent photo means no photo result yet.'],
  ['Compare without dates.', '"Looks better" needs your newer photo picked in every pair. Picking your first photo every time reads "looks worse to you".'],
];

const FAQ = [
  ["Why can't I see a change yet?", 'Slow-acting products take weeks or months of regular use. Same Spot counts only the weeks you really used it, and waits for your early look before saying anything about your photos.'],
  ['Why does how often I use it matter?', 'Waiting times assume use as the pack says. If you use it about half the days, those weeks count as half, so your dates move back and stay honest.'],
  ['Why compare without dates?', "When you know which photo is newer, hope can decide for you. Hiding the dates, and asking you to pick in every pair, makes a lucky \"looks better\" much less likely."],
  ['I changed phones. What now?', 'Before you switch, use Settings > Data > Export backup, then import the file on your new phone. Log "New phone or camera" at your next check-in, because a new camera can change how photos look.'],
  ['Is my data private?', 'Yes. Everything stays in this browser on this device. Same Spot has no server, no account and no analytics. Photos are never saved to your gallery.'],
  ['What if I clear my browser?', 'Clearing site data deletes your trackers and photos. Keep a backup from Settings > Data. On iPhone, add Same Spot to your Home Screen so Safari is less likely to clear it.'],
];

export default function Guide() {
  const models = useModels();
  const active = models?.active ?? [];
  const tracked = active.length ? active.map((m) => ({ key: m.tracker.id, name: m.tracker.productName, concern: m.tracker.concern, cautions: productById(m.tracker.productId)?.cautions ?? [] })) : PRODUCTS.map((p) => ({ key: p.id, name: p.name, concern: p.concern as keyof typeof CONCERNS, cautions: p.cautions }));

  return (
    <Page title="Guide">
      <p className="-mt-2 mb-6 text-[1.02rem] text-ink2">Short, honest answers. Tap any row to read more.</p>

      <SectionTitle>{active.length ? 'Your products' : 'Products'}</SectionTitle>
      <div className="grid gap-3">
        {tracked.map((p) => (
          <section key={p.key} className="card flex gap-4 p-4">
            <ConcernBadge concern={p.concern} />
            <div className="min-w-0">
              <h3 className="font-semibold text-ink">{p.name}</h3>
              <ul className="mt-1.5 space-y-1 text-[0.93rem] text-ink2">
                <li>{DIRECTIONS_LINE}</li>
                {p.cautions.map((c) => (
                  <li key={c} className="font-semibold text-ink">
                    {c}
                  </li>
                ))}
                <li>{PACK_WINS_LINE}</li>
              </ul>
            </div>
          </section>
        ))}
      </div>

      <SectionTitle>What to expect</SectionTitle>
      <Expandables
        items={CONCERN_ORDER.map((id) => {
          const c = CONCERNS[id];
          return {
            id,
            title: (
              <span className="flex items-center gap-3">
                <span className={cx('grid h-8 w-8 place-items-center rounded-[10px]', TONE_BG[c.tone], TONE_INK[c.tone])}>
                  <Calendar className="h-4 w-4" aria-hidden />
                </span>
                {c.label}
              </span>
            ),
            body: (
              <>
                <ol className="space-y-1.5">
                  {c.weeks.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ol>
                <p className="mt-3">
                  <b className="text-ink">Usually first:</b> {c.changesFirst.first.toLowerCase()}. <b className="text-ink">Later:</b> {c.changesFirst.later.toLowerCase()}.
                </p>
              </>
            ),
          };
        })}
      />

      <SectionTitle>Taking good photos</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {PHOTO_RULES.map((r, k) => (
          <section key={r.title} className="card flex items-start gap-3 p-4">
            <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-[14px]', ['bg-blue-50 text-blue-ink', 'bg-sand-50 text-sand-ink', 'bg-lav-50 text-lav-ink', 'bg-mint-50 text-mint-ink', 'bg-blue-50 text-blue-ink'][k])}>
              <r.icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold text-ink">
                {k + 1}. {r.title}
              </h3>
              <p className="mt-0.5 text-[0.93rem] text-ink2">{r.line}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="mt-3">
        <Expandables
          items={CONCERN_ORDER.filter((id) => id !== 'other').map((id) => ({
            id: `tips-${id}`,
            title: `Tips for ${CONCERNS[id].label.toLowerCase()}`,
            body: (
              <ul className="space-y-2">
                {CONCERNS[id].views.map((v) => (
                  <li key={v.id}>
                    <b className="text-ink">{v.label}:</b> {v.tip}
                  </li>
                ))}
              </ul>
            ),
          }))}
        />
      </div>

      <SectionTitle>When to see a doctor</SectionTitle>
      <Expandables
        items={CONCERN_ORDER.map((id) => ({
          id: `doc-${id}`,
          icon: ShieldAlert,
          title: CONCERNS[id].label,
          body: (
            <>
              <ul className="list-disc space-y-1 pl-5">
                {CONCERNS[id].warnings.map((w) => (
                  <li key={w.code}>{w.label}</li>
                ))}
              </ul>
              <p className="mt-3">If any of these happen, stop and follow your pack's directions. Same Spot shows "Please check this first" until it settles, and can make a one-page summary for a dermatologist.</p>
            </>
          ),
        }))}
      />

      <SectionTitle>How Same Spot decides</SectionTitle>
      <section className="card p-5">
        <ol className="space-y-3">
          {RULES.map(([title, line], k) => (
            <li key={title} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[0.85rem] font-bold text-blue-ink">{k + 1}</span>
              <span>
                <b className="text-ink">{title}</b> <span className="text-ink2">{line}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[0.9rem] text-ink2">The rules run in this order and the first one that matches decides, so two rules never contradict each other.</p>
      </section>

      <SectionTitle>Evidence and sources</SectionTitle>
      <Expandables
        items={CONCERN_ORDER.map((id) => {
          const c = CONCERNS[id];
          return {
            id: `ev-${id}`,
            icon: Scale,
            title: c.label,
            body: (
              <>
                <EvidenceMeter dots={c.evidence.dots} label={c.evidence.label} />
                <p className="mt-2">{c.evidence.line}</p>
                {c.sources.length ? (
                  <ul className="mt-3 space-y-2">
                    {c.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ),
          };
        })}
      />

      <SectionTitle>Questions</SectionTitle>
      <Expandables items={FAQ.map(([q, a], k) => ({ id: `faq-${k}`, icon: CircleHelp, title: q, body: <p>{a}</p> }))} />

      <p className="mt-8 flex items-start gap-2 rounded-[18px] bg-grey-50 p-4 text-[0.92rem] text-ink2">
        <Package className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        Same Spot is not a medical device. It shows you your own record so you can decide.
      </p>
    </Page>
  );
}
