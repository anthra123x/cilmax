// Capa de acceso a datos de la tienda.
// Fuente de verdad única: ERP (gestion-inventario) vía CATALOG_SOURCE=erp.
//
// Todas las funciones del frontend deben importar desde aquí.

import {
  erpToProductData,
  fetchCatalogProductByHandle,
  fetchCatalogProducts,
  fetchCategories,
  fetchProductReviews,
  fetchWebSettings,
  isErpEnabled,
} from './store-client';

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
  /** Slug de categoría web (null si no tiene). */
  categorySlug: string | null;
  /** Calificación promedio de opiniones (null si aún no hay). */
  rating: ProductRating | null;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
}

export interface ProductRating {
  /** Calificación promedio (1 decimal). */
  avg: number;
  count: number;
}

export interface ProductReview {
  id: string;
  productId: string;
  nombre: string;
  correo: string | null;
  calificacion: number;
  comentario: string;
  createdAt: string;
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
// Consultas de productos (ERP)
// ---------------------------------------------------------------------------

/** Devuelve el tema de la tienda desde el ERP, o el default. */
export async function getStoreTheme(): Promise<StoreTheme> {
  if (isErpEnabled()) {
    try {
      const settings = await fetchWebSettings();
      return settings.theme?.primaryColor ? settings.theme : FALLBACK_THEME;
    } catch {
      console.warn('[medusa] No se pudo leer el tema del ERP, usando fallback.');
    }
  }
  return FALLBACK_THEME;
}

export async function getProducts(limit = 12, offset = 0, options: { categorySlug?: string | null; search?: string; excludeIds?: string[] } = {}): Promise<ProductData[]> {
  if (!isErpEnabled()) return [];
  const list = await fetchCatalogProducts({ limit, offset, categorySlug: options.categorySlug, search: options.search });
  return list.map(erpToProductData);
}

/** Devuelve las categorías de la tienda (para el filtro del catálogo). */
export async function getCategories(): Promise<CategoryData[]> {
  if (!isErpEnabled()) return [];
  try {
    return await fetchCategories();
  } catch {
    console.warn('[medusa] No se pudieron leer las categorías del ERP.');
    return [];
  }
}

/** Busca productos por nombre (para el buscador live). */
export async function searchProducts(query: string, limit = 8): Promise<ProductData[]> {
  const q = query.trim();
  if (!q) return [];
  if (!isErpEnabled()) return [];
  try {
    const list = await fetchCatalogProducts({ limit, search: q });
    return list.map(erpToProductData);
  } catch {
    console.warn('[medusa] No se pudo buscar en el ERP.');
    return [];
  }
}

/** Productos de la misma categoría (sugerencias), excluyendo el producto actual. */
export async function getRelatedProducts(product: ProductData, limit = 4): Promise<ProductData[]> {
  if (product.categorySlug == null) return [];
  if (!isErpEnabled()) return [];
  try {
    const list = await fetchCatalogProducts({ limit: limit + 1, categorySlug: product.categorySlug });
    return list.filter((p) => p.id !== product.id).slice(0, limit).map(erpToProductData);
  } catch {
    console.warn('[medusa] No se pudieron leer productos relacionados del ERP.');
    return [];
  }
}

export async function getProductByHandle(handle: string): Promise<ProductData | null> {
  if (!isErpEnabled()) return null;
  try {
    const product = await fetchCatalogProductByHandle(handle);
    return product ? erpToProductData(product) : null;
  } catch {
    console.warn('[medusa] No se pudo leer el producto del ERP.');
    return null;
  }
}

// ---------------------------------------------------------------------------
// Opiniones y calificaciones (ERP)
// ---------------------------------------------------------------------------

/** Devuelve las opiniones SSR de un producto (más recientes primero). */
export async function getProductReviews(productId: string, limit = 50): Promise<ProductReview[]> {
  if (!isErpEnabled()) return [];
  try {
    return await fetchProductReviews(productId, limit);
  } catch {
    console.warn('[medusa] No se pudieron leer las opiniones del ERP.');
    return [];
  }
}
