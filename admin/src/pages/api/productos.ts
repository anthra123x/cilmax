import type { APIRoute } from 'astro';
import { listProducts, createProduct, updateProduct, deleteProduct, getProduct, slugify } from '../../lib/catalog';

export const prerender = false;

function parseCatalogForm(formData: FormData) {
  const rawHandle = String(formData.get('handle') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const images = String(formData.get('images') ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const categoryIdRaw = formData.get('category_id');
  const variants: { id: string; title: string; sku: string | null; price: number; currency: string; inventory_quantity: number }[] = [];
  const vTitles = formData.getAll('vtitle[]');
  const vSkus = formData.getAll('vsku[]');
  const vPrices = formData.getAll('vprice[]');
  const vStocks = formData.getAll('vstock[]');
  for (let i = 0; i < vTitles.length; i++) {
    const vTitle = String(vTitles[i] ?? '').trim();
    const vSku = String(vSkus[i] ?? '').trim();
    const price = Number(String(vPrices[i] ?? '').trim());
    const stock = Number(String(vStocks[i] ?? '').trim());
    if (!vTitle || !Number.isFinite(price)) continue;
    variants.push({
      id: `variant_${slugify(vTitle)}_${Math.random().toString(36).slice(2, 8)}`,
      title: vTitle,
      sku: vSku || null,
      price,
      currency: 'cop',
      inventory_quantity: Number.isFinite(stock) ? stock : 0,
    });
  }
  return {
    title,
    handle: rawHandle || slugify(title),
    description: String(formData.get('description') ?? '').trim() || null,
    images,
    tags,
    featured: formData.get('featured') === 'on',
    sort_order: Number(formData.get('order')) || 100,
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

  try {
    if (action === 'delete') {
      const id = String(formData.get('id') ?? '');
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