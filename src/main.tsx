import '@fontsource-variable/inter';
import '@fontsource/instrument-serif/400.css';
import './index.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyAppearance, offerUpdate } from './components/shell';
import { cachedAppearance } from './data/actions';

// Apply the saved theme before the first paint.
const a = cachedAppearance();
const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
applyAppearance({ dark: a.theme === 'dark' || (a.theme === 'system' && systemDark), textSize: a.textSize, reduceMotion: a.reduceMotion });

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // An earlier version of Same Spot used its own cache; remove it.
  caches?.delete('samespot-v1').catch(() => {});
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({ immediate: true, onNeedRefresh: () => offerUpdate(() => updateSW(true)) });
    })
    .catch(() => {});
}
