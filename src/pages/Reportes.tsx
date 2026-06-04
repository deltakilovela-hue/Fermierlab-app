import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { COLORES_ORGANISMOS, UMBRALES_NEMATODOS } from '../types';
import { ChevronDown, FlaskConical, FileDown, Loader2 } from 'lucide-react';
import { exportPdf } from '../utils/exportPdf';
import type { PdfDetalleRow } from '../utils/exportPdf';

function formatProp(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export default function Reportes() {
  const { clientes, parcelas, naves, puntos, analisis } = useStore();

  const [clienteId, setClienteId]   = useState(clientes[0]?.id ?? '');
  const [parcelaId, setParcelaId]   = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'nematodos' | 'fitopatogenos'>('todos');
  const [exporting, setExporting]   = useState(false);

  const parcelasFiltradas = parcelas.filter((p) => p.clienteId === clienteId);
  const navesParc = naves.filter((n) =>
    parcelaId
      ? n.parcelaId === parcelaId
      : parcelasFiltradas.some((p) => p.id === n.parcelaId),
  );

  // ── Chart data ────────────────────────────────────────────────────────────
  const orgsNem  = ['Meloidogyne', 'Pratylenchus', 'Rotylenchulus', 'Aphelenchus'];
  const orgsFito = ['Fusarium spp', 'Fusarium solani', 'Aspergillus', 'Trichoderma', 'B.Anaerobias'];

  const dataNem = navesParc.map((nave) => {
    const ptIds = puntos.filter((p) => p.naveId === nave.id).map((p) => p.id);
    const row: Record<string, number | string> = { nave: nave.nombre };
    for (const org of orgsNem) {
      const vals = analisis
        .filter((a) => ptIds.includes(a.puntoId) && a.tipo === 'nematodos')
        .flatMap((a) => a.resultadosNematodos ?? [])
        .filter((r) => r.organismo === org)
        .map((r) => r.individuosPor100cc);
      if (vals.length) row[org] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    return row;
  });

  const dataFito = navesParc.flatMap((nave) => {
    const ptIds = puntos.filter((p) => p.naveId === nave.id).map((p) => p.id);
    return ptIds.flatMap((ptId) => {
      const pt = puntos.find((p) => p.id === ptId);
      const alist = analisis.filter((a) => a.puntoId === ptId && a.tipo === 'fitopatogenos');
      return alist.map((a) => {
        const row: Record<string, number | string> = { label: `${nave.nombre} · ${pt?.tabla ?? ''}` };
        for (const org of orgsFito) {
          const r = a.resultadosFitopatogenos?.find((r) => r.organismo === org);
          if (r) row[org] = r.propagulos;
        }
        return row;
      });
    });
  });

  // ── Detail rows ───────────────────────────────────────────────────────────
  const detalleRows = analisis
    .filter((a) => {
      const pt   = puntos.find((p) => p.id === a.puntoId);
      const nave = naves.find((n) => n.id === pt?.naveId);
      const parc = parcelas.find((p) => p.id === nave?.parcelaId);
      if (parc?.clienteId !== clienteId) return false;
      if (parcelaId && nave?.parcelaId !== parcelaId) return false;
      if (tipoFiltro !== 'todos' && a.tipo !== tipoFiltro) return false;
      return true;
    })
    .map((a) => {
      const pt   = puntos.find((p) => p.id === a.puntoId);
      const nave = naves.find((n) => n.id === pt?.naveId);
      const parc = parcelas.find((p) => p.id === nave?.parcelaId);
      return { a, pt, nave, parc };
    });

  const showNem  = tipoFiltro === 'todos' || tipoFiltro === 'nematodos';
  const showFito = tipoFiltro === 'todos' || tipoFiltro === 'fitopatogenos';

  // ── PDF export ────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      // Build flat rows for PDF table
      const pdfRows: PdfDetalleRow[] = detalleRows.flatMap(({ a, pt, nave, parc }) => {
        const resultados: PdfDetalleRow[] = a.tipo === 'nematodos'
          ? (a.resultadosNematodos ?? []).map((r): PdfDetalleRow => ({
              parcela:     parc?.nombre   ?? '',
              nave:        nave?.nombre   ?? '',
              tabla:       pt?.tabla      ?? '',
              tipo:        'nematodos'    as const,
              tipoMuestreo: a.tipoMuestreo,
              organismo:   r.organismo,
              c1:          r.conteo1,
              c2:          r.conteo2,
              c3:          r.conteo3,
              promedio:    r.promedio,
              resultado:   `${r.individuosPor100cc} ind/100cc`,
              valor:       r.individuosPor100cc,
              umbral:      UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo)?.valor,
            }))
          : (a.resultadosFitopatogenos ?? []).map((r): PdfDetalleRow => ({
              parcela:     parc?.nombre   ?? '',
              nave:        nave?.nombre   ?? '',
              tabla:       pt?.tabla      ?? '',
              tipo:        'fitopatogenos' as const,
              tipoMuestreo: a.tipoMuestreo,
              organismo:   r.organismo,
              c1:          r.conteo1,
              c2:          r.conteo2,
              c3:          r.conteo3,
              promedio:    r.promedio,
              resultado:   `${formatProp(r.propagulos)} UFC/g`,
              valor:       r.propagulos,
              umbral:      undefined,
            }));
        return resultados;
      });

      const cliente = clientes.find((c) => c.id === clienteId);
      const parcela = parcelas.find((p) => p.id === parcelaId);

      await exportPdf({
        clienteNombre:  cliente?.nombre  ?? '',
        parcelaNombre:  parcela?.nombre  ?? '',
        tipoFiltro,
        dataNem,
        dataFito,
        detalleRows: pdfRows,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1a3320]">Reportes por parcela</h1>
        <p className="text-sm text-gray-500">Graficas y tablas detalladas por cliente y parcela</p>
      </div>

      {/* Filtros + Exportar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <select
            value={clienteId}
            onChange={(e) => { setClienteId(e.target.value); setParcelaId(''); }}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 cursor-pointer shadow-sm"
          >
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={parcelaId}
            onChange={(e) => setParcelaId(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 cursor-pointer shadow-sm"
          >
            <option value="">Todas las parcelas</option>
            {parcelasFiltradas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          {(['todos', 'nematodos', 'fitopatogenos'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                tipoFiltro === t ? 'bg-[#1a3320] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'todos' ? 'Todos' : t === 'nematodos' ? 'Nematodos' : 'Fitopatogenos'}
            </button>
          ))}
        </div>

        {/* Exportar PDF */}
        <button
          onClick={handleExport}
          disabled={exporting || detalleRows.length === 0}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#1a3320] text-white text-sm font-medium rounded-lg hover:bg-[#254d30] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {exporting
            ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
            : <><FileDown size={14} /> Exportar PDF</>
          }
        </button>
      </div>

      {/* Grafica nematodos */}
      {showNem && dataNem.some((r) => orgsNem.some((o) => r[o])) && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={15} className="text-green-700" />
            <h2 className="text-sm font-semibold text-gray-800">
              Nematodos — promedio ind/100cc por nave
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dataNem} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="nave" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {UMBRALES_NEMATODOS.map((u) => (
                <ReferenceLine key={u.organismo} y={u.valor} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.5} />
              ))}
              {orgsNem.map((org) => (
                <Bar key={org} dataKey={org} fill={COLORES_ORGANISMOS[org]} maxBarSize={28} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Grafica fitopatogenos */}
      {showFito && dataFito.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={15} className="text-orange-600" />
            <h2 className="text-sm font-semibold text-gray-800">
              Fitopatogenos — UFC/g por punto de muestreo
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dataFito} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatProp} />
              <Tooltip formatter={(v, n) => [`${formatProp(Number(v))} UFC/g`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {orgsFito.map((org) => (
                <Bar key={org} dataKey={org} fill={COLORES_ORGANISMOS[org]} maxBarSize={22} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla detalle */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Detalle completo de analisis</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Parcela</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Nave</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Tabla</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Tipo</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Muestreo</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Organismo</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">C1</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">C2</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">C3</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Promedio</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {detalleRows.flatMap(({ a, pt, nave, parc }) => {
                const resultados = a.tipo === 'nematodos'
                  ? (a.resultadosNematodos ?? []).map((r) => ({
                      org: r.organismo, c1: r.conteo1, c2: r.conteo2, c3: r.conteo3,
                      prom: r.promedio, resultado: `${r.individuosPor100cc} ind/100cc`,
                      umbral: UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo)?.valor,
                      valor: r.individuosPor100cc,
                    }))
                  : (a.resultadosFitopatogenos ?? []).map((r) => ({
                      org: r.organismo, c1: r.conteo1, c2: r.conteo2, c3: r.conteo3,
                      prom: r.promedio, resultado: `${formatProp(r.propagulos)} UFC/g`,
                      umbral: undefined, valor: r.propagulos,
                    }));
                return resultados.map((r, ri) => {
                  const color = r.umbral
                    ? (r.valor >= r.umbral ? '#ef4444' : r.valor >= r.umbral * 0.7 ? '#f97316' : undefined)
                    : undefined;
                  return (
                    <tr key={`${a.id}-${ri}`} className="border-t border-gray-50 hover:bg-gray-50/50">
                      {ri === 0 && (
                        <>
                          <td rowSpan={resultados.length} className="px-4 py-2.5 text-gray-500 align-top">{parc?.nombre}</td>
                          <td rowSpan={resultados.length} className="px-4 py-2.5 font-medium text-gray-700 align-top">{nave?.nombre}</td>
                          <td rowSpan={resultados.length} className="px-4 py-2.5 text-gray-500 align-top">{pt?.tabla}</td>
                          <td rowSpan={resultados.length} className="px-4 py-2.5 align-top">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${a.tipo === 'nematodos' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                              {a.tipo === 'nematodos' ? 'Nem.' : 'Fito.'}
                            </span>
                          </td>
                          <td rowSpan={resultados.length} className="px-4 py-2.5 text-gray-500 align-top capitalize">{a.tipoMuestreo.replace('-', ' ')}</td>
                        </>
                      )}
                      <td className="px-4 py-2.5 font-medium" style={{ color: COLORES_ORGANISMOS[r.org] }}>{r.org}</td>
                      <td className="text-right px-4 py-2.5 text-gray-600">{r.c1}</td>
                      <td className="text-right px-4 py-2.5 text-gray-600">{r.c2}</td>
                      <td className="text-right px-4 py-2.5 text-gray-600">{r.c3}</td>
                      <td className="text-right px-4 py-2.5 text-gray-600">{Number(r.prom).toFixed(1)}</td>
                      <td className="text-right px-4 py-2.5 font-semibold" style={{ color: color ?? '#374151' }}>{r.resultado}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
