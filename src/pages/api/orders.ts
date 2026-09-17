// API de pedidos del storefront CilMax.
// POST /api/orders -> proxy al ERP: reenvía al ERP /api/web/orders (fuente de
// verdad). Los pedidos se consultan y gestionan desde el panel del ERP.
//
// Seguridad: el ERP re-lee precios/clientes desde su BD
// (no se confía en los enviados). Igual que antes, no se aceptan montos manipulados.

import type { APIRoute } from 'astro';

export const prerender = false;

const ERP_API_URL: string | undefined = import.meta.env.ERP_API_URL as string | undefined;

const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

interface OrderItemIn {
  productId?: unknown;
  variantId?: unknown;
  handle?: unknown;
  title?: unknown;
  variantTitle?: unknown;
  price?: unknown;
  quantity?: unknown;
}

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Valida y normaliza el body del POST, retorna el objeto mapeado al ERP o un error. */
async function buildErpOrderBody(body: unknown | null): Promise<
  | { ok: false; error: string; status: number }
  | { ok: true; body: unknown }
> {
  const b = body as {
    name?: unknown; phone?: unknown; email?: unknown; notes?: unknown; items?: unknown;
  } | null;

  const name = b?.name;
  const phone = b?.phone;
  const email = b?.email;
  const notes = b?.notes;
  const rawItems: OrderItemIn[] = Array.isArray(b?.items) ? b.items : [];

  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: 'Falta el nombre del cliente.', status: 400 };
  }
  if (typeof phone !== 'string' || !phone.trim()) {
    return { ok: false, error: 'Falta el teléfono del cliente.', status: 400 };
  }
  if (name.trim().length > 120) {
    return { ok: false, error: 'El nombre es demasiado largo.', status: 400 };
  }
  if (phone.trim().length > 30) {
    return { ok: false, error: 'El teléfono no es válido.', status: 400 };
  }
  if (rawItems.length === 0) {
    return { ok: false, error: 'El pedido está vacío.', status: 400 };
  }
  if (rawItems.length > MAX_ITEMS) {
    return { ok: false, error: 'Demasiados productos en el pedido.', status: 400 };
  }

  // Validamos cada línea y mapeamos al formato del ERP.
  const erpItems: { productId: string; quantity: number }[] = [];
  for (const it of rawItems) {
    const quantity = Number(it.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { ok: false, error: 'Cantidad de producto no válida.', status: 400 };
    }
    if (typeof it.productId !== 'string' || it.productId.trim() === '') {
      return { ok: false, error: 'Falta el identificador del producto.', status: 400 };
    }
    erpItems.push({ productId: it.productId.trim(), quantity });
  }

  const erpBody: Record<string, unknown> = {
    customerName: name.trim(),
    customerPhone: phone.trim(),
    customerEmail: typeof email === 'string' && email.trim() ? email.trim() : null,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 2000) : null,
    items: erpItems,
  };

  return { ok: true, body: erpBody };
}

export const POST: APIRoute = async ({ request }) => {
  if (!ERP_API_URL) {
    return json({ ok: false, error: 'ERP_API_URL no configurada.' }, { status: 503 });
  }
  try {
    const body = (await request.json().catch(() => null));
    const result = await buildErpOrderBody(body);
    if (!result.ok) return json(result, { status: result.status });

    const erpRes = await fetch(`${ERP_API_URL}/api/web/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(result.body),
    });

    const data = await erpRes.json().catch(() => null);
    if (!erpRes.ok) {
      const errMsg = data?.error ?? 'Error en el ERP al registrar el pedido.';
      return json({ ok: false, error: errMsg }, { status: erpRes.status });
    }
    return json(data, { status: erpRes.status });
  } catch (error) {
    console.error('POST /api/orders (proxy):', error);
    return json({ ok: false, error: 'Error interno del servidor.' }, { status: 500 });
  }
};

export const GET: APIRoute = () =>
  json({ ok: false, error: 'Consulta desactivada: gestiona los pedidos desde el ERP.' }, { status: 501 });
