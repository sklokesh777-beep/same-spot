// PIN hashing for the app lock and password protection for backups,
// with the browser's own Web Crypto.

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

async function pbkdf2Bits(secret: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

export async function hashPin(pin: string, saltB64?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltB64 ? fromBase64(saltB64) : randomBytes(16);
  const bits = await pbkdf2Bits(pin, salt, 150_000);
  return { hash: toBase64(new Uint8Array(bits)), salt: toBase64(salt) };
}

export async function checkPin(pin: string, hash: string, salt: string): Promise<boolean> {
  const out = await hashPin(pin, salt);
  return out.hash === hash;
}

async function aesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 200_000 }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptText(text: string, password: string): Promise<{ salt: string; iv: string; data: string }> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await aesKey(password, salt);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return { salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

export async function decryptText(box: { salt: string; iv: string; data: string }, password: string): Promise<string> {
  const key = await aesKey(password, fromBase64(box.salt));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(box.iv) }, key, fromBase64(box.data));
  return dec.decode(plain);
}
