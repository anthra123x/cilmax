// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Astro 7: `static` (default) prerenderiza todo. Con el adapter de Vercel,
  // las rutas con `export const revalidate` obtienen ISR: el catálogo y las
  // vistas de producto se regeneran en segundo plano sin bajar el HTML.
  adapter: vercel({
    imageService: true,
    maxDuration: 60,
  }),
  integrations: [react()],
  // Nombre del sitio (usado para sitemap y rutas canónicas).
  site: 'https://cilmax-tienda.vercel.app',
  trailingSlash: 'never',
});
