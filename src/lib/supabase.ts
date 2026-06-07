import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local');
}

// Clerk expone window.Clerk una vez montado el ClerkProvider.
declare global {
  interface Window {
    Clerk?: { session?: { getToken: () => Promise<string | null> } };
  }
}

/**
 * Cliente de Supabase con autenticación de Clerk.
 * En cada petición adjunta el token de sesión de Clerk (que incluye los claims
 * `rol` y `clienteId`). Supabase lo verifica vía "Third-Party Auth" y las
 * políticas RLS filtran los datos por rol y por cliente.
 */
export const supabase = createClient(url, key, {
  accessToken: async () => {
    try {
      return (await window.Clerk?.session?.getToken()) ?? null;
    } catch {
      return null;
    }
  },
});
