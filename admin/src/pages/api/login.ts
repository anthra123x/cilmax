import type { APIRoute } from 'astro';
import { verifyPassword, setSessionCookie } from '../../lib/auth';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; first: number; blockedUntil: number }>();

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function isBlocked(ip: string): boolean {
  const a = attempts.get(ip);
  if (!a) return false;
  return a.blockedUntil > Date.now();
}

function recordFailure(ip: string): number {
  const now = Date.now();
  let a = attempts.get(ip);
  if (!a || now - a.first > WINDOW_MS) {
    a = { count: 0, first: now, blockedUntil: 0 };
  }
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) a.blockedUntil = now + BLOCK_MS;
  attempts.set(ip, a);
  return a.count;
}

function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);

  if (isBlocked(ip)) {
    return new Response(null, { status: 303, headers: { Location: '/login?error=blocked' } });
  }

  const formData = await request.formData();
  const password = String(formData.get('password') ?? '');

  if (!(await verifyPassword(password))) {
    recordFailure(ip);
    return new Response(null, { status: 303, headers: { Location: '/login?error=1' } });
  }

  clearAttempts(ip);
  const cookie = setSessionCookie();
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/admin',
      'Set-Cookie': cookie,
    },
  });
};

export const prerender = false;
