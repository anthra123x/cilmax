// API de pedidos del backend CilMax (Neon Postgres).
// POST /api/orders  -> registra un pedido del storefront (cliente + carrito).
// GET  /api/orders  -> consulta de administracion; exige header x-admin-key.

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export const prerender = false;

const ADMIN_KEY: string | undefined = import.meta.env.ADMIN_KEY as string | undefined;

interface OrderItem {
  handle?: string | null;
  title?: string | null;
  variantTitle?: string | null;
  price?: number | null;
  quantity?: number | null;
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
    const items: OrderItem[] = Array.isArray(body?.items) ? body.items : [];

    if (typeof name !== 'string' || name.trim() === '') {
      return json({ ok: false, error: 'Falta el nombre del cliente.' }, { status: 400 });
    }
    if (typeof phone !== 'string' || phone.trim() === '') {
      return json({ ok: false, error: 'Falta el teléfono del cliente.' }, { status: 400 });
    }
    if (items.length === 0) {
      return json({ ok: false, error: 'El pedido está vacío.' }, { status: 400 });
    }

    const db = getDb();

    const customer = await db.query(
      `insert into customers (store_id, name, phone, email)
       values ('cilmax', $1, $2, $3)
       on conflict (store_id, phone)
       do update set name = excluded.name, email = coalesce(excluded.email, customers.email)
       returning id`,
      [name.trim(), phone.trim(), typeof email === 'string' && email.trim() ? email.trim() : null],
    );
    const customerId = customer.rows[0].id as string;

    const subtotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0,
    );
    const snapshot = items.map((item) => ({
      handle: item.handle ?? null,
      title: item.title ?? null,
      variantTitle: item.variantTitle ?? null,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
    }));

    const order = await db.query(
      `insert into orders (store_id, customer_id, currency, subtotal_cop, items, notes)
       values ('cilmax', $1, 'cop', $2, $3::jsonb, $4)
       returning id, status, currency, subtotal_cop, created_at`,
      [
        customerId,
        subtotal,
        JSON.stringify(snapshot),
        typeof notes === 'string' && notes.trim() ? notes.trim() : null,
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