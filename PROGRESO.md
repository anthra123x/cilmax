# PROGRESO — CilMax tienda ⇄ ERP (gestion-inventario)

> Hilo vivo de la integración de la tienda con el ERP. Documenta el estado para
> retomar el trabajo sin perder contexto. El hermano completo está en
> `cilmaxinventario/PROGRESO.md` (mismo documento, cada repo guarda los commits
> que le tocan).

## Objetivo

Sustituir el panel admin (Astro + Keystatic + Neon) gestionando la tienda desde
el ERP. La tienda consume la API pública `/api/web/*` del ERP (fuente de
verdad) con **caché TTL + fallback** a Neon/mocks: nunca se rompe si el ERP
falla.

## Estado (fechado)

### Fase 2 — Cliente ERP con fallback ✅

Commit `761cbd7` (main de la tienda):

- `src/lib/store-client.ts`: cliente del ERP con timeout ~3s, caché TTL 60s y
  enrutado por `CATALOG_SOURCE`/`ERP_API_URL` (inactivo por defecto).
- `medusa.ts`: las consultas (catálogo, categorías, tema, reseñas,
  relacionados, búsqueda) intentan primero el ERP y caen a Neon/mocks si falla.
- `reviews.ts` y `contacto.ts`: en modo `erp` escriben al ERP (fuente de
  verdad) y propagan errores de validación; en modo `neon` siguen en Postgres.
- **Refactor de categorías**: el filtro del catálogo usa `?categoria=<slug>`
  (antes era el id numérico de Neon). `ProductData.categoryId` →
  `categorySlug`.
- `.env.example`: documenta `ERP_API_URL` y `CATALOG_SOURCE`.

Verificado: 27 tests verdes, cobertura ≥80 % (`search.ts`/`reviews.ts`),
`astro check` 0 errores, rutas `/catalogo` y `/api/search` en 200.

### Fase 3 — BD consolidada en Neon (schema `erp`) ✅

**Decisión del usuario (reemplaza el "no migrar")**: conectar el ERP a la **BD
Neon de la tienda** usando el **schema `erp`** de la misma instancia `neondb`
(el storefront sigue en `public`). Supabase Auth queda únicamente como login.
Datos reales del ERP anterior: "no / casi nada" → arranque limpio, sin migrar.

- Commits del ERP: `849aa91`, `76d2f88` (importador), `f7a4859`.
- `npm run db:push` ✅ y `npm run web:import --apply` ✅ contra Neon (schema
  `erp`): 3 categorías, 10 productos con precios/stock/visibilidad reales,
  2 mensajes, tema `#008a93/#d4af37`.
- Verificación runtime (ERP dev local + storefront en modo ERP):
  `/api/web/*` responde sobre `erp` (products, categories, products/[handle],
  search, settings, reviews), `POST /api/web/contact` inserta en `erp`, y el
  storefront con `CATALOG_SOURCE=erp ERP_API_URL=http://127.0.0.1:3000`
  sirve `/catalogo` y el home con los productos/ajustes del ERP.

## Estado

### Fase 3 — BD consolidada en Neon (schema `erp`) ✅

- ERP desplegado en `gestion-inventario-iobfhfb8q.vercel.app` con env vars
  seteadas; `/api/web/categories|products|search|settings` = 200.
- Tienda desplegada en `www.cilmax.store` con `CATALOG_SOURCE=erp` y
  `ERP_API_URL` configurados en Vercel; `/catalogo` y `/api/search` devuelven
  los 10 productos del ERP.
- Build ambos proyectos verificado en Vercel.
- **Proxy de pedidos**: con el ERP activo, `POST /api/orders` del shop deberá
  re-apuntarse al `POST /api/web/orders` del ERP. Hoy el frontend NO usa
  `/api/orders` (el checkout es WhatsApp puro); el pedido fire-and-forget al
  ERP (decisión v1) tampoco está implementado. Pendiente.
- **Fase 4 — Deprecación**:
  - [x] Admin de tienda v1 migrado al ERP (Fase 3 + 3b).
  - [x] Pushear la tienda (6 commits) para que Vercel redepliegue
        `www.cilmax.store` con el cliente ERP.
  - [x] Setear `CATALOG_SOURCE=erp` / `ERP_API_URL` en las env vars
        de Vercel de la tienda (hecho).
  - [x] Retirar el admin Astro (`admin/`) y desenlazarlo del menú/sitemap
        (`git rm -r admin/`, commit `c8c2f85`).
  - [ ] Archivar Neon (`public`) y limpiar fallback/mocks cuando el ERP esté
        confirmado estable en producción (`src/lib/medusa.ts` ya es ERP-only;
        quedan `lib/db.ts` y `mock-data.ts` legacy, uso interno).
  - [x] Proxy de pedidos: `POST /api/orders` reescrito para reenviar al ERP
        `POST /api/web/orders` (mapea `name→customerName`, etc.). Verificado en
        producción: `www.cilmax.store/api/orders` crea la orden en el ERP con
        precio/total recalculados (commit `c8c2f85`).
  - [x] Desplegado en Vercel (`cilmax-cpuwwija2`, Ready) y probado end-to-end
        junto con la conversión pedido→venta del panel del ERP.
  - [ ] Considerar apuntar `ERP_API_URL` al alias estable del ERP
        (`gestion-inventario-liart.vercel.app`) en vez del deploy pinneado actual.