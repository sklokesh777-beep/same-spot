// Logo, progress ring and illustrations. Illustrations are abstract shapes
// and line drawings in the brand pastels: never faces and never skin tones.

import { motion, useReducedMotion } from 'framer-motion';
import type { AnyTone } from './ui';
import { TONE_STROKE, cx } from './ui';

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="13" fill="#005995" />
      <path
        d="M12 19v-5.5A1.5 1.5 0 0 1 13.5 12H19M29 12h5.5a1.5 1.5 0 0 1 1.5 1.5V19M36 29v5.5a1.5 1.5 0 0 1-1.5 1.5H29M19 36h-5.5a1.5 1.5 0 0 1-1.5-1.5V29"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="4.6" fill="#FDDC69" />
    </svg>
  );
}

/** Weeks of real use toward the full look, with a marker at the early look. */
export function Ring({
  weeks,
  full,
  early,
  size = 200,
  tone = 'blue',
  label,
  sub,
  stroke = 14,
}: {
  weeks: number;
  full: number;
  early: number;
  size?: number;
  tone?: AnyTone;
  label?: string;
  sub?: string;
  stroke?: number;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, weeks / full));
  const earlyAngle = (early / full) * 2 * Math.PI - Math.PI / 2;
  const ex = size / 2 + r * Math.cos(earlyAngle);
  const ey = size / 2 + r * Math.sin(earlyAngle);
  const whole = Math.floor(weeks);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${whole} of ${full} weeks of real use. Early look at week ${early}.`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-line" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={cx(TONE_STROKE[tone])}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct) : c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {early < full ? (
          <circle cx={ex} cy={ey} r={stroke / 2 + 2} fill="#FDDC69" stroke="#143461" strokeWidth={2} />
        ) : null}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center" aria-hidden>
        <div>
          <div className="font-serif leading-none text-navy" style={{ fontSize: size * 0.26 }}>
            {label ?? whole}
          </div>
          <div className="mt-1 text-[0.85rem] font-semibold text-ink2">{sub ?? (whole > full ? 'weeks of real use' : `of ${full} weeks`)}</div>
        </div>
      </div>
    </div>
  );
}

export function MiniRing({ weeks, full, tone = 'blue', size = 64 }: { weeks: number; full: number; tone?: AnyTone; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, weeks / full));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-line" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className={TONE_STROKE[tone]}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="fill-navy font-serif" fontSize={size * 0.36}>
        {Math.floor(weeks)}
      </text>
    </svg>
  );
}

/** Soft blobs and arcs used behind the welcome and intro screens. */
export function HeroArt({ variant = 0, className }: { variant?: number; className?: string }) {
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <defs>
        <linearGradient id={`hg${variant}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#E6F5FF" />
          <stop offset="1" stopColor="#F3EEFF" />
        </linearGradient>
      </defs>
      <rect x="20" y="16" width="280" height="208" rx="48" fill={`url(#hg${variant})`} />
      {variant === 0 ? (
        <g>
          <circle cx="112" cy="116" r="58" fill="#E7F3F1" />
          <circle cx="206" cy="102" r="44" fill="#FFF8E1" />
          <path d="M70 176c40-30 80-30 120 0s80 30 110 0" fill="none" stroke="#005995" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
          <g transform="translate(130 70)">
            <rect width="72" height="72" rx="20" fill="#005995" />
            <path d="M18 30v-8a3 3 0 0 1 3-3h8M43 19h8a3 3 0 0 1 3 3v8M54 43v8a3 3 0 0 1-3 3h-8M29 54h-8a3 3 0 0 1-3-3v-8" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            <circle cx="36" cy="36" r="7" fill="#FDDC69" />
          </g>
        </g>
      ) : null}
      {variant === 1 ? (
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={58 + i * 30} y={170 - [40, 70, 30, 95, 60, 110, 84][i]} width="18" height={[40, 70, 30, 95, 60, 110, 84][i]} rx="9" fill={i % 2 ? '#005995' : '#9CCBEF'} fillOpacity={i % 2 ? 0.85 : 0.9} />
          ))}
          <circle cx="250" cy="66" r="18" fill="#FDDC69" />
          <path d="M50 182h220" stroke="#143461" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : null}
      {variant === 2 ? (
        <g>
          <rect x="62" y="58" width="92" height="120" rx="20" fill="#fff" stroke="#005995" strokeOpacity=".25" strokeWidth="2" />
          <rect x="166" y="58" width="92" height="120" rx="20" fill="#fff" stroke="#005995" strokeOpacity=".25" strokeWidth="2" />
          <path d="M84 150c14-26 34-40 48-40" stroke="#5B3FA8" strokeOpacity=".45" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M188 150c14-26 34-40 48-40" stroke="#0F5E52" strokeOpacity=".45" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="108" cy="88" r="16" fill="#F3EEFF" />
          <circle cx="212" cy="88" r="16" fill="#E7F3F1" />
          <text x="108" y="94" textAnchor="middle" fontSize="18" fontWeight="700" fill="#143461">A</text>
          <text x="212" y="94" textAnchor="middle" fontSize="18" fontWeight="700" fill="#143461">B</text>
        </g>
      ) : null}
      {variant === 3 ? (
        <g>
          <circle cx="160" cy="118" r="70" fill="#fff" />
          <circle cx="160" cy="118" r="70" fill="none" stroke="#005995" strokeOpacity=".2" strokeWidth="14" />
          <path d="M160 48a70 70 0 0 1 66 46" fill="none" stroke="#005995" strokeWidth="14" strokeLinecap="round" />
          <circle cx="226" cy="94" r="9" fill="#FDDC69" stroke="#143461" strokeWidth="2" />
          <path d="M140 120l14 14 28-30" fill="none" stroke="#0F5E52" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </svg>
  );
}

/** Dashed outline that shows how to frame each photo view. */
export function ViewGuide({ view, className }: { view: string; className?: string }) {
  const dash = { fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeDasharray: '8 8', strokeLinecap: 'round' as const };
  let body: JSX.Element;
  switch (view) {
    case 'parting':
      body = (
        <g>
          <ellipse cx="160" cy="124" rx="96" ry="88" {...dash} strokeOpacity={0.45} />
          <path d="M160 40v170" {...dash} />
        </g>
      );
      break;
    case 'hairline':
      body = (
        <g>
          <path d="M40 130c32-40 62-58 86-46s48 12 68 0 54 6 86 46" {...dash} />
          <path d="M96 210q64-34 128 0" {...dash} strokeOpacity={0.45} />
        </g>
      );
      break;
    case 'left':
    case 'right':
      body = (
        <g transform={view === 'right' ? 'translate(320 0) scale(-1 1)' : undefined}>
          <path d="M30 70c70 14 118 34 146 62 24 22 56 38 116 44" {...dash} />
          <path d="M120 150c26 6 48 18 64 34" {...dash} strokeOpacity={0.45} />
        </g>
      );
      break;
    case 'neck':
      body = (
        <g>
          <path d="M104 30c6 60 2 110-22 160M216 30c-6 60-2 110 22 160" {...dash} />
          <path d="M120 196c26-10 54-10 80 0" {...dash} strokeOpacity={0.45} />
        </g>
      );
      break;
    case 'elbow':
      body = (
        <g>
          <path d="M30 150c62-10 112-10 146-4 30 4 50-24 64-74" {...dash} />
          <circle cx="196" cy="140" r="26" {...dash} strokeOpacity={0.45} />
        </g>
      );
      break;
    default:
      body = <rect x="70" y="50" width="180" height="140" rx="22" {...dash} />;
  }
  return (
    <svg viewBox="0 0 320 240" className={cx('text-primary', className)} aria-hidden>
      {body}
    </svg>
  );
}

/** A little confetti, only for "All set". */
export function Confetti() {
  const reduce = useReducedMotion();
  if (reduce || document.documentElement.classList.contains('reduce-motion')) return null;
  const colours = ['#005995', '#FDDC69', '#9CCBEF', '#C4B2FF', '#7FD3C2', '#FFB38F'];
  return (
    <div aria-hidden>
      {Array.from({ length: 36 }, (_, i) => {
        const left = (i * 37) % 100;
        const style = {
          left: `${left}%`,
          background: colours[i % colours.length],
          ['--dx' as string]: `${((i * 53) % 120) - 60}px`,
          ['--rot' as string]: `${(i * 97) % 720}deg`,
          ['--dur' as string]: `${1.6 + ((i * 13) % 10) / 10}s`,
          animationDelay: `${(i % 8) * 0.06}s`,
        };
        return <span key={i} className="confetti-piece" style={style} />;
      })}
    </div>
  );
}
