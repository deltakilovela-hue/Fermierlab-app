import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { UMBRALES_NEMATODOS, UMBRALES_FITOPATOGENOS } from '../types';
import type { MensajeChat, MediaTypeChat } from '../types';
import {
  llamarClaude, tituloDesde, uid,
  fileToBase64, getMediaType,
} from '../utils/fermierBot';
import type { MensajeApi } from '../utils/fermierBot';
import {
  Bot, Send, Loader2, Sprout, AlertCircle,
  Camera, ImagePlus, Trash2, ClipboardList,
  Plus, Search, MessageSquare, X,
} from 'lucide-react';

// ── Local types ────────────────────────────────────────────────────────────────

interface LocalImagen {
  data: string;
  mediaType: MediaTypeChat;
  previewUrl: string;
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatSidebarDate(iso: string) {
  const d   = new Date(iso);
  const hoy = new Date();
  if (isSameDay(d, hoy)) return formatTime(iso);
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  if (isSameDay(d, ayer)) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

// ── Quick suggestions ─────────────────────────────────────────────────────────

const SUGERENCIAS = [
  { emoji: '📸', texto: 'Analiza esta imagen de mi cultivo y dime qué ves.', esImagen: true },
  { emoji: '🗓️', texto: 'Genera un plan de tratamiento para Fusarium solani', esImagen: false },
  { emoji: '🌱', texto: 'Cuéntame sobre el ciclo del tomate en Sinaloa', esImagen: false },
  { emoji: '⚠️', texto: 'Umbrales de Meloidogyne superados, ¿qué hago?', esImagen: false },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgenteChat() {
  const {
    sesion, clientes, parcelas, analisis, naves, puntos,
    conversaciones, addConversacion, appendMensaje, deleteConversacion,
  } = useStore();

  const [convActiva, setConvActiva] = useState<string | null>(null);
  const [input,      setInput]      = useState('');
  const [imagenPrev, setImagenPrev] = useState<LocalImagen | null>(null);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState('');
  const [busqueda,   setBusqueda]   = useState('');

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  const convSeleccionada = conversaciones.find((c) => c.id === convActiva) ?? null;

  // Auto-scroll when messages update
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convSeleccionada?.mensajes.length, cargando]);

  // Focus input when conversation changes
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [convActiva]);

  if (!sesion) return null;

  // ── Context builder ──────────────────────────────────────────────────────────

  function buildContexto(): string {
    const lines: string[] = [`Usuario: ${sesion!.nombre} (rol: ${sesion!.rol})`];

    if (sesion!.rol === 'cliente' && sesion!.clienteId) {
      const cli = clientes.find((c) => c.id === sesion!.clienteId);
      if (cli) {
        lines.push(`Cliente: ${cli.nombre}, cultivo: ${cli.cultivo}`);
        const ps = parcelas.filter((p) => p.clienteId === cli.id);
        lines.push(`Parcelas: ${ps.map((p) => p.nombre).join(', ')}`);
      }
    } else {
      lines.push(`Clientes: ${clientes.map((c) => `${c.nombre} (${c.cultivo})`).join('; ')}`);
    }

    const alertas: string[] = [];
    analisis.forEach((a) => {
      const punto = puntos.find((p) => p.id === a.puntoId);
      const nave  = punto ? naves.find((n) => n.id === punto.naveId) : null;
      const tag   = nave?.nombre ?? 'nave desconocida';

      a.resultadosNematodos?.forEach((r) => {
        const u = UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo);
        if (u && r.individuosPor100cc > u.valor)
          alertas.push(`⚠️ ${r.organismo} en ${tag}: ${r.individuosPor100cc} ind/100cc (umbral ${u.valor}) — SUPERADO`);
      });
      a.resultadosFitopatogenos?.forEach((r) => {
        const u = UMBRALES_FITOPATOGENOS.find((u) => u.organismo === r.organismo);
        if (u && r.propagulos > u.valor)
          alertas.push(`⚠️ ${r.organismo} en ${tag}: ${r.propagulos.toLocaleString()} UFC/g (umbral ${u.valor.toLocaleString()}) — SUPERADO`);
      });
    });

    if (alertas.length) {
      lines.push('\nALERTAS DE UMBRALES DETECTADAS EN EL SISTEMA:');
      alertas.forEach((a) => lines.push(a));
    }
    return lines.join('\n');
  }

  // ── Threshold badge ──────────────────────────────────────────────────────────

  const hayAlertas = analisis.some((a) =>
    a.resultadosNematodos?.some((r) => {
      const u = UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo);
      return u && r.individuosPor100cc > u.valor;
    }) ||
    a.resultadosFitopatogenos?.some((r) => {
      const u = UMBRALES_FITOPATOGENOS.find((u) => u.organismo === r.organismo);
      return u && r.propagulos > u.valor;
    })
  );

  // ── Image handlers ────────────────────────────────────────────────────────────

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Imagen demasiado grande (máx 5 MB)'); return; }

    const data       = await fileToBase64(file);
    const mediaType  = getMediaType(file);
    const previewUrl = URL.createObjectURL(file);
    setImagenPrev({ data, mediaType, previewUrl });
    setError('');
    e.target.value = '';
    inputRef.current?.focus();
  }

  function quitarImagen() {
    if (imagenPrev) URL.revokeObjectURL(imagenPrev.previewUrl);
    setImagenPrev(null);
  }

  // ── Send message ──────────────────────────────────────────────────────────────

  async function enviar(textoForzado?: string) {
    const texto  = (textoForzado ?? input).trim();
    const imagen = imagenPrev;

    if (!texto && !imagen) return;
    if (cargando) return;

    // Clear input immediately
    setInput('');
    if (imagen) URL.revokeObjectURL(imagen.previewUrl);
    setImagenPrev(null);
    setCargando(true);
    setError('');

    // Build user MensajeChat for the store
    const userMsg: MensajeChat = {
      rol: 'user',
      texto,
      imagen: imagen ? { data: imagen.data, mediaType: imagen.mediaType } : undefined,
      fechaHora: new Date().toISOString(),
    };

    // Build API history from snapshot BEFORE store updates
    const historialApi: MensajeApi[] = [
      ...(convSeleccionada?.mensajes ?? []).map((m): MensajeApi => ({
        rol:    m.rol,
        texto:  m.texto,
        imagen: m.imagen,
      })),
      { rol: 'user', texto, imagen: imagen ? { data: imagen.data, mediaType: imagen.mediaType } : undefined },
    ];

    // Create or append to conversation
    let targetId = convActiva;
    if (!targetId) {
      const newId = uid();
      const ahora = new Date().toISOString();
      addConversacion({
        id: newId,
        titulo: tituloDesde(texto),
        mensajes: [userMsg],
        creadaEn: ahora,
        actualizadaEn: ahora,
      });
      setConvActiva(newId);
      targetId = newId;
    } else {
      appendMensaje(targetId, userMsg);
    }

    try {
      const respuesta = await llamarClaude(historialApi, buildContexto());
      appendMensaje(targetId, {
        rol:       'assistant',
        texto:     respuesta,
        fechaHora: new Date().toISOString(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  function clickSugerencia(s: (typeof SUGERENCIAS)[0]) {
    if (s.esImagen) {
      fileRef.current?.click();
      setInput('Analiza esta imagen de mi cultivo y dime qué ves.');
    } else {
      enviar(s.texto);
    }
  }

  function nuevaConversacion() {
    setConvActiva(null);
    setInput('');
    quitarImagen();
    setError('');
  }

  // ── Sidebar grouping ──────────────────────────────────────────────────────────

  const hoy    = new Date();
  const ayer   = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const semana = new Date(hoy); semana.setDate(semana.getDate() - 7);

  const q = busqueda.toLowerCase();
  const convsFiltradas = [...conversaciones]
    .filter((c) =>
      !q ||
      c.titulo.toLowerCase().includes(q) ||
      c.mensajes.some((m) => m.texto.toLowerCase().includes(q))
    )
    .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn));

  const grupos = [
    { label: 'Hoy',            items: convsFiltradas.filter((c) => isSameDay(new Date(c.actualizadaEn), hoy)) },
    { label: 'Ayer',           items: convsFiltradas.filter((c) => isSameDay(new Date(c.actualizadaEn), ayer)) },
    { label: 'Últimos 7 días', items: convsFiltradas.filter((c) => { const d = new Date(c.actualizadaEn); return !isSameDay(d, hoy) && !isSameDay(d, ayer) && d >= semana; }) },
    { label: 'Más antiguas',   items: convsFiltradas.filter((c) => new Date(c.actualizadaEn) < semana) },
  ].filter((g) => g.items.length > 0);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-72 bg-[#1769a5] flex flex-col shrink-0">

        {/* Brand + new chat */}
        <div className="px-4 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
              <Sprout size={18} className="text-green-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">FermierBot</p>
              <p className="text-[11px] text-green-400">Asesor agrícola IA</p>
            </div>
          </div>
          <button
            onClick={nuevaConversacion}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500
              text-white text-sm font-medium px-3 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={16} />
            Nueva conversación
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Search size={13} className="text-green-300 shrink-0" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar conversaciones…"
              className="bg-transparent text-xs text-white placeholder-white/40 outline-none flex-1"
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="text-white/40 hover:text-white/70 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2">
          {conversaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50 px-6 text-center">
              <MessageSquare size={30} className="text-green-300 mb-2" />
              <p className="text-xs text-white/60 leading-relaxed">
                No hay conversaciones aún.<br />Empieza una nueva para comenzar.
              </p>
            </div>
          ) : grupos.length === 0 ? (
            <p className="text-xs text-white/40 text-center mt-8">Sin resultados para "{busqueda}"</p>
          ) : (
            grupos.map((grupo) => (
              <div key={grupo.label} className="mb-1">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold px-4 pt-3 pb-1">
                  {grupo.label}
                </p>
                {grupo.items.map((conv) => (
                  <div key={conv.id} className="group relative px-2">
                    <button
                      onClick={() => { setConvActiva(conv.id); setError(''); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex flex-col gap-0.5 ${
                        convActiva === conv.id
                          ? 'bg-white/15 text-white'
                          : 'text-white/70 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium truncate flex-1 leading-snug pr-6">
                          {conv.titulo}
                        </p>
                        <span className="text-[10px] text-white/30 shrink-0 mt-0.5 leading-none">
                          {formatSidebarDate(conv.actualizadaEn)}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 truncate leading-snug">
                        {conv.mensajes[conv.mensajes.length - 1]?.texto.slice(0, 55) || '…'}
                      </p>
                    </button>

                    {/* Delete button — visible on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (convActiva === conv.id) setConvActiva(null);
                        deleteConversacion(conv.id);
                      }}
                      title="Eliminar conversación"
                      className="absolute right-3.5 top-2 opacity-0 group-hover:opacity-100 transition-opacity
                        w-6 h-6 flex items-center justify-center rounded-lg
                        hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Chat area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#1769a5]/10 flex items-center justify-center">
            <Bot size={18} className="text-[#1769a5]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">
              {convSeleccionada ? convSeleccionada.titulo : 'Nueva conversación'}
            </p>
            <p className="text-xs text-gray-400">
              {convSeleccionada
                ? `${convSeleccionada.mensajes.length} mensajes · ${formatSidebarDate(convSeleccionada.actualizadaEn)}`
                : 'Haz una pregunta para comenzar'}
            </p>
          </div>
          {hayAlertas && (
            <span className="bg-red-100 text-red-600 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0">
              ⚠️ Umbrales superados
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Empty / welcome state */}
          {!convSeleccionada && (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1769a5] flex items-center justify-center mb-4 shadow-xl shadow-green-900/20">
                <Sprout size={32} className="text-green-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">FermierBot</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Tu asesor agrícola IA con más de 20 años de experiencia en cultivos de invernadero.
                Pregúntame sobre plagas, enfermedades, tratamientos o manda una foto de tu planta.
              </p>

              {hayAlertas && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5 mb-5
                  flex items-start gap-3 text-left w-full">
                  <span className="text-xl shrink-0">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-0.5">Umbrales superados detectados</p>
                    <p className="text-xs text-red-500 leading-relaxed">
                      Hay análisis con organismos por encima del umbral de daño económico.
                      Pregúntame para generar un plan de tratamiento completo.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 w-full">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s.texto}
                    onClick={() => clickSugerencia(s)}
                    className={`flex items-start gap-2.5 px-3 py-3 rounded-xl text-left transition-colors ${
                      s.esImagen
                        ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700'
                        : 'bg-green-50 hover:bg-green-100 border border-green-200 text-green-700'
                    }`}
                  >
                    <span className="text-xl shrink-0">{s.emoji}</span>
                    <span className="text-xs leading-snug">
                      {s.esImagen ? 'Subir foto para diagnóstico' : s.texto}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages list */}
          {convSeleccionada?.mensajes.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.rol === 'user' ? 'flex-row-reverse' : ''}`}>
              {m.rol === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-[#1769a5] flex items-center justify-center shrink-0 mt-1">
                  <Bot size={15} className="text-green-300" />
                </div>
              )}
              <div className={`flex flex-col gap-1 max-w-[72%] ${m.rol === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl overflow-hidden text-sm leading-relaxed ${
                    m.rol === 'user'
                      ? 'bg-[#1769a5] text-white rounded-tr-sm'
                      : 'bg-white text-gray-700 shadow-sm rounded-tl-sm border border-gray-100'
                  }`}
                >
                  {/* Stored image */}
                  {m.imagen && (
                    <img
                      src={`data:${m.imagen.mediaType};base64,${m.imagen.data}`}
                      alt="Foto del cultivo"
                      className="w-full max-h-64 object-cover"
                    />
                  )}
                  {m.texto && (
                    <div className="px-4 py-3" style={{ whiteSpace: 'pre-wrap' }}>
                      {m.texto}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 px-1">
                  {formatTime(m.fechaHora)}
                </span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {cargando && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1769a5] flex items-center justify-center shrink-0 mt-1">
                <Bot size={15} className="text-green-300" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100
                flex items-center gap-2">
                <Loader2 size={14} className="text-green-500 animate-spin" />
                <span className="text-xs text-gray-400">Analizando…</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-lg mx-auto">
              <AlertCircle size={15} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* ── Input area ─────────────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 bg-white px-6 pt-3 pb-4 shrink-0">

          {/* Image preview strip */}
          {imagenPrev && (
            <div className="flex items-center gap-3 mb-3">
              <div className="relative shrink-0">
                <img
                  src={imagenPrev.previewUrl}
                  alt="Vista previa"
                  className="w-14 h-14 rounded-xl object-cover border border-gray-200"
                />
                <button
                  onClick={quitarImagen}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600
                    rounded-full flex items-center justify-center transition-colors"
                >
                  <Trash2 size={10} className="text-white" />
                </button>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Foto lista para analizar</p>
                <p className="text-[11px] text-gray-400">Agrega un mensaje o envía directo</p>
              </div>
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2">

            {/* Camera / image button */}
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
              {imagenPrev ? <ImagePlus size={18} /> : <Camera size={18} />}
            </button>

            {/* Treatment plan button */}
            <button
              onClick={() =>
                enviar('Genera un plan de tratamiento completo basándote en los umbrales superados en el sistema.')
              }
              disabled={cargando || !hayAlertas}
              title={hayAlertas ? 'Generar plan de tratamiento' : 'Sin umbrales superados'}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600
                text-gray-500 flex items-center justify-center transition-colors shrink-0
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ClipboardList size={18} />
            </button>

            {/* Text input */}
            <div className="flex-1 flex items-center bg-gray-100 rounded-2xl px-4 py-2.5 min-h-[42px]">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  imagenPrev
                    ? 'Describe el problema (opcional)…'
                    : 'Pregunta sobre tu cultivo…'
                }
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                disabled={cargando}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => enviar()}
              disabled={(!input.trim() && !imagenPrev) || cargando}
              className="w-10 h-10 rounded-xl bg-[#1769a5] disabled:opacity-30 hover:bg-[#11537f]
                flex items-center justify-center transition-colors shrink-0"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>

          <p className="text-[10px] text-gray-300 text-center mt-2">
            Powered by Claude Vision · No reemplaza asesoría técnica profesional
          </p>
        </div>
      </div>
    </div>
  );
}
