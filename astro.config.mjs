// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// https://astro.build/config
export default defineConfig({
  // Astro 7: `static` (default) prerenderiza todo por defecto. Las rutas con
  // `export const prerender = false` en `/api/*` se convierten en funciones
  // serverless (backend Neon); el resto sigue siendo SSG + ISR con `revalidate`.
  adapter: vercel({
    imageService: true,
    maxDuration: 60,
  }),
  integrations: [react(), keystatic()],
  // Nombre del sitio (usado para sitemap y rutas canónicas).
  site: 'https://cilmax-tienda.vercel.app',
  trailingSlash: 'never',
});
