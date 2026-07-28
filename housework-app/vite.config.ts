import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a new service worker installs but waits until the user
      // confirms (via PwaUpdatePrompt) before taking over, instead of
      // silently swapping the running app out from under them.
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '家事分担アプリ',
        short_name: '家事分担',
        description: '2人の家事分担を記録して見える化するアプリ',
        theme_color: '#c2683f',
        background_color: '#fdf8ef',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Firestore handles its own offline cache/sync; only precache the app shell.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Tip illustrations are deliberately NOT precached. globPatterns above
        // sweeps up every png in dist, so without this every illustration
        // would download on service-worker install AND on every update —
        // exactly the "startup gets heavy" problem this feature must avoid.
        // They're fetched on demand instead and cached from then on (below),
        // so only the tips actually opened cost anything, and they still work
        // offline afterwards.
        globIgnores: ['tips/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/tips/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'housework-tip-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
