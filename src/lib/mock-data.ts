// Fuente de datos local de la tienda. Lee los productos y categorías desde
// src/data/products/*.json y src/data/categories/*.json — archivos gestionados
// por el panel de administración Keystatic (/keystatic) y versionados en git.
//
// Se usa como fallback cuando no hay backend de Medusa configurado (env
// `PUBLIC_MEDUSA_BACKEND_URL` sin rellenar), y permite que la tienda compile y
// se vea en desarrollo. En cuanto se configure Medusa, la capa de datos
// (src/lib/medusa.ts) pasa a consultar la Store API y este archivo queda solo
// como referencia/fallback.

export interface MockCategory {
  name: string;
  handle: string;
  description?: string | null;
}

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
  /** Posición en el catálogo (menor = primero) */
  order: number;
}

interface RawProduct {
  id: string;
  title: string;
  description: string;
  images?: (string | null)[] | null;
  category?: string | null;
  tags?: string[] | null;
  featured?: boolean | null;
  order?: number | null;
  variants: {
    id: string;
    title: string;
    sku: string | null;
    prices: { amount: number; currency_code: string }[];
    inventory_quantity: number;
  }[];
}

interface RawCategory {
  name: string;
  description?: string | null;
}

const rawProducts = import.meta.glob<{ default: RawProduct }>('../data/products/*.json', {
  eager: true,
});
const rawCategories = import.meta.glob<{ default: RawCategory }>('../data/categories/*.json', {
  eager: true,
});

export const mockCategories: MockCategory[] = Object.entries(rawCategories).map(([path, mod]) => ({
  name: mod.default.name,
  handle: path.split('/').pop()!.replace(/\.json$/, ''),
  description: mod.default.description ?? null,
}));

const categoriesByHandle = new Map(mockCategories.map((c) => [c.handle, c]));

export const mockProducts: MockProduct[] = Object.entries(rawProducts)
  .map(([path, mod]): MockProduct => {
    const raw = mod.default;
    const handle = path.split('/').pop()!.replace(/\.json$/, '');
    const images = (raw.images ?? []).filter(Boolean).map((src) => ({ url: src as string }));
    const categoryHandle = raw.category ?? null;
    const category = categoryHandle ? categoriesByHandle.get(categoryHandle) ?? null : null;
    return {
      id: raw.id,
      title: raw.title,
      handle,
      description: raw.description,
      thumbnail: images[0]?.url ?? null,
      images,
      variants: raw.variants ?? [],
      collection: category ? { title: category.name } : null,
      tags: raw.tags ?? [],
      featured: raw.featured ?? false,
      order: raw.order ?? 100,
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'es'));