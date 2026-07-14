import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rodder5.github.io',
  integrations: [sitemap()],
});
