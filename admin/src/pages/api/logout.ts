import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../lib/auth';

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 303,
    headers: { Location: '/login?out=1', 'Set-Cookie': clearSessionCookie },
  });
};