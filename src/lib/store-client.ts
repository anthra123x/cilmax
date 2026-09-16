/**
 * Cliente de la API pública del ERP (gestion-inventario) hacia la tienda.
 *
 * Cuando `CATALOG_SOURCE=erp` (y `ERP_API_URL` está definido), el catálogo y
 * las reseñas de la tienda se leen desde el ERP. La capa de datos de la tienda
 * (medusa.ts) intenta primero este cliente y, si falla, cae al flujo Neon o a
 * los datos locales: la tienda nunca se rompe por el ERP.
 *
 * El ERP es la fuente de verdad de productos/precios/stock. Esta capa solo lee
 * (GET) y escribe pedidos web, mensajes y reseñas (POST) hacia /api/web/*.
 */

import type { CategoryData, ProductData, ProductRating, ProductReview, StoreTheme } from './medusa';

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

/** URL base del ERP, leída en cada llamada (permite tests con vi.stubEnv). */
export function erpBaseUrl(): string | undefined {
  return (import.meta.env.ERP_API_URL as string | undefined)?.replace(/\/+$/, '');
}

/** La tienda usa el ERP solo cuando se activa explícitamente. */
export function isErpEnabled(): boolean {
  return import.meta.env.CATALOG_SOURCE === 'erp' && Boolean(erpBaseUrl());
}

// ---------------------------------------------------------------------------
// Tipos del contrato /api/web/*
// ---------------------------------------------------------------------------

export interface WebVariant {
  id: string;
  title: string;
  sku: string | null;
  amount: number;
  currencyCode: string;
  inventoryQuantity: number;
}

export interface WebProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string | null;
  images: { url: string }[];
  variants: WebVariant[];
  collectionTitle: string | null;
  currencyCode: string;
  featured: boolean;
  categorySlug: string | null;
  rating: ProductRating | null;
}

export interface WebSettings {
  storeName: string;
  whatsapp: string | null;
  email: string | null;
  shippingInfo: string | null;
  theme: StoreTheme;
}

// ---------------------------------------------------------------------------
// Transporte: fetch con timeout + caché TTL
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 3000;
const TTL_MS = 60_000;
const cache = new Map<string, { expiresAt: number; value: unknown }>();

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = erpBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`ERP ${response.status}: ${path}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function cached<T>(cacheKey: string, loader: () => Promise<T>, ttlMs = TTL_MS): Promise<T> {
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const value = await loader();
  cache.set(cacheKey, { expiresAt: now + ttlMs, value });
  return value;
}

// ---------------------------------------------------------------------------
// Normalización a los tipos de la tienda (medusa.ts)
// ---------------------------------------------------------------------------

export function erpToProductData(p: WebProduct): ProductData {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description,
    thumbnail: p.thumbnail,
    images: p.images,
    variants: p.variants.map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      amount: v.amount,
      currencyCode: v.currencyCode,
      inventoryQuantity: v.inventoryQuantity,
    })),
    collectionTitle: p.collectionTitle,
    currencyCode: p.currencyCode,
    featured: p.featured,
    categorySlug: p.categorySlug,
    rating: p.rating,
  };
}

export function erpToProductReviews(reviews: {
  id: string;
  productId: string;
  name: string;
  email: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}[]): ProductReview[] {
  return reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    nombre: r.name,
    correo: r.email,
    calificacion: r.rating,
    comentario: r.comment,
    createdAt: r.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Consultas del catálogo (estas funciones lanzan si el ERP falla: medusa.ts
// aplica el fallback).
// ---------------------------------------------------------------------------

export async function fetchCatalogProducts(options?: {
  limit?: number;
  offset?: number;
  categorySlug?: string | null;
  search?: string;
}): Promise<WebProduct[]> {
  if (!erpBaseUrl()) throw new Error('ERP_API_URL no configurado');
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  if (options?.categorySlug) params.set('category', options.categorySlug);
  if (options?.search) params.set('q', options.search);
  const parts = params.toString();
  const key = `/api/web/products${parts ? `?${parts}` : ''}`;
  const data = await cached<{ products: WebProduct[] }>(key, () => fetchJson<{ products: WebProduct[] }>(key));
  return data.products ?? [];
}

export async function fetchCatalogProductByHandle(handle: string): Promise<WebProduct | null> {
  if (!erpBaseUrl()) throw new Error('ERP_API_URL no configurado');
  const key = `/api/web/products/${encodeURIComponent(handle)}`;
  const data = await cached<{ product: WebProduct | null }>(key, () =>
    fetchJson<{ product: WebProduct | null }>(key),
  );
  return data.product ?? null;
}

export async function fetchCategories(): Promise<CategoryData[]> {
  if (!erpBaseUrl()) throw new Error('ERP_API_URL no configurado');
  const key = '/api/web/categories';
  const data = await cached<{ categories: CategoryData[] }>(key, () => fetchJson(key));
  return data.categories ?? [];
}

export async function fetchProductReviews(productId: string, limit = 50): Promise<ProductReview[]> {
  if (!erpBaseUrl()) throw new Error('ERP_API_URL no configurado');
  const key = `/api/web/reviews?productId=${encodeURIComponent(productId)}&limit=${limit}`;
  const data = await cached<{ reviews: { id: string; productId: string; name: string; email: string | null; rating: number; comment: string; createdAt: string }[] }>(key, () => fetchJson(key));
  return erpToProductReviews(data.reviews ?? []);
}

export async function fetchWebSettings(): Promise<WebSettings> {
  if (!erpBaseUrl()) throw new Error('ERP_API_URL no configurado');
  const key = '/api/web/settings';
  const data = await cached<{ settings: WebSettings }>(key, () => fetchJson(key));
  return data.settings;
}

// ---------------------------------------------------------------------------
// Escrituras proxy (usadas por las APIs de la tienda cuando el ERP está activo)
// ---------------------------------------------------------------------------

export async function postWebAction<T>(path: string, payload: unknown): Promise<T> {
  if (!erpBaseUrl()) throw new Error('ERP_API_URL no configurado');
  return await fetchJson<T>(path, { method: 'POST', body: JSON.stringify(payload) });
}