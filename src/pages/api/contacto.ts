// API de mensajes de contacto del backend CilMax (Neon Postgres).
// POST /api/contacto -> recibe un mensaje del formulario de contacto del
// storefront, lo valida y lo guarda en la tabla contact_messages para que el
// equipo lo vea en el panel de admin.

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export const prerender = false;

const MAX_NOMBRE = 160;
const MAX_CORREO = 254;
const MAX_ASUNTO = 200;
const MAX_MENSAJE = 4000;

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | { nombre?: unknown; correo?: unknown; asunto?: unknown; mensaje?: unknown }
      | null;

    const nombre = String(body?.nombre ?? '').trim();
    const correo = String(body?.correo ?? '').trim();
    const asunto = String(body?.asunto ?? '').trim() || 'Consulta desde la web';
    const mensaje = String(body?.mensaje ?? '').trim();

    if (!nombre) return json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    if (nombre.length > MAX_NOMBRE) return json({ error: 'El nombre es demasiado largo.' }, { status: 400 });
    if (!correo) return json({ error: 'El correo es obligatorio.' }, { status: 400 });
    if (correo.length > MAX_CORREO) return json({ error: 'El correo es demasiado largo.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return json({ error: 'Correo inválido.' }, { status: 400 });
    if (asunto.length > MAX_ASUNTO) return json({ error: 'El asunto es demasiado largo.' }, { status: 400 });
    if (!mensaje) return json({ error: 'El mensaje es obligatorio.' }, { status: 400 });
    if (mensaje.length > MAX_MENSAJE) return json({ error: 'El mensaje es demasiado largo.' }, { status: 400 });

    const db = getDb();
    await db.query(
      `INSERT INTO contact_messages (store_id, nombre, correo, asunto, mensaje)
       VALUES ($1, $2, $3, $4, $5)`,
      ['cilmax', nombre, correo, asunto, mensaje],
    );

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: 'No se pudo enviar el mensaje. Intenta de nuevo.' }, { status: 500 });
  }
};