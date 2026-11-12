import { Delete, Lock as LockIcon } from 'lucide-react';
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Logo } from '../../components/art';
import { confirmAsk } from '../../components/overlay';
import { cx } from '../../components/ui';
import { deleteEverything } from '../../data/actions';
import { checkPin } from '../../data/crypto';
import { useSettings } from '../../data/hooks';

// Unlocked state lives in memory only, so a reload asks again.
let unlocked = false;
let hiddenAt = 0;
const listeners = new Set<() => void>();
const set = (v: boolean) => {
  unlocked = v;
  listeners.forEach((l) => l());
};
export const markUnlocked = () => set(true);

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (unlocked && hiddenAt && Date.now() - hiddenAt > 60_000) set(false);
  });
}

export function LockGate({ children }: { children: ReactNode }) {
  const s = useSettings();
  const isUnlocked = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => unlocked,
  );
  if (!s) return null;
  if (s.lockHash && s.lockSalt && !isUnlocked) return <LockScreen hash={s.lockHash} salt={s.lockSalt} />;
  return <>{children}</>;
}

function LockScreen({ hash, salt }: { hash: string; salt: string }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  const press = useCallback(
    (k: string) => {
      if (busy) return;
      setMsg('');
      setShake(false);
      setCode((c) => (k === 'del' ? c.slice(0, -1) : c.length < 4 ? c + k : c));
    },
    [busy],
  );

  useEffect(() => {
    if (code.length !== 4) return;
    setBusy(true);
    checkPin(code, hash, salt).then((ok) => {
      setBusy(false);
      if (ok) set(true);
      else {
        setCode('');
        setMsg("That code doesn't match.");
        setShake(true);
      }
    });
  }, [code, hash, salt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const forgot = async () => {
    const ok = await confirmAsk({
      title: 'Forgot your code?',
      body: "A forgotten code can't be recovered. You can erase all data on this device and start again.",
      confirmLabel: 'Erase all data',
      danger: true,
    });
    if (ok) {
      await deleteEverything();
      set(true);
      location.hash = '#/welcome';
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-blue-50 to-bg px-6 py-10">
      <div className="w-full max-w-[340px] text-center">
        <Logo size={56} className="mx-auto" />
        <h1 className="title mt-6">Same Spot is locked</h1>
        <p className="mt-2 text-ink2">Type your 4-digit code.</p>
        <div className={cx('mt-7 flex justify-center gap-4', shake && 'shake')} aria-label={`${code.length} of 4 digits typed`} role="img">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cx('h-4 w-4 rounded-full border-2 border-navy transition-colors', i < code.length && 'bg-navy')} />
          ))}
        </div>
        <p className="mt-3 h-6 font-semibold text-rose-ink" role="alert">
          {msg}
        </p>
        <div className="mx-auto mt-4 grid max-w-[288px] grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button key={n} type="button" onClick={() => press(n)} className="tap h-[72px] rounded-full bg-card text-[1.6rem] font-semibold text-navy shadow-soft hover:bg-blue-50">
              {n}
            </button>
          ))}
          <button type="button" onClick={forgot} className="tap h-[72px] rounded-full text-[0.85rem] font-semibold text-primary">
            Forgot?
          </button>
          <button type="button" onClick={() => press('0')} className="tap h-[72px] rounded-full bg-card text-[1.6rem] font-semibold text-navy shadow-soft hover:bg-blue-50">
            0
          </button>
          <button type="button" onClick={() => press('del')} aria-label="Delete last digit" className="tap grid h-[72px] place-items-center rounded-full text-navy hover:bg-grey-50">
            <Delete className="h-6 w-6" aria-hidden />
          </button>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-[0.85rem] text-ink2">
          <LockIcon className="h-4 w-4" aria-hidden /> A privacy screen, not encryption.
        </p>
      </div>
    </main>
  );
}
