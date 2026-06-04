/**
 * api/chat.ts — Función serverless (Vercel Edge)
 * Proxy seguro entre el navegador y la API de Anthropic.
 *
 * El navegador NUNCA ve la API key: vive solo en el servidor (ANTHROPIC_API_KEY).
 * El cliente solo envía { system, messages }; el modelo y los límites se fijan aquí
 * para evitar que se abuse de nuestras credenciales con peticiones arbitrarias.
 */

export const config = { runtime: 'edge' };

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 1536;

export default async function handler(req: Request): Promise<Response> {
  // Solo POST
  if (req.method !== 'POST') {
    return json({ error: { message: 'Método no permitido' } }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: { message: 'Falta ANTHROPIC_API_KEY en el servidor' } }, 500);
  }

  let body: { system?: string; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: { message: 'Cuerpo de la petición inválido' } }, 400);
  }

  const { system, messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: { message: 'Faltan mensajes' } }, 400);
  }

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: system ?? '',
        messages,
      }),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return json({ error: { message: `Error al contactar la IA: ${String(e)}` } }, 502);
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
