import { NavLink, Outlet, Navigate } from 'react-router-dom';
import {
  BarChart3, FlaskConical, PlusCircle, Map,
  GitCompare, Settings, Users, Sprout, Bot, UserCog,
} from 'lucide-react';
import { UserButton } from '@clerk/react';
import { useStore } from '../store/useStore';
import Logo from './Logo';
import type { Rol } from '../types';

const ALL_NAV = [
  { to: '/',              label: 'Dashboard',      Icon: BarChart3,    roles: ['admin', 'asesor'] as Rol[] },
  { to: '/reportes',      label: 'Reportes',       Icon: FlaskConical, roles: ['admin', 'asesor'] as Rol[] },
  { to: '/comparativa',   label: 'Comparativa',    Icon: GitCompare,   roles: ['admin', 'asesor'] as Rol[] },
  { to: '/mapa',          label: 'Mapa',           Icon: Map,          roles: ['admin', 'asesor'] as Rol[] },
  { to: '/captura',       label: 'Captura',        Icon: PlusCircle,   roles: ['admin', 'asesor'] as Rol[] },
  { to: '/portal',        label: 'Portal',         Icon: Users,        roles: ['admin', 'asesor', 'cliente'] as Rol[] },
  { to: '/fumigacion',    label: 'Fumigación',     Icon: Sprout,       roles: ['admin', 'asesor', 'operador'] as Rol[] },
  { to: '/agente',        label: 'Agente IA',      Icon: Bot,          roles: ['admin', 'asesor', 'cliente', 'operador'] as Rol[] },
  { to: '/usuarios',      label: 'Usuarios',       Icon: UserCog,      roles: ['admin'] as Rol[] },
  { to: '/configuracion', label: 'Config',         Icon: Settings,     roles: ['admin', 'asesor', 'cliente', 'operador'] as Rol[] },
];

// En móvil solo mostramos los items más relevantes en la barra inferior (máx 5)
const MOBILE_PRIORITY: Record<Rol, string[]> = {
  admin:    ['/', '/captura', '/reportes', '/agente', '/configuracion'],
  asesor:   ['/', '/captura', '/reportes', '/agente', '/configuracion'],
  cliente:  ['/portal', '/agente', '/configuracion'],
  operador: ['/fumigacion', '/agente', '/configuracion'],
};

export default function Layout() {
  const { sesion } = useStore();

  if (!sesion) return <Navigate to="/login" replace />;

  const nav = ALL_NAV.filter((item) => item.roles.includes(sesion.rol));
  const mobileRoutes = MOBILE_PRIORITY[sesion.rol];
  const mobileNav = mobileRoutes
    .map((r) => nav.find((n) => n.to === r))
    .filter(Boolean) as typeof nav;

  const rolLabel: Record<Rol, string> = {
    admin:    'Administrador',
    asesor:   'Asesor de campo',
    cliente:  'Cliente',
    operador: 'Operador',
  };

  return (
    <div className="flex min-h-screen min-h-dvh bg-[#f1f5f1]">

      {/* ── Sidebar (solo desktop md+) ──────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 bg-[#1769a5] text-white flex-col shrink-0">

        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/15">
          <Logo variant="dark" size={22} />
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[#3aa935] text-white font-medium shadow-sm'
                    : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
            <UserButton
              userProfileUrl="/perfil"
              userProfileMode="navigation"
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8 shrink-0',
                  userButtonPopoverCard: 'shadow-2xl',
                  userButtonPopoverFooter: 'hidden',
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{sesion.nombre}</p>
              <p className="text-[10px] text-white/60 truncate">{rolLabel[sesion.rol]}</p>
            </div>
          </div>

          <div className="mt-3 px-2">
            <p className="text-[10px] text-white/50">Culiacán, Sinaloa</p>
            <p className="text-[10px] text-white/30">v1.4.0 — Fermier</p>
          </div>
        </div>
      </aside>

      {/* ── Contenido principal ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto pb-[env(safe-area-inset-bottom)] md:pb-0">
        {/* Header móvil */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#1769a5] text-white">
          <Logo variant="dark" size={18} />
          <UserButton
            userProfileUrl="/perfil"
            userProfileMode="navigation"
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
                userButtonPopoverCard: 'shadow-2xl',
                userButtonPopoverFooter: 'hidden',
              },
            }}
          />
        </header>

        {/* Padding inferior en móvil para que el contenido no quede bajo la barra */}
        <div className="pb-20 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom nav bar (solo móvil) ──────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileNav.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[#1769a5]'
                  : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-[#1769a5]/10' : ''}`}>
                  <Icon size={20} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
