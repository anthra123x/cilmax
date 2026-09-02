-- 001_init.sql — esquema base del backend CilMax (Neon Postgres)
-- Tienda vitrina con pedidos por WhatsApp. Guarda un snapshot inmutable del
-- carrito (items jsonb) para que cambios futuros en productos no alteren
-- pedidos ya registrados. `store_id` prepara el multi-cliente.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  store_id text not null default 'cilmax',
  name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, phone)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  store_id text not null default 'cilmax',
  customer_id uuid not null references customers(id) on delete restrict,
  status text not null default 'nuevo',
  currency text not null default 'cop',
  subtotal_cop bigint not null default 0,
  items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_store_created_idx on orders (store_id, created_at desc);
create index if not exists orders_customer_idx on orders (customer_id);
create index if not exists customers_store_phone_idx on customers (store_id, phone);