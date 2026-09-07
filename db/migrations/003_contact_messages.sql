-- Mensajes del formulario de contacto (ver "tienda" src/pages/contacto.astro y
-- src/pages/api/contacto.ts). El panel de administracion los lista en
-- admin/src/pages/admin/mensajes.astro.

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  store_id text not null default 'cilmax',
  nombre text not null,
  correo text not null,
  asunto text not null default 'Consulta desde la web',
  mensaje text not null,
  leido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_messages_store_idx on contact_messages (store_id);