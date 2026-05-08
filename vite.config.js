import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: 'Polyglot',
        short_name: 'Polyglot',
        description: 'Lerne 5 Sprachen parallel — FSRS · Schrift · KI-Tutor',
        theme_color: '#0F0E0D',
        background_color: '#0F0E0D',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // cache the app shell + static assets
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // never cache API calls (always go to network)
        navigateFallbackDenylist: [/^\/api/]
      }
    })
  ],
  server: { port: 5173 }
});
