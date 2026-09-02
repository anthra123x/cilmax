#!/usr/bin/env node
// CLI de administración de productos de CilMax.
//
// Gestiona la fuente de datos local en src/data/products/*.json y
// src/data/categories/*.json (archivos versionables con git). Es un
// complemento al panel de administración Keystatic (/keystatic); ambos
// escriben en los mismos archivos.
//
// Uso:
//   node scripts/products.mjs <comando> [argumentos...]
//
// Comandos:
//   list                       Lista productos (id, título, precio, destacado)
//   info <handle|id>           Muestra el detalle completo de un producto
//   new                        Crea un producto (pide datos interactivos)
//   edit <handle|id>           Edita campos de un producto existente
//   rm <handle|id>             Elimina un producto
//   featured <handle|id> [on|off]  Marca/desmarca un producto como destacado
//   add-variant <handle|id>    Añade una variante a un producto
//   collections                Lista categorías y etiquetas en uso
//   help                       Muestra esta ayuda
//
// Notas:
//   - Estructura por archivo: cada producto vive en
//     src/data/products/<handle>.json y el nombre de archivo ES el handle.
//   - Las categorías viven en src/data/categories/<slug>.json y los
//     productos las referencian por slug en el campo `category`.
//   - Los precios se piden en pesos colombianos (COP, sin decimales,
//     p. ej. 549900 o 549.900) y se guardan como enteros.
//   - El handle se genera automáticamente a partir del título si no se indica.
//   - Si no pasas un valor con --flag, se te pedirá de forma interactiva.

import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DIR = join(__dirname, '..', 'src', 'data', 'products');
const CATEGORIES_DIR = join(__dirname, '..', 'src', 'data', 'categories');

const DEFAULT_CURRENCY = 'cop';
const DEFAULT_STOCK = 10;

// ---------------------------------------------------------------------------
// Utilidades de archivo
// ---------------------------------------------------------------------------

function readProducts() {
  if (!existsSync(PRODUCTS_DIR)) return [];
  return readdirSync(PRODUCTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = JSON.parse(readFileSync(join(PRODUCTS_DIR, f), 'utf8'));
      return { ...raw, handle: f.replace(/\.json$/, '') };
    });
}

function writeProduct(product) {
  const { handle, collection, ...rest } = product;
  const file = join(PRODUCTS_DIR, `${handle}.json`);
  writeFileSync(file, JSON.stringify(rest, null, 2) + '\n');
}

function removeProduct(handle) {
  rmSync(join(PRODUCTS_DIR, `${handle}.json`), { force: true });
}

function readCategories() {
  if (!existsSync(CATEGORIES_DIR)) return [];
  return readdirSync(CATEGORIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = JSON.parse(readFileSync(join(CATEGORIES_DIR, f), 'utf8'));
      return { ...raw, handle: f.replace(/\.json$/, '') };
    });
}

function writeCategory(category) {
  const { handle, ...rest } = category;
  writeFileSync(join(CATEGORIES_DIR, `${handle}.json`), JSON.stringify(rest, null, 2) + '\n');
}

/** Resuelve una categoría: acepta nombre o slug y devuelve su slug,
 *  creándola en src/data/categories si no existe. */
function ensureCategory(value) {
  const cats = readCategories();
  let match = cats.find((c) => c.handle === value || c.name === value);
  if (!match) {
    const slug = slugify(value);
    match = cats.find((c) => c.handle === slug);
    if (!match) {
      match = { name: value, description: '', handle: slug };
      writeCategory(match);
    }
  }
  return match.handle;
}

// ---------------------------------------------------------------------------
// Utilidades generales
// ---------------------------------------------------------------------------

const rl = createInterface({ input, output });

async function ask(question, fallback) {
  // Si no hay terminal interactiva, no se pueden pedir datos: devolver el
  // fallback o lanzar un error claro pidiendo la variable por flag.
  if (!process.stdin.isTTY) {
    if (fallback !== undefined && fallback !== null) return fallback;
    throw new Error(
      `No se pudo obtener "${question}". En ejecución no interactiva pasa el valor con "--flag" o usa: npm run product:new -- <flag> <valor>`
    );
  }
  const suffix = fallback !== undefined && fallback !== null ? ` [${fallback}] ` : ' ';
  const answer = (await rl.question(question + suffix)).trim();
  return answer === '' ? fallback : answer;
}

let counter = Date.now() % 100000;
function genId(prefix) {
  return `${prefix}_${(counter++).toString(36)}`;
}

/** Convierte un título/string en un handle URL-safe. */
function slugify(input) {
  return input
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Convierte un precio en pesos colombianos (COP, sin decimales) a entero.
 *  P. ej. "549900" o "549.900" -> 549900. */
function toAmount(value) {
  const cleaned = String(value).replace(/\./g, '').replace(/,/g, '');
  const num = Number(cleaned);
  if (Number.isNaN(num) || num < 0) throw new Error(`Precio inválido: ${value}`);
  return Math.round(num);
}

/** Importe entero COP -> string con separador de miles (549900 -> "549.900"). */
function formatAmountDisplay(amount) {
  return Number(amount).toLocaleString('es-CO');
}

function findProduct(products, ref) {
  return products.find((p) => p.handle === ref || p.id === ref);
}

function formatProductLine(p) {
  const price = p.variants?.[0]?.prices?.[0]?.amount;
  const priceStr = price !== undefined ? `$ ${formatAmountDisplay(price)}` : '—';
  return `• ${p.title}${p.featured ? ' ★' : ''}\n    handle: ${p.handle}  |  id: ${p.id}  |  desde ${priceStr} COP  |  ${p.variants?.length ?? 0} variante(s)`;
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------

async function cmdList() {
  const products = readProducts();
  if (products.length === 0) {
    console.log('No hay productos todavía. Crea uno con: npm run product:new');
    return;
  }
  console.log(`\n${products.length} producto(s):\n`);
  for (const p of products) console.log(formatProductLine(p));
}

async function cmdInfo(ref) {
  const products = readProducts();
  const p = findProduct(products, ref);
  if (!p) {
    console.error(`✗ Producto no encontrado: ${ref}`);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(p, null, 2));
}

async function cmdNew(args) {
  const products = readProducts();
  const title = args.title || (await ask('Título del producto'));
  if (!title) {
    console.error('✗ El título es obligatorio.');
    return;
  }
  const description = args.description ?? (await ask('Descripción', ''));
  const collection = args.collection ?? (await ask('Categoría', ''));
  const tagsInput = args.tags ?? (await ask('Etiquetas (separadas por coma)', ''));
  const tags = tagsInput
    ? String(tagsInput).split(',').map((t) => t.trim()).filter(Boolean)
    : [];
  const priceInput = args.price ?? (await ask('Precio (COP)', '0'));
  const stock = Number(args.stock ?? (await ask('Stock', DEFAULT_STOCK)));
  const variantTitle = args.variant ?? (await ask('Nombre de variante', 'Única'));
  const sku = (args.sku ?? (await ask('SKU', ''))) || null;
  let featured = false;
  if (args.featured !== undefined) {
    featured = /^(1|true|on|si|s|sí|yes|y)$/i.test(String(args.featured));
  } else {
    const featuredInput = await ask('¿Destacado? (si/no)', 'no');
    featured = /^(si|s|sí|yes|y|true|1)$/i.test(featuredInput);
  }

  const handle = slugify(title);
  if (findProduct(products, handle)) {
    console.error(`✗ Ya existe un producto con handle "${handle}".`);
    return;
  }

  const category = collection ? ensureCategory(collection) : null;

  const product = {
    id: genId('prod'),
    title,
    handle,
    description,
    images: [],
    category,
    tags,
    featured,
    order: products.length + 1,
    variants: [
      {
        id: genId('variant'),
        title: variantTitle,
        sku,
        prices: [{ amount: toAmount(priceInput), currency_code: DEFAULT_CURRENCY }],
        inventory_quantity: stock,
      },
    ],
  };

  writeProduct(product);
  console.log(`\n✓ Producto creado: ${product.title}`);
  console.log(`  Página: /producto/${product.handle}`);
}

async function cmdEdit(ref, args) {
  const products = readProducts();
  const p = findProduct(products, ref);
  if (!p) {
    console.error(`✗ Producto no encontrado: ${ref}`);
    process.exitCode = 1;
    return;
  }
  const oldHandle = p.handle;

  if (args.title) p.title = args.title;
  if (args.description !== undefined) p.description = args.description;
  if (args.collection !== undefined) {
    p.category = args.collection ? ensureCategory(args.collection) : null;
  }
  if (args.tags !== undefined) {
    p.tags = args.tags.split(',').map((t) => t.trim()).filter(Boolean);
  }
  if (args.price !== undefined && p.variants?.[0]) {
    p.variants[0].prices = [
      { amount: toAmount(args.price), currency_code: DEFAULT_CURRENCY },
    ];
  }
  if (args.stock !== undefined && p.variants?.[0]) {
    p.variants[0].inventory_quantity = Number(args.stock);
  }
  if (args.sku !== undefined && p.variants?.[0]) {
    p.variants[0].sku = args.sku || null;
  }
  if (args.featured !== undefined) {
    p.featured = /^(1|true|on|si|yes)$/i.test(args.featured);
  }
  if (args.order !== undefined) {
    p.order = Number(args.order);
  }

  // Re-generar handle si cambió el título (a menos que se indique uno fijo).
  if (args.title && !args.handle) {
    p.handle = slugify(p.title);
  }
  if (args.handle) p.handle = args.handle;

  if (oldHandle !== p.handle) removeProduct(oldHandle);
  writeProduct(p);
  console.log(`\n✓ Producto actualizado: ${p.title} (/${p.handle})`);
}

async function cmdRm(ref) {
  const products = readProducts();
  const idx = products.findIndex((p) => p.handle === ref || p.id === ref);
  if (idx === -1) {
    console.error(`✗ Producto no encontrado: ${ref}`);
    process.exitCode = 1;
    return;
  }
  const removed = products[idx];
  removeProduct(removed.handle);
  console.log(`\n✗ Producto eliminado: ${removed.title}`);
}

async function cmdFeatured(ref, state) {
  const products = readProducts();
  const p = findProduct(products, ref);
  if (!p) {
    console.error(`✗ Producto no encontrado: ${ref}`);
    process.exitCode = 1;
    return;
  }
  const value = state ? /^(1|true|on|si|yes)$/i.test(state) : !p.featured;
  p.featured = value;
  writeProduct(p);
  console.log(`\n✓ "${p.title}" ${value ? 'marcado ★' : 'desmarcado'} como destacado.`);
}

async function cmdAddVariant(ref, args) {
  const products = readProducts();
  const p = findProduct(products, ref);
  if (!p) {
    console.error(`✗ Producto no encontrado: ${ref}`);
    process.exitCode = 1;
    return;
  }
  const title = args.title || (await ask('Nombre de la variante'));
  const priceInput = args.price || (await ask('Precio (COP)'));
  const sku = args.sku || (await ask('SKU', '')) || null;
  const stock = Number(args.stock ?? (await ask('Stock', DEFAULT_STOCK)));

  p.variants = p.variants || [];
  p.variants.push({
    id: genId('variant'),
    title,
    sku,
    prices: [{ amount: toAmount(priceInput), currency_code: DEFAULT_CURRENCY }],
    inventory_quantity: stock,
  });
  writeProduct(p);
  console.log(`\n✓ Variante "${title}" añadida a "${p.title}".`);
}

function cmdCollections() {
  const categories = readCategories();
  const products = readProducts();
  const tags = new Set();
  for (const p of products) {
    for (const t of p.tags || []) tags.add(t);
  }
  console.log('\nCategorías:');
  categories.forEach((c) => console.log(`  - ${c.name} (${c.handle})`));
  console.log('\nEtiquetas:');
  tags.forEach((t) => console.log(`  - ${t}`));
  if (categories.length === 0 && tags.size === 0) console.log('  (ninguna)');
}

function cmdHelp() {
  console.log(`CLI de productos CilMax

Uso: node scripts/products.mjs <comando> [argumentos...]

Comandos:
  list
  info <handle|id>
  new
  edit <handle|id> --title "..." --price 549900 --stock 12 ...
  rm <handle|id>
  featured <handle|id> [on|off]
  add-variant <handle|id> --title "Color" --price 99 --sku AU-X --stock 5
  collections
  help

Flags comunes para new/edit/add-variant:
  --title, --description, --collection, --tags (coma), --price (COP),
  --stock, --sku, --variant, --featured (1|0), --handle, --order

Nota: los campos no pasados como flag se piden de forma interactiva.
Recomendación: el panel web (/keystatic) es la vía principal para
administrar la tienda; este CLI es un complemento.`);
}

// ---------------------------------------------------------------------------
// Parseo de argumentos
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._positional = args._positional || [];
      args._positional.push(a);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const [command, ...positional] = process.argv.slice(2);

  switch (command) {
    case 'list': {
      await cmdList();
      break;
    }
    case 'info': {
      const ref = positional[0];
      if (!ref) return console.error('Uso: products info <handle|id>');
      await cmdInfo(ref);
      break;
    }
    case 'new': {
      await cmdNew(parseArgs(positional));
      break;
    }
    case 'edit': {
      const ref = positional[0];
      if (!ref) return console.error('Uso: products edit <handle|id> [--flag valor]');
      await cmdEdit(ref, parseArgs(positional.slice(1)));
      break;
    }
    case 'rm': {
      const ref = positional[0];
      if (!ref) return console.error('Uso: products rm <handle|id>');
      await cmdRm(ref);
      break;
    }
    case 'featured': {
      const ref = positional[0];
      const state = positional[1];
      if (!ref) return console.error('Uso: products featured <handle|id> [on|off]');
      await cmdFeatured(ref, state);
      break;
    }
    case 'add-variant': {
      const ref = positional[0];
      if (!ref) return console.error('Uso: products add-variant <handle|id> [--flag valor]');
      await cmdAddVariant(ref, parseArgs(positional.slice(1)));
      break;
    }
    case 'collections': {
      cmdCollections();
      break;
    }
    case 'help':
    case undefined: {
      cmdHelp();
      break;
    }
    default: {
      console.error(`✗ Comando desconocido: ${command}`);
      cmdHelp();
      process.exitCode = 1;
    }
  }

  rl.close();
}

main();