import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

const manifest: Record<string, unknown> = {
  id: '/',
  name: 'Tibetan-English Dictionary',
  short_name: 'TibetanDictionary',
  start_url: './',
  display: 'standalone',
  orientation: 'portrait-primary',
  theme_color: '#ffffff',
  background_color: '#ffffff',
  scope: '/',
  icons: [
    { src: 'dicticons/icon-flat-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: 'dicticons/icon-flat-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: 'dicticons/icon-48x48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
    { src: 'dicticons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
    { src: 'dicticons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
    { src: 'dicticons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
    { src: 'dicticons/icon-flat-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'dicticons/icon-flat-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ] as ManifestIcon[],
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false, // Disable PWA in dev mode to prevent service worker caching issues
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,json}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /dict\.php/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
      manifest,
    }),
  ],
  server: {
    middlewareMode: false,
    proxy: {
      '^/backend': {
        target: process.env.BACKEND_URL || 'http://backend-dev:80',
        changeOrigin: true,
      },
    },   
    fs: {
      allow: ['..'], // Allow serving from parent directories (for symlinks)
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '~assets': '/src/assets',
    },
  },
  build: {
    // The app includes large config files (dictlist, abbreviations) that
    // inflate the main chunk. This is expected and acceptable.
    chunkSizeWarningLimit: 700,
    sourcemap: true,
    // minify: false, // Disable minification to preserve variable names for easier debugging
  },
});
