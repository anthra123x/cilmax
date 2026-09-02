import type { APIRoute } from 'astro';
import { listProducts, createProduct, updateProduct, deleteProduct, getProduct, slugify } from '../../lib/catalog';

export const prerender = false;

const MAX_TITLE = 160;
const MAX_HANDLE = 160;
const MAX_SKU = 64;
const MAX_DESCRIPTION = 4000;
const MAX_VARIANTS = 50;
const MAX_IMAGES = 12;
const MAX_TAGS = 20;
const MAX_PRICE = 100_000_000_000;
const MAX_STOCK = 1_000_000_000;
const MAX_ORDER = 10_000;

function validationError(message: string): { error: string } {
  return { error: message };
}

function parseCatalogForm(formData: FormData) {
  const rawHandle = String(formData.get('handle') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const descriptionRaw = String(formData.get('description') ?? '').trim();
  const images = String(formData.get('images') ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const categoryIdRaw = formData.get('category_id');

  if (!title) return validationError('El título del producto es obligatorio.');
  if (title.length > MAX_TITLE) return validationError(`El título no puede superar ${MAX_TITLE} caracteres.`);
  if (descriptionRaw.length > MAX_DESCRIPTION) return validationError(`La descripción no puede superar ${MAX_DESCRIPTION} caracteres.`);
  if (images.length > MAX_IMAGES) return validationError(`Máximo ${MAX_IMAGES} imágenes por producto.`);
  if (tags.length > MAX_TAGS) return validationError(`Máximo ${MAX_TAGS} etiquetas por producto.`);

  if (categoryIdRaw) {
    const cat = Number(categoryIdRaw);
    if (!Number.isInteger(cat) || cat <= 0) return validationError('Categoría inválida.');
  }

  if (rawHandle.length > MAX_HANDLE) return validationError(`El handle no puede superar ${MAX_HANDLE} caracteres.`);
  const handle = rawHandle || slugify(title);

  const variants: { id: string; title: string; sku: string | null; price: number; currency: string; inventory_quantity: number }[] = [];
  const vTitles = formData.getAll('vtitle[]');
  const vSkus = formData.getAll('vsku[]');
  const vPrices = formData.getAll('vprice[]');
  const vStocks = formData.getAll('vstock[]');

  if (vTitles.length > MAX_VARIANTS) return validationError(`Máximo ${MAX_VARIANTS} variantes por producto.`);

  for (let i = 0; i < vTitles.length; i++) {
    const vTitle = String(vTitles[i] ?? '').trim();
    const vSku = String(vSkus[i] ?? '').trim();
    const price = Number(String(vPrices[i] ?? '').trim());
    const stock = Number(String(vStocks[i] ?? '').trim());

    if (!vTitle) continue;
    if (vTitle.length > MAX_TITLE) return validationError(`El nombre de una variante supera ${MAX_TITLE} caracteres.`);
    if (vSku.length > MAX_SKU) return validationError(`El SKU no puede superar ${MAX_SKU} caracteres.`);

    if (!Number.isFinite(price) || price <= 0) {
      return validationError(`La variante "${vTitle}" debe tener un precio mayor que 0.`);
    }
    if (price > MAX_PRICE) return validationError(`El precio de "${vTitle}" supera el límite permitido.`);

    if (!Number.isFinite(stock) || stock < 0) {
      return validationError(`El stock de "${vTitle}" no puede ser negativo.`);
    }
    if (stock > MAX_STOCK) return validationError(`El stock de "${vTitle}" supera el límite permitido.`);

    variants.push({
      id: `variant_${slugify(vTitle)}_${Math.random().toString(36).slice(2, 8)}`,
      title: vTitle,
      sku: vSku || null,
      price: Math.round(price),
      currency: 'cop',
      inventory_quantity: Math.round(stock),
    });
  }

  if (variants.length === 0) return validationError('El producto debe tener al menos una variante con precio válido.');

  const orderRaw = Number(formData.get('order'));
  const order = Number.isFinite(orderRaw) ? orderRaw : 100;
  if (order < 0 || order > MAX_ORDER) return validationError(`El orden debe estar entre 0 y ${MAX_ORDER}.`);

  return {
    title,
    handle,
    description: descriptionRaw || null,
    images,
    tags,
    featured: formData.get('featured') === 'on',
    sort_order: Math.round(order),
    category_id: categoryIdRaw ? Number(categoryIdRaw) : null,
    variants,
  };
}

async function getUniqueHandle(base: string): Promise<string> {
  let candidate = base;
  let n = 2;
  const existing = new Set((await listProducts()).map((p) => p.handle));
  while (existing.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const action = String(formData.get('_action') ?? '');
  const data = parseCatalogForm(formData);

  if ('error' in data) {
    return new Response(null, {
      status: 303,
      headers: { Location: '/admin/producto/nuevo?error=1' },
    });
  }

  try {
    if (action === 'delete') {
      const id = String(formData.get('id') ?? '');
      if (!id) return new Response(null, { status: 303, headers: { Location: '/admin' } });
      await deleteProduct(id);
      return new Response(null, { status: 303, headers: { Location: '/admin' } });
    }
    if (action === 'update') {
      const id = String(formData.get('id') ?? '');
      const current = await getProduct(id);
      if (!current) return new Response(null, { status: 303, headers: { Location: '/admin' } });
      const existing = new Set((await listProducts()).map((p) => p.handle).filter((h) => h !== current.handle));
      if (existing.has(data.handle)) data.handle = `${data.handle}-2`;
      await updateProduct(current.id, data, data.variants);
      return new Response(null, { status: 303, headers: { Location: '/admin' } });
    }
    data.handle = await getUniqueHandle(data.handle);
    await createProduct(data, data.variants);
    return new Response(null, { status: 303, headers: { Location: '/admin' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'No se pudo guardar el producto.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
