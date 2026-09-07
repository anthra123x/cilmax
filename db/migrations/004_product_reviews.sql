-- Resenas/calificaciones de productos. Los clientes las publican desde la
-- pagina de producto (tienda, src/pages/producto/[handle].astro con el island
-- ProductReviews.tsx y POST a src/pages/api/reviews.ts). El panel de
-- administracion las lista y elimina en admin/src/pages/admin/resenas.astro.

create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id text not null default 'cilmax',
  product_id text not null references products(id) on delete cascade,
  nombre text not null,
  correo text,
  calificacion smallint not null check (calificacion between 1 and 5),
  comentario text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_reviews_store_product_idx on product_reviews (store_id, product_id);