/**
 * Tests del mapeo de resultados de búsqueda (src/pages/api/search.ts).
 *
 * Cubre el bug latente: `first.amount` ya está normalizado (número en la moneda
 * principal, p. ej. 50 USD). Aplicarle formatAmount de nuevo divide el precio
 * por segunda vez (50 -> 0.50). Las expectativas se calculan con formatPrice()
 * real para no duplicar la lógica bajo prueba.
 */

import { describe, it, expect } from 'vitest';
import { toSearchResult } from '../../pages/api/search';
import { formatPrice } from '../../lib/medusa';
import type { ProductData } from '../../lib/medusa';

function makeProduct(overrides: Partial<ProductData> = {}): ProductData {
  return {
    id: 'prod_test',
    title: 'Test',
    handle: 'test',
    description: '',
    thumbnail: null,
    images: [],
    variants: [],
    collectionTitle: null,
    currencyCode: 'cop',
    featured: false,
    categoryId: null,
    rating: null,
    ...overrides,
  };
}

describe('toSearchResult', () => {
  it('no re-divide un precio ya normalizado (moneda con decimales, USD)', () => {
    const product = makeProduct({
      currencyCode: 'usd',
      variants: [{ id: 'v1', title: 'Estándar', sku: null, amount: 50, currencyCode: 'usd', inventoryQuantity: 5 }],
    });
    const r = toSearchResult(product);
    expect(r.priceFormatted).toBe(formatPrice(50, 'usd'));
  });

  it('mantiene el precio correcto para COP (sin decimales)', () => {
    const product = makeProduct({
      variants: [{ id: 'v1', title: 'Negro', sku: null, amount: 549900, currencyCode: 'cop', inventoryQuantity: 5 }],
    });
    const r = toSearchResult(product);
    expect(r.priceFormatted).toBe(formatPrice(549900, 'cop'));
  });

  it('usa 0 como precio cuando el producto no tiene variantes', () => {
    const r = toSearchResult(makeProduct());
    expect(r.priceFormatted).toBe(formatPrice(0, 'cop'));
  });

  it('propaga id, handle, thumbnail, colección y rating', () => {
    const product = makeProduct({
      handle: 'micuchillo',
      thumbnail: 'https://img.example/x.png',
      collectionTitle: 'Hogar y oficina',
      rating: { avg: 4.5, count: 3 },
    });
    const r = toSearchResult(product);
    expect(r.handle).toBe('micuchillo');
    expect(r.thumbnail).toBe('https://img.example/x.png');
    expect(r.collectionTitle).toBe('Hogar y oficina');
    expect(r.rating).toEqual({ avg: 4.5, count: 3 });
  });
});