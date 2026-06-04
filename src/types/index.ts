// ── Auth ──────────────────────────────────────────────────────────────────────
export type Rol = 'admin' | 'asesor' | 'cliente' | 'operador';

export interface UsuarioSistema {
  id: string;
  nombre: string;
  rol: Rol;
  usuario: string;     // identificador principal (username)
  password: string;
  correo?: string;
  telefono?: string;
  negocio?: string;
  clienteId?: string;  // solo para rol 'cliente'
}

// ── Agente IA — historial de conversaciones ───────────────────────────────────

export type MediaTypeChat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export interface ImagenChat {
  data: string;           // base64 sin prefijo
  mediaType: MediaTypeChat;
}

export interface MensajeChat {
  rol: 'user' | 'assistant';
  texto: string;
  imagen?: ImagenChat;
  fechaHora: string;      // ISO
}

export interface Conversacion {
  id: string;
  titulo: string;         // auto-generado del primer mensaje
  mensajes: MensajeChat[];
  creadaEn: string;       // ISO
  actualizadaEn: string;  // ISO
}

// ── Fumigación ────────────────────────────────────────────────────────────────
export type EstadoFumigacion = 'activa' | 'completada' | 'cancelada';

export interface Fumigacion {
  id: string;
  parcelaId: string;
  naveId?: string;
  operadorId: string;       // UsuarioSistema.id
  operadorNombre: string;
  fechaInicio: string;      // ISO datetime
  fechaFin?: string;        // ISO datetime
  ruta: [number, number][]; // [lat, lng][]
  distanciaM: number;       // metros recorridos
  estado: EstadoFumigacion;
}

// ─────────────────────────────────────────────────────────────────────────────
export type TipoAnalisis = 'nematodos' | 'fitopatogenos';

export type TipoMuestreo = 'pre-tratamiento' | 'post-tratamiento' | 'general';

export interface Cliente {
  id: string;
  nombre: string;
  cultivo: string;
  correo?: string;
  telefono?: string;
  negocio?: string;    // nombre comercial / empresa
}

export interface Parcela {
  id: string;
  clienteId: string;
  nombre: string;
  poligono?: [number, number][]; // [lat, lng] vertices
}

export interface Nave {
  id: string;
  parcelaId: string;
  numero: number;
  nombre: string;
}

export interface ResultadoNematodo {
  organismo: string;
  grSuelo: number;
  conteo1: number;
  conteo2: number;
  conteo3: number;
  promedio: number;
  individuosPor100cc: number;
}

export interface ResultadoFitopatogeno {
  organismo: string;
  medioCultivo: string;
  conteo1: number;
  conteo2: number;
  conteo3: number;
  promedio: number;
  propagulos: number;
}

export interface PuntoMuestreo {
  id: string;
  naveId: string;
  tabla: string;
  lat?: number;
  lng?: number;
}

export interface Analisis {
  id: string;
  puntoId: string;
  folio: string;
  fechaRecepcion: string;
  fechaEmision: string;
  tipo: TipoAnalisis;
  tipoMuestreo: TipoMuestreo;
  resultadosNematodos?: ResultadoNematodo[];
  resultadosFitopatogenos?: ResultadoFitopatogeno[];
}

export interface UmbralDanio {
  organismo: string;
  valor: number;
  unidad: string;
}

export const UMBRALES_NEMATODOS: UmbralDanio[] = [
  { organismo: 'Meloidogyne', valor: 200, unidad: 'ind/100cc' },
  { organismo: 'Pratylenchus', valor: 150, unidad: 'ind/100cc' },
  { organismo: 'Rotylenchulus', valor: 200, unidad: 'ind/100cc' },
];

export const UMBRALES_FITOPATOGENOS: UmbralDanio[] = [
  { organismo: 'Fusarium spp', valor: 3000, unidad: 'UFC/g' },
  { organismo: 'Fusarium solani', valor: 3000, unidad: 'UFC/g' },
];

export const COLORES_ORGANISMOS: Record<string, string> = {
  'Meloidogyne': '#ef4444',
  'Pratylenchus': '#f97316',
  'Rotylenchulus': '#eab308',
  'Aphelenchus': '#8b5cf6',
  'Saprófitos': '#6b7280',
  'Fusarium spp': '#dc2626',
  'Fusarium solani': '#b91c1c',
  'Aspergillus': '#d97706',
  'Trichoderma': '#16a34a',
  'B.Anaerobias': '#4b5563',
};
