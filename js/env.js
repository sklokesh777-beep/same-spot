// What kind of browser is this? Used for the iPhone Home Screen step,
// in-app browser help and the install button.

const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
const mm = (q) => typeof window !== 'undefined' && window.matchMedia && window.matchMedia(q).matches;

export const env = {
  ios: /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  android: /Android/i.test(ua),
  standalone: mm('(display-mode: standalone)') || (typeof navigator !== 'undefined' && navigator.standalone === true),
  inApp: /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|Snapchat|LinkedInApp|Twitter/i.test(ua),
  secure: typeof window !== 'undefined' && window.isSecureContext,
  mobile: /Android|iPhone|iPad|iPod|Mobile/i.test(ua),
  reducedMotion: mm('(prefers-reduced-motion: reduce)'),
  installPrompt: null,
};

env.iosSafariTab = env.ios && !env.standalone;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    env.installPrompt = e;
    document.dispatchEvent(new CustomEvent('samespot:installable'));
  });
}

export async function copyLink(url = location.href) {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = url;
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    t.remove();
    return ok;
  }
}
