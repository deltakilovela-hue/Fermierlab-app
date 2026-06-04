import { NavLink, Outlet, Navigate } from 'react-router-dom';
import {
  BarChart3, FlaskConical, PlusCircle, Leaf, Map,
  GitCompare, Settings, Users, Sprout, Bot,
} from 'lucide-react';
import { UserButton } from '@clerk/react';
import { useStore } from '../store/useStore';
import type { Rol } from '../types';

// ── Nav items por rol ─────────────────────────────────────────────────────────

const ALL_NAV = [
  { to: '/',              label: 'Dashboard',      Icon: BarChart3,    roles: ['admin', 'asesor'] as Rol[] },
  { to: '/reportes',      label: 'Reportes',       Icon: FlaskConical, roles: ['admin', 'asesor'] as Rol[] },
  { to: '/comparativa',   label: 'Comparativa',    Icon: GitCompare,   roles: ['admin', 'asesor'] as Rol[] },
  { to: '/mapa',          label: 'Mapa',           Icon: Map,          roles: ['admin', 'asesor'] as Rol[] },
  { to: '/captura',       label: 'Captura',        Icon: PlusCircle,   roles: ['admin', 'asesor'] as Rol[] },
  { to: '/portal',        label: 'Portal cliente', Icon: Users,        roles: ['admin', 'asesor', 'cliente'] as Rol[] },
  { to: '/fumigacion',    label: 'Fumigación',     Icon: Sprout,       roles: ['admin', 'asesor', 'operador'] as Rol[] },
  { to: '/agente',        label: 'Agente IA',      Icon: Bot,          roles: ['admin', 'asesor', 'cliente', 'operador'] as Rol[] },
  { to: '/configuracion', label: 'Configuración',  Icon: Settings,     roles: ['admin'] as Rol[] },
];

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function Layout() {
  const { sesion } = useStore();

  if (!sesion) return <Navigate to="/login" replace />;

  const nav = ALL_NAV.filter((item) => item.roles.includes(sesion.rol));

  const avatarColor =
    sesion.rol === 'admin'    ? '#16a34a' :
    sesion.rol === 'asesor'   ? '#2563eb' :
    sesion.rol === 'operador' ? '#d97706' : '#7c3aed';

  const rolLabel: Record<Rol, string> = {
    admin:    'Administrador',
    asesor:   'Asesor de campo',
    cliente:  'Cliente',
    operador: 'Operador',
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f1]">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-56 bg-[#1a3320] text-white flex flex-col shrink-0">

        {/* Brand */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <Leaf size={22} className="text-green-300" />
          <div>
            <p className="font-bold text-sm leading-tight">Fermier Lab</p>
            <p className="text-[11px] text-green-300 leading-tight">Sistema de muestreo</p>
          </div>
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
                    ? 'bg-green-600 text-white font-medium'
                    : 'text-green-100 hover:bg-white/10'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info — UserButton de Clerk (avatar + menú de cuenta + cerrar sesión) */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
            {/* Avatar con menú desplegable de Clerk */}
            <UserButton
              afterSignOutUrl="/login"
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
              <p className="text-[10px] text-green-300 truncate">{rolLabel[sesion.rol]}</p>
            </div>
          </div>

          <div className="mt-3 px-2">
            <p className="text-[10px] text-green-400">Culiacán, Sinaloa</p>
            <p className="text-[10px] text-white/30">v1.3.0 — Fase 4</p>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
