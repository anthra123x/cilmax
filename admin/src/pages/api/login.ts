import type { APIRoute } from 'astro';
import { verifyPassword, setSessionCookie } from '../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const password = String(formData.get('password') ?? '');
  if (!(await verifyPassword(password))) {
    return new Response(null, { status: 303, headers: { Location: '/login?error=1' } });
  }
  const cookie = setSessionCookie();
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/admin',
      'Set-Cookie': cookie,
    },
  });
};