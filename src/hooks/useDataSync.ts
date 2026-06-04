import { useEffect } from 'react';
import { useUser } from '@clerk/react';
import { useStore } from '../store/useStore';

/**
 * useDataSync
 * Carga todos los datos desde Supabase cuando el usuario se autentica.
 * Se llama una vez en ClerkBridge (App.tsx) — después de que Clerk confirma la sesión.
 */
export function useDataSync() {
  const { user, isLoaded } = useUser();
  const cargarDatos = useStore((s) => s.cargarDatos);

  useEffect(() => {
    if (isLoaded && user) {
      cargarDatos(user.id);
    }
  }, [isLoaded, user?.id]);
}
