import type { APIRoute } from 'astro';
import { updateTheme } from '../../lib/catalog';

export const prerender = false;

const HEX = /^#[0-9a-fA-F]{6}$/;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const primary = String(formData.get('primary_text') ?? '');
  const gold = String(formData.get('gold_text') ?? '');
  const primaryOk = HEX.test(primary);
  const goldOk = HEX.test(gold);
  if (!primaryOk || !goldOk) {
    return new Response(null, {
      status: 303,
      headers: { Location: '/admin/colores?error=hex' },
    });
  }
  try {
    await updateTheme(primary, gold);
  } catch (err) {
    console.error(err);
    return new Response(null, { status: 303, headers: { Location: '/admin/colores?error=error' } });
  }
  return new Response(null, { status: 303, headers: { Location: '/admin/colores' } });
};