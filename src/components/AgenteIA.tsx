import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { UMBRALES_NEMATODOS, UMBRALES_FITOPATOGENOS } from '../types';
import type { MediaTypeChat } from '../types';
import { llamarClaude, fileToBase64, getMediaType } from '../utils/fermierBot';
import type { MensajeApi } from '../utils/fermierBot';
import {
  Bot, X, Send, Loader2, Sprout, AlertCircle,
  Camera, ImagePlus, Trash2, ClipboardList,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ImagenAdjunta {
  data: string;          // base64 sin prefijo data:...
  mediaType: MediaTypeChat;
  previewUrl: string;    // object URL para mostrar en UI
}

interface Mensaje {
  rol: 'user' | 'assistant';
  texto: string;
  imagen?: ImagenAdjunta;
}

// ── Sugerencias rápidas ───────────────────────────────────────────────────────

const SUGERENCIAS = [
  { emoji: '📸', texto: 'Analiza esta foto de mi planta', esImagen: true },
  { emoji: '🗓️', texto: 'Plan de tratamiento para Fusarium', esImagen: false },
  { emoji: '🌱', texto: 'Ciclo del tomate en Sinaloa', esImagen: false },
  { emoji: '⚠️', texto: 'Umbrales de Meloidogyne superados, ¿qué hago?', esImagen: false },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function AgenteIA() {
  const { sesion, clientes, parcelas, analisis, naves, puntos } = useStore();

  const [abierto, setAbierto]       = useState(false);
  const [mensajes, setMensajes]     = useState<Mensaje[]>([]);
  const [input, setInput]           = useState('');
  const [imagenPrev, setImagenPrev] = useState<ImagenAdjunta | null>(null);
  const [cargando, setCargando]     = useState(false);
  const [error, setError]           = useState('');

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes, cargando]);
  useEffect(() => { if (abierto) setTimeout(() => inputRef.current?.focus(), 100); }, [abierto]);

  if (!sesion) return null;

  // ── Contexto dinámico con alertas de umbrales ────────────────────────────────
  function buildContexto() {
    const lines: string[] = [`Usuario: ${sesion!.nombre} (rol: ${sesion!.rol})`];

    if (sesion!.rol === 'cliente' && sesion!.clienteId) {
      const cli = clientes.find((c) => c.id === sesion!.clienteId);
      if (cli) {
        lines.push(`Cliente: ${cli.nombre}, cultivo principal: ${cli.cultivo}`);
        const ps = parcelas.filter((p) => p.clienteId === cli.id);
        lines.push(`Parcelas: ${ps.map((p) => p.nombre).join(', ')}`);
      }
    } else {
      lines.push(`Clientes: ${clientes.map((c) => `${c.nombre} (${c.cultivo})`).join('; ')}`);
    }

    // Detectar umbrales superados en análisis recientes
    const alertas: string[] = [];
    analisis.forEach((a) => {
      const punto = puntos.find((p) => p.id === a.puntoId);
      const nave  = punto ? naves.find((n) => n.id === punto.naveId) : null;

      a.resultadosNematodos?.forEach((r) => {
        const umbral = UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo);
        if (umbral && r.individuosPor100cc > umbral.valor) {
          alertas.push(
            `⚠️ ${r.organismo} en ${nave?.nombre ?? 'nave desconocida'}: ` +
            `${r.individuosPor100cc} ind/100cc (umbral: ${umbral.valor}) — SUPERADO`
          );
        }
      });

      a.resultadosFitopatogenos?.forEach((r) => {
        const umbral = UMBRALES_FITOPATOGENOS.find((u) => u.organismo === r.organismo);
        if (umbral && r.propagulos > umbral.valor) {
          alertas.push(
            `⚠️ ${r.organismo} en ${nave?.nombre ?? 'nave desconocida'}: ` +
            `${r.propagulos.toLocaleString()} UFC/g (umbral: ${umbral.valor.toLocaleString()}) — SUPERADO`
          );
        }
      });
    });

    if (alertas.length) {
      lines.push('\nALERTAS DE UMBRALES DETECTADAS EN EL SISTEMA:');
      alertas.forEach((a) => lines.push(a));
    }

    return lines.join('\n');
  }

  // ── Manejo de imagen ─────────────────────────────────────────────────────────
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Imagen demasiado grande (máx 5 MB)'); return; }

    const data      = await fileToBase64(file);
    const mediaType = getMediaType(file);
    const preview   = URL.createObjectURL(file);
    setImagenPrev({ data, mediaType, previewUrl: preview });
    setError('');
    e.target.value = '';  // reset input
    inputRef.current?.focus();
  }

  function quitarImagen() {
    if (imagenPrev) URL.revokeObjectURL(imagenPrev.previewUrl);
    setImagenPrev(null);
  }

  // ── Enviar mensaje ────────────────────────────────────────────────────────────
  async function enviar(textoForzado?: string, imagenForzada?: ImagenAdjunta) {
    const texto  = (textoForzado ?? input).trim();
    const imagen = imagenForzada ?? imagenPrev ?? undefined;

    if (!texto && !imagen) return;
    if (cargando) return;

    const nuevoMensaje: Mensaje = { rol: 'user', texto, imagen };
    const historial = [...mensajes, nuevoMensaje];

    setMensajes(historial);
    setInput('');
    setImagenPrev(null);
    setCargando(true);
    setError('');

    // Convertir al tipo MensajeApi (sin previewUrl) para llamarClaude
    const apiMensajes: MensajeApi[] = historial.map((m) => ({
      rol:    m.rol,
      texto:  m.texto,
      imagen: m.imagen ? { data: m.imagen.data, mediaType: m.imagen.mediaType } : undefined,
    }));

    try {
      const respuesta = await llamarClaude(apiMensajes, buildContexto());
      setMensajes([...historial, { rol: 'assistant', texto: respuesta }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  // Cuando el usuario hace clic en sugerencia de foto: abre selector directamente
  function clickSugerencia(s: typeof SUGERENCIAS[0]) {
    if (s.esImagen) {
      fileRef.current?.click();
      // Pre-cargamos el texto de análisis para que vaya con la foto
      setInput('Analiza esta imagen de mi cultivo y dime qué ves.');
    } else {
      setInput(s.texto);
      inputRef.current?.focus();
    }
  }

  // ── Alertas para el badge del botón flotante ─────────────────────────────────
  const hayAlertas = analisis.some((a) => {
    const nemOk = a.resultadosNematodos?.some((r) => {
      const u = UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo);
      return u && r.individuosPor100cc > u.valor;
    });
    const fitoOk = a.resultadosFitopatogenos?.some((r) => {
      const u = UMBRALES_FITOPATOGENOS.find((u) => u.organismo === r.organismo);
      return u && r.propagulos > u.valor;
    });
    return nemOk || fitoOk;
  });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Input oculto para selección de imagen */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {/* ── Botón flotante ─────────────────────────────────────────────────── */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          className="fixed bottom-6 right-6 z-[2000] w-14 h-14 rounded-full
            bg-[#1769a5] hover:bg-[#11537f] text-white shadow-2xl shadow-green-900/40
            flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          title="FermierBot — Asesor IA agrícola"
        >
          <Sprout size={24} className="text-green-300" />
          {/* Badge: Bot icon o alerta roja */}
          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center
            ${hayAlertas ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`}
          >
            {hayAlertas
              ? <span className="text-white text-[8px] font-bold">!</span>
              : <Bot size={10} className="text-[#1a1a0a]" />
            }
          </span>
        </button>
      )}

      {/* ── Panel de chat ───────────────────────────────────────────────────── */}
      {abierto && (
        <div
          className="fixed bottom-5 right-5 z-[2000] w-[390px] max-w-[calc(100vw-1.5rem)]
            flex flex-col bg-white rounded-3xl shadow-2xl shadow-black/20 overflow-hidden"
          style={{ height: 'min(620px, calc(100vh - 2.5rem))' }}
        >
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-[#1769a5] text-white shrink-0">
            <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Sprout size={18} className="text-green-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">FermierBot</p>
              <p className="text-[10px] text-green-300 flex items-center gap-1">
                Asesor agrícola IA
                {hayAlertas && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                    Umbrales superados
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Mensajes ────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">

            {/* Saludo + sugerencias */}
            {mensajes.length === 0 && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#1769a5] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-green-300" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[88%]">
                  <p className="font-semibold text-[#1769a5] text-sm mb-1">¡Hola! Soy FermierBot 🌱</p>
                  <p className="text-gray-500 text-xs leading-relaxed mb-3">
                    Pregúntame sobre tus cultivos, enfermedades o manda una foto de tu planta
                    y te digo qué le pasa.
                  </p>

                  {/* Alerta de umbrales si hay */}
                  {hayAlertas && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                      <span className="text-red-500 text-sm shrink-0">⚠️</span>
                      <p className="text-xs text-red-600 leading-relaxed">
                        Hay <strong>umbrales superados</strong> en los análisis recientes.
                        Pregúntame para generar un plan de tratamiento.
                      </p>
                    </div>
                  )}

                  {/* Sugerencias rápidas */}
                  <div className="flex flex-wrap gap-1.5">
                    {SUGERENCIAS.map((s) => (
                      <button
                        key={s.texto}
                        onClick={() => clickSugerencia(s)}
                        className={`text-[11px] rounded-full px-2.5 py-1 transition-colors flex items-center gap-1 ${
                          s.esImagen
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                        }`}
                      >
                        {s.emoji} {s.esImagen ? 'Subir foto' : s.texto}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Historial de mensajes */}
            {mensajes.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.rol === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.rol === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#1769a5] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-green-300" />
                  </div>
                )}
                <div
                  className={`rounded-2xl text-sm max-w-[85%] leading-relaxed overflow-hidden ${
                    m.rol === 'user'
                      ? 'bg-[#1769a5] text-white rounded-tr-sm'
                      : 'bg-white text-gray-700 shadow-sm rounded-tl-sm'
                  }`}
                >
                  {/* Imagen adjunta del usuario */}
                  {m.imagen && (
                    <img
                      src={m.imagen.previewUrl}
                      alt="Foto del cultivo"
                      className="w-full max-h-48 object-cover"
                    />
                  )}
                  {/* Texto (con soporte Markdown básico) */}
                  {m.texto && (
                    <div className="px-4 py-3" style={{ whiteSpace: 'pre-wrap' }}>
                      {m.texto}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {cargando && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#1769a5] flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-green-300" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <Loader2 size={14} className="text-green-500 animate-spin" />
                  <span className="text-xs text-gray-400">Analizando…</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mx-1">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* ── Input area ──────────────────────────────────────────────────── */}
          <div className="border-t border-gray-100 bg-white shrink-0">

            {/* Preview de imagen seleccionada */}
            {imagenPrev && (
              <div className="px-3 pt-3 flex items-start gap-2">
                <div className="relative shrink-0">
                  <img
                    src={imagenPrev.previewUrl}
                    alt="Vista previa"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                  />
                  <button
                    onClick={quitarImagen}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600
                      rounded-full flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={10} className="text-white" />
                  </button>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-xs font-medium text-gray-600">Foto lista para analizar</p>
                  <p className="text-[11px] text-gray-400">Agrega un mensaje o envía directo</p>
                </div>
              </div>
            )}

            {/* Campo de texto + botones */}
            <div className="px-3 py-3 flex items-end gap-2">
              {/* Botón de cámara/imagen */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={cargando}
                title="Adjuntar foto de cultivo"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  imagenPrev
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                }`}
              >
                {imagenPrev ? <ImagePlus size={17} /> : <Camera size={17} />}
              </button>

              {/* Botón plan de tratamiento rápido */}
              <button
                onClick={() => {
                  setInput('Genera un plan de tratamiento completo basándote en los umbrales superados en el sistema.');
                  inputRef.current?.focus();
                }}
                disabled={cargando || !hayAlertas}
                title={hayAlertas ? 'Generar plan de tratamiento' : 'Sin umbrales superados'}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600
                  text-gray-500 flex items-center justify-center transition-colors shrink-0
                  disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ClipboardList size={17} />
              </button>

              {/* Input de texto */}
              <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2.5 min-h-[40px]">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={imagenPrev ? 'Describe el problema (opcional)…' : 'Pregunta sobre tu cultivo…'}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                  disabled={cargando}
                />
              </div>

              {/* Botón enviar */}
              <button
                onClick={() => enviar()}
                disabled={(!input.trim() && !imagenPrev) || cargando}
                className="w-10 h-10 rounded-xl bg-[#1769a5] disabled:opacity-30 hover:bg-[#11537f]
                  flex items-center justify-center transition-colors shrink-0"
              >
                <Send size={15} className="text-white" />
              </button>
            </div>

            <p className="text-[10px] text-gray-300 text-center pb-2">
              Powered by Claude Vision · No reemplaza asesoría técnica profesional
            </p>
          </div>
        </div>
      )}
    </>
  );
}
