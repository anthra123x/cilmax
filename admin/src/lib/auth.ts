import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'cilmax_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

function secret(): string {
  return process.env.ADMIN_KEY ?? import.meta.env.ADMIN_KEY ?? '';
}

export function adminKey(): string {
  return secret();
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_TTL_MS;
  return `${exp}.${sign(String(exp))}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expRaw, sig] = token.split('.');
  if (!expRaw || !sig) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(expRaw);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const key = adminKey();
  if (!key) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function setSessionCookie(expiresAt = Date.now() + SESSION_TTL_MS): string {
  const token = `${expiresAt}.${sign(String(expiresAt))}`;
  const secure = !import.meta.env.DEV ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure}`;
}

export const clearSessionCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}