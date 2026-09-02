-- Catalogo gestionado por el panel de administracion (admin/).
-- La tienda lee productos/categorias/colores directamente de estas tablas,
-- por lo que los cambios del panel se ven reflejados de forma inmediata.

-- Categorias
create table if not exists categories (
  id serial primary key,
  store_id text not null default 'cilmax',
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

-- Productos
create table if not exists products (
  id text primary key,
  store_id text not null default 'cilmax',
  title text not null,
  handle text not null,
  description text,
  images jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  sort_order integer not null default 100,
  category_id integer references categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, handle)
);

-- Variantes / precios
create table if not exists product_variants (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  title text not null,
  sku text,
  price integer not null,
  currency text not null default 'cop',
  inventory_quantity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on product_variants (product_id);

-- Colores de marca (panel -> tienda)
create table if not exists store_settings (
  store_id text primary key default 'cilmax',
  primary_color text not null default '#008a93',
  gold_color text not null default '#d4af37',
  updated_at timestamptz not null default now()
);

-- Seed inicial (mismo catálogo que venía en src/data/*.json)
insert into categories (slug, name, description) values
  ('audio', 'Audio', 'Auriculares, parlantes y sonido.'),
  ('computacion', 'Computación', 'Teclados, ratones y periféricos.'),
  ('pantallas', 'Pantallas', 'Monitores y pantallas.'),
  ('hogar-y-oficina', 'Hogar y oficina', 'Sillas, lámparas y mobiliario.')
on conflict (store_id, slug) do nothing;

insert into products (id, title, handle, description, images, tags, featured, sort_order, category_id) values
  ('prod_headphones', 'Auriculares inalámbricos', 'auriculares-inalambricos',
   'Auriculares inalámbricos con cancelación de ruido, hasta 30 horas de batería y diseño ligero.',
   '[]'::jsonb, '["audio","inalambrico"]'::jsonb, true, 1, (select id from categories where slug = 'audio')),
  ('prod_keyboard', 'Teclado mecánico', 'teclado-mecanico',
   'Teclado mecánico con switches lineales, retroiluminación RGB y estructura de aluminio.',
   '[]'::jsonb, '["teclado","mecanico","gaming"]'::jsonb, true, 2, (select id from categories where slug = 'computacion')),
  ('prod_mouse', 'Ratón ergonómico', 'raton-ergonomico',
   'Ratón ergonómico con curva que se adapta a la mano y sensor de alta precisión.',
   '[]'::jsonb, '["raton","ergonomico"]'::jsonb, true, 3, (select id from categories where slug = 'computacion')),
  ('prod_monitor', 'Monitor 27"', 'monitor-27',
   'Monitor 27" IPS con resolución QHD, 144Hz y 98% de cobertura sRGB.',
   '[]'::jsonb, '["monitor","qhd","gaming"]'::jsonb, false, 4, (select id from categories where slug = 'pantallas')),
  ('prod_chair', 'Silla ergonómica', 'silla-ergonomica',
   'Silla ergonómica con soporte lumbar, reposabrazos 4D y tejido de malla transpirable.',
   '[]'::jsonb, '["silla","ergonomica","oficina"]'::jsonb, false, 5, (select id from categories where slug = 'hogar-y-oficina')),
  ('prod_lamp', 'Lámpara de escritorio', 'lampara-escritorio',
   'Lámpara de escritorio con temperatura regulable y flexo articulado.',
   '[]'::jsonb, '["lampara","hogar"]'::jsonb, false, 6, (select id from categories where slug = 'hogar-y-oficina'))
on conflict (store_id, handle) do nothing;

insert into product_variants (id, product_id, title, sku, price, inventory_quantity) values
  ('variant_headphones_black', 'prod_headphones', 'Negro', 'AU-001-BLK', 549900, 12),
  ('variant_headphones_white', 'prod_headphones', 'Blanco', 'AU-001-WHT', 549900, 8),
  ('variant_keyboard_gray', 'prod_keyboard', 'Gris', 'KB-004-GRY', 729900, 8),
  ('variant_keyboard_white', 'prod_keyboard', 'Blanco', 'KB-004-WHT', 789900, 5),
  ('variant_mouse_white', 'prod_mouse', 'Blanco', 'MO-002-WHT', 349900, 20),
  ('variant_monitor_std', 'prod_monitor', 'Estándar', 'MN-001-STD', 1499900, 5),
  ('variant_chair_black', 'prod_chair', 'Negra', 'SC-001-BLK', 1299900, 4),
  ('variant_lamp_white', 'prod_lamp', 'Blanca', 'LM-003-WHT', 289900, 15)
on conflict (id) do nothing;

insert into store_settings (store_id, primary_color, gold_color) values
  ('cilmax', '#008a93', '#d4af37')
on conflict (store_id) do nothing;