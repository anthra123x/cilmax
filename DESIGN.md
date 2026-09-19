# Design

> Sistema visual de la tienda CilMax. Los tokens viven en `src/styles/global.css`
> (fuente de verdad) e `src/lib/palette.ts` (deriva variantes de hover/soft desde
> los colores base del tema del ERP).

## Brand anchor

- Primario: turquesa de marca `#008A93` (hover `#0B6B75`, soft `#E3F4F5`).
- Acento: dorado `#D4AF37` (hover `#E5BA4D`, bright `#F3D35C`), usado en
  insignias e indicadores activos.

## Color

- `--color-bg: #fafafa`, `--color-surface: #ffffff`, `--color-surface-muted: #f4f6f8`.
- Texto: `--color-text: #111827`, muted `#6b7280`; borde `#e7e9ee`.
- Danger `#b91c1c`. Modo oscuro: no (decisión de marca, paleta fresca).

## Typography

- Familia: **Plus Jakarta Sans** variable (300–800), auto-hospedada
  (`/fonts/plus-jakarta-sans-latin-variable.woff2`).
- Escala: xs .75rem / sm .875 / base 1 / lg 1.125 / xl 1.375 / 2xl 1.75 /
  3xl 2.25 / 4xl 3.
- Títulos `text-wrap: balance`; precios con `font-variant-numeric: tabular-nums`.

## Radius & spacing

- Radii: sm 6 / md 10 / lg 14 / pill 999.
- Espaciado escalado: .25/.5/.75/1/1.5/2/3/4/6 (rem).
- Sombras derivadas del primario via `color-mix`.

## Motion

- Easings: `--ease-out-quart: cubic-bezier(0.25,1,0.5,1)`,
  `--ease-out-quint: cubic-bezier(0.22,1,0.36,1)`,
  `--ease-out-expo: cubic-bezier(0.16,1,0.3,1)`.
- Entradas: `rise-in` (opacity + translateY 16px, 0.6s ease-out-quart) solo en
  hero (una vez al cargar, escalonada ~80ms); reveal on scroll `[data-reveal]`
  con stagger capado a 450ms y default visible sin JS.
- Micro: hover/press en botones (scale 0.97–0.98), nudge de flecha en CTAs,
  zoom sutil de imagen en cards (1.06), underline en links de nav/footer.
- Accesibilidad: todo bajo `@media (prefers-reduced-motion: reduce)`.

## Layout

- Contenedor máx. 1200px; header sticky (72px, blur + saturate al hacer scroll).
- Grids de tarjetas: 3 col (home) / 4→3→2→1 (catálogo) / 4→3→2 (related).
- Mobile: BottomNav fijo (64px + safe-area), nav horizontal oculto ≤768px.

## Components

- **btn**: primary (teal), secondary (gold), ghost (borde dorado), whatsapp.
- **product-card**: superficie + borde, hover (lift −3px, sombra teal/gold),
  CTA WhatsApp con icono; imagen con zoom hover.
- **chips** (filtro catálogo): pill, hover borde/color primario, activo sólido.
- **header__links**: underline animado `scaleX` desde la izquierda.
- **bottom-nav**: 5 ítems, activo con indicador dorado superior + icono dorado.
- **cart-drawer**: overlay fade + drawer slide desde la derecha (200–250ms).