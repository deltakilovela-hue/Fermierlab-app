import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth, useUser, SignUp } from '@clerk/react';
import { useDataSync } from './hooks/useDataSync';
import { useStore } from './store/useStore';
import type { Rol } from './types';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reportes from './pages/Reportes';
import Captura from './pages/Captura';
import Mapa from './pages/Mapa';
import Comparativa from './pages/Comparativa';
import Ajustes from './pages/Ajustes';
import Portal from './pages/Portal';
import Fumigacion from './pages/Fumigacion';
import AgenteChat from './pages/AgenteChat';
import Perfil from './pages/Perfil';
import Usuarios from './pages/Usuarios';
import AgenteIA from './components/AgenteIA';

// ── Puente Clerk → Zustand ────────────────────────────────────────────────────
// Sincroniza el usuario autenticado de Clerk con el sistema de roles de la app.
// El rol se guarda en Clerk publicMetadata.rol (lo asigna el admin desde el Dashboard).
// Si un usuario nuevo no tiene rol asignado, cae en 'cliente' por defecto.

function ClerkBridge() {
  const { user, isLoaded } = useUser();
  const { setSesion, sesion } = useStore();

  // Carga datos desde Supabase en cuanto el usuario está autenticado
  useDataSync();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setSesion(null);
      return;
    }

    // Evitar re-renders si ya está sincronizado
    if (sesion?.id === user.id) return;

    const rol = ((user.publicMetadata as Record<string, unknown>)?.rol as Rol) ?? 'cliente';
    setSesion({
      id:        user.id,
      nombre:    user.fullName ?? user.primaryEmailAddress?.emailAddress ?? 'Usuario',
      rol,
      usuario:   user.id,
      password:  '',
      correo:    user.primaryEmailAddress?.emailAddress,
      clienteId: (user.publicMetadata as Record<string, unknown>)?.clienteId as string | undefined,
    });
  }, [isLoaded, user?.id]);

  return <Layout />;
}

// ── Guard de autenticación ────────────────────────────────────────────────────
// Mientras Clerk carga → spinner. Si no autenticado → /login. Si autenticado → ClerkBridge.
function RequireAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  // Spinner mientras Clerk carga la sesión (evita flash de redirect)
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f1]">
        <div className="w-8 h-8 rounded-full border-4 border-[#1769a5]/20 border-t-[#1769a5] animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/login" replace />;

  return <ClerkBridge />;
}

// ── Guards por rol ────────────────────────────────────────────────────────────
function OnlyAdmin({ children }: { children: React.ReactNode }) {
  const sesion = useStore((s) => s.sesion);
  if (sesion?.rol !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function NoCliente({ children }: { children: React.ReactNode }) {
  const sesion = useStore((s) => s.sesion);
  if (sesion?.rol === 'cliente') return <Navigate to="/portal" replace />;
  if (sesion?.rol === 'operador') return <Navigate to="/fumigacion" replace />;
  return <>{children}</>;
}

function NoOperador({ children }: { children: React.ReactNode }) {
  const sesion = useStore((s) => s.sesion);
  if (sesion?.rol === 'operador') return <Navigate to="/fumigacion" replace />;
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth — fuera del Layout */}
        <Route path="/login"   element={<LoginOrRedirect />} />
        <Route path="/sign-up" element={<SignUp routing="hash" signInUrl="/login" />} />

        {/* App protegida */}
        <Route element={<RequireAuth />}>
          <Route
            index
            element={
              <NoCliente>
                <Dashboard />
              </NoCliente>
            }
          />
          <Route
            path="reportes"
            element={
              <NoCliente>
                <Reportes />
              </NoCliente>
            }
          />
          <Route
            path="comparativa"
            element={
              <NoCliente>
                <Comparativa />
              </NoCliente>
            }
          />
          <Route
            path="mapa"
            element={
              <NoCliente>
                <Mapa />
              </NoCliente>
            }
          />
          <Route
            path="captura"
            element={
              <NoCliente>
                <Captura />
              </NoCliente>
            }
          />
          <Route
            path="portal"
            element={
              <NoOperador>
                <Portal />
              </NoOperador>
            }
          />
          <Route path="fumigacion" element={<Fumigacion />} />
          <Route path="agente"     element={<AgenteChat />} />
          <Route path="perfil"     element={<Perfil />} />
          <Route
            path="usuarios"
            element={
              <OnlyAdmin>
                <Usuarios />
              </OnlyAdmin>
            }
          />
          <Route path="configuracion" element={<Ajustes />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Agente IA — flotante global (solo usuarios autenticados) */}
      <AgenteIA />
    </BrowserRouter>
  );
}

// Si ya tiene sesión activa en Clerk, redirige según su rol
function LoginOrRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const sesion = useStore((s) => s.sesion);

  if (!isLoaded) return null;

  if (isSignedIn && sesion) {
    if (sesion.rol === 'cliente')  return <Navigate to="/portal"     replace />;
    if (sesion.rol === 'operador') return <Navigate to="/fumigacion" replace />;
    return <Navigate to="/" replace />;
  }

  return <Login />;
}
