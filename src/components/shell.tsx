import { BookOpen, House, Images, Activity, Settings as SettingsIcon, CalendarClock, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { dbReady } from '../data/db';
import { isOnboardedThisSession } from '../data/actions';
import { useSettings } from '../data/hooks';
import { setDateOverride, useDateOverride } from '../data/today';
import { formatDate } from '../engine/dates';
import { Logo } from './art';
import { cx } from './ui';

const TABS = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/progress', label: 'Progress', icon: Activity },
  { to: '/photos', label: 'Photos', icon: Images },
  { to: '/guide', label: 'Guide', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function TabLayout() {
  return (
    <div className="lg:pl-[264px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-line bg-card/70 px-4 py-6 backdrop-blur-md lg:flex" aria-label="Main">
        <div className="mb-8 flex items-center gap-3 px-2">
          <Logo size={38} />
          <span className="text-[1.15rem] font-bold text-navy">Same Spot</span>
        </div>
        <nav className="grid gap-1">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx('flex min-h-[48px] items-center gap-3 rounded-[14px] px-3 font-semibold transition-colors', isActive ? 'bg-blue-50 text-blue-ink' : 'text-ink2 hover:bg-grey-50 hover:text-ink')
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 text-[0.82rem] text-ink2">Made for Be Bodywise customers. Your data stays on this device.</p>
      </aside>
      <Outlet />
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/90 pb-[var(--safe-b)] backdrop-blur-md lg:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-[600px] grid-cols-5 px-1">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="group flex min-h-[64px] flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold">
              {({ isActive }) => (
                <>
                  <span className={cx('grid h-8 w-14 place-items-center rounded-full transition-colors duration-200', isActive ? 'bg-blue-50 text-blue-ink' : 'text-ink2 group-hover:text-ink')}>
                    <Icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.1 : 1.8} aria-hidden />
                  </span>
                  <span className={isActive ? 'text-blue-ink' : 'text-ink2'}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Sends first-time visitors to the welcome screens. */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const loc = useLocation();
  if (!settings) return null;
  if (!settings.onboarded && !isOnboardedThisSession() && !loc.pathname.startsWith('/welcome')) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

/** Applies theme, text size and reduced motion. */
export function Appearance({ children }: { children: ReactNode }) {
  const s = useSettings();
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const theme = s?.theme;
  const textSize = s?.textSize;
  const reduce = s?.reduceMotion;
  useEffect(() => {
    if (!s) return;
    applyAppearance({ dark: theme === 'dark' || (theme === 'system' && systemDark), textSize: textSize ?? 'default', reduceMotion: !!reduce });
  }, [s, theme, textSize, reduce, systemDark]);
  return <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>{children}</MotionConfig>;
}

export function applyAppearance({ dark, textSize, reduceMotion }: { dark: boolean; textSize: string; reduceMotion: boolean }) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.classList.toggle('reduce-motion', reduceMotion);
  if (textSize === 'default') root.removeAttribute('data-text');
  else root.setAttribute('data-text', textSize);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B1220' : '#005995');
}

/** A small pill while Settings > Advanced has changed today's date. */
export function DatePill() {
  const override = useDateOverride();
  if (!override) return null;
  return (
    <aside aria-label="Changed date" className="no-print relative z-[25] flex justify-center bg-[#FFF8E1] px-4 pb-1.5 pt-[calc(6px+var(--safe-t))] lg:pl-[280px]">
      <div className="flex items-center gap-2 rounded-full border border-accent bg-white/70 py-0.5 pl-3 pr-1 text-[0.85rem] font-semibold text-[#5C4300]">
        <CalendarClock className="h-4 w-4" aria-hidden />
        <span>Date: {formatDate(override, { short: true, year: true })}</span>
        <button type="button" onClick={() => setDateOverride(null)} className="min-h-[36px] rounded-full bg-white/70 px-3 font-bold text-[#143461] hover:bg-white">
          Reset
        </button>
      </div>
    </aside>
  );
}

// ---------- new version ----------

let applyUpdate: (() => Promise<void>) | null = null;
const updateListeners = new Set<() => void>();
const setUpdate = (fn: typeof applyUpdate) => {
  applyUpdate = fn;
  updateListeners.forEach((l) => l());
};

/** Called by the service worker setup when a new version is waiting. */
export function offerUpdate(apply: () => Promise<void>) {
  setUpdate(apply);
}

/** "A new version is ready", until she refreshes or closes it. */
export function UpdateBar() {
  const apply = useSyncExternalStore(
    (l) => {
      updateListeners.add(l);
      return () => updateListeners.delete(l);
    },
    () => applyUpdate,
  );
  const [busy, setBusy] = useState(false);
  if (!apply) return null;
  return (
    <aside aria-label="New version" className="no-print relative z-[25] flex justify-center bg-[#E6F5FF] px-4 pb-1.5 pt-[calc(6px+var(--safe-t))] lg:pl-[280px]">
      <div className="flex items-center gap-2 text-[0.88rem] font-semibold text-[#143461]">
        <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
        <span role="status">A new version of Same Spot is ready.</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            // The page reloads once the new version takes over.
            void apply().catch(() => window.location.reload());
          }}
          className="min-h-[36px] shrink-0 rounded-full bg-[#005995] px-3 font-bold text-white hover:bg-[#004A7C] disabled:opacity-70"
        >
          Refresh
        </button>
        <button type="button" aria-label="Later" onClick={() => setUpdate(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/70">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}

/** A clear banner when this browser can't save anything. */
export function StorageBanner() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    dbReady.then(setOk);
  }, []);
  if (ok) return null;
  return (
    <div role="alert" className="no-print fixed inset-x-0 top-0 z-[65] flex items-start gap-2 bg-[#FFF0F0] px-4 py-3 pt-[calc(12px+var(--safe-t))] text-[0.92rem] font-semibold text-[#A12A2A]">
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <span>This browser can't save your data, often because of a private window. Open Same Spot in a normal window to keep your record.</span>
    </div>
  );
}
