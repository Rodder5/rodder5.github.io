import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rodwoods.dev',
  integrations: [sitemap()],
});
