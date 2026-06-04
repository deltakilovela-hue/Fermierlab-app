import { useState, useMemo, Fragment } from 'react';
import {
  MapContainer, TileLayer, Polygon, Marker, CircleMarker, Popup,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from 'recharts';
import { useStore } from '../store/useStore';
import type { Analisis } from '../types';
import {
  COLORES_ORGANISMOS, UMBRALES_NEMATODOS, UMBRALES_FITOPATOGENOS,
} from '../types';
import { exportPdf } from '../utils/exportPdf';
import type { PdfDetalleRow, ReporteData } from '../utils/exportPdf';
import {
  MessageCircle, FileDown, ChevronDown, MapPin, BarChart3,
  GitCompare, Loader2, Building2, AlertCircle, CheckCircle2,
  FlaskConical, Leaf,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const WA_PHONE   = '526692900628';
const PARCELA_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6'];
const DEFAULT_CENTER: [number, number] = [24.8, -107.4];
const DEFAULT_ZOOM = 13;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parcelaColor(i: number) { return PARCELA_COLORS[i % PARCELA_COLORS.length]; }

function centroid(pts: [number, number][]): [number, number] {
  return [
    pts.reduce((s, [la]) => s + la, 0) / pts.length,
    pts.reduce((s, [, ln]) => s + ln, 0) / pts.length,
  ];
}

function parcelaIcon(nombre: string, color: string) {
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="
      position:absolute;transform:translate(-50%,-50%);
      background:${color};color:#fff;padding:3px 10px;border-radius:20px;
      font-size:12px;font-weight:700;white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.45);pointer-events:none;
    ">${nombre}</div>`,
  });
}

function puntoSeverity(
  puntoId: string,
  analisis: Analisis[],
): 0 | 1 | 2 {
  const lista = analisis.filter((a) => a.puntoId === puntoId && a.tipo === 'nematodos');
  if (!lista.length) return 0;
  let sev: 0 | 1 | 2 = 0;
  for (const a of lista) {
    for (const r of a.resultadosNematodos ?? []) {
      const u = UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo);
      if (u && r.individuosPor100cc >= u.valor) sev = 2;
      else if (u && r.individuosPor100cc >= u.valor * 0.7 && sev < 2) sev = 1;
    }
  }
  return sev;
}

const SEV_COLOR = { 0: '#16a34a', 1: '#f97316', 2: '#ef4444' } as const;

// ── Section card ──────────────────────────────────────────────────────────────

function Section({
  title, icon: Icon, children, badge,
}: {
  title: string; icon: React.ElementType;
  children: React.ReactNode; badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-[#1a3320]/8 flex items-center justify-center">
          <Icon size={14} className="text-[#1a3320]" />
        </div>
        <h2 className="text-sm font-bold text-[#1a3320] flex-1">{title}</h2>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

// ── Custom bar tooltip ────────────────────────────────────────────────────────

function NemTooltip({ active, payload }: { active?: boolean; payload?: { payload: { organismo: string; valor: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const u = UMBRALES_NEMATODOS.find((u) => u.organismo === d.organismo);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{d.organismo}</p>
      <p style={{ color: COLORES_ORGANISMOS[d.organismo] ?? '#6b7280' }}>
        {d.valor} ind/100cc
      </p>
      {u && (
        <p className="text-gray-400 mt-0.5">Umbral: {u.valor} ind/100cc</p>
      )}
    </div>
  );
}

function FitoTooltip({ active, payload }: { active?: boolean; payload?: { payload: { organismo: string; valor: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const u = UMBRALES_FITOPATOGENOS.find((u) => u.organismo === d.organismo);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{d.organismo}</p>
      <p style={{ color: COLORES_ORGANISMOS[d.organismo] ?? '#6b7280' }}>
        {d.valor.toLocaleString()} UFC/g
      </p>
      {u && (
        <p className="text-gray-400 mt-0.5">Umbral: {u.valor.toLocaleString()} UFC/g</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Portal() {
  const { clientes, parcelas, naves, puntos, analisis } = useStore();

  const { sesion } = useStore();

  // Si el usuario es cliente, forzar su clienteId; si es admin/asesor, puede cambiar
  const defaultId = sesion?.rol === 'cliente' && sesion.clienteId
    ? sesion.clienteId
    : clientes[0]?.id ?? '';

  const [clienteId, setClienteId] = useState(defaultId);
  const [exporting, setExporting]  = useState(false);

  const cliente = clientes.find((c) => c.id === clienteId);
  const esCliente = sesion?.rol === 'cliente';

  // ── Derived data ─────────────────────────────────────────────────────────────

  const misParcelas = useMemo(
    () => parcelas.filter((p) => p.clienteId === clienteId),
    [parcelas, clienteId],
  );

  const misNaves = useMemo(() => {
    const ids = new Set(misParcelas.map((p) => p.id));
    return naves.filter((n) => ids.has(n.parcelaId));
  }, [naves, misParcelas]);

  const misNaveIds = useMemo(() => misNaves.map((n) => n.id), [misNaves]);

  const misPuntos = useMemo(
    () => puntos.filter((p) => misNaveIds.includes(p.naveId)),
    [puntos, misNaveIds],
  );

  const misAnalisis = useMemo(
    () => analisis.filter((a) => misPuntos.some((p) => p.id === a.puntoId)),
    [analisis, misPuntos],
  );

  const misPuntosConCoords = useMemo(
    () => misPuntos.filter((p) => p.lat !== undefined && p.lng !== undefined),
    [misPuntos],
  );

  // Map center
  const mapCenter = useMemo<[number, number]>(() => {
    const all: [number, number][] = [
      ...misParcelas.flatMap((p) => p.poligono ?? []),
      ...misPuntosConCoords.map((p) => [p.lat!, p.lng!] as [number, number]),
    ];
    return all.length ? centroid(all) : DEFAULT_CENTER;
  }, [misParcelas, misPuntosConCoords]);

  // Last analysis date
  const ultimaFecha = useMemo(() => {
    const dates = misAnalisis.map((a) => a.fechaEmision).filter(Boolean).sort().reverse();
    return dates[0] ?? null;
  }, [misAnalisis]);

  function fmtFecha(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso + 'T12:00').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: '2-digit',
    });
  }

  // Nematode chart data (max value per organism across all analyses)
  const nemData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of misAnalisis.filter((a) => a.tipo === 'nematodos')) {
      for (const r of a.resultadosNematodos ?? []) {
        if (r.organismo === 'Saprófitos') continue;
        map[r.organismo] = Math.max(map[r.organismo] ?? 0, r.individuosPor100cc);
      }
    }
    return Object.entries(map).map(([organismo, valor]) => ({ organismo, valor }));
  }, [misAnalisis]);

  // Fitopatogen chart data
  const fitoData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of misAnalisis.filter((a) => a.tipo === 'fitopatogenos')) {
      for (const r of a.resultadosFitopatogenos ?? []) {
        map[r.organismo] = Math.max(map[r.organismo] ?? 0, r.propagulos);
      }
    }
    return Object.entries(map).map(([organismo, valor]) => ({ organismo, valor }));
  }, [misAnalisis]);

  // Comparativa pre/post
  const comparativaData = useMemo(() => {
    const hayPre  = misAnalisis.some((a) => a.tipoMuestreo === 'pre-tratamiento');
    const hayPost = misAnalisis.some((a) => a.tipoMuestreo === 'post-tratamiento');
    if (!hayPre || !hayPost) return null;

    const map: Record<string, { pre: number; post: number }> = {};
    for (const a of misAnalisis.filter((a) => a.tipo === 'nematodos')) {
      for (const r of a.resultadosNematodos ?? []) {
        if (r.organismo === 'Saprófitos') continue;
        if (!map[r.organismo]) map[r.organismo] = { pre: 0, post: 0 };
        if (a.tipoMuestreo === 'pre-tratamiento')
          map[r.organismo].pre = Math.max(map[r.organismo].pre, r.individuosPor100cc);
        else if (a.tipoMuestreo === 'post-tratamiento')
          map[r.organismo].post = Math.max(map[r.organismo].post, r.individuosPor100cc);
      }
    }
    return Object.entries(map)
      .filter(([, v]) => v.pre > 0 || v.post > 0)
      .map(([org, v]) => ({
        organismo: org,
        'Pre-tratamiento': v.pre,
        'Post-tratamiento': v.post,
        eficacia: v.pre > 0 ? Math.round(((v.pre - v.post) / v.pre) * 100) : 0,
      }));
  }, [misAnalisis]);

  // WhatsApp link
  const waLink = useMemo(() => {
    const msg = encodeURIComponent(
      `Hola Fermier Lab, soy ${cliente?.nombre ?? 'un cliente'} y quisiera información sobre mis análisis de laboratorio.`,
    );
    return `https://wa.me/${WA_PHONE}?text=${msg}`;
  }, [cliente]);

  // PDF export
  async function handleExport() {
    if (!cliente) return;
    setExporting(true);
    try {
      const rows: PdfDetalleRow[] = misAnalisis.flatMap((a) => {
        const punto   = misPuntos.find((p) => p.id === a.puntoId);
        const nave    = misNaves.find((n) => n.id === punto?.naveId);
        const parcela = misParcelas.find((p) => p.id === nave?.parcelaId);

        if (a.tipo === 'nematodos') {
          return (a.resultadosNematodos ?? []).map((r): PdfDetalleRow => ({
            parcela: parcela?.nombre ?? '',
            nave: nave?.nombre ?? '',
            tabla: punto?.tabla ?? '',
            tipo: 'nematodos' as const,
            tipoMuestreo: a.tipoMuestreo,
            organismo: r.organismo,
            c1: r.conteo1, c2: r.conteo2, c3: r.conteo3,
            promedio: r.promedio,
            resultado: String(r.individuosPor100cc),
            valor: r.individuosPor100cc,
            umbral: UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo)?.valor,
          }));
        } else {
          return (a.resultadosFitopatogenos ?? []).map((r): PdfDetalleRow => ({
            parcela: parcela?.nombre ?? '',
            nave: nave?.nombre ?? '',
            tabla: punto?.tabla ?? '',
            tipo: 'fitopatogenos' as const,
            tipoMuestreo: a.tipoMuestreo,
            organismo: r.organismo,
            c1: r.conteo1, c2: r.conteo2, c3: r.conteo3,
            promedio: r.promedio,
            resultado: String(r.propagulos),
            valor: r.propagulos,
            umbral: UMBRALES_FITOPATOGENOS.find((u) => u.organismo === r.organismo)?.valor,
          }));
        }
      });

      const data: ReporteData = {
        clienteNombre: cliente.nombre,
        parcelaNombre: misParcelas.map((p) => p.nombre).join(', ') || 'Todas',
        tipoFiltro: 'todos',
        dataNem: nemData.map((d) => ({ organismo: d.organismo, Valor: d.valor })),
        dataFito: fitoData.map((d) => ({ organismo: d.organismo, Valor: d.valor })),
        detalleRows: rows,
      };

      await exportPdf(data);
    } finally {
      setExporting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f1f5f1]">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#1a3320] text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Leaf size={16} className="text-green-300" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">Fermier Lab</p>
              <p className="text-[10px] text-green-300 leading-none mt-0.5">Portal del cliente</p>
            </div>
          </div>

          {/* Cliente selector — solo visible para admin/asesor */}
          {!esCliente && (
            <div className="relative">
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="appearance-none bg-white/10 hover:bg-white/15 text-white text-xs border
                  border-white/25 rounded-xl px-3 py-2 pr-8 cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id} className="text-gray-800 bg-white">{c.nombre}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/60" />
            </div>
          )}
          {esCliente && (
            <span className="text-white/80 text-sm font-semibold">{cliente?.nombre}</span>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <button
            onClick={handleExport}
            disabled={exporting || misAnalisis.length === 0}
            className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20
              text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors disabled:opacity-40"
          >
            {exporting
              ? <><Loader2 size={13} className="animate-spin" /> Generando…</>
              : <><FileDown size={13} /> Descargar PDF</>}
          </button>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#22bf5c] text-white
              text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <MessageCircle size={14} />
            <span className="hidden sm:inline">Contactar</span>
          </a>
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────────── */}
      {clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <Building2 size={36} />
          <p className="text-sm">No hay clientes registrados.</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">

          {/* ── Stat cards ────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Parcelas"       value={misParcelas.length}      color="#3b82f6" />
            <StatCard label="Naves"          value={misNaves.length}         color="#22c55e" />
            <StatCard label="Análisis"       value={misAnalisis.length}      color="#8b5cf6" />
            <StatCard label="Último análisis" value={fmtFecha(ultimaFecha)}  color="#f97316" />
          </div>

          {/* ── Mapa ──────────────────────────────────────────────────────────────── */}
          <Section title="Ubicación de la parcela" icon={MapPin}>
            <div style={{ height: 280 }} className="relative">
              {misParcelas.every((p) => !p.poligono?.length) && !misPuntosConCoords.length ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
                  <MapPin size={32} />
                  <p className="text-xs text-gray-400">Sin coordenadas registradas aún</p>
                </div>
              ) : (
                <MapContainer
                  key={clienteId}
                  center={mapCenter}
                  zoom={DEFAULT_ZOOM}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles © Esri"
                    maxZoom={20}
                  />
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    attribution=""
                    maxZoom={20}
                    opacity={0.7}
                  />

                  {/* Parcela polygons */}
                  {misParcelas.map((p, i) => {
                    if (!p.poligono || p.poligono.length < 3) return null;
                    const color  = parcelaColor(i);
                    const center = centroid(p.poligono);
                    return (
                      <Fragment key={p.id}>
                        <Polygon
                          positions={p.poligono}
                          pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 2.5, opacity: 0.9 }}
                        />
                        <Marker position={center} icon={parcelaIcon(p.nombre, color)} />
                      </Fragment>
                    );
                  })}

                  {/* Sampling points */}
                  {misPuntosConCoords.map((pt) => {
                    const sev   = puntoSeverity(pt.id, analisis);
                    const color = SEV_COLOR[sev];
                    const nave  = misNaves.find((n) => n.id === pt.naveId);
                    return (
                      <CircleMarker
                        key={pt.id}
                        center={[pt.lat!, pt.lng!]}
                        radius={8}
                        pathOptions={{ color: 'white', fillColor: color, fillOpacity: 0.9, weight: 2 }}
                      >
                        <Popup>
                          <p className="text-xs font-semibold">{nave?.nombre} · {pt.tabla}</p>
                          <p className="text-xs mt-0.5" style={{ color }}>
                            {sev === 2 ? '⚠ Sobre umbral' : sev === 1 ? '⚡ Precaución' : '✓ Normal'}
                          </p>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              )}
            </div>
            {/* Map legend */}
            <div className="flex items-center gap-5 px-5 py-3 border-t border-gray-50">
              {[
                { color: '#ef4444', label: 'Sobre umbral' },
                { color: '#f97316', label: 'Precaución' },
                { color: '#16a34a', label: 'Normal' },
                { color: '#6b7280', label: 'Sin análisis' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Nematodos chart ───────────────────────────────────────────────────── */}
          {nemData.length > 0 && (
            <Section title="Nematodos detectados" icon={BarChart3}
              badge={
                <span className="text-[10px] text-gray-400 font-medium">ind / 100cc</span>
              }
            >
              <div className="p-5" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nemData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="organismo" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<NemTooltip />} cursor={{ fill: '#f9fafb' }} />
                    {/* Threshold reference lines */}
                    {UMBRALES_NEMATODOS.map((u) => (
                      <ReferenceLine
                        key={u.organismo}
                        y={u.valor}
                        stroke="#ef4444"
                        strokeDasharray="5 4"
                        strokeWidth={1.5}
                        label={{ value: u.valor, position: 'right', fontSize: 9, fill: '#ef4444' }}
                      />
                    ))}
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {nemData.map((entry) => {
                        const u = UMBRALES_NEMATODOS.find((u) => u.organismo === entry.organismo);
                        const over = u && entry.valor >= u.valor;
                        const warn = u && !over && entry.valor >= u.valor * 0.7;
                        return (
                          <Cell
                            key={entry.organismo}
                            fill={over ? '#ef4444' : warn ? '#f97316' : (COLORES_ORGANISMOS[entry.organismo] ?? '#6b7280')}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-2 px-5 pb-4 text-[10px] text-gray-400">
                <span className="inline-block w-6 border-t-2 border-dashed border-red-400" />
                Línea roja = umbral de daño
              </div>
            </Section>
          )}

          {/* ── Fitopatógenos chart ───────────────────────────────────────────────── */}
          {fitoData.length > 0 && (
            <Section title="Fitopatógenos detectados" icon={BarChart3}
              badge={
                <span className="text-[10px] text-gray-400 font-medium">UFC / g</span>
              }
            >
              <div className="p-5" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fitoData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="organismo" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip content={<FitoTooltip />} cursor={{ fill: '#f9fafb' }} />
                    {UMBRALES_FITOPATOGENOS.map((u) => (
                      <ReferenceLine
                        key={u.organismo}
                        y={u.valor}
                        stroke="#ef4444"
                        strokeDasharray="5 4"
                        strokeWidth={1.5}
                      />
                    ))}
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {fitoData.map((entry) => {
                        const u = UMBRALES_FITOPATOGENOS.find((u) => u.organismo === entry.organismo);
                        const over = u && entry.valor >= u.valor;
                        return (
                          <Cell
                            key={entry.organismo}
                            fill={over ? '#ef4444' : (COLORES_ORGANISMOS[entry.organismo] ?? '#6b7280')}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}

          {/* ── Comparativa pre/post ──────────────────────────────────────────────── */}
          {comparativaData && comparativaData.length > 0 && (
            <Section title="Comparativa pre / post tratamiento" icon={GitCompare}>
              <div className="p-5" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparativaData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="organismo" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: unknown, name: unknown) => [`${v} ind/100cc`, name]}
                      cursor={{ fill: '#f9fafb' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="Pre-tratamiento" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Post-tratamiento" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Efficacy chips */}
              <div className="flex flex-wrap gap-2 px-5 pb-4">
                {comparativaData.map((d) => (
                  d.eficacia > 0 && (
                    <span key={d.organismo}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        d.eficacia >= 70
                          ? 'bg-green-100 text-green-700'
                          : d.eficacia >= 30
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {d.organismo}: {d.eficacia}% reducción
                    </span>
                  )
                ))}
              </div>
            </Section>
          )}

          {/* ── Detalle de análisis ───────────────────────────────────────────────── */}
          <Section title="Estudios realizados" icon={FlaskConical}>
            {misAnalisis.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                No hay análisis registrados para este cliente
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Folio</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nave / Parcela</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Muestreo</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha emisión</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...misAnalisis]
                      .sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision))
                      .map((a, i) => {
                        const punto   = misPuntos.find((p) => p.id === a.puntoId);
                        const nave    = misNaves.find((n) => n.id === punto?.naveId);
                        const parcela = misParcelas.find((p) => p.id === nave?.parcelaId);

                        const overUmbral = a.tipo === 'nematodos'
                          ? (a.resultadosNematodos ?? []).some((r) => {
                              const u = UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo);
                              return u && r.individuosPor100cc >= u.valor;
                            })
                          : (a.resultadosFitopatogenos ?? []).some((r) => {
                              const u = UMBRALES_FITOPATOGENOS.find((u) => u.organismo === r.organismo);
                              return u && r.propagulos >= u.valor;
                            });

                        const muestreoLabel: Record<string, string> = {
                          'general': 'General',
                          'pre-tratamiento': 'Pre-tratamiento',
                          'post-tratamiento': 'Post-tratamiento',
                        };

                        return (
                          <tr key={a.id} className={`border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                            <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{a.folio || '—'}</td>
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-semibold text-gray-700">{nave?.nombre ?? '—'}</p>
                              <p className="text-xs text-gray-400">{parcela?.nombre ?? ''} · {punto?.tabla ?? ''}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                                a.tipo === 'nematodos'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {a.tipo === 'nematodos' ? 'Nematodos' : 'Fitopatógenos'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-gray-600">
                              {muestreoLabel[a.tipoMuestreo] ?? a.tipoMuestreo}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-gray-500">{fmtFecha(a.fechaEmision)}</td>
                            <td className="px-5 py-3.5 text-center">
                              {overUmbral ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                  <AlertCircle size={11} /> Sobre umbral
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 size={11} /> Normal
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Acciones finales ──────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 pb-10">
            <button
              onClick={handleExport}
              disabled={exporting || misAnalisis.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1a3320] text-white
                px-6 py-4 rounded-2xl text-sm font-bold hover:bg-[#254830]
                transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exporting
                ? <><Loader2 size={16} className="animate-spin" /> Generando PDF…</>
                : <><FileDown size={16} /> Descargar reporte PDF</>}
            </button>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#22bf5c]
                text-white px-6 py-4 rounded-2xl text-sm font-bold transition-colors shadow-sm"
            >
              <MessageCircle size={16} />
              Contactar por WhatsApp
            </a>
          </div>

        </div>
      )}
    </div>
  );
}
