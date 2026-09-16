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

## Cómo activar el modo ERP

```bash
# .env de la tienda (o variables en Vercel)
CATALOG_SOURCE=erp
ERP_API_URL=https://<erp-desplegado>   # sin barra final
```

En local: `CATALOG_SOURCE=erp ERP_API_URL=http://127.0.0.1:3000 npm run dev`
con el ERP corriendo (`npm run dev`). El ERP usa la misma BD Neon (schema
`erp`), así que requiere redeploy o dev local con el `.env` actualizado
(`DATABASE_URL`/`DIRECT_URL` → pooler de Neon + `schema=erp`, ver
`cilmaxinventario/PROGRESO.md`).

## Pendiente

- **Fase 3b (ERP)**: ✅ completada y commiteada en el ERP (`53eecce`) — el ERP
  ya tiene la UI "Tienda online" (productos web, pedidos→venta POS, mensajes,
  reseñas, ajustes de tema/WhatsApp). Falta **desplegarla** (commits sin
  pushear de `gestion-inventario`).
- **Proxy de pedidos**: con el ERP activo, `POST /api/orders` del shop deberá
  re-apuntarse al `POST /api/web/orders` del ERP. Hoy el frontend NO usa
  `/api/orders` (el checkout es WhatsApp puro); el pedido fire-and-forget al
  ERP (decisión v1) tampoco está implementado. Pendiente.
- **Fase 4 — Deprecación**:
  - [x] Admin de tienda v1 migrado al ERP (Fase 3 + 3b).
  - [ ] Pushear la tienda (6 commits sin subir) para que Vercel redepliegue
        `cilmax.vercel.app` con el cliente ERP + fallback (hoy sirve una build
        vieja).
  - [ ] Setear `CATALOG_SOURCE=erp` / `ERP_API_URL` en las env vars de Vercel
        de la tienda (una vez el ERP esté desplegado y con su BD `erp`).
  - [ ] Retirar el admin Astro (`admin/`) y desenlazarlo del menú/sitemap.
  - [ ] Archivar Neon (`public`) y limpiar fallback/mocks cuando el ERP esté
        estable en producción.