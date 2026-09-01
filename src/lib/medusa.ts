// Capa de acceso a datos de la tienda. Une el SDK real de Medusa con un
// fallback local (mock) para que la app compile y se vea sin backend.
//
// - Con `PUBLIC_MEDUSA_BACKEND_URL` + `PUBLIC_MEDUSA_PUBLISHABLE_KEY`
//   configuradas, consulta la Store API de Medusa.
// - Sin ellas, devuelve datos de ejemplo (src/lib/mock-data.ts).
//
// Todas las funciones del frontend deben importar desde aquí (nunca usar
// fetch directo a Medusa): el SDK inyecta el header x-publishable-api-key
// automáticamente en cada petición.

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
  /** Si el producto debe destacar en la home. En modo Medusa se deriva de la colección/tags. */
  featured: boolean;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Unidades mínimas de moneda por código ISO (decimales). Medusa almacena
 *  los importes en la unidad menor de cada moneda. */
const MINOR_UNITS: Record<string, number> = {
  cop: 0,
  clp: 0,
  jpy: 0,
  krw: 0,
  vnd: 0,
  isk: 0,
};

/** Convierte un importe "en unidades" (unidad menor) de Medusa al número en la
 *  moneda principal. P. ej. COP no tiene decimales (549900 -> 549900), EUR sí
 *  (8990 -> 89.9). */
export function formatAmount(amountInUnits: number, currencyCode: string): number {
  const digits = MINOR_UNITS[currencyCode.toLowerCase()] ?? 2;
  return amountInUnits / 10 ** digits;
}

/** Formatea un precio para mostrar con Intl. Usa la moneda y locale de Colombia. */
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
    // Medusa devuelve amount en unidades de la moneda (unidad menor).
    // Preferimos calculated_price (precio con impuestos aplicados según
    // región) si viene disponible.
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

// ---------------------------------------------------------------------------
// Consultas de productos
// ---------------------------------------------------------------------------

export async function getProducts(limit = 12, offset = 0): Promise<ProductData[]> {
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
    console.warn('[medusa] No se pudo obtener productos, usando datos de ejemplo.', error);
  }
  return mockProducts.slice(offset, offset + limit).map(toProductData) as ProductData[];
}

export async function getProductByHandle(handle: string): Promise<ProductData | null> {
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
    console.warn('[medusa] No se pudo obtener el producto, usando datos de ejemplo.', error);
  }
  const mock = mockProducts.find((p) => p.handle === handle || p.id === handle);
  return mock ? toProductData(mock) : null;
}
