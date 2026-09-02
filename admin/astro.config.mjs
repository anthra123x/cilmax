// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel({ imageService: true, maxDuration: 60 }),
  trailingSlash: 'never',
});