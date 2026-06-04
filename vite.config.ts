import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.VITE_ANTHROPIC_API_KEY ?? env.ANTHROPIC_API_KEY ?? ''

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Inyectar API key server-side
              proxyReq.setHeader('x-api-key', apiKey);
              proxyReq.setHeader('anthropic-version', '2023-06-01');
              // Eliminar headers que delatan que es una petición del browser
              // sin estos, Anthropic no aplica la restricción CORS
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
      },
    },
  }
})
