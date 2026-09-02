// Paleta de marca derivada desde los colores base (primary y gold). En
// global.css los tokens de :root sirven de fallback; aquí se calculan las
// variantes (hover/soft/acentos) y se inyectan como style inline en <html>
// desde Layout.astro para que ganen a :root. Los colores base pueden venir de
// la base de datos (panel admin) o del archivo src/data/site.json.

import siteData from '../data/site.json';

const FALLBACK_PRIMARY = '#008a93';
const FALLBACK_GOLD = '#d4af37';

function normalizeHex(value: string | undefined, fallback: string): string {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value ?? '') ? (value as string) : fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

/** Mezcla `color` con `mix` en proporción `amount` (0-1) del color mezcla. */
function mix(color: string, mixWith: string, amount: number): string {
  const a = hexToRgb(color);
  const b = hexToRgb(mixWith);
  return toHex(a.map((v, i) => v * (1 - amount) + b[i] * amount) as [number, number, number]);
}

/** Construye el mapa de variables CSS a partir de los colores base. */
export function buildPalette(
  primaryColor: string | undefined,
  goldColor: string | undefined
): Record<string, string> {
  const primary = normalizeHex(primaryColor, FALLBACK_PRIMARY);
  const gold = normalizeHex(goldColor, FALLBACK_GOLD);

  return {
    '--color-primary': primary,
    '--color-primary-hover': mix(primary, '#000000', 0.12),
    '--color-primary-soft': mix(primary, '#ffffff', 0.9),
    '--color-accent': primary,
    '--color-accent-hover': mix(primary, '#000000', 0.12),
    '--color-accent-soft': mix(primary, '#ffffff', 0.9),
    '--color-whatsapp': primary,
    '--color-whatsapp-soft': mix(primary, '#ffffff', 0.9),
    '--color-gold': gold,
    '--color-gold-hover': mix(gold, '#ffffff', 0.16),
    '--color-gold-soft': mix(gold, '#ffffff', 0.88),
    '--color-gold-bright': mix(gold, '#ffffff', 0.28),
  };
}

/** Atributo `style` para el <html> del Layout: vars inline que ganan a :root.
 *  Usa los colores de src/data/site.json como fallback. */
export const paletteStyle = Object.entries(
  buildPalette(siteData?.primaryColor, siteData?.goldColor)
)
  .map(([k, v]) => `${k}:${v};`)
  .join('');