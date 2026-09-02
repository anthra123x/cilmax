// API de pedidos del backend CilMax (Neon Postgres).
// POST /api/orders  -> registra un pedido del storefront (cliente + carrito).
// GET  /api/orders  -> consulta de administracion; exige header x-admin-key.
//
// Seguridad: el subtotal se recalcula SIEMPRE en el servidor usando los precios
// reales de la base de datos (por variantId). Se ignoran los precios enviados
// por el cliente: no se confía en ellos. Así no es posible registrar un pedido
// con un monto manipulado.

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export const prerender = false;

const ADMIN_KEY: string | undefined = import.meta.env.ADMIN_KEY as string | undefined;

/** Máximo de líneas de producto por pedido, protección contra abuso. */
const MAX_ITEMS = 50;
/** Máxima cantidad de unidades por línea. */
const MAX_QUANTITY = 99;
/** Máximo subtotal admitido en COP (protección contra valores absurdos). */
const MAX_SUBTOTAL_COP = 1_000_000_000;

interface OrderItemIn {
  variantId?: unknown;
  handle?: unknown;
  title?: unknown;
  variantTitle?: unknown;
  price?: unknown;
  quantity?: unknown;
}

interface OrderItemOut {
  variantId: string;
  handle: string | null;
  title: string | null;
  variantTitle: string | null;
  price: number;
  quantity: number;
}

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; phone?: unknown; email?: unknown; notes?: unknown; items?: unknown }
      | null;

    const name = body?.name;
    const phone = body?.phone;
    const email = body?.email;
    const notes = body?.notes;
    const rawItems: OrderItemIn[] = Array.isArray(body?.items) ? body.items : [];

    if (typeof name !== 'string' || !name.trim()) {
      return json({ ok: false, error: 'Falta el nombre del cliente.' }, { status: 400 });
    }
    if (typeof phone !== 'string' || !phone.trim()) {
      return json({ ok: false, error: 'Falta el teléfono del cliente.' }, { status: 400 });
    }
    if (name.trim().length > 120) {
      return json({ ok: false, error: 'El nombre es demasiado largo.' }, { status: 400 });
    }
    if (phone.trim().length > 30) {
      return json({ ok: false, error: 'El teléfono no es válido.' }, { status: 400 });
    }
    if (rawItems.length === 0) {
      return json({ ok: false, error: 'El pedido está vacío.' }, { status: 400 });
    }
    if (rawItems.length > MAX_ITEMS) {
      return json({ ok: false, error: 'Demasiados productos en el pedido.' }, { status: 400 });
    }

    // Validamos y normalizamos cada línea: quantity entero >= 1 y <= MAX_QUANTITY.
    const requested: OrderItemOut[] = [];
    for (const it of rawItems) {
      const quantity = Number(it.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        return json(
          {
            ok: false,
            error: 'Cantidad de producto no válida.',
          },
          { status: 400 }
        );
      }
      if (typeof it.variantId !== 'string' || it.variantId.trim() === '') {
        return json(
          {
            ok: false,
            error: 'Falta el identificador de la variante.',
          },
          { status: 400 }
        );
      }
      requested.push({
        variantId: it.variantId.trim(),
        handle: typeof it.handle === 'string' && it.handle.trim() ? it.handle.trim() : null,
        title:
          typeof it.title === 'string' && it.title.trim() ? it.title.trim().slice(0, 200) : null,
        variantTitle:
          typeof it.variantTitle === 'string' && it.variantTitle.trim()
            ? it.variantTitle.trim().slice(0, 200)
            : null,
        price: 0, // se rellena desde BD
        quantity,
      });
    }

    const db = getDb();

    // Precios reales desde BD por variantId (en lote, sin N+1).
    const ids = requested.map((r) => r.variantId);
    const { rows: realVariants } = await db.query<{
      id: string;
      product_id: string;
      handle: string;
      title: string;
      variant_title: string | null;
      price: number;
      currency: string;
    }>(
      `select pv.id,
              pv.product_id,
              p.handle,
              p.title,
              pv.title as variant_title,
              pv.price,
              pv.currency
         from product_variants pv
         join products p on p.id = pv.product_id
        where pv.id = any($1::text[])
          and p.store_id = 'cilmax'`,
      [ids]
    );
    const byId = new Map(realVariants.map((v) => [v.id, v]));

    // Reconstruimos el pedido SOLO con precios reales. Si alguna variante no
    // existe en BD, rechazamos el pedido completo (no se cobra inventario web).
    const snapshot: OrderItemOut[] = [];
    let subtotal = 0;
    for (const r of requested) {
      const real = byId.get(r.variantId);
      if (!real || real.currency !== 'cop') {
        return json(
          {
            ok: false,
            error: 'Uno de los productos ya no está disponible.',
          },
          { status: 400 }
        );
      }
      const item: OrderItemOut = {
        variantId: r.variantId,
        handle: real.handle,
        title: real.title ?? r.title,
        variantTitle: real.variant_title ?? r.variantTitle,
        price: real.price,
        quantity: r.quantity,
      };
      snapshot.push(item);
      subtotal += real.price * r.quantity;
    }

    if (!Number.isInteger(subtotal) || subtotal < 0 || subtotal > MAX_SUBTOTAL_COP) {
      return json({ ok: false, error: 'El total del pedido no es válido.' }, { status: 400 });
    }

    const customer = await db.query(
      `insert into customers (store_id, name, phone, email)
       values ('cilmax', $1, $2, $3)
       on conflict (store_id, phone)
       do update set name = excluded.name, email = coalesce(excluded.email, customers.email)
       returning id`,
      [name.trim(), phone.trim(), typeof email === 'string' && email.trim() ? email.trim() : null],
    );
    const customerId = customer.rows[0].id as string;

    const order = await db.query(
      `insert into orders (store_id, customer_id, currency, subtotal_cop, items, notes)
       values ('cilmax', $1, 'cop', $2, $3::jsonb, $4)
       returning id, status, currency, subtotal_cop, created_at`,
      [
        customerId,
        subtotal,
        JSON.stringify(snapshot),
        typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 2000) : null,
      ],
    );

    return json({ ok: true, order: order.rows[0] });
  } catch (error) {
    console.error('POST /api/orders:', error);
    return json({ ok: false, error: 'Error interno del servidor.' }, { status: 500 });
  }
};

export const GET: APIRoute = async ({ request }) => {
  if (!ADMIN_KEY) {
    return json({ ok: false, error: 'Consulta desactivada: falta ADMIN_KEY.' }, { status: 501 });
  }
  if (request.headers.get('x-admin-key') !== ADMIN_KEY) {
    return json({ ok: false, error: 'No autorizado.' }, { status: 401 });
  }
  try {
    const db = getDb();
    const result = await db.query(
      `select o.id, o.status, o.currency, o.subtotal_cop, o.created_at, o.items,
              c.name, c.phone, c.email
       from orders o
       join customers c on c.id = o.customer_id
       where o.store_id = 'cilmax'
       order by o.created_at desc
       limit 100`,
    );
    return json({ ok: true, orders: result.rows });
  } catch (error) {
    console.error('GET /api/orders:', error);
    return json({ ok: false, error: 'Error interno del servidor.' }, { status: 500 });
  }
};