// API de mensajes de contacto del storefront.
// POST /api/contacto -> recibe un mensaje del formulario de contacto, lo
// valida y lo escribe en el ERP (/api/web/contact), ÚNICA fuente de verdad:
// el ERP agrupa asunto+mensaje en un solo campo.

import type { APIRoute } from 'astro';
import { isErpEnabled, postWebAction } from '../../lib/store-client';

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

    if (!isErpEnabled()) {
      return json({ error: 'El formulario no está disponible.' }, { status: 503 });
    }

    // Con el catálogo sobre el ERP, el mensaje se escribe en el ERP (fuente de
    // verdad). El ERP agrupa asunto+mensaje en un solo campo.
    try {
      const defaultAsunto = 'Consulta desde la web';
      const merged =
        asunto && asunto !== defaultAsunto ? `${asunto} — ${mensaje}` : mensaje;
      const result = (await postWebAction('/api/web/contact', {
        name: nombre,
        email: correo,
        phone: null,
        message: merged,
      })) as { ok?: boolean; error?: string };
      if (result.ok === false || result.error) {
        return json({ error: result.error ?? 'No se pudo enviar el mensaje.' }, { status: 400 });
      }
      return json({ ok: true });
    } catch (err) {
      console.error('[contacto] No se pudo escribir en el ERP.', err);
      return json({ error: 'No se pudo enviar el mensaje. Intenta de nuevo.' }, { status: 500 });
    }
  } catch (err) {
    console.error(err);
    return json({ error: 'No se pudo enviar el mensaje. Intenta de nuevo.' }, { status: 500 });
  }
};