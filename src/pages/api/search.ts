// API de búsqueda en vivo del storefront.
// GET /api/search?q=<texto>  -> JSON { results: [{ id, title, handle, thumbnail, priceFormatted, collectionTitle }] }

import type { APIRoute } from 'astro';
import { searchProducts, formatPrice, type ProductData } from '../../lib/medusa';

export const prerender = false;

export interface SearchResultItem {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  priceFormatted: string;
  collectionTitle: string | null;
  rating: ProductData['rating'];
}

/**
 * Normaliza un producto a la respuesta de búsqueda. `variant.amount` ya es el
 * número en la moneda principal (normalizado por formatAmount en medusa.ts).
 * Aplicarle de nuevo `formatAmount` dividiría el precio por segunda vez en
 * monedas con decimales (p. ej. USD 50 -> 0.50), así que se usa tal cual.
 */
export function toSearchResult(p: ProductData): SearchResultItem {
  const first = p.variants?.[0];
  const amount = first ? first.amount : 0;
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    thumbnail: p.thumbnail,
    priceFormatted: formatPrice(amount, p.currencyCode),
    collectionTitle: p.collectionTitle,
    rating: p.rating,
  };
}

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const limit = Number(url.searchParams.get('limit') ?? 8);
  const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 20 ? limit : 8;

  const products = await searchProducts(q, safeLimit);

  const results = products.map(toSearchResult);

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};