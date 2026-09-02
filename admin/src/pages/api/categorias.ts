import type { APIRoute } from 'astro';
import { createCategory } from '../../lib/catalog';

export const prerender = false;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return new Response(null, { status: 303, headers: { Location: '/admin/categorias?error=nombre' } });
  }
  try {
    await createCategory(slugify(name), name, String(formData.get('description') ?? '').trim());
  } catch (err) {
    console.error(err);
    const msg = String((err as { message?: unknown })?.message ?? '').toLowerCase();
    const isDuplicate = msg.includes('duplicate') || msg.includes('unique');
    return new Response(null, {
      status: 303,
      headers: { Location: `/admin/categorias?error=${isDuplicate ? 'duplicado' : 'error'}` },
    });
  }
  return new Response(null, { status: 303, headers: { Location: '/admin/categorias' } });
};