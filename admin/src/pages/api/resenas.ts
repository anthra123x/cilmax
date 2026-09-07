// API de reseñas del panel CilMax.
// POST /api/resenas -> elimina una reseña (_action=delete + id).

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const action = String(formData.get('_action') ?? '');

  if (action === 'delete') {
    try {
      const id = String(formData.get('id') ?? '');
      const db = getDb();
      await db.query('DELETE FROM product_reviews WHERE id = $1', [id]);
      return new Response(null, {
        status: 303,
        headers: { Location: '/admin/resenas?ok=borrado' },
      });
    } catch (err) {
      console.error(err);
      return new Response(null, {
        status: 303,
        headers: { Location: '/admin/resenas?error=borrado' },
      });
    }
  }

  return new Response(null, {
    status: 303,
    headers: { Location: '/admin/resenas' },
  });
};