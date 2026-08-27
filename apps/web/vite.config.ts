import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      filename: 'service-worker.js',
      injectRegister: false,
      registerType: 'prompt',
      manifest: false,
      workbox: {
        cacheId: 'lop-sach-static',
        inlineWorkboxRuntime: true,
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,txt}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//u],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/[^/]+\/api\//u,
            handler: 'NetworkOnly',
            method: 'GET',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
  preview: {
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
