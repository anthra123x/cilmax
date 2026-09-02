// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // `server`: cada petición se renderiza en Vercel y el catálogo se lee de la
  // base de datos (Neon) en tiempo real, por lo que los cambios hechos desde
  // el panel de administración se reflejan de forma inmediata. El backend de
  // pedidos (/api/orders) vive en esta misma app como función serverless.
  output: 'server',
  adapter: vercel({
    imageService: true,
    maxDuration: 60,
  }),
  integrations: [react()],
  // Nombre del sitio (usado para sitemap y rutas canónicas).
  site: 'https://cilmax-tienda.vercel.app',
  trailingSlash: 'never',
});