/**
 * Tests del cliente del catálogo ERP (src/lib/store-client.ts).
 *
 * Cubre el enrutamiento por entorno (CATALOG_SOURCE/ERP_API_URL) y la
 * normalización del contrato /api/web/* a los tipos de la tienda. Las llamadas
 * HTTP reales no se ejercitan aquí; el transporte se cubre con la integración
 * en vivo contra el ERP.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { erpBaseUrl, isErpEnabled, erpToProductData, erpToProductReviews } from '../store-client';

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('isErpEnabled / erpBaseUrl', () => {
  it('está desactivado por defecto', () => {
    expect(isErpEnabled()).toBe(false);
  });

  it('se activa solo con CATALOG_SOURCE=erp y URL configurada', () => {
    vi.stubEnv('CATALOG_SOURCE', 'erp');
    vi.stubEnv('ERP_API_URL', 'https://erp.example');
    expect(isErpEnabled()).toBe(true);
  });

  it('queda desactivado si CATALOG_SOURCE=erp pero falta la URL', () => {
    vi.stubEnv('CATALOG_SOURCE', 'erp');
    expect(isErpEnabled()).toBe(false);
  });

  it('normaliza la URL base (elimina la barra final)', () => {
    vi.stubEnv('ERP_API_URL', 'https://erp.example/');
    expect(erpBaseUrl()).toBe('https://erp.example');
  });
});

describe('erpToProductData', () => {
  it('mapea el producto del ERP a ProductData', () => {
    const product = erpToProductData({
      id: 'clx_1',
      title: 'Olla a presión',
      handle: 'olla',
      description: 'Desc.',
      thumbnail: 'https://img/e.jpg',
      images: [{ url: 'https://img/e.jpg' }],
      variants: [
        { id: 'clx_v1', title: 'Único', sku: 'OLL-1', amount: 480000, currencyCode: 'cop', inventoryQuantity: 3 },
      ],
      collectionTitle: 'Cocina',
      currencyCode: 'cop',
      featured: true,
      categorySlug: 'cocina',
      rating: { avg: 4.6, count: 2 },
    });

    expect(product.id).toBe('clx_1');
    expect(product.handle).toBe('olla');
    expect(product.categorySlug).toBe('cocina');
    expect(product.collectionTitle).toBe('Cocina');
    expect(product.featured).toBe(true);
    expect(product.rating).toEqual({ avg: 4.6, count: 2 });
    expect(product.variants[0]).toEqual({
      id: 'clx_v1',
      title: 'Único',
      sku: 'OLL-1',
      amount: 480000,
      currencyCode: 'cop',
      inventoryQuantity: 3,
    });
  });
});

describe('erpToProductReviews', () => {
  it('mapea las reseñas del ERP al formato de la tienda', () => {
    const reviews = erpToProductReviews([
      {
        id: 'clx_r1',
        productId: 'clx_1',
        name: 'Cliente',
        email: 'c@x.co',
        rating: 5,
        comment: 'Excelente',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
    expect(reviews).toEqual([
      {
        id: 'clx_r1',
        productId: 'clx_1',
        nombre: 'Cliente',
        correo: 'c@x.co',
        calificacion: 5,
        comentario: 'Excelente',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
  });
});