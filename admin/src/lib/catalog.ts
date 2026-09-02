import { getDb } from './db';

const STORE_ID = 'cilmax';

export interface AdminVariant {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  currency: string;
  inventory_quantity: number;
}

export interface AdminProduct {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  images: string[];
  tags: string[];
  featured: boolean;
  sort_order: number;
  category_id: number | null;
  category_name: string | null;
  variants: AdminVariant[];
}

export interface AdminCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
}

export interface StoreTheme {
  primary_color: string;
  gold_color: string;
}

export type NewProductInput = Omit<
  AdminProduct,
  'id' | 'category_name' | 'variants'
>;

export async function listProducts(): Promise<AdminProduct[]> {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.store_id = $1
     ORDER BY p.sort_order ASC, p.title ASC`,
    [STORE_ID],
  );
  if (rows.length === 0) return [];
  const variantsById = await loadVariants(rows.map((r) => r.id));
  return rows.map(rowToProduct(variantsById));
}

export async function getProduct(id: string): Promise<AdminProduct | null> {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.store_id = $1 AND (p.id = $2 OR p.handle = $2)`,
    [STORE_ID, id],
  );
  if (rows.length === 0) return null;
  const variants = await loadVariants([rows[0].id]);
  return rowToProduct(variants)(rows[0]);
}

export async function createProduct(input: NewProductInput, variants: AdminVariant[]): Promise<AdminProduct> {
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const id = `prod_${Math.random().toString(36).slice(2, 10)}`;
    const { rows } = await client.query(
      `INSERT INTO products (id, store_id, title, handle, description, images, tags, featured, sort_order, category_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
       RETURNING *`,
      [
        id,
        STORE_ID,
        input.title,
        input.handle,
        input.description,
        JSON.stringify(input.images),
        JSON.stringify(input.tags),
        input.featured,
        input.sort_order,
        input.category_id,
      ],
    );
    await insertVariants(client, id, variants);
    await client.query('COMMIT');
    const result = await getProduct(id);
    if (!result) throw new Error('No se pudo crear el producto');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateProduct(
  id: string,
  input: NewProductInput,
  variants: AdminVariant[],
): Promise<AdminProduct | null> {
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE products
       SET title = $1, handle = $2, description = $3, images = $4::jsonb, tags = $5::jsonb,
           featured = $6, sort_order = $7, category_id = $8, updated_at = now()
       WHERE store_id = $9 AND id = $10`,
      [
        input.title,
        input.handle,
        input.description,
        JSON.stringify(input.images),
        JSON.stringify(input.tags),
        input.featured,
        input.sort_order,
        input.category_id,
        STORE_ID,
        id,
      ],
    );
    await client.query(`DELETE FROM product_variants WHERE product_id = $1`, [id]);
    await insertVariants(client, id, variants);
    await client.query('COMMIT');
    return getProduct(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const db = getDb();
  const { rowCount } = await db.query(
    `DELETE FROM products WHERE store_id = $1 AND id = $2`,
    [STORE_ID, id],
  );
  return (rowCount ?? 0) > 0;
}

async function loadVariants(productIds: string[]): Promise<Map<string, AdminVariant[]>> {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT * FROM product_variants WHERE product_id = ANY($1::text[]) ORDER BY title ASC`,
    [productIds],
  );
  const map = new Map<string, AdminVariant[]>();
  for (const r of rows) {
    const list = map.get(r.product_id) ?? [];
    list.push(variantFromRow(r));
    map.set(r.product_id, list);
  }
  return map;
}

async function insertVariants(client: any, productId: string, variants: AdminVariant[]): Promise<void> {
  for (const v of variants) {
    await client.query(
      `INSERT INTO product_variants (id, product_id, title, sku, price, currency, inventory_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [v.id, productId, v.title, v.sku, v.price, v.currency, v.inventory_quantity],
    );
  }
}

function variantFromRow(r: any): AdminVariant {
  return {
    id: r.id,
    title: r.title,
    sku: r.sku,
    price: Number(r.price),
    currency: r.currency,
    inventory_quantity: Number(r.inventory_quantity),
  };
}

function rowToProduct(variantsById: Map<string, AdminVariant[]>) {
  return (r: any): AdminProduct => ({
    id: r.id,
    title: r.title,
    handle: r.handle,
    description: r.description,
    images: Array.isArray(r.images) ? r.images : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    featured: r.featured,
    sort_order: Number(r.sort_order),
    category_id: r.category_id,
    category_name: r.category_name,
    variants: variantsById.get(r.id) ?? [],
  });
}

export async function listCategories(): Promise<AdminCategory[]> {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT * FROM categories WHERE store_id = $1 ORDER BY name ASC`,
    [STORE_ID],
  );
  return rows;
}

export async function createCategory(slug: string, name: string, description: string): Promise<AdminCategory> {
  const db = getDb();
  const { rows } = await db.query(
    `INSERT INTO categories (store_id, slug, name, description)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [STORE_ID, slug, name, description],
  );
  return rows[0];
}

export async function updateCategory(
  id: number,
  slug: string,
  name: string,
  description: string,
): Promise<AdminCategory | null> {
  const db = getDb();
  const { rows } = await db.query(
    `UPDATE categories SET slug = $1, name = $2, description = $3, updated_at = now()
     WHERE store_id = $4 AND id = $5 RETURNING *`,
    [slug, name, description, STORE_ID, id],
  );
  return rows[0] ?? null;
}

export async function deleteCategory(id: number): Promise<boolean> {
  const db = getDb();
  const { rowCount } = await db.query(
    `DELETE FROM categories WHERE store_id = $1 AND id = $2`,
    [STORE_ID, id],
  );
  return (rowCount ?? 0) > 0;
}

export async function getTheme(): Promise<StoreTheme> {
  const db = getDb();
  const { rows } = await db.query(
    `SELECT primary_color, gold_color FROM store_settings WHERE store_id = $1`,
    [STORE_ID],
  );
  if (rows.length === 0) return { primary_color: '#008a93', gold_color: '#d4af37' };
  return { primary_color: rows[0].primary_color, gold_color: rows[0].gold_color };
}

export async function updateTheme(primary: string, gold: string): Promise<void> {
  const db = getDb();
  await db.query(
    `INSERT INTO store_settings (store_id, primary_color, gold_color, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (store_id) DO UPDATE SET primary_color = $2, gold_color = $3, updated_at = now()`,
    [STORE_ID, primary, gold],
  );
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}