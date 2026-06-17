import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { handleUsers } from './api/users'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5'
const MAX_TOKENS = 1536

/** Lee una variable de entorno del sistema o de .env.local (solo para dev). */
function readEnv(...names: string[]): string {
  for (const n of names) {
    if (process.env[n]) return process.env[n] as string
  }
  try {
    const txt = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const n of names) {
      const m = txt.match(new RegExp('^\\s*' + n + '\\s*=\\s*(.+?)\\s*$', 'm'))
      if (m) return m[1].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* sin .env.local — ok en producción */ }
  return ''
}

function readBody(req: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((res) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => { try { res(JSON.parse(raw || '{}')) } catch { res({}) } })
  })
}

/**
 * Middleware dev que replica `/api/chat` (FermierBot). La API key nunca llega
 * al navegador; en producción lo hace la función serverless de Vercel.
 */
function devChatApi(apiKey: string): Plugin {
  return {
    name: 'dev-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        if (!apiKey) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: { message: 'Falta ANTHROPIC_API_KEY en .env.local' } }))
          return
        }
        let raw = ''
        req.on('data', (chunk) => { raw += chunk })
        req.on('end', async () => {
          try {
            const { system, messages } = JSON.parse(raw || '{}')
            const upstream = await fetch(ANTHROPIC_URL, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: system ?? '', messages }),
            })
            const text = await upstream.text()
            res.statusCode = upstream.status
            res.setHeader('content-type', 'application/json')
            res.end(text)
          } catch (e) {
            res.statusCode = 502
            res.end(JSON.stringify({ error: { message: String(e) } }))
          }
        })
      })
    },
  }
}

/** Middleware dev que replica `/api/users` (panel de administración). */
function devUsersApi(secretKey: string): Plugin {
  return {
    name: 'dev-users-api',
    configureServer(server) {
      server.middlewares.use('/api/users', async (req, res) => {
        const token = (req.headers['authorization'] as string | undefined)?.replace(/^Bearer\s+/i, '') ?? null
        const body = await readBody(req)
        const { status, data } = await handleUsers({ method: req.method ?? 'GET', token, body, secretKey })
        res.statusCode = status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(data))
      })
    },
  }
}

export default defineConfig(() => {
  const apiKey = readEnv('ANTHROPIC_API_KEY', 'VITE_ANTHROPIC_API_KEY')
  const secretKey = readEnv('CLERK_SECRET_KEY')

  return {
    plugins: [
      react(),
      tailwindcss(),
      devChatApi(apiKey),
      devUsersApi(secretKey),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons.svg'],
        manifest: {
          name: 'Fermier — Laboratorio Agrícola',
          short_name: 'Fermier',
          description: 'Captura y análisis de muestreos agrícolas en invernaderos',
          theme_color: '#1769a5',
          background_color: '#f1f5f1',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: '/icons/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: { cacheName: 'supabase-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } },
            },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      strictPort: false,
    },
  }
})
