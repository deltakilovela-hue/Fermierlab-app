/**
 * api/users.ts — Función serverless (Vercel · runtime Node.js)
 * Panel de administración de usuarios.
 *
 * La lógica se carga con import dinámico dentro de un try/catch para que
 * cualquier fallo de carga (p. ej. empaquetado de @clerk/backend) se reporte
 * como JSON legible en vez de un FUNCTION_INVOCATION_FAILED opaco.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { handleUsers } = await import('./_lib/usersCore');

    const secretKey = process.env.CLERK_SECRET_KEY ?? '';
    const auth = req.headers.authorization;
    const token = typeof auth === 'string' ? auth.replace(/^Bearer\s+/i, '') : null;

    let body: Record<string, unknown> = {};
    if (req.body && typeof req.body === 'object') {
      body = req.body as Record<string, unknown>;
    } else if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body || '{}'); } catch { body = {}; }
    }

    const { status, data } = await handleUsers({
      method: req.method ?? 'GET',
      token,
      body,
      secretKey,
    });

    res.status(status).json(data);
  } catch (e) {
    const err = e as Error;
    res.status(500).json({
      error: { message: `Fallo en /api/users: ${err?.message ?? String(e)}` },
    });
  }
}
