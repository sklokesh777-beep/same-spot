// Photo processing, all on the device. Each photo is drawn once onto a
// canvas (at most 1600 px on the long edge), saved as JPEG, and given a
// 400 px thumbnail. Re-encoding drops location and other hidden data.

import { isDateStr, localDateStr } from '../engine/dates';

export interface ProcessedPhoto {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  brightness: number;
  previewUrl: string;
}

export const LIGHT_LOW = 0.75;
export const LIGHT_HIGH = 1.33;

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality);
  });
}

/** Mean luminance (0 to 255) of the centre 60% of an image source. */
export function centreBrightness(source: CanvasImageSource, w: number, h: number): number {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 48;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx || !w || !h) return 0;
  ctx.drawImage(source, w * 0.2, h * 0.2, w * 0.6, h * 0.6, 0, 0, 48, 48);
  const d = ctx.getImageData(0, 0, 48, 48).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return Math.round(sum / (d.length / 4));
}

async function encode(source: CanvasImageSource, sw: number, sh: number, maxEdge: number, mirror = false): Promise<ProcessedPhoto> {
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, w, h);
  const full = await toBlob(canvas, 0.82);
  const brightness = centreBrightness(canvas, w, h);
  const ts = Math.min(1, 400 / Math.max(w, h));
  const t = document.createElement('canvas');
  t.width = Math.max(1, Math.round(w * ts));
  t.height = Math.max(1, Math.round(h * ts));
  t.getContext('2d')?.drawImage(canvas, 0, 0, t.width, t.height);
  const thumb = await toBlob(t, 0.78);
  // Free canvas memory straight away; phones limit the total.
  canvas.width = 1;
  canvas.height = 1;
  t.width = 1;
  t.height = 1;
  return { full, thumb, width: w, height: h, brightness, previewUrl: URL.createObjectURL(thumb) };
}

export async function processSource(source: CanvasImageSource, sw: number, sh: number, mirror = false): Promise<ProcessedPhoto> {
  try {
    return await encode(source, sw, sh, 1600, mirror);
  } catch {
    // Very large photos can exceed the canvas limit on some phones.
    return encode(source, sw, sh, 1200, mirror);
  }
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
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

export class NotAPhotoError extends Error {}

export async function processFile(file: File): Promise<ProcessedPhoto> {
  if (file.type && !file.type.startsWith('image/')) throw new NotAPhotoError('not-image');
  const img = await loadImage(file);
  return processSource(img, img.naturalWidth, img.naturalHeight);
}

/** When was this photo taken? The camera's own date first, then the file date. */
export async function captureDate(file: File): Promise<{ date: string | null; fromPhoto: boolean }> {
  try {
    const exifr = await import('exifr');
    const tags = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
    const d: unknown = tags?.DateTimeOriginal ?? tags?.CreateDate;
    if (d instanceof Date && !Number.isNaN(d.getTime())) return { date: localDateStr(d), fromPhoto: true };
  } catch {
    /* no readable date in this photo */
  }
  if (file.lastModified) {
    const d = localDateStr(new Date(file.lastModified));
    if (isDateStr(d)) return { date: d, fromPhoto: false };
  }
  return { date: null, fromPhoto: false };
}

export type LightCheck = 'match' | 'less' | 'more';

export function compareLight(brightness: number, first: number | undefined): LightCheck {
  if (!first) return 'match';
  const ratio = Math.max(1, brightness) / Math.max(1, first);
  if (ratio < LIGHT_LOW) return 'less';
  if (ratio > LIGHT_HIGH) return 'more';
  return 'match';
}

export const LIGHT_TEXT: Record<LightCheck, string> = {
  match: 'Light matches',
  less: 'Less light than your first photo: face a window',
  more: 'More light than your first photo: avoid direct sun',
};

/** Open the phone's camera or gallery through a hidden file input. */
export function pickFile({ camera, accept = 'image/*' }: { camera: boolean; accept?: string }): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (camera) input.setAttribute('capture', 'environment');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.tabIndex = -1;
    document.body.appendChild(input);
    let done = false;
    const finish = (f: File | null) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(f);
    };
    input.addEventListener('change', () => finish(input.files && input.files[0] ? input.files[0] : null));
    input.addEventListener('cancel', () => finish(null));
    input.click();
  });
}

export const liveCameraSupported = (): boolean =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window !== 'undefined' && window.isSecureContext;

export function isInAppBrowser(): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|Snapchat|LinkedInApp/i.test(navigator.userAgent || '');
}
