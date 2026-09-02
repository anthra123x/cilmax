// Capa de acceso a datos de la tienda. Orden de prioridad:
//   1. Base de datos (Neon) — fuente de verdad gestionada por el panel admin.
//   2. SDK de Medusa (si PUBLIC_MEDUSA_BACKEND_URL está configurado).
//   3. Datos de ejemplo locales (src/lib/mock-data.ts) — solo para desarrollo.
//
// Todas las funciones del frontend deben importar desde aquí.

import { getDb } from './db';
import { isConfigured, getStoreSdk } from './medusa-sdk';
import { mockProducts } from './mock-data';

// ---------------------------------------------------------------------------
// Tipos normalizados (independientes del SDK para no acoplar la UI)
// ---------------------------------------------------------------------------

export interface ProductImage {
  url: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  /** Precio mostrado ya formateado (número en la moneda principal, p. ej. 89.9) */
  amount: number;
  currencyCode: string;
  inventoryQuantity: number;
}

export interface ProductData {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  collectionTitle: string | null;
  currencyCode: string;
  /** Si el producto debe destacar en la home */
  featured: boolean;
}

export interface StoreTheme {
  primaryColor: string;
  goldColor: string;
}

const FALLBACK_THEME: StoreTheme = { primaryColor: '#008a93', goldColor: '#d4af37' };

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Unidades mínimas de moneda por código ISO (decimales). */
const MINOR_UNITS: Record<string, number> = {
  cop: 0,
  clp: 0,
  jpy: 0,
  krw: 0,
  vnd: 0,
  isk: 0,
};

/** Convierte un importe "en unidades" (unidad menor) al número en la moneda principal. */
export function formatAmount(amountInUnits: number, currencyCode: string): number {
  const digits = MINOR_UNITS[currencyCode.toLowerCase()] ?? 2;
  return amountInUnits / 10 ** digits;
}

/** Formatea un precio para mostrar con Intl (locale Colombia). */
export function formatPrice(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

function toProductData(raw: any): ProductData | null {
  if (!raw || !raw.id) return null;

  const currencyCode =
    (raw.variants?.[0]?.prices?.[0]?.currency_code ??
      (raw.variants?.[0]?.calculated_price?.currency_code as string | undefined)) ||
    'cop';

  const variants: ProductVariant[] = (raw.variants ?? []).map((v: any) => {
    const price = v.calculated_price ?? v.prices?.[0];
    const amountInUnits = price?.amount ?? price?.original_amount ?? 0;
    const variantCurrency = price?.currency_code ?? currencyCode;
    return {
      id: v.id,
      title: v.title,
      sku: v.sku ?? null,
      amount: formatAmount(amountInUnits, variantCurrency),
      currencyCode: variantCurrency,
      inventoryQuantity: v.inventory_quantity ?? 0,
    };
  });

  return {
    id: raw.id,
    title: raw.title,
    handle: raw.handle ?? raw.id,
    description: raw.description ?? '',
    thumbnail: raw.thumbnail ?? raw.images?.[0]?.url ?? null,
    images: (raw.images ?? []).map((img: any) => ({ url: img.url })),
    variants,
    collectionTitle: raw.collection?.title ?? null,
    currencyCode,
    featured: raw.featured ?? false,
  };
}

function toProductDataFromDb(row: any, variants: ProductVariant[]): ProductData {
  const images: ProductImage[] = (Array.isArray(row.images) ? row.images : [])
    .filter(Boolean)
    .map((url: string) => ({ url }));
  return {
    id: row.id,
    title: row.title,
    handle: row.handle,
    description: row.description ?? '',
    thumbnail: images[0]?.url ?? null,
    images,
    variants,
    collectionTitle: row.category_name ?? null,
    currencyCode: 'cop',
    featured: row.featured ?? false,
  };
}

// ---------------------------------------------------------------------------
// Base de datos (Neon)
// ---------------------------------------------------------------------------

interface DbProductRow {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  images: string[];
  tags: string[];
  featured: boolean;
  sort_order: number;
  category_name: string | null;
}

async function productsFromDb(limit: number, offset: number): Promise<ProductData[]> {
  const db = getDb();
  const { rows } = await db.query<DbProductRow>(
    `select p.id, p.title, p.handle, p.description, p.images, p.tags, p.featured, p.sort_order,
            c.name as category_name
       from products p
       left join categories c on c.id = p.category_id
      where p.store_id = 'cilmax'
      order by p.sort_order asc, p.title asc
      limit $1 offset $2`,
    [limit, offset]
  );

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { rows: variantRows } = await db.query<any>(
    `select id, product_id, title, sku, price, currency, inventory_quantity
       from product_variants
      where product_id = any($1::text[])
      order by title asc`,
    [ids]
  );

  const variantsByProduct = new Map<string, ProductVariant[]>();
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push({
      id: v.id,
      title: v.title,
      sku: v.sku ?? null,
      amount: formatAmount(v.price, v.currency),
      currencyCode: v.currency,
      inventoryQuantity: v.inventory_quantity ?? 0,
    });
    variantsByProduct.set(v.product_id, list);
  }

  return rows.map((r) => toProductDataFromDb(r, variantsByProduct.get(r.id) ?? []));
}

async function themeFromDb(): Promise<StoreTheme | null> {
  try {
    const db = getDb();
    const { rows } = await db.query<{ primary_color: string; gold_color: string }>(
      `select primary_color, gold_color from store_settings where store_id = 'cilmax'`
    );
    if (rows[0]) {
      return { primaryColor: rows[0].primary_color, goldColor: rows[0].gold_color };
    }
  } catch (error) {
    console.warn('[medusa] No se pudo leer los colores de la BD.', error);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Consultas de productos
// ---------------------------------------------------------------------------

/** Devuelve el tema de la tienda (colores de marca) desde la BD, o el default. */
export async function getStoreTheme(): Promise<StoreTheme> {
  return (await themeFromDb()) ?? FALLBACK_THEME;
}

export async function getProducts(limit = 12, offset = 0): Promise<ProductData[]> {
  // 1. Base de datos (fuente principal)
  try {
    return await productsFromDb(limit, offset);
  } catch (error) {
    console.warn('[medusa] No se pudo leer la BD, usando fallback.', error);
  }

  // 2. Medusa si está configurado
  try {
    if (isConfigured()) {
      const store = getStoreSdk();
      const { products } = await store.store.product.list({
        limit,
        offset,
        fields:
          'id,title,handle,description,thumbnail,images.url,collection.title,variants.id,variants.title,variants.sku,variants.prices.amount,variants.prices.currency_code,variants.calculated_price.amount,variants.calculated_price.currency_code,variants.inventory_quantity',
      });
      return (products ?? []).map(toProductData).filter(Boolean) as ProductData[];
    }
  } catch (error) {
    console.warn('[medusa] No se pudo obtener productos de Medusa.', error);
  }

  // 3. Datos de ejemplo (desarrollo)
  return mockProducts.slice(offset, offset + limit).map(toProductData) as ProductData[];
}

export async function getProductByHandle(handle: string): Promise<ProductData | null> {
  // 1. Base de datos (fuente principal)
  try {
    const db = getDb();
    const { rows } = await db.query<DbProductRow>(
      `select p.id, p.title, p.handle, p.description, p.images, p.tags, p.featured, p.sort_order,
              c.name as category_name
         from products p
         left join categories c on c.id = p.category_id
        where p.store_id = 'cilmax' and p.handle = $1
        limit 1`,
      [handle]
    );
    if (rows[0]) {
      const { rows: variantRows } = await db.query<any>(
        `select id, product_id, title, sku, price, currency, inventory_quantity
           from product_variants
          where product_id = $1
          order by title asc`,
        [rows[0].id]
      );
      const variants: ProductVariant[] = variantRows.map((v) => ({
        id: v.id,
        title: v.title,
        sku: v.sku ?? null,
        amount: formatAmount(v.price, v.currency),
        currencyCode: v.currency,
        inventoryQuantity: v.inventory_quantity ?? 0,
      }));
      return toProductDataFromDb(rows[0], variants);
    }
  } catch (error) {
    console.warn('[medusa] No se pudo leer el producto de la BD, usando fallback.', error);
  }

  // 2/3. Medusa o datos de ejemplo
  try {
    if (isConfigured()) {
      const store = getStoreSdk();
      const { products } = await store.store.product.list({
        q: '',
        fields:
          'id,title,handle,description,thumbnail,images.url,collection.title,variants.id,variants.title,variants.sku,variants.prices.amount,variants.prices.currency_code,variants.calculated_price.amount,variants.calculated_price.currency_code,variants.inventory_quantity',
      });
      const product = (products ?? []).find(
        (p: any) => p.handle === handle || p.id === handle
      );
      if (product) return toProductData(product);
    }
  } catch (error) {
    console.warn('[medusa] No se pudo obtener el producto de Medusa.', error);
  }
  const mock = mockProducts.find((p) => p.handle === handle || p.id === handle);
  return mock ? toProductData(mock) : null;
}