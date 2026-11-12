import * as Accordion from '@radix-ui/react-accordion';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ChevronDown, CircleCheck, CircleHelp, Equal, Flag, Hourglass, Layers, Pause, TrendingDown, TrendingUp,
  TriangleAlert, X, CircleX, type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConcernId } from '../engine/types';
import { CONCERNS } from '../content/concerns';
import { FAMILY_TONE, RESULT_FOOTER, type Family } from '../content/copy';
import type { CheckItem } from '../engine/rules';
import { usePhotoUrl } from '../data/hooks';
import { goBackOr } from '../data/flows';
import { Sheet } from './overlay';
import { Button, TONE_BG, TONE_BORDER, TONE_INK, cx, type AnyTone } from './ui';

export const FAMILY_ICON: Record<Family, LucideIcon> = {
  safety: TriangleAlert,
  wait: Hourglass,
  unclear: CircleHelp,
  positive: TrendingUp,
  mixed: Layers,
  neutral: Equal,
  negative: TrendingDown,
  ready: Flag,
  paused: Pause,
};

export function familyTone(f: Family): AnyTone {
  return FAMILY_TONE[f];
}

// ---------- concern badge ----------

export function ConcernIcon({ concern, className }: { concern: ConcernId; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {concern === 'hair' ? (
        <g {...common}>
          <path d="M7 20c-1-6 0-11 4-15" />
          <path d="M11.5 20c-.6-5.5.4-10 3.5-13.5" />
          <path d="M16 20c-.4-4.6.6-8.4 3-11" />
        </g>
      ) : concern === 'underarm' ? (
        <g {...common}>
          <rect x="8" y="9" width="8" height="12" rx="3" />
          <path d="M9.5 9V6.5a2.5 2.5 0 0 1 5 0V9" />
          <circle cx="12" cy="4.2" r="1.2" />
        </g>
      ) : concern === 'neck' ? (
        <g {...common}>
          <path d="M8 3c.6 4 .3 7.5-2 11.5L4 21" />
          <path d="M16 3c-.6 4-.3 7.5 2 11.5l2 6.5" />
          <path d="M9.5 17c1.6-.6 3.4-.6 5 0" />
        </g>
      ) : (
        <g {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" />
        </g>
      )}
    </svg>
  );
}

export function ConcernBadge({ concern, size = 44 }: { concern: ConcernId; size?: number }) {
  const tone = CONCERNS[concern].tone;
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-[14px]', TONE_BG[tone], TONE_INK[tone])} style={{ width: size, height: size }}>
      <ConcernIcon concern={concern} className="h-[55%] w-[55%]" />
    </span>
  );
}

// ---------- result card ----------

export function ResultCard({
  title,
  family,
  paragraphs,
  kicker,
  checks,
  footer = RESULT_FOOTER,
  animate = true,
}: {
  title: string;
  family: Family;
  paragraphs: string[];
  kicker?: string;
  checks?: CheckItem[];
  footer?: string | null;
  animate?: boolean;
}) {
  const [why, setWhy] = useState(false);
  const tone = familyTone(family);
  const Icon = FAMILY_ICON[family];
  return (
    <motion.article
      initial={animate ? { y: 24, opacity: 0, scale: 0.98 } : false}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cx('overflow-hidden rounded-card border bg-card shadow-soft', TONE_BORDER[tone])}
      aria-live="polite"
    >
      <div className={cx('px-5 pb-5 pt-5', TONE_BG[tone])}>
        <div className="flex items-center gap-3">
          <span className={cx('grid h-11 w-11 place-items-center rounded-[14px] bg-card', TONE_INK[tone])}>
            <Icon className="h-6 w-6" strokeWidth={1.9} aria-hidden />
          </span>
          {kicker ? <span className={cx('text-[0.8rem] font-bold uppercase tracking-[0.08em]', TONE_INK[tone])}>{kicker}</span> : null}
        </div>
        <h2 className="mt-4 font-serif text-[2rem] leading-[1.05] text-navy">{title}</h2>
      </div>
      <div className="space-y-3 px-5 pb-5 pt-4">
        {paragraphs.map((p) => (
          <p key={p} className="text-[1.02rem] leading-relaxed text-ink">
            {p}
          </p>
        ))}
        {checks && checks.length ? (
          <button type="button" onClick={() => setWhy(true)} className="tap -ml-1 flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 font-semibold text-primary">
            Why this result?
            <ChevronDown className="h-4 w-4 -rotate-90" aria-hidden />
          </button>
        ) : null}
        {footer ? <p className="border-t border-dashed border-line pt-3 text-[0.85rem] text-ink2">{footer}</p> : null}
      </div>
      {checks ? (
        <Sheet open={why} onClose={() => setWhy(false)} title="Why this result?" description="Same Spot checks these in order. The first one that doesn't pass decides.">
          <ul className="space-y-2.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 rounded-[16px] bg-grey-50 p-3.5">
                {c.ok ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint-ink" aria-hidden /> : <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-coral-ink" aria-hidden />}
                <span>
                  <span className="sr-only">{c.ok ? 'Passed: ' : 'Decided here: '}</span>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </Sheet>
      ) : null}
    </motion.article>
  );
}

// ---------- flows ----------

export function FlowShell({
  step,
  total,
  onBack,
  onClose,
  closeTo = '/',
  closeLabel = 'Close',
  children,
  footer,
  hideClose,
  tone = 'plain',
}: {
  step?: number;
  total?: number;
  onBack?: () => void;
  /** Close the flow. Without it, the close button goes back one screen. */
  onClose?: () => void;
  closeTo?: string;
  closeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  hideClose?: boolean;
  tone?: 'plain' | 'tint';
}) {
  const nav = useNavigate();
  const close = onClose ?? (() => void goBackOr(nav, closeTo));
  return (
    <div className={cx('flex min-h-dvh flex-col', tone === 'tint' ? 'bg-gradient-to-b from-blue-50 via-bg to-bg' : 'bg-bg')}>
      <header className="sticky top-0 z-20 bg-bg/85 pt-[var(--safe-t)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[600px] items-center gap-3 px-3">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label="Back" className="tap grid h-12 w-12 place-items-center rounded-full text-navy hover:bg-primary/10">
              <ArrowLeft className="h-6 w-6" aria-hidden />
            </button>
          ) : (
            <span className="w-12" aria-hidden />
          )}
          <div className="flex-1">
            {total ? (
              <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label={`Step ${step} of ${total}`}>
                <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${((step ?? 0) / total) * 100}%` }} transition={{ duration: 0.3 }} />
              </div>
            ) : null}
          </div>
          {hideClose ? (
            <span className="w-12" aria-hidden />
          ) : (
            <button type="button" onClick={close} aria-label={closeLabel} className="tap grid h-12 w-12 place-items-center rounded-full text-ink2 hover:bg-grey-50">
              <X className="h-6 w-6" aria-hidden />
            </button>
          )}
        </div>
      </header>
      <main id="main" tabIndex={-1} className="focus:outline-none mx-auto w-full max-w-[600px] flex-1 px-5 pb-6 pt-2">
        {children}
      </main>
      {footer ? (
        <div className="sticky bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-bg/0 pb-[calc(16px+var(--safe-b))] pt-6">
          <div className="mx-auto grid max-w-[600px] gap-2.5 px-5">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

/** A step's heading, focused when the step changes so screen readers follow. */
export function StepTitle({ children, kicker, sub }: { children: ReactNode; kicker?: string; sub?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <motion.div initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="mb-6 mt-2">
      {kicker ? <p className="kicker mb-2">{kicker}</p> : null}
      <h1 ref={ref} tabIndex={-1} className="title focus:outline-none">
        {children}
      </h1>
      {sub ? <p className="mt-3 text-[1.02rem] text-ink2">{sub}</p> : null}
    </motion.div>
  );
}

export function StepBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.26, delay: 0.04, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

// ---------- tab pages ----------

export function Page({ title, kicker, right, children }: { title: string; kicker?: ReactNode; right?: ReactNode; children: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: '-8px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="pb-tabbar">
      <header className={cx('sticky top-0 z-20 border-b pt-[var(--safe-t)] backdrop-blur-md transition-colors duration-200', compact ? 'border-line bg-bg/90' : 'border-transparent bg-bg/0')}>
        <div className="mx-auto flex h-14 max-w-[760px] items-center justify-between gap-3 px-5">
          <span className={cx('truncate font-semibold text-navy transition-opacity duration-200', compact ? 'opacity-100' : 'opacity-0')} aria-hidden={!compact}>
            {title}
          </span>
          <div className="flex items-center gap-1">{right}</div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="focus:outline-none mx-auto w-full max-w-[760px] px-5">
        {kicker ? <div className="mb-1">{kicker}</div> : null}
        <h1 className="title-lg">{title}</h1>
        <div ref={sentinel} className="h-1" aria-hidden />
        <div className="mt-5">{children}</div>
      </main>
    </div>
  );
}

// ---------- expandable rows ----------

export function Expandables({
  items,
  defaultOpen,
  level = 3,
}: {
  items: { id: string; title: ReactNode; icon?: LucideIcon; body: ReactNode }[];
  defaultOpen?: string[];
  /** Heading level of each row, so headings stay in order on the page. */
  level?: 2 | 3;
}) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <Accordion.Root type="multiple" defaultValue={defaultOpen} className="card divide-y divide-line overflow-hidden p-0">
      {items.map(({ id, title, icon: Icon, body }) => (
        <Accordion.Item key={id} value={id}>
          <Accordion.Header asChild>
            <H className="m-0">
            <Accordion.Trigger className="group flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left font-semibold text-ink hover:bg-grey-50">
              {Icon ? <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} aria-hidden /> : null}
              <span className="flex-1">{title}</span>
              <ChevronDown className="h-5 w-5 shrink-0 text-ink2 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
            </Accordion.Trigger>
            </H>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden px-4 pb-4 text-[0.97rem] leading-relaxed text-ink2">{body}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

// ---------- photos ----------

export function PhotoThumb({
  id,
  label,
  sub,
  blur,
  onClick,
  kind = 'thumb',
  className,
  alt,
  selected,
}: {
  id: string;
  label?: string;
  sub?: string;
  blur?: boolean;
  onClick?: () => void;
  kind?: 'thumb' | 'full';
  className?: string;
  alt: string;
  selected?: boolean;
}) {
  const url = usePhotoUrl(id, kind);
  const [revealed, setRevealed] = useState(false);
  const hidden = blur && !revealed;
  const inner = (
    <>
      {url ? (
        <img src={url} alt={alt} className={cx('h-full w-full object-cover transition-[filter] duration-300', hidden && 'blurred')} draggable={false} />
      ) : (
        <span className="block h-full w-full animate-pulse bg-grey-50" />
      )}
      {label ? (
        <span className="absolute left-2 top-2 rounded-lg bg-[#143461]/85 px-2 py-1 text-left text-[0.78rem] font-bold leading-tight text-white">
          {label}
          {sub ? <span className="block text-[0.72rem] font-semibold opacity-90">{sub}</span> : null}
        </span>
      ) : null}
      {hidden ? <span className="absolute inset-x-2 bottom-2 rounded-lg bg-card/90 px-2 py-1 text-center text-[0.78rem] font-semibold text-ink">Tap to show</span> : null}
    </>
  );
  const cls = cx(
    'relative block aspect-[3/4] w-full overflow-hidden rounded-[18px] border bg-grey-50',
    selected ? 'border-primary ring-4 ring-primary/25' : 'border-line',
    className,
  );
  if (onClick || blur) {
    return (
      <button type="button" className={cx(cls, 'tap')} onClick={() => (hidden ? setRevealed(true) : onClick?.())} aria-label={hidden ? `Show photo: ${alt}` : alt}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

/** Full-screen photo viewer. No zoom and no filters. */
export function PhotoViewer({ ids, index, onClose, labels }: { ids: string[]; index: number; onClose: () => void; labels: string[] }) {
  const [i, setI] = useState(index);
  useEffect(() => setI(index), [index]);
  const url = usePhotoUrl(ids[i], 'full');
  const startX = useRef<number | null>(null);
  return (
    <Sheet open onClose={onClose} title={labels[i] ?? 'Photo'} wide>
      <div
        className="relative overflow-hidden rounded-[20px] bg-[#0B1220]"
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 50 && ids.length > 1) setI((v) => (v + (dx < 0 ? 1 : -1) + ids.length) % ids.length);
        }}
      >
        {url ? <img src={url} alt={labels[i]} className="mx-auto max-h-[70dvh] w-auto object-contain" draggable={false} /> : <div className="h-[50dvh]" />}
      </div>
      {ids.length > 1 ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {ids.map((pid, k) => (
            <Button key={pid} variant={k === i ? 'primary' : 'secondary'} onClick={() => setI(k)}>
              {labels[k]}
            </Button>
          ))}
        </div>
      ) : null}
    </Sheet>
  );
}

export { TONE_BG, TONE_INK };
