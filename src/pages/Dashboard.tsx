import { useStore } from '../store/useStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { COLORES_ORGANISMOS, UMBRALES_NEMATODOS } from '../types';
import { AlertTriangle, CheckCircle2, FlaskConical, MapPin } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number) {
  return n >= 1000000
    ? `${(n / 1000000).toFixed(1)}M`
    : n >= 1000
    ? `${(n / 1000).toFixed(0)}k`
    : String(n);
}

function getSeverityColor(valor: number, umbral: number | undefined) {
  if (!umbral) return '#16a34a';
  if (valor >= umbral) return '#ef4444';
  if (valor >= umbral * 0.7) return '#f97316';
  return '#16a34a';
}

// ── subcomponents ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? '#1a3320' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function AlertaBadge({ texto, nivel }: { texto: string; nivel: 'ok' | 'warn' | 'danger' }) {
  const styles = {
    ok:     'bg-green-50 text-green-700 border-green-200',
    warn:   'bg-orange-50 text-orange-700 border-orange-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
  };
  const Icon = nivel === 'ok' ? CheckCircle2 : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${styles[nivel]}`}>
      <Icon size={11} />
      {texto}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { analisis, puntos, naves, parcelas, clientes } = useStore();

  // ── Datos para gráfica de nematodos por nave (ind/100cc) ──────────────────
  // Agrupa por nave: máximo de cada organismo fitoparásito
  const navesConNem = naves.filter((n) => {
    const ptIds = puntos.filter((p) => p.naveId === n.id).map((p) => p.id);
    return analisis.some((a) => ptIds.includes(a.puntoId) && a.tipo === 'nematodos');
  });

  // organismos fitoparásitos (excluye Saprófitos)
  const orgsNem = ['Meloidogyne', 'Pratylenchus', 'Rotylenchulus', 'Aphelenchus'];

  const dataNematodos = navesConNem.map((nave) => {
    const ptIds = puntos.filter((p) => p.naveId === nave.id).map((p) => p.id);
    const analisiNave = analisis.filter(
      (a) => ptIds.includes(a.puntoId) && a.tipo === 'nematodos'
    );
    const entry: Record<string, number | string> = { nave: nave.nombre };
    for (const org of orgsNem) {
      let max = 0;
      for (const a of analisiNave) {
        const r = a.resultadosNematodos?.find((r) => r.organismo === org);
        if (r && r.individuosPor100cc > max) max = r.individuosPor100cc;
      }
      if (max > 0) entry[org] = max;
    }
    return entry;
  });

  // ── Datos para gráfica de fitopatógenos por tabla (UFC/g) ─────────────────
  const orgsVirus = ['Fusarium spp', 'Fusarium solani', 'Aspergillus', 'Trichoderma'];

  const dataFito = analisis
    .filter((a) => a.tipo === 'fitopatogenos')
    .map((a) => {
      const pt = puntos.find((p) => p.id === a.puntoId);
      const nave = naves.find((n) => n.id === pt?.naveId);
      const entry: Record<string, number | string> = {
        label: `${nave?.nombre ?? ''} ${pt?.tabla ?? ''}`,
      };
      for (const org of orgsVirus) {
        const r = a.resultadosFitopatogenos?.find((r) => r.organismo === org);
        if (r) entry[org] = r.propagulos;
      }
      return entry;
    });

  // ── Alertas: puntos sobre umbral ──────────────────────────────────────────
  const alertas: { nave: string; org: string; valor: number; umbral: number }[] = [];
  for (const a of analisis) {
    if (a.tipo !== 'nematodos') continue;
    const pt = puntos.find((p) => p.id === a.puntoId);
    const nave = naves.find((n) => n.id === pt?.naveId);
    for (const r of a.resultadosNematodos ?? []) {
      const umbral = UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo);
      if (umbral && r.individuosPor100cc >= umbral.valor) {
        alertas.push({ nave: nave?.nombre ?? '', org: r.organismo, valor: r.individuosPor100cc, umbral: umbral.valor });
      }
    }
  }

  // ── Stats globales ────────────────────────────────────────────────────────
  const totalPuntos = puntos.length;
  const totalAnalisis = analisis.length;
  const puntosConAlerta = new Set(alertas.map((a) => a.nave)).size;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1a3320]">Dashboard general</h1>
        <p className="text-sm text-gray-500">
          {clientes[0]?.nombre} — Muestreo Abril 2026 — Folio CLN-N-026
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Clientes" value={clientes.length} sub="activos" />
        <StatCard label="Parcelas" value={parcelas.length} sub="en monitoreo" />
        <StatCard label="Puntos de muestreo" value={totalPuntos} Icon={MapPin} />
        <StatCard
          label="Naves sobre umbral"
          value={puntosConAlerta}
          sub={`de ${navesConNem.length} naves con nematodos`}
          color={puntosConAlerta > 0 ? '#ef4444' : '#16a34a'}
        />
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600" />
            <h2 className="text-sm font-semibold text-red-700">
              {alertas.length} punto{alertas.length > 1 ? 's' : ''} sobre umbral de daño económico
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertas.map((a, i) => (
              <div key={i} className="bg-white border border-red-200 rounded-lg px-3 py-1.5 text-xs">
                <span className="font-semibold text-red-700">{a.nave}</span>
                <span className="text-gray-500 mx-1">·</span>
                <span className="text-gray-700">{a.org}</span>
                <span className="text-gray-400 mx-1">·</span>
                <span className="font-bold text-red-600">{a.valor} ind/100cc</span>
                <span className="text-gray-400"> (umbral {a.umbral})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfica nematodos */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={16} className="text-green-700" />
          <h2 className="text-sm font-semibold text-gray-800">
            Nematodos fitoparásitos por nave — ind/100cc de suelo
          </h2>
        </div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {UMBRALES_NEMATODOS.map((u) => (
            <span key={u.organismo} className="text-xs text-gray-500 flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 bg-red-400 border-t-2 border-dashed border-red-400" />
              Umbral {u.organismo}: {u.valor}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataNematodos} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="nave" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} />
            <Tooltip
              formatter={(value, name) => [`${value} ind/100cc`, name]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            {UMBRALES_NEMATODOS.map((u) => (
              <ReferenceLine
                key={u.organismo}
                y={u.valor}
                stroke="#ef4444"
                strokeDasharray="4 2"
                strokeOpacity={0.6}
              />
            ))}
            {orgsNem.map((org) => (
              <Bar key={org} dataKey={org} fill={COLORES_ORGANISMOS[org]} maxBarSize={28} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfica fitopatógenos */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={16} className="text-orange-600" />
          <h2 className="text-sm font-semibold text-gray-800">
            Fitopatógenos — Nave 8 El Alto (Post-tratamiento) — UFC/g
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dataFito} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} />
            <Tooltip
              formatter={(value, name) => [`${formatNum(Number(value))} UFC/g`, name]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            {orgsVirus.map((org) => (
              <Bar key={org} dataKey={org} fill={COLORES_ORGANISMOS[org]} maxBarSize={22} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla resumen nematodos por nave */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <MapPin size={15} className="text-green-700" />
          <h2 className="text-sm font-semibold text-gray-800">Resumen por nave — nematodos (ind/100cc máximo detectado)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Nave</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Parcela</th>
                {orgsNem.map((o) => (
                  <th key={o} className="text-center px-3 py-2.5 font-semibold text-gray-600">{o}</th>
                ))}
                <th className="text-center px-3 py-2.5 font-semibold text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {dataNematodos.map((row, i) => {
                const nave = navesConNem[i];
                const parcela = parcelas.find((p) => p.id === nave?.parcelaId);
                const maxVal = Math.max(...orgsNem.map((o) => Number(row[o] ?? 0)));
                const umbral = UMBRALES_NEMATODOS.find((u) => orgsNem.includes(u.organismo));
                const nivel = maxVal >= 200 ? 'danger' : maxVal >= 140 ? 'warn' : 'ok';
                return (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.nave}</td>
                    <td className="px-4 py-2.5 text-gray-500">{parcela?.nombre}</td>
                    {orgsNem.map((o) => {
                      const val = Number(row[o] ?? 0);
                      const u = UMBRALES_NEMATODOS.find((u) => u.organismo === o);
                      const color = getSeverityColor(val, u?.valor);
                      return (
                        <td key={o} className="text-center px-3 py-2.5 font-medium" style={{ color: val > 0 ? color : '#d1d5db' }}>
                          {val > 0 ? val : '—'}
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-2.5">
                      <AlertaBadge
                        texto={nivel === 'danger' ? 'Sobre umbral' : nivel === 'warn' ? 'Precaución' : 'Normal'}
                        nivel={nivel}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
