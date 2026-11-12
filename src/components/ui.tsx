import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import * as RSwitch from '@radix-ui/react-switch';
import { Check, ChevronRight, Loader2, Minus, Plus, type LucideIcon } from 'lucide-react';
import type { Tone } from '../content/concerns';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export type AnyTone = Tone | 'accent';

export const TONE_BG: Record<AnyTone, string> = {
  blue: 'bg-blue-50',
  lav: 'bg-lav-50',
  mint: 'bg-mint-50',
  sand: 'bg-sand-50',
  rose: 'bg-rose-50',
  coral: 'bg-coral-50',
  grey: 'bg-grey-50',
  accent: 'bg-accent/35',
};

export const TONE_INK: Record<AnyTone, string> = {
  blue: 'text-blue-ink',
  lav: 'text-lav-ink',
  mint: 'text-mint-ink',
  sand: 'text-sand-ink',
  rose: 'text-rose-ink',
  coral: 'text-coral-ink',
  grey: 'text-grey-ink',
  accent: 'text-navy',
};

export const TONE_BORDER: Record<AnyTone, string> = {
  blue: 'border-blue-ink/25',
  lav: 'border-lav-ink/25',
  mint: 'border-mint-ink/25',
  sand: 'border-sand-ink/25',
  rose: 'border-rose-ink/30',
  coral: 'border-coral-ink/25',
  grey: 'border-grey-ink/20',
  accent: 'border-accent',
};

export const TONE_STROKE: Record<AnyTone, string> = {
  blue: 'stroke-blue-ink',
  lav: 'stroke-lav-ink',
  mint: 'stroke-mint-ink',
  sand: 'stroke-sand-ink',
  rose: 'stroke-rose-ink',
  coral: 'stroke-coral-ink',
  grey: 'stroke-grey-ink',
  accent: 'stroke-accent',
};

// ---------- buttons ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-onprimary shadow-soft hover:bg-primary-press',
  secondary: 'border border-line bg-card text-primary hover:border-primary/50',
  ghost: 'text-primary hover:bg-primary/10',
  danger: 'bg-rose-ink text-card hover:opacity-90',
  soft: 'bg-blue-50 text-blue-ink hover:opacity-90',
};
const SIZE = { sm: 'h-12 px-4 text-[0.92rem] gap-2', md: 'h-12 px-5 text-[0.98rem] gap-2', lg: 'h-14 px-6 text-[1.05rem] gap-2.5' };

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof SIZE;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  block?: boolean;
  loading?: boolean;
  to?: string;
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, block, loading, to, href, className, children, disabled, ...rest },
  ref,
) {
  const cls = cx(
    'tap inline-flex select-none items-center justify-center rounded-btn font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45',
    VARIANT[variant],
    SIZE[size],
    block && 'w-full',
    className,
  );
  const inner = (
    <>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden strokeWidth={1.9} /> : null}
      <span>{children}</span>
      {IconRight ? <IconRight className="h-5 w-5 shrink-0" aria-hidden strokeWidth={1.9} /> : null}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button ref={ref} type="button" className={cls} disabled={disabled || loading} {...rest}>
      {inner}
    </button>
  );
});

export function IconButton({ icon: Icon, label, onClick, className, tone = 'plain', to }: { icon: LucideIcon; label: string; onClick?: () => void; className?: string; tone?: 'plain' | 'soft'; to?: string }) {
  const cls = cx(
    'tap inline-grid h-12 w-12 shrink-0 place-items-center rounded-full text-navy transition-colors',
    tone === 'soft' ? 'bg-card shadow-soft hover:bg-blue-50' : 'hover:bg-primary/10',
    className,
  );
  if (to)
    return (
      <Link to={to} className={cls} aria-label={label}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden />
      </Link>
    );
  return (
    <button type="button" className={cls} aria-label={label} onClick={onClick}>
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden />
    </button>
  );
}

// ---------- surfaces ----------

export function Card({ children, className, as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' } & Record<string, unknown>) {
  return (
    <As className={cx('card p-5', className)} {...rest}>
      {children}
    </As>
  );
}

export function Panel({ tone = 'blue', children, className, icon: Icon }: { tone?: AnyTone; children: ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <div className={cx('flex gap-3 rounded-[18px] p-4', TONE_BG[tone], TONE_INK[tone], className)}>
      {Icon ? <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.9} aria-hidden /> : null}
      <div className="min-w-0 flex-1 text-[0.95rem] leading-snug">{children}</div>
    </div>
  );
}

export function StatusChip({ tone, icon: Icon, children, className }: { tone: AnyTone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.88rem] font-semibold', TONE_BG[tone], TONE_INK[tone], className)}>
      {Icon ? <Icon className="h-4 w-4" strokeWidth={2} aria-hidden /> : null}
      {children}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between gap-3 first:mt-0">
      <h2 className="text-[0.82rem] font-bold uppercase tracking-[0.08em] text-ink2">{children}</h2>
      {action}
    </div>
  );
}

// ---------- choices ----------

export function Chip({ selected, onClick, children, tone = 'blue', className }: { selected: boolean; onClick: () => void; children: ReactNode; tone?: 'blue' | 'rose'; className?: string }) {
  const on = tone === 'rose' ? 'border-rose-ink/50 bg-rose-50 text-rose-ink' : 'border-primary/50 bg-blue-50 text-blue-ink';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx('tap inline-flex min-h-[48px] items-center gap-2 rounded-full border px-4 py-2 text-left text-[0.95rem] font-medium transition-colors', selected ? on : 'border-line bg-card text-ink hover:border-primary/40', className)}
    >
      <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full border', selected ? (tone === 'rose' ? 'border-rose-ink bg-rose-ink text-card' : 'border-primary bg-primary text-onprimary') : 'border-line')}>
        {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
      </span>
      <span>{children}</span>
    </button>
  );
}

export function ChoiceCard({
  selected,
  onClick,
  title,
  sub,
  left,
  role = 'radio',
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  sub?: ReactNode;
  left?: ReactNode;
  role?: 'radio' | 'button';
}) {
  return (
    <button
      type="button"
      role={role === 'radio' ? 'radio' : undefined}
      aria-checked={role === 'radio' ? selected : undefined}
      onClick={onClick}
      className={cx(
        'tap flex w-full items-center gap-4 rounded-[20px] border p-4 text-left transition-colors duration-200',
        selected ? 'border-primary bg-blue-50 shadow-soft' : 'border-line bg-card hover:border-primary/40',
      )}
    >
      {left}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        {sub ? <span className="mt-0.5 block text-[0.9rem] text-ink2">{sub}</span> : null}
      </span>
      <span aria-hidden className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2', selected ? 'border-primary' : 'border-line')}>
        {selected ? <span className="h-3 w-3 rounded-full bg-primary" /> : null}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto rounded-[16px] bg-grey-50 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            'min-h-[44px] flex-1 whitespace-nowrap rounded-[12px] px-3 text-[0.92rem] font-semibold transition-colors',
            value === o.id ? 'bg-card text-navy shadow-soft' : 'text-ink2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="relative h-8 w-[52px] shrink-0 rounded-full bg-line transition-colors data-[state=checked]:bg-primary"
    >
      <RSwitch.Thumb className="block h-6 w-6 translate-x-1 rounded-full bg-white shadow transition-transform duration-200 data-[state=checked]:translate-x-[24px]" />
    </RSwitch.Root>
  );
}

// ---------- list rows (settings) ----------

export function ListRow({
  icon: Icon,
  label,
  sub,
  value,
  onClick,
  to,
  right,
  danger,
  tone = 'blue',
  leading,
}: {
  icon?: LucideIcon;
  leading?: ReactNode;
  label: string;
  sub?: ReactNode;
  value?: ReactNode;
  onClick?: () => void;
  to?: string;
  right?: ReactNode;
  danger?: boolean;
  tone?: AnyTone;
}) {
  const body = (
    <>
      {leading}
      {Icon ? (
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-[12px]', danger ? 'bg-rose-50 text-rose-ink' : cx(TONE_BG[tone], TONE_INK[tone]))}>
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className={cx('block font-medium', danger ? 'text-rose-ink' : 'text-ink')}>{label}</span>
        {sub ? <span className="mt-0.5 block text-[0.88rem] text-ink2">{sub}</span> : null}
      </span>
      {value !== undefined ? <span className="shrink-0 text-[0.92rem] text-ink2">{value}</span> : null}
      {right ?? (onClick || to ? <ChevronRight className="h-5 w-5 shrink-0 text-ink2" aria-hidden /> : null)}
    </>
  );
  const cls = 'flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors';
  if (to)
    return (
      <Link to={to} className={cx(cls, 'hover:bg-grey-50')}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cx(cls, 'hover:bg-grey-50')}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

export function RowGroup({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <section className="mb-6">
      {title ? <h2 className="mb-2 px-1 text-[0.82rem] font-bold uppercase tracking-[0.08em] text-ink2">{title}</h2> : null}
      <div className="card divide-y divide-line overflow-hidden p-0">{children}</div>
    </section>
  );
}

// ---------- form fields ----------

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  maxLength,
  min,
  max,
  hint,
  autoFocus,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  min?: string;
  max?: string;
  hint?: string;
  autoFocus?: boolean;
  inputMode?: 'numeric' | 'text';
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.92rem] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        autoFocus={autoFocus}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-btn border border-line bg-card px-4 text-ink placeholder:text-ink2/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
      />
      {hint ? <p className="mt-1.5 text-[0.85rem] text-ink2">{hint}</p> : null}
    </div>
  );
}

export function Stepper({ value, onChange, min, max, step = 1, label, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; unit: string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <IconButton icon={Minus} label={`Less: ${value - step} ${unit}`} tone="soft" onClick={() => set(value - step)} />
      <div className="flex h-12 min-w-[120px] flex-1 items-center justify-center rounded-btn border border-line bg-card font-semibold text-navy" aria-live="polite">
        {value} {unit}
      </div>
      <IconButton icon={Plus} label={`More: ${value + step} ${unit}`} tone="soft" onClick={() => set(value + step)} />
    </div>
  );
}

// ---------- misc ----------

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[40vh] place-items-center text-ink2">
      <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-card bg-grey-50', className)} aria-hidden />;
}

export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cx('h-2 rounded-full transition-all duration-300', i === active ? 'w-6 bg-primary' : 'w-2 bg-line')} />
      ))}
    </div>
  );
}

export function EvidenceMeter({ dots, label }: { dots: 1 | 2 | 3; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cx('h-2.5 w-2.5 rounded-full', i <= dots ? 'bg-primary' : 'bg-line')} />
        ))}
      </span>
      <span className="text-[0.9rem] font-semibold text-ink">Evidence: {label.toLowerCase()}</span>
    </span>
  );
}
