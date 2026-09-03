// API de búsqueda en vivo del storefront.
// GET /api/search?q=<texto>  -> JSON { results: [{ id, title, handle, thumbnail, priceFormatted, collectionTitle }] }

import type { APIRoute } from 'astro';
import { searchProducts, formatAmount, formatPrice } from '../../lib/medusa';

export const prerender = false;

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

  const results = products.map((p) => {
    const first = p.variants?.[0];
    const amount = first ? formatAmount(first.amount, p.currencyCode) : 0;
    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      thumbnail: p.thumbnail,
      priceFormatted: formatPrice(amount, p.currencyCode),
      collectionTitle: p.collectionTitle,
    };
  });

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};