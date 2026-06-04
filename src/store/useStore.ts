import { create } from 'zustand';
import type {
  Cliente, Parcela, Nave, PuntoMuestreo,
  Analisis, UsuarioSistema, Fumigacion, Conversacion, MensajeChat,
} from '../types';
import * as db from '../lib/db';

// ── Store interface ───────────────────────────────────────────────────────────

interface Store {
  // Datos
  clientes:       Cliente[];
  parcelas:       Parcela[];
  naves:          Nave[];
  puntos:         PuntoMuestreo[];
  analisis:       Analisis[];
  fumigaciones:   Fumigacion[];
  conversaciones: Conversacion[];

  // Estado de carga
  cargando: boolean;
  errorDb:  string;

  // Auth (gestionado por Clerk, sincronizado aquí)
  sesion:       UsuarioSistema | null;
  setSesion:    (s: UsuarioSistema | null) => void;
  cerrarSesion: () => void;

  // Carga inicial desde Supabase
  cargarDatos: (userId?: string) => Promise<void>;

  // Clientes
  addCliente:    (c: Cliente) => void;
  updateCliente: (id: string, data: Partial<Omit<Cliente, 'id'>>) => void;
  deleteCliente: (id: string) => void;

  // Parcelas
  addParcela:    (p: Parcela) => void;
  updateParcela: (id: string, data: Partial<Omit<Parcela, 'id'>>) => void;
  deleteParcela: (id: string) => void;

  // Naves
  addNave:    (n: Nave) => void;
  updateNave: (id: string, data: Partial<Omit<Nave, 'id'>>) => void;
  deleteNave: (id: string) => void;

  // Puntos y análisis
  addPunto:   (p: PuntoMuestreo) => void;
  addAnalisis:(a: Analisis) => void;

  // Fumigaciones
  addFumigacion:    (f: Fumigacion) => void;
  updateFumigacion: (id: string, data: Partial<Omit<Fumigacion, 'id'>>) => void;

  // Conversaciones FermierBot
  addConversacion:    (c: Conversacion) => void;
  updateConversacion: (id: string, data: Partial<Omit<Conversacion, 'id'>>) => void;
  appendMensaje:      (conversacionId: string, msg: MensajeChat) => void;
  deleteConversacion: (id: string) => void;

  // Compatibilidad retroactiva (usado en Login.tsx demo)
  iniciarSesion: (usuario: string, password: string, clientes: Cliente[]) => boolean;
}

// ── Helper: sync a Supabase en background (no bloquea la UI) ─────────────────

function sync(promise: Promise<void>) {
  promise.catch((e) => console.error('[Supabase sync]', e));
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<Store>()((set, get) => ({
  // Estado inicial vacío — Supabase lo llena al autenticarse
  clientes:       [],
  parcelas:       [],
  naves:          [],
  puntos:         [],
  analisis:       [],
  fumigaciones:   [],
  conversaciones: [],
  cargando:       false,
  errorDb:        '',
  sesion:         null,

  // ── Auth ──────────────────────────────────────────────────────────────────

  setSesion:    (s) => set({ sesion: s }),
  cerrarSesion: ()  => set({
    sesion: null,
    clientes: [], parcelas: [], naves: [], puntos: [],
    analisis: [], fumigaciones: [], conversaciones: [],
  }),

  // ── Carga inicial desde Supabase ──────────────────────────────────────────
  // Se llama una vez cuando el usuario se autentica (ver useDataSync.ts)

  cargarDatos: async (userId) => {
    set({ cargando: true, errorDb: '' });
    try {
      const [clientes, parcelas, naves, puntos, analisis, fumigaciones, conversaciones] =
        await Promise.all([
          db.getClientes(),
          db.getParcelas(),
          db.getNaves(),
          db.getPuntos(),
          db.getAnalisis(),
          db.getFumigaciones(),
          userId ? db.getConversaciones(userId) : Promise.resolve([]),
        ]);
      set({ clientes, parcelas, naves, puntos, analisis, fumigaciones, conversaciones });
    } catch (e) {
      console.error('[cargarDatos]', e);
      set({ errorDb: 'Error al cargar datos de Supabase' });
    } finally {
      set({ cargando: false });
    }
  },

  // ── Clientes ──────────────────────────────────────────────────────────────

  addCliente: (c) => {
    set((s) => ({ clientes: [...s.clientes, c] }));
    sync(db.insertCliente(c));
  },
  updateCliente: (id, data) => {
    set((s) => ({ clientes: s.clientes.map((c) => c.id === id ? { ...c, ...data } : c) }));
    sync(db.updateCliente(id, data));
  },
  deleteCliente: (id) => {
    set((s) => ({ clientes: s.clientes.filter((c) => c.id !== id) }));
    sync(db.deleteCliente(id));
  },

  // ── Parcelas ──────────────────────────────────────────────────────────────

  addParcela: (p) => {
    set((s) => ({ parcelas: [...s.parcelas, p] }));
    sync(db.insertParcela(p));
  },
  updateParcela: (id, data) => {
    set((s) => ({ parcelas: s.parcelas.map((p) => p.id === id ? { ...p, ...data } : p) }));
    sync(db.updateParcela(id, data));
  },
  deleteParcela: (id) => {
    set((s) => ({ parcelas: s.parcelas.filter((p) => p.id !== id) }));
    sync(db.deleteParcela(id));
  },

  // ── Naves ─────────────────────────────────────────────────────────────────

  addNave: (n) => {
    set((s) => ({ naves: [...s.naves, n] }));
    sync(db.insertNave(n));
  },
  updateNave: (id, data) => {
    set((s) => ({ naves: s.naves.map((n) => n.id === id ? { ...n, ...data } : n) }));
    sync(db.updateNave(id, data));
  },
  deleteNave: (id) => {
    set((s) => ({ naves: s.naves.filter((n) => n.id !== id) }));
    sync(db.deleteNave(id));
  },

  // ── Puntos y análisis ─────────────────────────────────────────────────────

  addPunto: (p) => {
    set((s) => ({ puntos: [...s.puntos, p] }));
    sync(db.insertPunto(p));
  },
  addAnalisis: (a) => {
    set((s) => ({ analisis: [...s.analisis, a] }));
    sync(db.insertAnalisis(a));
  },

  // ── Fumigaciones ──────────────────────────────────────────────────────────

  addFumigacion: (f) => {
    set((s) => ({ fumigaciones: [...s.fumigaciones, f] }));
    sync(db.insertFumigacion(f));
  },
  updateFumigacion: (id, data) => {
    set((s) => ({ fumigaciones: s.fumigaciones.map((f) => f.id === id ? { ...f, ...data } : f) }));
    sync(db.updateFumigacion(id, data));
  },

  // ── Conversaciones FermierBot ─────────────────────────────────────────────

  addConversacion: (c) => {
    set((s) => ({ conversaciones: [...s.conversaciones, c] }));
    const userId = get().sesion?.id;
    if (userId) sync(db.insertConversacion(userId, c));
  },
  updateConversacion: (id, data) => {
    set((s) => ({
      conversaciones: s.conversaciones.map((c) => c.id === id ? { ...c, ...data } : c),
    }));
    sync(db.updateConversacion(id, data));
  },
  appendMensaje: (conversacionId, msg) => {
    set((s) => ({
      conversaciones: s.conversaciones.map((c) =>
        c.id === conversacionId
          ? { ...c, mensajes: [...c.mensajes, msg], actualizadaEn: new Date().toISOString() }
          : c,
      ),
    }));
    // Sincronizar el array completo de mensajes a Supabase
    const conv = get().conversaciones.find((c) => c.id === conversacionId);
    if (conv) sync(db.updateConversacion(conversacionId, {
      mensajes: conv.mensajes,
      actualizadaEn: conv.actualizadaEn,
    }));
  },
  deleteConversacion: (id) => {
    set((s) => ({ conversaciones: s.conversaciones.filter((c) => c.id !== id) }));
    sync(db.deleteConversacion(id));
  },

  // ── Compatibilidad retroactiva ────────────────────────────────────────────
  // Este método era del sistema de login manual (antes de Clerk).
  // Se mantiene para que componentes que aún lo referencien no rompan.
  // Con Clerk activo, el login real lo gestiona ClerkBridge en App.tsx.

  iniciarSesion: () => false,
}));

// ── Helpers exportados ────────────────────────────────────────────────────────

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
