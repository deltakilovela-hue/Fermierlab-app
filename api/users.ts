/**
 * api/users.ts — Función serverless (Vercel · runtime Node.js)
 * Panel de administración de usuarios. Toda la lógica vive en _lib/usersCore.ts.
 *
 * Usa el runtime Node.js (NO Edge) porque @clerk/backend depende de módulos
 * de Node (crypto, etc.) que el runtime Edge no soporta.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUsers } from './_lib/usersCore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secretKey = process.env.CLERK_SECRET_KEY ?? '';
  const auth = req.headers.authorization;
  const token = typeof auth === 'string' ? auth.replace(/^Bearer\s+/i, '') : null;

  // Vercel parsea automáticamente el body JSON en funciones Node.
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
}
