// Fuente de datos local de la tienda. Lee los productos desde
// src/data/products.json (archivo versionable y editable por el desarrollador
// mediante los scripts CLI `npm run product:*`).
//
// Se usa como fallback cuando no hay backend de Medusa configurado (env
// `PUBLIC_MEDUSA_BACKEND_URL` sin rellenar), y permite que la tienda compile y
// se vea en desarrollo. En cuanto se configure Medusa, la capa de datos
// (src/lib/medusa.ts) pasa a consultar la Store API y este archivo queda solo
// como referencia/fallback.

import raw from '../data/products.json';

export interface MockProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string | null;
  images: { url: string }[];
  variants: {
    id: string;
    title: string;
    sku: string | null;
    prices: { amount: number; currency_code: string }[];
    inventory_quantity: number;
  }[];
  collection: { title: string } | null;
  tags: string[];
  /** Si el producto debe destacar en la home / secciones destacadas */
  featured: boolean;
}

export const mockProducts: MockProduct[] = (raw as { products: MockProduct[] }).products;
