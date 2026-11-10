// S17 Privacy and data, the app lock, and the lock screen.

import { html, icon, btn, topbar, bindActions, toast, confirmDialog, dialog } from '../ui.js';
import { COPY } from '../config.js';
import {
  S, refreshStorageInfo, exportBackup, importBackup, validateBackup, deleteEverything, lockEnabled, lockSupported,
  setLock, checkLock, removeLock,
} from '../state.js';
import { todayStr } from '../dates.js';
import { env } from '../env.js';

const mb = (n) => (n == null ? 'unknown' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

async function askCode(title, body) {
  const code = await dialog({
    title,
    body,
    content: html`<label class="text-field"><span>4-digit code</span><input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"></label>`,
    buttons: [
      { label: 'Continue', value: (m) => m.querySelector('#pin').value, variant: 'primary' },
      { label: 'Cancel', value: null, variant: 'secondary' },
    ],
  });
  if (code == null) return null;
  if (!/^\d{4}$/.test(code)) {
    toast('Use exactly 4 digits.');
    return null;
  }
  return code;
}

export const privacy = {
  title: 'Privacy and data',
  cls: 'screen-privacy',
  async render(ctx) {
    await refreshStorageInfo();
    const photos = S.photos.length;
    const records = S.records.length;
    return html`${topbar({ back: S.records.length ? '#/home' : '#/', title: 'Privacy and data' })}
      <div class="pad flow">
        <h1 class="screen-title" tabindex="-1">Privacy and data</h1>
        <section class="card card-plain">
          <h2 class="card-title">${icon('lock')}<span>What is stored, and where</span></h2>
          <ul class="dot-list">
            <li>Your answers, dates and any photos you take.</li>
            <li>Only in this browser on this phone. Same Spot has no server, no account and no analytics.</li>
            <li>Nobody at Be Bodywise or Mosaic can see them. Photos never go to your gallery.</li>
          </ul>
          <dl class="kv kv-tight">
            <div><dt>Records</dt><dd>${records}</dd></div>
            <div><dt>Photos</dt><dd>${photos}</dd></div>
            <div><dt>Space used</dt><dd>${mb(S.usage)}${S.usageIncludesApp && S.usage != null ? html`<span class="muted small"> including the app’s offline files</span>` : ''}</dd></div>
            <div><dt>Protected from clean-up</dt><dd>${S.persisted ? 'Yes' : 'Not yet. The browser decides.'}</dd></div>
          </dl>
          ${env.iosSafariTab ? html`<p class="small">On iPhone, Safari can delete saved data from sites you haven’t opened for 7 days. Open Same Spot from your Home Screen, and keep a backup.</p>` : ''}
        </section>

        <section class="card card-plain">
          <h2 class="card-title">${icon('download')}<span>Backup</span></h2>
          <p class="small">A backup is one file with your records and photos. Keep it somewhere private: anyone with the file can see your photos.</p>
          <div class="stack">
            ${btn('Export a backup', { action: 'export', variant: 'secondary', iconName: 'download', cls: 'btn-block', disabled: !records })}
            ${btn('Import a backup', { action: 'import', variant: 'secondary', iconName: 'upload', cls: 'btn-block' })}
          </div>
        </section>

        <section class="card card-plain">
          <h2 class="card-title">${icon('key')}<span>Lock Same Spot</span></h2>
          <p class="small">For shared phones. A 4-digit code hides your record from someone who picks up your phone. It does not encrypt your data, and a forgotten code can’t be recovered.</p>
          ${lockSupported()
            ? lockEnabled()
              ? html`<div class="stack">${btn('Turn off the lock', { action: 'unlock', variant: 'secondary', cls: 'btn-block' })}</div>`
              : html`<div class="stack">${btn('Set a 4-digit code', { action: 'lock', variant: 'secondary', iconName: 'lock', cls: 'btn-block' })}</div>`
            : html`<p class="small muted">The lock needs a secure (https) page.</p>`}
        </section>

        <section class="card card-rose">
          <h2 class="card-title">${icon('trash')}<span>Delete everything</span></h2>
          <p class="small">Removes every record and photo from this phone. This can’t be undone. Copies you exported, or screenshots, are not affected.</p>
          ${btn('Delete everything', { action: 'wipe', variant: 'danger', iconName: 'trash', cls: 'btn-block' })}
        </section>

        <p class="note">${icon('info', { size: 18 })}<span>${COPY.notMedical}</span></p>
        <p class="small muted">Designed with India’s data protection rules in mind: a plain notice, adults only, nothing sent anywhere, and deletion at any time.</p>
      </div>`;
  },
  mount(root, ctx) {
    return bindActions(root, {
      async export() {
        try {
          const data = await exportBackup();
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `same-spot-backup-${todayStr()}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          toast('Backup file ready. Keep it somewhere private.');
        } catch {
          toast('The backup couldn’t be made. Please try again.');
        }
      },
      import() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.className = 'visually-hidden';
        input.tabIndex = -1;
        // Some phone browsers only report a choice for inputs in the page.
        document.body.appendChild(input);
        input.addEventListener('cancel', () => input.remove());
        input.addEventListener('change', async () => {
          const file = input.files && input.files[0];
          input.remove();
          if (!file) return;
          let obj;
          try {
            obj = JSON.parse(await file.text());
          } catch {
            toast('That file is not a Same Spot backup.');
            return;
          }
          const problem = validateBackup(obj);
          if (problem) {
            toast(problem);
            return;
          }
          const ok = await confirmDialog({
            title: 'Replace what’s on this phone?',
            body: `The backup has ${obj.records.length} record${obj.records.length === 1 ? '' : 's'} and ${obj.photos.length} photo${obj.photos.length === 1 ? '' : 's'}. It will replace your current records.`,
            confirmLabel: 'Import and replace',
            danger: true,
          });
          if (!ok) return;
          try {
            await importBackup(obj);
            toast('Backup imported.');
            ctx.nav('/home');
          } catch (e) {
            toast(e.message || 'The backup couldn’t be imported.');
          }
        });
        input.click();
      },
      async lock() {
        const a = await askCode('Choose a 4-digit code', 'You’ll need it each time you open Same Spot.');
        if (!a) return;
        const b = await askCode('Type it again', '');
        if (!b) return;
        if (a !== b) {
          toast('The codes didn’t match. Try again.');
          return;
        }
        await setLock(a);
        toast('Same Spot is locked with your code.');
        ctx.refresh();
      },
      async unlock() {
        const code = await askCode('Type your code to turn off the lock', '');
        if (!code) return;
        if (!(await checkLock(code))) {
          toast('That code doesn’t match.');
          return;
        }
        await removeLock();
        toast('Lock turned off.');
        ctx.refresh();
      },
      async wipe() {
        const ok = await confirmDialog({
          title: 'Delete everything?',
          body: 'Every record and photo on this phone will be removed. This can’t be undone.',
          confirmLabel: 'Delete everything',
          danger: true,
        });
        if (!ok) return;
        await deleteEverything();
        toast('Everything is deleted.');
        ctx.nav('/');
      },
    });
  },
};

let lockCleanup = null;

/** The lock screen, drawn over everything until the right code is typed. */
export function renderLock(root, onUnlock) {
  // Each route change while locked redraws this screen. Drop the old
  // listeners first so a key press is never counted twice.
  if (lockCleanup) lockCleanup();
  let code = '';
  const draw = (msg = '') => {
    root.className = 'screen screen-lock';
    root.innerHTML = String(html`<div class="lock">
      <span class="lock-icon">${icon('lock', { size: 34 })}</span>
      <h1 class="screen-title" tabindex="-1">Same Spot is locked</h1>
      <p class="muted">Type your 4-digit code.</p>
      <div class="pin-dots" aria-label="${code.length} of 4 digits typed">${[0, 1, 2, 3].map((i) => html`<span class="${i < code.length ? 'on' : ''}"></span>`)}</div>
      <p class="pin-msg" role="alert">${msg}</p>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => html`<button type="button" data-k="${n}">${n}</button>`)}
        <button type="button" data-k="forgot" class="key-text">Forgot?</button><button type="button" data-k="0">0</button>
        <button type="button" data-k="del" aria-label="Delete last digit">${icon('back')}</button></div>
    </div>`);
  };
  draw();
  let checking = false;
  const press = async (k) => {
    if (checking) return;
    if (k === 'del') code = code.slice(0, -1);
    else if (k === 'forgot') {
      const ok = await confirmDialog({
        title: 'Forgot your code?',
        body: 'A forgotten code can’t be recovered. You can delete everything on this phone and start again.',
        confirmLabel: 'Delete everything',
        danger: true,
      });
      if (ok) {
        await deleteEverything();
        cleanup();
        S.unlocked = true;
        onUnlock();
      }
      return;
    } else if (code.length < 4) code += k;
    draw();
    if (code.length === 4) {
      checking = true;
      const ok = await checkLock(code);
      checking = false;
      if (ok) {
        S.unlocked = true;
        cleanup();
        onUnlock();
      } else {
        code = '';
        draw('That code doesn’t match.');
        const dots = root.querySelector('.pin-dots');
        if (dots) dots.classList.add('shake');
      }
    }
  };
  const onClick = (e) => {
    const b = e.target.closest('[data-k]');
    if (b) press(b.dataset.k);
  };
  // A keyboard works too, for laptops.
  const onKey = (e) => {
    if (document.querySelector('.modal-wrap')) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
  };
  const cleanup = () => {
    root.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    lockCleanup = null;
  };
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  lockCleanup = cleanup;
}

