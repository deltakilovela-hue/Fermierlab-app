import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5'
const MAX_TOKENS = 1536

/** Resuelve la API key para el middleware de desarrollo (no afecta producción). */
function readApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  if (process.env.VITE_ANTHROPIC_API_KEY) return process.env.VITE_ANTHROPIC_API_KEY
  try {
    const txt = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    const m = txt.match(/^\s*(?:VITE_)?ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/m)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  } catch { /* sin .env.local — ok en producción */ }
  return ''
}

/**
 * Middleware solo-para-desarrollo que replica la función serverless `/api/chat`.
 * Así el FermierBot funciona igual con `npm run dev` que en producción (Vercel),
 * y la API key nunca llega al navegador.
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

export default defineConfig(() => {
  const apiKey = readApiKey()

  return {
    plugins: [react(), tailwindcss(), devChatApi(apiKey)],
    server: {
      port: 5173,
      strictPort: false,
    },
  }
})
