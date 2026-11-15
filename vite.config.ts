import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// Relative paths so the build works from any folder on the host (and inside an app wrapper later).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Jezero: Sol 30',
        short_name: 'Jezero 30',
        description: 'Command the first Mars colony for 30 sols. A 3D game built on real NASA data.',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#0d0806',
        theme_color: '#1a0f0a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // the whole game (code, real terrain, NASA model and sounds) is cached for offline play
        globPatterns: ['**/*.{js,css,html,svg,png,bin,json,glb,mp3,webp}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // the presentation and demo deck are separate pages, not part of the offline game
        navigateFallbackDenylist: [/\/api\//, /\/presentation\//, /\/demo\//],
        globIgnores: ['presentation/**', 'demo/**'],
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
