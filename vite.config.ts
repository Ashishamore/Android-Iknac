import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/**
 * Exposes the server's LAN URLs at `/__network` so the desktop preview can
 * render a "scan to open on your phone" QR code while running locally.
 */
function networkUrls(): Plugin {
  return {
    name: 'network-urls',
    configureServer(server) {
      server.middlewares.use('/__network', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(server.resolvedUrls?.network ?? []))
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/__network', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(server.resolvedUrls?.network ?? []))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), networkUrls()],
  resolve: {
    // '~' is the admin panel (admin/src). It is served from this same origin at
    // /Adminpannel, so what it changes reaches an open phone app live.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('./admin/src', import.meta.url)),
    },
  },
  // Listen on the LAN so phones/tablets on the same Wi-Fi can open the app.
  server: { host: true },
  preview: { host: true },
  // Single bundle is fine for a prototype (icons ship every weight).
  build: { chunkSizeWarningLimit: 1200 },
})
