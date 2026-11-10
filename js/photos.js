// Photo capture and processing, all on the phone.
// The dependable path is the phone's own camera through a file input.
// A live camera with a faint copy of the first photo is offered where it works.
// Photos are drawn once onto a canvas at most 1,600 px on the long edge,
// saved as JPEG at quality 0.8, and never rotated by hand (browsers already
// apply the photo's orientation). Nothing is saved to the gallery.

import { LIMITS } from './config.js';

let work = null;
const canvas = () => work || (work = document.createElement('canvas'));

function toBlob(c, type, quality) {
  return new Promise((resolve, reject) => {
    if (c.toBlob) {
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), type, quality);
    } else {
      try {
        const url = c.toDataURL(type, quality);
        fetch(url).then((r) => r.blob()).then(resolve, reject);
      } catch (e) {
        reject(e);
      }
    }
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    img.src = url;
  });
}

function measure(c) {
  const s = document.createElement('canvas');
  s.width = 64;
  s.height = 64;
  const x = s.getContext('2d', { willReadFrequently: true });
  const side = Math.min(c.width, c.height) * 0.6;
  x.drawImage(c, (c.width - side) / 2, (c.height - side) / 2, side, side, 0, 0, 64, 64);
  const d = x.getImageData(0, 0, 64, 64).data;
  let sum = 0;
  let hi = 0;
  let lo = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    sum += l;
    if (l >= 250) hi++;
    if (l <= 6) lo++;
  }
  return { mean: Math.round(sum / n), high: hi / n, low: lo / n };
}

async function encode(source, sw, sh, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const c = canvas();
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(source, 0, 0, w, h);
  const blob = await toBlob(c, 'image/jpeg', 0.8);
  const stats = measure(c);
  const ts = Math.min(1, 420 / Math.max(w, h));
  const t = document.createElement('canvas');
  t.width = Math.round(w * ts);
  t.height = Math.round(h * ts);
  t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
  const thumbBlob = await toBlob(t, 'image/jpeg', 0.74);
  // Free canvas memory straight away; iOS limits the total.
  c.width = 1;
  c.height = 1;
  t.width = 1;
  t.height = 1;
  return {
    data: await blob.arrayBuffer(),
    thumb: await thumbBlob.arrayBuffer(),
    width: w,
    height: h,
    brightness: stats.mean,
    clippedHigh: stats.high,
    clippedLow: stats.low,
    previewUrl: URL.createObjectURL(thumbBlob),
  };
}

export async function processSource(source, sw, sh) {
  try {
    return await encode(source, sw, sh, 1600);
  } catch {
    // A very large photo can exceed the canvas limit on iPhone. Try smaller.
    return encode(source, sw, sh, 1200);
  }
}

export async function processFile(file) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('not-image');
  const img = await loadImage(file);
  return processSource(img, img.naturalWidth, img.naturalHeight);
}

/** Compare a check-in photo's light with the first photo of the same view. */
export function compareLight(current, baselineBrightness) {
  if (!baselineBrightness || !current) return { flagged: false, ratio: 1 };
  const ratio = Math.max(1, current.brightness) / Math.max(1, baselineBrightness);
  if (ratio > LIMITS.brightnessRatioHigh) return { flagged: true, reason: 'more-light', ratio };
  if (ratio < LIMITS.brightnessRatioLow) return { flagged: true, reason: 'less-light', ratio };
  return { flagged: false, ratio };
}

/** Gentle checks for a first photo, which has nothing to compare with yet. */
export function firstPhotoAdvice(p) {
  if (!p) return null;
  if (p.brightness < 45) return 'This photo is quite dark. Try facing a window in daylight.';
  if (p.clippedHigh > 0.12) return 'Part of this photo is washed out by glare. Try indirect light, flash off.';
  return null;
}

let pendingInput = null;

/**
 * Open the phone's camera (capture) or gallery through a hidden file input.
 * Resolves with a File, or null if she cancels. If nothing at all happens
 * within 5 seconds (the page never lost focus), onStall is called so the
 * screen can explain that in-app browsers may block the camera. The input
 * keeps listening, so a photo taken late is never lost.
 */
export function pickImage({ capture = false, onStall = null } = {}) {
  if (pendingInput) pendingInput.remove();
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', 'environment');
    input.className = 'visually-hidden';
    input.tabIndex = -1;
    document.body.appendChild(input);
    pendingInput = input;
    let settled = false;
    let leftPage = false;
    const onHide = () => {
      leftPage = true;
    };
    const timer = setTimeout(() => {
      if (!settled && !leftPage && capture && document.visibilityState === 'visible' && onStall) onStall();
    }, 5000);
    const finish = (v) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onHide);
      window.removeEventListener('pagehide', onHide);
      input.remove();
      if (pendingInput === input) pendingInput = null;
      resolve(v);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onHide);
    window.addEventListener('pagehide', onHide);
    input.addEventListener('change', () => finish(input.files && input.files[0] ? input.files[0] : null));
    input.addEventListener('cancel', () => finish(null));
    input.click();
  });
}

export const liveCameraSupported = () =>
  !!(globalThis.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

/**
 * A live camera view with a faint copy of her first photo to line up with.
 * Resolves with a processed photo, or null if she closes it.
 */
export function openLiveCamera({ ghostUrl = null, title = 'Line it up', tip = '' } = {}) {
  return new Promise((resolve, reject) => {
    let stream = null;
    let facing = 'environment';
    const wrap = document.createElement('div');
    wrap.className = 'cam';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', title);
    wrap.innerHTML = `
      <div class="cam-stage">
        <video class="cam-video" playsinline muted autoplay></video>
        ${ghostUrl ? `<img class="cam-ghost" alt="" src="${ghostUrl}">` : ''}
        <svg class="cam-frame" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 16V6a2 2 0 0 1 2-2h10M84 4h10a2 2 0 0 1 2 2v10M96 59v10a2 2 0 0 1-2 2H84M16 71H6a2 2 0 0 1-2-2V59" fill="none" stroke="#fff" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linecap="round"/>
        </svg>
        <p class="cam-status" role="status">Starting the camera</p>
      </div>
      <div class="cam-bar">
        <div class="cam-top">
          <strong>${title}</strong>
          ${tip ? `<span>${tip}</span>` : ''}
        </div>
        ${ghostUrl ? `<label class="cam-slider"><span>First photo</span><input type="range" min="0" max="70" value="35" aria-label="How strongly to show your first photo"></label>` : ''}
        <div class="cam-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-cam="close">Cancel</button>
          <button type="button" class="cam-shutter" data-cam="shoot" aria-label="Take photo"><span></span></button>
          <button type="button" class="btn btn-secondary btn-sm" data-cam="flip">Switch</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    const video = wrap.querySelector('video');
    const status = wrap.querySelector('.cam-status');
    const ghost = wrap.querySelector('.cam-ghost');
    const slider = wrap.querySelector('input[type=range]');
    if (slider && ghost) {
      ghost.style.opacity = '0.35';
      slider.addEventListener('input', () => {
        ghost.style.opacity = String(Number(slider.value) / 100);
      });
    }

    const stop = () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
    };
    const close = (value, err) => {
      stop();
      wrap.remove();
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKey);
      if (err) reject(err);
      else resolve(value);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
    };
    document.addEventListener('keydown', onKey);

    async function start() {
      stop();
      status.hidden = false;
      status.textContent = 'Starting the camera';
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play().catch(() => {});
        status.hidden = true;
      } catch (e) {
        close(null, Object.assign(new Error('camera-denied'), { cause: e }));
      }
    }

    wrap.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-cam]');
      if (!b) return;
      const what = b.dataset.cam;
      if (what === 'close') close(null);
      if (what === 'flip') {
        facing = facing === 'environment' ? 'user' : 'environment';
        start();
      }
      if (what === 'shoot') {
        if (!video.videoWidth) return;
        b.disabled = true;
        try {
          const processed = await processSource(video, video.videoWidth, video.videoHeight);
          processed.source = 'live';
          close(processed);
        } catch (err) {
          close(null, err);
        }
      }
    });
    start();
  });
}
