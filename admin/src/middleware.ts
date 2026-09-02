import { defineMiddleware } from 'astro:middleware';
import { verifySessionToken, sessionCookieName } from './lib/auth';

const PUBLIC_API = ['/api/login'];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const isProtected =
    path.startsWith('/admin') ||
    (path.startsWith('/api/') && !PUBLIC_API.some((p) => path === p || path.startsWith(p + '/')));

  if (!isProtected) return next();

  const cookies = context.request.headers.get('cookie') ?? '';
  const token = cookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(sessionCookieName() + '='))
    ?.split('=')[1];

  if (token && verifySessionToken(token)) return next();

  if (path.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return context.redirect('/login');
});