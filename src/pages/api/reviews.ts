// API de reseñas de productos del backend CilMax (Neon Postgres).
// POST /api/reviews -> recibe una opinión del formulario de reseñas del
// storefront, la valida y la guarda en product_reviews (se publica al instante).

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { isErpEnabled, postWebAction } from '../../lib/store-client';

export const prerender = false;

const MAX_NOMBRE = 120;
const MAX_CORREO = 254;
const MAX_COMENTARIO = 2000;

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | { productId?: unknown; nombre?: unknown; correo?: unknown; calificacion?: unknown; comentario?: unknown; website?: unknown }
      | null;

    // Honeypot anti-spam: un bot rellena el campo oculto "website". Si venía
    // con valor, respondemos éxito pero NO guardamos nada.
    if (body?.website) return json({ ok: true });

    const productId = String(body?.productId ?? '').trim();
    const nombre = String(body?.nombre ?? '').trim();
    const correo = String(body?.correo ?? '').trim();
    const calificacion = Number(body?.calificacion);
    const comentario = String(body?.comentario ?? '').trim();

    if (!productId) return json({ error: 'Producto inválido.' }, { status: 400 });
    if (!nombre) return json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    if (nombre.length > MAX_NOMBRE) return json({ error: 'El nombre es demasiado largo.' }, { status: 400 });
    if (correo && correo.length > MAX_CORREO) return json({ error: 'El correo es demasiado largo.' }, { status: 400 });
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return json({ error: 'Correo inválido.' }, { status: 400 });
    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
      return json({ error: 'Selecciona una calificación de 1 a 5 estrellas.' }, { status: 400 });
    }
    if (!comentario) return json({ error: 'El comentario es obligatorio.' }, { status: 400 });
    if (comentario.length > MAX_COMENTARIO) return json({ error: 'El comentario es demasiado largo.' }, { status: 400 });

    // Con el catálogo sobre el ERP, la reseña se escribe en el ERP (fuente de
    // verdad de productos). Un productId desconocido es rechazado ahí con 400.
    if (isErpEnabled()) {
      try {
        const result = (await postWebAction('/api/web/reviews', {
          productId,
          name: nombre,
          email: correo || null,
          rating: calificacion,
          comment: comentario,
        })) as { ok?: boolean; error?: string };
        if (result.ok === false || result.error) {
          return json({ error: result.error ?? 'Producto inválido.' }, { status: 400 });
        }
        return json({ ok: true });
      } catch (err) {
        console.error('[reviews] No se pudo escribir en el ERP.', err);
        return json({ error: 'No se pudo enviar la reseña. Intenta de nuevo.' }, { status: 500 });
      }
    }

    const db = getDb();

    // El productId debe referenciar un producto vigente del catálogo. Sin esta
    // verificación explícita, una reseña para una variante/producto borrado
    // chocaba con la FK y terminaba en 500 en vez de un 400 limpio.
    const exists = await db.query(
      `select 1 from products where id = $1 and store_id = $2`,
      [productId, 'cilmax'],
    );
    if (!exists.rowCount) {
      return json({ error: 'Producto inválido.' }, { status: 400 });
    }

    await db.query(
      `INSERT INTO product_reviews (store_id, product_id, nombre, correo, calificacion, comentario)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['cilmax', productId, nombre, correo || null, calificacion, comentario],
    );

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: 'No se pudo enviar la reseña. Intenta de nuevo.' }, { status: 500 });
  }
};