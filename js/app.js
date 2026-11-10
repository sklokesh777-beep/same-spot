// Boot and the hash router. Every screen is a small object:
// { title, cls, guard(ctx), render(ctx), mount(root, ctx) -> cleanup }.

import { S, init, releaseImageURLs, lockEnabled } from './state.js';
import { hydratePhotos } from './ui.js';
import { todayStr, isDateStr } from './dates.js';
import { env } from './env.js';

import landing from './screens/landing.js';
import about from './screens/about.js';
import sample from './screens/sample.js';
import sampleCheck from './screens/sample-check.js';
import { notice, iphone, concern, product, expect, firstPhotos, reminders } from './screens/onboarding.js';
import home from './screens/home.js';
import checkin from './screens/checkin.js';
import { look, verdict } from './screens/look.js';
import { harm, pack, recordScreen, summary, photosLater } from './screens/record.js';
import { privacy, renderLock } from './screens/privacy.js';

const routes = [
  [/^\/$/, landing],
  [/^\/about$/, about],
  [/^\/sample(?:\/(?<scenario>[a-z-]+))?$/, sample],
  [/^\/sample\/(?<scenario>[a-z-]+)\/check$/, sampleCheck],
  [/^\/start$/, notice],
  [/^\/start\/iphone$/, iphone],
  [/^\/new$/, concern],
  [/^\/new\/product$/, product],
  [/^\/new\/expect$/, expect],
  [/^\/new\/photos$/, firstPhotos],
  [/^\/home$/, home],
  [/^\/privacy$/, privacy],
  [/^\/r\/(?<id>[\w-]+)\/reminders$/, reminders],
  [/^\/r\/(?<id>[\w-]+)\/checkin$/, checkin],
  [/^\/r\/(?<id>[\w-]+)\/look$/, look],
  [/^\/r\/(?<id>[\w-]+)\/verdict\/(?<cid>[\w-]+)$/, verdict],
  [/^\/r\/(?<id>[\w-]+)\/check-this$/, harm],
  [/^\/r\/(?<id>[\w-]+)\/pack$/, pack],
  [/^\/r\/(?<id>[\w-]+)\/photos$/, photosLater],
  [/^\/r\/(?<id>[\w-]+)\/summary$/, summary],
  [/^\/r\/(?<id>[\w-]+)$/, recordScreen],
];

const root = document.getElementById('screen');
let current = null;
let renderToken = 0;

function parse() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  return { path: path || '/', query: new URLSearchParams(qs || '') };
}

export function nav(path, { replace = false } = {}) {
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (replace) {
    history.replaceState(null, '', target);
    render();
  } else if (location.hash === target) {
    render();
  } else {
    location.hash = target;
  }
}

async function draw(screen, ctx, isNav) {
  const token = ++renderToken;
  if (current && current.cleanup) {
    try {
      current.cleanup();
    } catch {
      /* ignore */
    }
    current.cleanup = null;
  }
  const out = await screen.render(ctx);
  if (token !== renderToken) return;
  root.innerHTML = String(out);
  root.className = `screen ${screen.cls || ''}`;
  document.body.dataset.screen = screen.cls || '';
  const t = typeof screen.title === 'function' ? screen.title(ctx) : screen.title;
  document.title = t ? `${t} · Same Spot` : 'Same Spot';
  current.cleanup = screen.mount ? screen.mount(root, ctx) || null : null;
  hydratePhotos(root);
  if (isNav) {
    if (!env.reducedMotion) {
      root.classList.remove('enter');
      void root.offsetWidth;
      root.classList.add('enter');
    }
    window.scrollTo(0, 0);
    const h = root.querySelector('h1');
    if (h) {
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
  }
}

async function render() {
  const { path, query } = parse();
  if (lockEnabled() && !S.unlocked) {
    renderLock(root, () => render());
    return;
  }
  let match = null;
  let screen = null;
  for (const [re, s] of routes) {
    const m = path.match(re);
    if (m) {
      match = m;
      screen = s;
      break;
    }
  }
  if (!screen) {
    nav('/', { replace: true });
    return;
  }
  const key = location.hash || '#/';
  const same = current && current.key === key;
  releaseImageURLs();
  const ctx = {
    params: (match && match.groups) || {},
    query,
    path,
    nav,
    env,
    today: todayStr(),
    local: same ? current.local : {},
  };
  ctx.refresh = () => {
    ctx.today = todayStr();
    return draw(screen, ctx, false);
  };
  const redirect = screen.guard ? screen.guard(ctx) : null;
  if (redirect && redirect !== path) {
    nav(redirect, { replace: true });
    return;
  }
  if (current && current.cleanup && !same) {
    try {
      current.cleanup();
    } catch {
      /* ignore */
    }
  }
  current = { key, local: ctx.local, cleanup: same && current ? current.cleanup : null };
  await draw(screen, ctx, !same);
}

// Re-lock a locked app after it has been in the background for 2 minutes.
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (lockEnabled() && S.unlocked && Date.now() - hiddenAt > 120000 && hiddenAt) {
    S.unlocked = false;
    render();
  }
});

// Reviewers can open the example directly with ?demo=1.
function handleQuery() {
  const p = new URLSearchParams(location.search);
  if (p.has('demo') && (!location.hash || location.hash === '#/')) history.replaceState(null, '', `${location.pathname}#/sample/too-early`);
}

async function boot() {
  try {
    const t = sessionStorage.getItem('samespot:today');
    if (isDateStr(t)) globalThis.__SAMESPOT_TODAY__ = t;
  } catch {
    /* ignore */
  }
  handleQuery();
  await init();
  window.addEventListener('hashchange', render);
  await render();
  document.documentElement.classList.add('ready');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
