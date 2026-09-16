/**
 * Tests del endpoint GET /api/search (handler). Se mockea únicamente
 * `searchProducts` (acceso a datos); `formatPrice`/`formatAmount` se usan
 * reales para que las expectativas no dupliquen lógica.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../pages/api/search';
import { formatPrice } from '../../lib/medusa';
import type { ProductData } from '../../lib/medusa';

const { searchProductsMock } = vi.hoisted(() => ({ searchProductsMock: vi.fn() }));

vi.mock('../../lib/medusa', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/medusa')>();
  return { ...actual, searchProducts: searchProductsMock };
});

function get(url: string) {
  return GET({ url: new URL(url) } as any);
}

function makeProduct(): ProductData {
  return {
    id: 'prod_test',
    title: 'Olla de presión',
    handle: 'olla',
    description: '',
    thumbnail: null,
    images: [],
    variants: [{ id: 'v1', title: 'Estándar', sku: null, amount: 480000, currencyCode: 'cop', inventoryQuantity: 3 }],
    collectionTitle: 'Hogar y oficina',
    currencyCode: 'cop',
    featured: true,
    categoryId: null,
    rating: { avg: 4.6, count: 2 },
  };
}

beforeEach(() => {
  searchProductsMock.mockReset();
});

describe('GET /api/search', () => {
  it('responde con vacío y no consulta la BD si no hay query', async () => {
    const res = await get('http://127.0.0.1:4321/api/search?q=');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.results).toEqual([]);
    expect(searchProductsMock).not.toHaveBeenCalled();
  });

  it('mapea los resultados de searchProducts y formatea el precio', async () => {
    searchProductsMock.mockResolvedValueOnce([makeProduct()]);
    const res = await get('http://127.0.0.1:4321/api/search?q=olla&limit=5');
    const body = await res.json();
    expect(searchProductsMock).toHaveBeenCalledWith('olla', 5);
    expect(body.results).toHaveLength(1);
    const [r] = body.results;
    expect(r.handle).toBe('olla');
    expect(r.thumbnail).toBeNull();
    expect(r.collectionTitle).toBe('Hogar y oficina');
    expect(r.rating).toEqual({ avg: 4.6, count: 2 });
    expect(r.priceFormatted).toBe(formatPrice(480000, 'cop'));
  });

  it('usa el límite por defecto cuando el parámetro limit no es válido', async () => {
    searchProductsMock.mockResolvedValueOnce([]);
    await get('http://127.0.0.1:4321/api/search?q=x&limit=999');
    expect(searchProductsMock).toHaveBeenCalledWith('x', 8);
  });
});