import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/** The admin panel lives at /Adminpannel. Opening the bare host sends you there. */
const BASE = '/Adminpannel/'

function rootRedirect(): Plugin {
  const redirect = (req: { url?: string }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: () => void }, next: () => void) => {
    const url = req.url ?? '/'
    const path = url.split('?')[0]
    // "/", and "/Adminpannel" without the slash (any casing), go to the panel.
    if (path === '/' || path === '/index.html' || path.toLowerCase() === BASE.slice(0, -1).toLowerCase()) {
      res.statusCode = 302
      res.setHeader('Location', BASE + url.slice(path.length))
      return res.end()
    }
    // Deep links typed in another casing, e.g. /adminpannel/stock.
    if (path.toLowerCase().startsWith(BASE.toLowerCase()) && !path.startsWith(BASE)) {
      res.statusCode = 302
      res.setHeader('Location', BASE + url.slice(BASE.length))
      return res.end()
    }
    next()
  }
  return {
    name: 'admin-root-redirect',
    configureServer: (server) => void server.middlewares.use(redirect),
    configurePreviewServer: (server) => void server.middlewares.use(redirect),
  }
}

/**
 * Prop Owner admin panel: a desktop web app (not the phone prototype).
 * It shares the owner data, store and helpers in src/, with its own shell in admin/.
 *   npm run admin        → http://localhost:5175/Adminpannel
 */
export default defineConfig({
  root: fileURLToPath(new URL('./admin', import.meta.url)),
  base: BASE,
  publicDir: false,
  plugins: [react(), tailwindcss(), rootRedirect()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('./admin/src', import.meta.url)),
    },
  },
  server: { port: 5175, strictPort: true, host: true },
  preview: { port: 5175, strictPort: true, host: true },
  build: { outDir: fileURLToPath(new URL('./dist-admin', import.meta.url)), emptyOutDir: true, chunkSizeWarningLimit: 1600 },
})
