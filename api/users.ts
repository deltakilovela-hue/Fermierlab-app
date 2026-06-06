/**
 * api/users.ts — Función serverless (Vercel Edge)
 * Panel de administración de usuarios. Toda la lógica vive en _lib/usersCore.ts.
 */

import { handleUsers } from './_lib/usersCore';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const secretKey = process.env.CLERK_SECRET_KEY ?? '';
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;

  let body: Record<string, unknown> = {};
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    body = await req.json().catch(() => ({}));
  } else if (req.method === 'DELETE') {
    body = await req.json().catch(() => ({}));
  }

  const { status, data } = await handleUsers({ method: req.method, token, body, secretKey });
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
