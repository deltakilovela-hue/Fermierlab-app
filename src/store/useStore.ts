import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cliente, Parcela, Nave, PuntoMuestreo, Analisis, UsuarioSistema, Fumigacion, Conversacion, MensajeChat } from '../types';
import { clientes as seedClientes, parcelas as seedParcelas, naves as seedNaves, puntos as seedPuntos, analisis as seedAnalisis } from '../data/seed';

const STORE_VERSION = 8; // bump to reset localStorage when seed changes

// ── Usuarios del sistema (no persisten en localStorage) ───────────────────────
const USUARIOS_SISTEMA: UsuarioSistema[] = [
  {
    id: 'admin',
    nombre: 'Administrador',
    rol: 'admin',
    usuario: 'admin',
    password: 'fermier2026',
    correo: 'admin@fermierlab.com',
    negocio: 'Fermier Lab',
  },
  {
    id: 'asesor1',
    nombre: 'Asesor de Campo',
    rol: 'asesor',
    usuario: 'asesor',
    password: 'campo2026',
    correo: 'asesor@fermierlab.com',
    negocio: 'Fermier Lab',
  },
  {
    id: 'op1',
    nombre: 'Operador Demo',
    rol: 'operador',
    usuario: 'operador',
    password: 'fumigar2026',
    negocio: 'Fermier Lab',
  },
];

// ── Store interface ───────────────────────────────────────────────────────────

interface Store {
  clientes: Cliente[];
  parcelas: Parcela[];
  naves: Nave[];
  puntos: PuntoMuestreo[];
  analisis: Analisis[];
  fumigaciones: Fumigacion[];
  conversaciones: Conversacion[];

  // Auth
  sesion: UsuarioSistema | null;
  iniciarSesion: (usuario: string, password: string, clientes: Cliente[]) => boolean;
  setSesion: (s: UsuarioSistema | null) => void;
  cerrarSesion: () => void;

  addAnalisis: (a: Analisis) => void;
  addCliente: (c: Cliente) => void;
  addParcela: (p: Parcela) => void;
  addNave: (n: Nave) => void;
  addPunto: (p: PuntoMuestreo) => void;

  addFumigacion: (f: Fumigacion) => void;
  updateFumigacion: (id: string, data: Partial<Omit<Fumigacion, 'id'>>) => void;

  addConversacion: (c: Conversacion) => void;
  updateConversacion: (id: string, data: Partial<Omit<Conversacion, 'id'>>) => void;
  appendMensaje: (conversacionId: string, msg: MensajeChat) => void;
  deleteConversacion: (id: string) => void;

  updateCliente: (id: string, data: Partial<Omit<Cliente, 'id'>>) => void;
  updateParcela: (id: string, data: Partial<Omit<Parcela, 'id'>>) => void;
  updateNave: (id: string, data: Partial<Omit<Nave, 'id'>>) => void;
  deleteCliente: (id: string) => void;
  deleteParcela: (id: string) => void;
  deleteNave: (id: string) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<Store>()(
  persist(
    (set) => ({
      clientes: seedClientes,
      parcelas: seedParcelas,
      naves: seedNaves,
      puntos: seedPuntos,
      analisis: seedAnalisis,
      fumigaciones: [],
      conversaciones: [],
      sesion: null,

      // ── Auth ────────────────────────────────────────────────────────────────
      iniciarSesion: (identificador, password, clientesActuales) => {
        // Normalizar: minúsculas, sin espacios extremos
        const norm = (s?: string) => (s ?? '').trim().toLowerCase();
        const key  = norm(identificador);

        // 1. Buscar en usuarios del sistema por cualquier identificador
        const sys = USUARIOS_SISTEMA.find((u) =>
          norm(u.usuario)   === key ||
          norm(u.correo)    === key ||
          norm(u.telefono)  === key ||
          norm(u.negocio)   === key ||
          norm(u.nombre)    === key,
        );
        if (sys) {
          if (sys.password !== password) return false;
          set({ sesion: sys });
          return true;
        }

        // 2. Buscar en clientes por cualquier identificador
        const cli = clientesActuales.find((c) =>
          norm(c.id)       === key ||
          norm(c.nombre)   === key ||
          norm(c.correo)   === key ||
          norm(c.telefono) === key ||
          norm(c.negocio)  === key,
        );
        if (cli) {
          if (password !== 'cliente2026') return false;
          const sesionCli: UsuarioSistema = {
            id: `cli-${cli.id}`,
            nombre: cli.nombre,
            rol: 'cliente',
            usuario: cli.id,
            password: 'cliente2026',
            correo: cli.correo,
            telefono: cli.telefono,
            negocio: cli.negocio,
            clienteId: cli.id,
          };
          set({ sesion: sesionCli });
          return true;
        }

        return false;
      },

      setSesion:    (s) => set({ sesion: s }),
      cerrarSesion: ()  => set({ sesion: null }),

      // ── Data ─────────────────────────────────────────────────────────────────
      addAnalisis:    (a) => set((s) => ({ analisis:     [...s.analisis,     a] })),
      addCliente:     (c) => set((s) => ({ clientes:     [...s.clientes,     c] })),
      addParcela:     (p) => set((s) => ({ parcelas:     [...s.parcelas,     p] })),
      addNave:        (n) => set((s) => ({ naves:        [...s.naves,        n] })),
      addPunto:       (p) => set((s) => ({ puntos:       [...s.puntos,       p] })),
      addFumigacion:  (f) => set((s) => ({ fumigaciones: [...s.fumigaciones, f] })),

      addConversacion:    (c)       => set((s) => ({ conversaciones: [...s.conversaciones, c] })),
      updateConversacion: (id, data) => set((s) => ({
        conversaciones: s.conversaciones.map((c) => c.id === id ? { ...c, ...data } : c),
      })),
      appendMensaje: (conversacionId, msg) => set((s) => ({
        conversaciones: s.conversaciones.map((c) =>
          c.id === conversacionId
            ? { ...c, mensajes: [...c.mensajes, msg], actualizadaEn: new Date().toISOString() }
            : c,
        ),
      })),
      deleteConversacion: (id) => set((s) => ({
        conversaciones: s.conversaciones.filter((c) => c.id !== id),
      })),

      updateFumigacion: (id, data) => set((s) => ({
        fumigaciones: s.fumigaciones.map((f) => f.id === id ? { ...f, ...data } : f),
      })),

      updateCliente: (id, data) => set((s) => ({ clientes: s.clientes.map((c) => c.id === id ? { ...c, ...data } : c) })),
      updateParcela: (id, data) => set((s) => ({ parcelas: s.parcelas.map((p) => p.id === id ? { ...p, ...data } : p) })),
      updateNave:    (id, data) => set((s) => ({ naves:    s.naves.map((n)    => n.id === id ? { ...n, ...data } : n) })),
      deleteCliente: (id) => set((s) => ({ clientes: s.clientes.filter((c) => c.id !== id) })),
      deleteParcela: (id) => set((s) => ({ parcelas: s.parcelas.filter((p) => p.id !== id) })),
      deleteNave:    (id) => set((s) => ({ naves:    s.naves.filter((n)    => n.id !== id) })),
    }),
    {
      name: 'fermier-storage',
      version: STORE_VERSION,
      migrate: (_state, fromVersion) => {
        console.log(`Migrating store from v${fromVersion} to v${STORE_VERSION} — resetting to seed`);
        return {
          clientes: seedClientes,
          parcelas: seedParcelas,
          naves: seedNaves,
          puntos: seedPuntos,
          analisis: seedAnalisis,
          fumigaciones: [],
          conversaciones: [],
          sesion: null,
        };
      },
    },
  ),
);

// ── Helpers ───────────────────────────────────────────────────────────────────
export function credencialCliente(clienteId: string) {
  return { usuario: clienteId, password: 'cliente2026' };
}

/** Distancia Haversine en metros entre dos coordenadas */
export function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const dLat = (b[0] - a[0]) * (Math.PI / 180);
  const dLon = (b[1] - a[1]) * (Math.PI / 180);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * (Math.PI / 180)) * Math.cos(b[0] * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
