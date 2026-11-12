// Sheets, dialogs and toasts. The browser Back button closes any open sheet.

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { overlayPopped, pushOverlay, releaseOverlay, releaseTopOverlay } from '../data/flows';
import { Button, TextField, cx } from './ui';

/** While an overlay is open, the Back button closes it instead of leaving the screen. */
export function useBackClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const marker = Math.random().toString(36).slice(2);
    let alive = true;
    // Same URL, a new entry: React Router keeps its own position (idx) in it.
    void pushOverlay(marker).then(() => {
      if (!alive) releaseOverlay(marker);
    });
    const onPop = () => {
      if (overlayPopped(marker)) closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      alive = false;
      window.removeEventListener('popstate', onPop);
      releaseOverlay(marker);
    };
  }, [open]);
}

export { releaseTopOverlay };

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  hideTitle,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  hideTitle?: boolean;
  wide?: boolean;
}) {
  useBackClose(open, onClose);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div className="fixed inset-0 z-50 bg-[#0B1630]/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6">
              <Dialog.Content forceMount asChild aria-describedby={description ? undefined : undefined}>
                <motion.div
                  className={cx(
                    'pointer-events-auto relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-card px-5 pb-[calc(24px+var(--safe-b))] pt-3 shadow-lift focus:outline-none lg:rounded-[28px] lg:pb-6 lg:pt-6',
                    wide ? 'lg:max-w-[760px]' : 'lg:max-w-[560px]',
                  )}
                  initial={{ y: 48, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 48, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line lg:hidden" aria-hidden />
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className={hideTitle ? 'sr-only' : ''}>
                      <Dialog.Title className="font-serif text-[1.75rem] leading-tight text-navy">{title}</Dialog.Title>
                      {description ? <Dialog.Description className="mt-1 text-ink2">{description}</Dialog.Description> : null}
                    </div>
                    <Dialog.Close className="tap -mr-2 -mt-1 ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink2 hover:bg-grey-50" aria-label="Close">
                      <X className="h-5 w-5" aria-hidden />
                    </Dialog.Close>
                  </div>
                  {children}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ---------- ask: confirm and prompt dialogs ----------

export interface AskOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  input?: { label: string; type?: string; placeholder?: string; mustEqual?: string; inputMode?: 'numeric' | 'text'; maxLength?: number };
}

type AskState = (AskOptions & { resolve: (r: { ok: boolean; value: string }) => void }) | null;
let askState: AskState = null;
const askListeners = new Set<() => void>();
const setAsk = (s: AskState) => {
  askState = s;
  askListeners.forEach((l) => l());
};

export function ask(opts: AskOptions): Promise<{ ok: boolean; value: string }> {
  return new Promise((resolve) => setAsk({ ...opts, resolve }));
}

export async function confirmAsk(opts: Omit<AskOptions, 'input'>): Promise<boolean> {
  return (await ask(opts)).ok;
}

export function AskHost() {
  const state = useSyncExternalStore(
    (l) => {
      askListeners.add(l);
      return () => askListeners.delete(l);
    },
    () => askState,
  );
  const [value, setValue] = useState('');
  useEffect(() => setValue(''), [state]);
  const finish = (ok: boolean) => {
    const current = askState;
    if (!current) return;
    setAsk(null);
    // Answer only once the sheet's history entry is gone, so a screen change
    // that follows is never undone by the sheet closing.
    void releaseTopOverlay().then(() => current.resolve({ ok, value }));
  };
  const blocked = !!state?.input?.mustEqual && value.trim() !== state.input.mustEqual;
  return (
    <Sheet open={!!state} onClose={() => finish(false)} title={state?.title ?? ''}>
      {state ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!blocked) finish(true);
          }}
        >
          {state.body ? <p className="mb-5 text-ink2">{state.body}</p> : null}
          {state.input ? (
            <div className="mb-5">
              <TextField
                label={state.input.label}
                type={state.input.type}
                value={value}
                onChange={setValue}
                placeholder={state.input.placeholder}
                inputMode={state.input.inputMode}
                maxLength={state.input.maxLength}
                autoFocus
              />
            </div>
          ) : null}
          <div className="grid gap-2.5">
            <button type="submit" disabled={blocked} className={cx('tap h-12 rounded-btn font-semibold disabled:opacity-45', state.danger ? 'bg-rose-ink text-card' : 'bg-primary text-onprimary shadow-soft')}>
              {state.confirmLabel ?? 'Continue'}
            </button>
            <Button variant="secondary" onClick={() => finish(false)}>
              {state.cancelLabel ?? 'Cancel'}
            </Button>
          </div>
        </form>
      ) : null}
    </Sheet>
  );
}

// ---------- toasts ----------

interface ToastItem {
  id: number;
  message: string;
  undo?: () => void;
}
let toastItem: ToastItem | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const toastListeners = new Set<() => void>();
const emitToast = () => toastListeners.forEach((l) => l());

export function toast(message: string, opts: { undo?: () => void } = {}) {
  toastItem = { id: Date.now(), message, undo: opts.undo };
  emitToast();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastItem = null;
    emitToast();
  }, opts.undo ? 6000 : 4000);
}

export function Toaster() {
  const item = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toastItem,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(96px+var(--safe-b))] z-[70] flex justify-center px-4 lg:bottom-8" role="status" aria-live="polite">
      <AnimatePresence>
        {item ? (
          <motion.div
            key={item.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-auto flex max-w-[460px] items-center gap-4 rounded-[18px] bg-[#143461] px-5 py-3.5 text-[0.95rem] font-medium text-white shadow-lift dark:bg-[#26324A]"
          >
            <span>{item.message}</span>
            {item.undo ? (
              <button
                type="button"
                className="min-h-[40px] shrink-0 rounded-lg px-2 font-bold text-[#FDDC69] hover:bg-white/10"
                onClick={() => {
                  item.undo?.();
                  toastItem = null;
                  emitToast();
                }}
              >
                Undo
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
