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

## Cómo activar el modo ERP

```bash
# .env de la tienda (o variables en Vercel)
CATALOG_SOURCE=erp
ERP_API_URL=https://<erp-desplegado>   # sin barra final
```

El ERP debe estar desplegado con el schema aplicado (`npm run db:push`) y los
datos importados (`npm run web:import --apply` — ver `cilmaxinventario/PROGRESO.md`).

## Pendiente

- **Fase 3b (ERP)**: UI "Tienda online" (productos web, pedidos, mensajes,
  reseñas, ajustes de tema/WhatsApp).
- **Proxy de pedidos**: con el ERP activo, `POST /api/orders` del shop deberá
  re-apuntarse al `POST /api/web/orders` del ERP (hoy no lo usa el frontend;
  el checkout sigue siendo WhatsApp).
- **Fase 4**: deprecar admin Astro, archivar Neon, evaluar consolidación.