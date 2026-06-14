/**
 * api/users.ts — Función serverless (Vercel · runtime Node.js)
 * Panel de administración de usuarios. AUTOCONTENIDA (sin imports relativos),
 * porque Vercel no despliega los archivos en carpetas con guion bajo (_lib).
 *
 * Exporta `handleUsers` para que el middleware de desarrollo (vite.config.ts)
 * reutilice exactamente la misma lógica.
 *
 * Seguridad: toda operación exige un token de sesión de Clerk de un usuario
 * con rol "admin". El token se verifica server-side con @clerk/backend.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';

const CLERK_API = 'https://api.clerk.com/v1';

export interface CoreInput {
  method: string;
  token: string | null;
  body: Record<string, unknown>;
  secretKey: string;
}
export interface CoreResult { status: number; data: unknown; }

interface ClerkUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: { email_address: string }[];
  public_metadata: Record<string, unknown>;
}

function bapiHeaders(secret: string) {
  return { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
}

async function getUser(id: string, secret: string): Promise<ClerkUser | null> {
  const r = await fetch(`${CLERK_API}/users/${id}`, { headers: bapiHeaders(secret) });
  if (!r.ok) return null;
  return r.json() as Promise<ClerkUser>;
}

async function verificarAdmin(token: string | null, secret: string): Promise<string | null> {
  if (!token) return null;
  try {
    const claims = await verifyToken(token, { secretKey: secret });
    const callerId = claims.sub;
    if (!callerId) return null;
    const caller = await getUser(callerId, secret);
    if (!caller) return null;
    return caller.public_metadata?.rol === 'admin' ? callerId : null;
  } catch {
    return null;
  }
}

function shape(u: ClerkUser) {
  return {
    id: u.id,
    nombre: [u.first_name, u.last_name].filter(Boolean).join(' ') || '(sin nombre)',
    correo: u.email_addresses?.[0]?.email_address ?? '',
    rol: (u.public_metadata?.rol as string) ?? 'cliente',
    clienteId: (u.public_metadata?.clienteId as string) ?? '',
  };
}

export async function handleUsers({ method, token, body, secretKey }: CoreInput): Promise<CoreResult> {
  if (!secretKey) return { status: 500, data: { error: { message: 'Falta CLERK_SECRET_KEY en el servidor' } } };

  const adminId = await verificarAdmin(token, secretKey);
  if (!adminId) return { status: 403, data: { error: { message: 'No autorizado (se requiere rol admin)' } } };

  const H = bapiHeaders(secretKey);

  // ── LISTAR ──
  if (method === 'GET') {
    const r = await fetch(`${CLERK_API}/users?limit=100&order_by=-created_at`, { headers: H });
    if (!r.ok) return { status: r.status, data: { error: { message: 'Error al listar usuarios' } } };
    const users = (await r.json()) as ClerkUser[];
    return { status: 200, data: users.map(shape) };
  }

  // ── CREAR ──
  if (method === 'POST') {
    const { correo, password, rol, clienteId, nombre } = body as {
      correo?: string; password?: string; rol?: string; clienteId?: string; nombre?: string;
    };
    if (!correo || !password || !rol) {
      return { status: 400, data: { error: { message: 'Faltan datos (correo, contraseña y rol)' } } };
    }
    const publicMetadata: Record<string, unknown> = { rol };
    if (rol === 'cliente' && clienteId) publicMetadata.clienteId = clienteId;

    const r = await fetch(`${CLERK_API}/users`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        email_address: [correo],
        password,
        first_name: nombre || undefined,
        public_metadata: publicMetadata,
        skip_password_checks: true,
      }),
    });
    const data = (await r.json()) as ClerkUser & { errors?: { message: string }[] };
    if (!r.ok) return { status: r.status, data: { error: { message: data.errors?.[0]?.message ?? 'Error al crear usuario' } } };
    return { status: 201, data: shape(data) };
  }

  // ── ACTUALIZAR (rol / cliente) ──
  if (method === 'PATCH') {
    const { userId, rol, clienteId } = body as { userId?: string; rol?: string; clienteId?: string };
    if (!userId || !rol) return { status: 400, data: { error: { message: 'Faltan userId o rol' } } };

    const publicMetadata: Record<string, unknown> = { rol };
    if (rol === 'cliente' && clienteId) publicMetadata.clienteId = clienteId;

    const r = await fetch(`${CLERK_API}/users/${userId}`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({ public_metadata: publicMetadata }),
    });
    const data = (await r.json()) as ClerkUser & { errors?: { message: string }[] };
    if (!r.ok) return { status: r.status, data: { error: { message: data.errors?.[0]?.message ?? 'Error al actualizar' } } };
    return { status: 200, data: shape(data) };
  }

  // ── BORRAR ──
  if (method === 'DELETE') {
    const { userId } = body as { userId?: string };
    if (!userId) return { status: 400, data: { error: { message: 'Falta userId' } } };
    if (userId === adminId) return { status: 400, data: { error: { message: 'No puedes borrar tu propia cuenta' } } };

    const r = await fetch(`${CLERK_API}/users/${userId}`, { method: 'DELETE', headers: H });
    if (!r.ok) return { status: r.status, data: { error: { message: 'Error al borrar usuario' } } };
    return { status: 200, data: { ok: true } };
  }

  return { status: 405, data: { error: { message: 'Método no permitido' } } };
}

// ── Handler de Vercel ───────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY ?? '';
    const auth = req.headers.authorization;
    const token = typeof auth === 'string' ? auth.replace(/^Bearer\s+/i, '') : null;

    let body: Record<string, unknown> = {};
    if (req.body && typeof req.body === 'object') body = req.body as Record<string, unknown>;
    else if (typeof req.body === 'string') { try { body = JSON.parse(req.body || '{}'); } catch { body = {}; } }

    const { status, data } = await handleUsers({ method: req.method ?? 'GET', token, body, secretKey });
    res.status(status).json(data);
  } catch (e) {
    const err = e as Error;
    res.status(500).json({ error: { message: `Fallo en /api/users: ${err?.message ?? String(e)}` } });
  }
}
