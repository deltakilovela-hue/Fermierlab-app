import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { COLORES_ORGANISMOS, UMBRALES_NEMATODOS } from '../types';
import { TrendingDown, TrendingUp, Minus, ChevronDown, BarChart3, AlertTriangle } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function pct(pre: number, post: number): number {
  if (pre === 0) return 0;
  return ((post - pre) / pre) * 100;
}

function formatVal(n: number, tipo: 'nematodos' | 'fitopatogenos'): string {
  if (tipo === 'nematodos') return `${n} ind/100cc`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M UFC/g`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k UFC/g`;
  return `${n} UFC/g`;
}

// ── Cambio chip ───────────────────────────────────────────────────────────────

function CambioChip({ pre, post, esBeneficioso }: { pre: number; post: number; esBeneficioso?: boolean }) {
  if (pre === 0 && post === 0) return <span className="text-gray-300 text-xs">—</span>;
  const diff = pct(pre, post);
  // Para organismos beneficiosos (Trichoderma): aumento es bueno
  const esBueno = esBeneficioso ? diff > 0 : diff < 0;
  const color = esBueno ? 'text-green-600' : diff === 0 ? 'text-gray-400' : 'text-red-600';
  const bg = esBueno ? 'bg-green-50' : diff === 0 ? 'bg-gray-50' : 'bg-red-50';
  const Icon = Math.abs(diff) < 1 ? Minus : esBueno ? TrendingDown : TrendingUp;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color} ${bg}`}>
      <Icon size={11} />
      {diff === 0 ? 'Sin cambio' : `${Math.abs(diff).toFixed(0)}% ${diff < 0 ? '↓' : '↑'}`}
    </span>
  );
}

// ── Selector ──────────────────────────────────────────────────────────────────

function Sel({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 cursor-pointer shadow-sm"
        >
          {children}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const BENEFICIOSOS = ['Trichoderma'];

export default function Comparativa() {
  const { clientes, parcelas, naves, puntos, analisis } = useStore();

  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '');
  const [parcelaId, setParcelaId] = useState('');
  const [naveId, setNaveId] = useState('');
  const [tipo, setTipo] = useState<'nematodos' | 'fitopatogenos'>('nematodos');

  const parcelasFiltradas = parcelas.filter((p) => p.clienteId === clienteId);
  const navesFiltradas = naves.filter((n) => parcelaId ? n.parcelaId === parcelaId : parcelasFiltradas.some((p) => p.id === n.parcelaId));

  // ── Calcular promedios por organismo para una nave ────────────────────────
  const { preData, postData, organismos, hayPre, hayPost } = useMemo(() => {
    if (!naveId) return { preData: {}, postData: {}, organismos: [], hayPre: false, hayPost: false };

    const ptIds = puntos.filter((p) => p.naveId === naveId).map((p) => p.id);

    const analysisPre = analisis.filter(
      (a) => ptIds.includes(a.puntoId) && a.tipo === tipo && a.tipoMuestreo === 'pre-tratamiento'
    );
    const analysisPost = analisis.filter(
      (a) => ptIds.includes(a.puntoId) && a.tipo === tipo && a.tipoMuestreo === 'post-tratamiento'
    );

    function avgByOrg(list: typeof analysisPre, campo: 'nematodos' | 'fitopatogenos') {
      const acc: Record<string, number[]> = {};
      for (const a of list) {
        const resultados = campo === 'nematodos' ? a.resultadosNematodos : a.resultadosFitopatogenos;
        for (const r of resultados ?? []) {
          const val = campo === 'nematodos'
            ? (r as { individuosPor100cc: number }).individuosPor100cc
            : (r as { propagulos: number }).propagulos;
          if (!acc[r.organismo]) acc[r.organismo] = [];
          acc[r.organismo].push(val);
        }
      }
      const result: Record<string, number> = {};
      for (const [org, vals] of Object.entries(acc)) {
        result[org] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
      return result;
    }

    const preData = avgByOrg(analysisPre, tipo);
    const postData = avgByOrg(analysisPost, tipo);
    const allOrgs = Array.from(new Set([...Object.keys(preData), ...Object.keys(postData)]));

    return {
      preData,
      postData,
      organismos: allOrgs,
      hayPre: analysisPre.length > 0,
      hayPost: analysisPost.length > 0,
    };
  }, [naveId, tipo, analisis, puntos]);

  // ── Gráfica agrupada ──────────────────────────────────────────────────────
  const chartData = organismos.map((org) => ({
    organismo: org,
    'Pre-tratamiento': preData[org] ?? 0,
    'Post-tratamiento': postData[org] ?? 0,
  }));

  // ── Eficacia global ───────────────────────────────────────────────────────
  const eficacia = useMemo(() => {
    if (!hayPre || !hayPost) return null;
    const patogenos = organismos.filter((o) => !BENEFICIOSOS.includes(o) && o !== 'Saprófitos');
    if (patogenos.length === 0) return null;
    const reducciones = patogenos.map((o) => {
      const pre = preData[o] ?? 0;
      const post = postData[o] ?? 0;
      return pre > 0 ? ((pre - post) / pre) * 100 : 0;
    });
    return Math.round(reducciones.reduce((a, b) => a + b, 0) / reducciones.length);
  }, [preData, postData, organismos, hayPre, hayPost]);

  const unidad = tipo === 'nematodos' ? 'ind/100cc' : 'UFC/g';

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1769a5]">Comparativa pre/post tratamiento</h1>
        <p className="text-sm text-gray-500">Evalúa la eficacia del tratamiento comparando los resultados antes y después</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Sel label="Cliente" value={clienteId} onChange={(v) => { setClienteId(v); setParcelaId(''); setNaveId(''); }}>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Sel>
          <Sel label="Parcela" value={parcelaId} onChange={(v) => { setParcelaId(v); setNaveId(''); }}>
            <option value="">Todas</option>
            {parcelasFiltradas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Sel>
          <Sel label="Nave" value={naveId} onChange={setNaveId}>
            <option value="">Seleccionar nave</option>
            {navesFiltradas.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </Sel>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Tipo</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 h-[38px]">
              {(['nematodos', 'fitopatogenos'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex-1 text-xs font-medium transition-colors ${
                    tipo === t ? 'bg-[#1769a5] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'nematodos' ? 'Nematodos' : 'Fitopatógenos'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sin datos */}
      {!naveId && (
        <div className="bg-white rounded-xl p-10 border border-gray-100 shadow-sm flex flex-col items-center gap-3 text-center">
          <BarChart3 size={32} className="text-gray-200" />
          <p className="text-sm text-gray-500">Selecciona una nave para ver la comparativa</p>
        </div>
      )}

      {naveId && (!hayPre || !hayPost) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-700">
              {!hayPre && !hayPost ? 'Sin datos para esta nave y tipo de análisis' :
               !hayPre ? 'No hay muestreo pre-tratamiento para esta nave' :
               'No hay muestreo post-tratamiento para esta nave'}
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Para la comparativa se necesitan análisis de pre y post tratamiento en la misma nave.
            </p>
          </div>
        </div>
      )}

      {naveId && hayPre && hayPost && (
        <>
          {/* KPI de eficacia global */}
          {eficacia !== null && (
            <div className={`rounded-xl p-5 border flex items-center gap-5 ${
              eficacia >= 60 ? 'bg-green-50 border-green-200' :
              eficacia >= 30 ? 'bg-orange-50 border-orange-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${
                eficacia >= 60 ? 'bg-green-100 text-green-700' :
                eficacia >= 30 ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {eficacia}%
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {eficacia >= 60 ? '✅ Tratamiento efectivo' :
                   eficacia >= 30 ? '⚠️ Efectividad parcial' :
                   '❌ Baja efectividad'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Reducción promedio de patógenos: <strong>{eficacia}%</strong> —{' '}
                  {eficacia >= 60
                    ? 'El tratamiento controló satisfactoriamente la población.'
                    : eficacia >= 30
                    ? 'Se recomienda complementar con otro manejo.'
                    : 'Evaluar cambio de producto o reapliación.'}
                </p>
              </div>
            </div>
          )}

          {/* Gráfica agrupada */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">
              Comparativa por organismo — {unidad}
            </h2>
            <p className="text-xs text-gray-400 mb-4">Promedio de todos los puntos de muestreo de la nave</p>

            {tipo === 'nematodos' && (
              <div className="flex flex-wrap gap-3 mb-3">
                {UMBRALES_NEMATODOS.filter((u) => organismos.includes(u.organismo)).map((u) => (
                  <span key={u.organismo} className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="inline-block w-4 border-t-2 border-dashed border-red-400" />
                    Umbral {u.organismo}: {u.valor}
                  </span>
                ))}
              </div>
            )}

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="organismo" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => tipo === 'fitopatogenos' && v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(0)}M`
                    : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  formatter={(value, name) => [formatVal(Number(value), tipo), name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                {tipo === 'nematodos' && UMBRALES_NEMATODOS.filter((u) => organismos.includes(u.organismo)).map((u) => (
                  <ReferenceLine key={u.organismo} y={u.valor} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.5} />
                ))}
                <Bar dataKey="Pre-tratamiento" fill="#f97316" maxBarSize={40} radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="Post-tratamiento" fill="#16a34a" maxBarSize={40} radius={[4, 4, 0, 0]} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla detalle */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Detalle por organismo</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Organismo</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Tipo</th>
                    <th className="text-right px-4 py-3 font-semibold text-orange-600">Pre-tratamiento</th>
                    <th className="text-right px-4 py-3 font-semibold text-green-700">Post-tratamiento</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Diferencia</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Cambio</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {organismos.map((org) => {
                    const pre = preData[org] ?? 0;
                    const post = postData[org] ?? 0;
                    const diff = post - pre;
                    const esBenef = BENEFICIOSOS.includes(org);
                    const esSap = org === 'Saprófitos';
                    const umbral = UMBRALES_NEMATODOS.find((u) => u.organismo === org);
                    const sobreUmbral = umbral && post >= umbral.valor;
                    const reduccion = pct(pre, post);

                    // Estado del tratamiento para este organismo
                    let estadoLabel = '';
                    let estadoColor = '';
                    if (esSap) {
                      estadoLabel = 'Indicador';
                      estadoColor = 'bg-gray-100 text-gray-600';
                    } else if (esBenef) {
                      estadoLabel = reduccion < 0 ? 'Bajó ⚠️' : '↑ Aumentó ✅';
                      estadoColor = reduccion < 0 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700';
                    } else {
                      if (reduccion <= -60) { estadoLabel = 'Control efectivo'; estadoColor = 'bg-green-50 text-green-700'; }
                      else if (reduccion <= -30) { estadoLabel = 'Control parcial'; estadoColor = 'bg-yellow-50 text-yellow-700'; }
                      else if (reduccion < 0) { estadoLabel = 'Reducción leve'; estadoColor = 'bg-orange-50 text-orange-700'; }
                      else { estadoLabel = 'Sin control'; estadoColor = 'bg-red-50 text-red-700'; }
                    }

                    return (
                      <tr key={org} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium" style={{ color: COLORES_ORGANISMOS[org] ?? '#374151' }}>
                          {org}
                          {esBenef && <span className="ml-1 text-[10px] text-gray-400">(benéfico)</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{unidad}</td>
                        <td className="px-4 py-3 text-right font-medium text-orange-600">
                          {pre > 0 ? formatVal(pre, tipo) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${sobreUmbral ? 'text-red-600' : 'text-green-700'}`}>
                          {post > 0 ? formatVal(post, tipo) : <span className="text-gray-300">—</span>}
                          {sobreUmbral && <span className="ml-1 text-[10px]">⚠️</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${diff < 0 && !esBenef ? 'text-green-600' : diff > 0 && !esBenef ? 'text-red-600' : 'text-gray-500'}`}>
                          {diff !== 0 ? (diff > 0 ? '+' : '') + formatVal(Math.abs(diff), tipo) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <CambioChip pre={pre} post={post} esBeneficioso={esBenef} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${estadoColor}`}>
                            {estadoLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pie de tabla */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">
                Valores = promedio de todos los puntos de muestreo de la nave. ⚠️ = supera umbral de daño económico.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
