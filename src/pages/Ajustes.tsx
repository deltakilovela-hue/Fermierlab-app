import { useClerk } from '@clerk/react';
import { useStore } from '../store/useStore';
import { useTheme } from '../hooks/useTheme';
import {
  Settings, Sun, Moon, LogOut, MessageCircle, Check,
} from 'lucide-react';

const WA_FERMIER = 'https://wa.me/526692900628?text=' +
  encodeURIComponent('Hola Fermier, necesito ayuda con la plataforma.');

export default function Ajustes() {
  const { theme, setTheme } = useTheme();
  const { signOut } = useClerk();
  const { sesion, cerrarSesion } = useStore();

  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-[#1769a5]/10 flex items-center justify-center">
          <Settings size={20} className="text-[#1769a5]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1769a5]">Configuración</h1>
          <p className="text-xs text-gray-400">Preferencias de tu cuenta</p>
        </div>
      </div>

      {/* ── Tema ──────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-1">Apariencia</h2>
        <p className="text-xs text-gray-400 mb-4">Elige cómo se ve la aplicación</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 transition-colors ${
              theme === 'light' ? 'border-[#1769a5] bg-[#1769a5]/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sun size={18} className="text-amber-500" />
              <span className="text-sm font-medium text-gray-700">Claro</span>
            </span>
            {theme === 'light' && <Check size={16} className="text-[#1769a5]" />}
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 transition-colors ${
              theme === 'dark' ? 'border-[#1769a5] bg-[#1769a5]/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Moon size={18} className="text-indigo-400" />
              <span className="text-sm font-medium text-gray-700">Oscuro</span>
            </span>
            {theme === 'dark' && <Check size={16} className="text-[#1769a5]" />}
          </button>
        </div>
      </section>

      {/* ── Contacto ──────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-1">Soporte</h2>
        <p className="text-xs text-gray-400 mb-4">¿Dudas o problemas? Escríbenos.</p>
        <a
          href={WA_FERMIER}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
            bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-semibold transition-colors"
        >
          <MessageCircle size={17} />
          Contactar a Fermier
        </a>
      </section>

      {/* ── Sesión ────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-1">Sesión</h2>
        <p className="text-xs text-gray-400 mb-1">
          {sesion?.nombre} · {sesion?.correo}
        </p>
        <button
          onClick={() => { cerrarSesion(); signOut({ redirectUrl: '/login' }); }}
          className="flex items-center justify-center gap-2 w-full py-3 mt-3 rounded-xl
            bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold transition-colors"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </section>

      <p className="text-[11px] text-gray-300 text-center mt-6">Fermier · v1.4.0 · Culiacán, Sinaloa</p>
    </div>
  );
}
