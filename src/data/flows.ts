// Keeps the browser Back button sensible.
// - Sheets add one history entry, so Back closes the sheet, not the screen.
// - Full-screen flows (welcome, new tracker, check-in, look) remember where
//   they started. Finishing or closing a flow removes its screens, so Back
//   never lands in the middle of a finished flow.
// React Router stores each entry's position as history.state.idx.

import { useNavigate, type NavigateFunction } from 'react-router-dom';

// ---------- positions ----------

export function historyIdx(): number {
  const s = window.history.state as { idx?: unknown } | null;
  return typeof s?.idx === 'number' ? s.idx : 0;
}

const PATHS_KEY = 'samespot:paths';
const STARTS_KEY = 'samespot:flows';

function load(key: string): Record<string, number | string> {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function store(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* not available */
  }
}

const paths = load(PATHS_KEY) as Record<string, string>;
const starts = load(STARTS_KEY) as Record<string, number>;

/** Called on every screen change: which path is at which history position. */
export function recordLocation(path: string): void {
  paths[historyIdx()] = path;
  store(PATHS_KEY, paths);
}

function pathAt(idx: number): string | undefined {
  return paths[idx];
}

const pathname = (p: string | undefined) => (p ?? '').split('?')[0] || '/';

// ---------- overlays ----------

let pendingPop: Promise<void> | null = null;
const overlays = new Set<string>();

/** Resolves once any Back started by a closing sheet has happened. */
export function settleHistory(): Promise<void> {
  return pendingPop ?? Promise.resolve();
}

function popOnce(): Promise<void> {
  const p = new Promise<void>((resolve) => {
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', settle);
      resolve();
    };
    window.addEventListener('popstate', settle);
    setTimeout(settle, 700);
  });
  const tracked = p.then(() => {
    if (pendingPop === tracked) pendingPop = null;
  });
  pendingPop = tracked;
  window.history.back();
  return tracked;
}

/** A sheet opened: add a history entry for it (after any pending Back). */
export function pushOverlay(marker: string): Promise<void> {
  return settleHistory().then(() => {
    overlays.add(marker);
    window.history.pushState({ ...(window.history.state ?? {}), overlay: marker }, '');
  });
}

/** Back was pressed. True when this sheet's entry is gone, so the sheet should close. */
export function overlayPopped(marker: string): boolean {
  if (!overlays.has(marker)) return false;
  if ((window.history.state as { overlay?: string } | null)?.overlay === marker) return false;
  overlays.delete(marker);
  return true;
}

/** A sheet closed: remove its history entry if it is still the current one. */
export function releaseOverlay(marker: string): void {
  if (!overlays.has(marker)) return;
  overlays.delete(marker);
  if ((window.history.state as { overlay?: string } | null)?.overlay === marker) void popOnce();
}

/** Close the top sheet's entry now; resolves when it is gone. Use before navigating. */
export function releaseTopOverlay(): Promise<void> {
  const m = (window.history.state as { overlay?: string } | null)?.overlay;
  if (m && overlays.has(m)) {
    overlays.delete(m);
    return popOnce();
  }
  return settleHistory();
}

// ---------- moving around ----------

/** Go by delta, then optionally run fn in the same task as the router's update. */
function traverse(delta: number, fn?: () => void): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', go);
      fn?.();
      resolve();
    };
    window.addEventListener('popstate', go);
    setTimeout(go, 900);
    window.history.go(delta);
  });
}

/** Back one screen, or to a fallback when this is the first screen in the tab. */
export async function goBackOr(navigate: NavigateFunction, fallback: string): Promise<void> {
  await settleHistory();
  if (historyIdx() > 0) await traverse(-1);
  else navigate(fallback, { replace: true });
}

export function useGoBack(fallback = '/'): () => void {
  const navigate = useNavigate();
  return () => void goBackOr(navigate, fallback);
}

/** Call when a flow starts. The prefix checks a saved start still belongs to this flow. */
export function beginFlow(key: string, prefix: string): void {
  const cur = historyIdx();
  const s = starts[key];
  if (s === undefined || s > cur || !(pathAt(s) ?? '').startsWith(prefix)) {
    starts[key] = cur;
    store(STARTS_KEY, starts);
  }
}

function takeStart(key: string | null): number {
  const cur = historyIdx();
  if (key === null) return cur;
  const s = starts[key];
  delete starts[key];
  store(STARTS_KEY, starts);
  return s === undefined || s > cur ? cur : s;
}

/**
 * Finish a flow and go to `to`. The flow's screens are removed. When the screen
 * before the flow is `to` already, go back to it instead of adding a copy.
 * key null treats the current screen as a one-screen flow.
 */
export async function finishFlow(navigate: NavigateFunction, key: string | null, to: string): Promise<void> {
  await settleHistory();
  const cur = historyIdx();
  const start = takeStart(key);
  const before = start - 1;
  if (before >= 0 && pathname(pathAt(before)) === pathname(to)) {
    await traverse(before - cur);
    return;
  }
  if (cur === start) {
    navigate(to, { replace: true });
    return;
  }
  await traverse(start - cur, () => navigate(to, { replace: true }));
}

/** Close a flow: back to the screen before it, or `fallback` when there is none. */
export async function exitFlow(navigate: NavigateFunction, key: string | null, fallback = '/'): Promise<void> {
  await settleHistory();
  const cur = historyIdx();
  const start = takeStart(key);
  if (start > 0) {
    await traverse(start - 1 - cur);
    return;
  }
  if (cur === start) navigate(fallback, { replace: true });
  else await traverse(start - cur, () => navigate(fallback, { replace: true }));
}
