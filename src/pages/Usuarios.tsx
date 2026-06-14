import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { useStore } from '../store/useStore';
import type { Rol } from '../types';
import {
  Users, UserPlus, Trash2, Loader2, AlertCircle, Shield,
  FlaskConical, Sprout, Building2, RefreshCw, Check, X,
} from 'lucide-react';
import Configuracion from './Configuracion';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface UsuarioAdmin {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  clienteId: string;
}

const ROLES: { value: Rol; label: string; Icon: React.ElementType; color: string }[] = [
  { value: 'admin',    label: 'Administrador', Icon: Shield,       color: '#16a34a' },
  { value: 'asesor',   label: 'Asesor',        Icon: FlaskConical, color: '#2563eb' },
  { value: 'operador', label: 'Operador',      Icon: Sprout,       color: '#d97706' },
  { value: 'cliente',  label: 'Cliente',       Icon: Building2,    color: '#7c3aed' },
];

function rolInfo(rol: Rol) {
  return ROLES.find((r) => r.value === rol) ?? ROLES[3];
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function Usuarios() {
  const { getToken } = useAuth();
  const { clientes, sesion } = useStore();

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');
  const [guardando, setGuardando] = useState(false);

  const [tab, setTab] = useState<'usuarios' | 'proyectos'>('usuarios');

  // Form de nuevo usuario
  const [showForm, setShowForm] = useState(false);
  const [fCorreo, setFCorreo]     = useState('');
  const [fNombre, setFNombre]     = useState('');
  const [fPassword, setFPassword] = useState('');
  const [fRol, setFRol]           = useState<Rol>('asesor');
  const [fClienteId, setFClienteId] = useState('');

  // ── Llamada al API ────────────────────────────────────────────────────────────
  const api = useCallback(async (method: string, body?: Record<string, unknown>) => {
    const token = await getToken();
    const res = await fetch('/api/users', {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as { error?: { message?: string } })?.error?.message ?? `Error ${res.status}`);
    return data;
  }, [getToken]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setUsuarios(await api('GET') as UsuarioAdmin[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Crear ─────────────────────────────────────────────────────────────────────
  async function crear() {
    if (!fCorreo.trim() || !fPassword.trim()) { setError('Correo y contraseña son obligatorios'); return; }
    if (fPassword.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setGuardando(true);
    setError('');
    try {
      await api('POST', {
        correo: fCorreo.trim(),
        password: fPassword,
        nombre: fNombre.trim(),
        rol: fRol,
        clienteId: fRol === 'cliente' ? fClienteId : undefined,
      });
      setFCorreo(''); setFNombre(''); setFPassword(''); setFRol('asesor'); setFClienteId('');
      setShowForm(false);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  // ── Cambiar rol / cliente ──────────────────────────────────────────────────────
  async function cambiar(u: UsuarioAdmin, rol: Rol, clienteId: string) {
    setError('');
    try {
      await api('PATCH', { userId: u.id, rol, clienteId: rol === 'cliente' ? clienteId : undefined });
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // ── Borrar ─────────────────────────────────────────────────────────────────────
  async function borrar(u: UsuarioAdmin) {
    if (!confirm(`¿Borrar al usuario ${u.correo}? Esta acción no se puede deshacer.`)) return;
    setError('');
    try {
      await api('DELETE', { userId: u.id });
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const nombreCliente = (id: string) => clientes.find((c) => c.id === id)?.nombre ?? '—';

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1769a5]/8 flex items-center justify-center">
            <Users size={20} className="text-[#1769a5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1769a5]">Gestión de usuarios</h1>
            <p className="text-xs text-gray-400">Crea, edita roles y asigna proyectos — sin salir de la app</p>
          </div>
        </div>
        {tab === 'usuarios' && (
          <div className="flex items-center gap-2">
            <button
              onClick={cargar}
              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              title="Recargar"
            >
              <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { setShowForm((v) => !v); setError(''); }}
              className="flex items-center gap-2 bg-[#1769a5] hover:bg-[#11537f] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <UserPlus size={16} /> Nuevo usuario
            </button>
          </div>
        )}
      </div>

      {/* Pestañas: Usuarios / Proyectos */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm mb-5">
        {([
          { key: 'usuarios' as const,  label: 'Usuarios',  Icon: Users },
          { key: 'proyectos' as const, label: 'Proyectos', Icon: Building2 },
        ]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-[#1769a5] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'proyectos' && <Configuracion embedded />}

      {tab === 'usuarios' && (<>
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Form nuevo usuario */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
          <p className="text-sm font-bold text-[#1769a5] mb-4 flex items-center gap-2"><UserPlus size={15} /> Crear usuario</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Correo" value={fCorreo} onChange={setFCorreo} placeholder="correo@ejemplo.com" type="email" />
            <Field label="Nombre (opcional)" value={fNombre} onChange={setFNombre} placeholder="Nombre del usuario" />
            <Field label="Contraseña" value={fPassword} onChange={setFPassword} placeholder="Mínimo 8 caracteres" type="text" />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Rol</label>
              <select
                value={fRol}
                onChange={(e) => setFRol(e.target.value as Rol)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {fRol === 'cliente' && (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Proyecto asociado</label>
                <select
                  value={fClienteId}
                  onChange={(e) => setFClienteId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                >
                  <option value="">— Seleccionar proyecto —</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.cultivo})</option>)}
                </select>
                <p className="text-[10px] text-gray-400">Puedes asignar varios usuarios al mismo proyecto.</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={crear}
              disabled={guardando}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {guardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Crear
            </button>
            <button
              onClick={() => { setShowForm(false); setError(''); }}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <Loader2 size={18} className="animate-spin" /> Cargando usuarios…
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No hay usuarios.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Proyecto</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const info = rolInfo(u.rol);
                const esYo = u.id === sesion?.id;
                return (
                  <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    {/* Usuario */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: info.color }}
                        >
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{u.nombre}{esYo && <span className="text-[10px] text-green-600 ml-1">(tú)</span>}</p>
                          <p className="text-[11px] text-gray-400 truncate">{u.correo}</p>
                        </div>
                      </div>
                    </td>
                    {/* Rol (editable) */}
                    <td className="px-4 py-3">
                      <select
                        value={u.rol}
                        onChange={(e) => cambiar(u, e.target.value as Rol, u.clienteId)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20"
                        style={{ color: info.color, fontWeight: 600 }}
                      >
                        {ROLES.map((r) => <option key={r.value} value={r.value} style={{ color: '#374151' }}>{r.label}</option>)}
                      </select>
                    </td>
                    {/* Cliente (editable solo si rol=cliente) */}
                    <td className="px-4 py-3">
                      {u.rol === 'cliente' ? (
                        <select
                          value={u.clienteId}
                          onChange={(e) => cambiar(u, 'cliente', e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 max-w-[180px]"
                        >
                          <option value="">— Sin asignar —</option>
                          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-300">{nombreCliente('')}</span>
                      )}
                    </td>
                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => borrar(u)}
                        disabled={esYo}
                        title={esYo ? 'No puedes borrarte a ti mismo' : 'Borrar usuario'}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
        💡 Para asignar <b>varios accesos al mismo proyecto</b>, crea varios usuarios con rol "Cliente" y el mismo proyecto asociado.
        Los cambios de rol aplican la próxima vez que el usuario inicie sesión.
      </p>
      </>)}
    </div>
  );
}

// ── Campo de formulario ────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize="none"
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
      />
    </div>
  );
}
