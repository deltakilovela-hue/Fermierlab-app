import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { Analisis, TipoAnalisis, TipoMuestreo } from '../types';
import { PlusCircle, ChevronDown, CheckCircle2, FileUp, Loader2, AlertTriangle } from 'lucide-react';
import { parsePdfFile } from '../utils/parsePdf';
import type { ParsedSeccion } from '../utils/parsePdf';
import PdfImportModal from '../components/PdfImportModal';

const ORGANISMOS_NEMATODOS = ['Rotylenchulus', 'Pratylenchus', 'Meloidogyne', 'Aphelenchus', 'Saprófitos'];
const ORGANISMOS_FITO = [
  { nombre: 'Fusarium spp', medio: 'Komada' },
  { nombre: 'Fusarium solani', medio: 'Komada' },
  { nombre: 'Aspergillus', medio: 'PDA-AL' },
  { nombre: 'Trichoderma', medio: 'PDA-AL' },
  { nombre: 'B.Anaerobias', medio: 'AN' },
];

interface FilaNem { organismo: string; grSuelo: number; conteo1: string; conteo2: string; conteo3: string; }
interface FilaFito { organismo: string; medioCultivo: string; conteo1: string; conteo2: string; conteo3: string; }

function calcProm(c1: string, c2: string, c3: string) {
  const vals = [c1, c2, c3].map(Number).filter((v) => !isNaN(v));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function Selector({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-gray-700 cursor-pointer"
        >
          {children}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );
}

function NumCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      className="w-20 text-center bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-sm
        font-medium text-gray-800 placeholder-gray-300
        focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 focus:bg-white
        hover:border-gray-400 transition-colors"
    />
  );
}

export default function Captura() {
  const { clientes, parcelas, naves, puntos, addAnalisis, addPunto } = useStore();

  // PDF import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfSecciones, setPdfSecciones] = useState<ParsedSeccion[] | null>(null);
  const [pdfDoneCount, setPdfDoneCount] = useState<number | null>(null);

  async function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    setPdfError('');
    setPdfDoneCount(null);
    try {
      const secciones = await parsePdfFile(file);
      if (secciones.length === 0) {
        setPdfError('No se encontraron análisis en el PDF. Verifica que el formato sea el del laboratorio Fermier.');
      } else {
        setPdfSecciones(secciones);
      }
    } catch (err) {
      setPdfError('Error al leer el PDF. Intenta de nuevo.');
      console.error(err);
    } finally {
      setPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const [step, setStep] = useState<'form' | 'done'>('form');
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '');
  const [parcelaId, setParcelaId] = useState('');
  const [naveId, setNaveId] = useState('');
  const [tabla, setTabla] = useState('');
  const [tipoAnalisis, setTipoAnalisis] = useState<TipoAnalisis>('nematodos');
  const [tipoMuestreo, setTipoMuestreo] = useState<TipoMuestreo>('general');
  const [folio, setFolio] = useState('');
  const [fechaRec, setFechaRec] = useState(new Date().toISOString().slice(0, 10));
  const [fechaEm, setFechaEm] = useState(new Date().toISOString().slice(0, 10));

  const [filasNem, setFilasNem] = useState<FilaNem[]>(
    ORGANISMOS_NEMATODOS.map((o) => ({ organismo: o, grSuelo: 200, conteo1: '', conteo2: '', conteo3: '' }))
  );
  const [filasFito, setFilasFito] = useState<FilaFito[]>(
    ORGANISMOS_FITO.map((o) => ({ organismo: o.nombre, medioCultivo: o.medio, conteo1: '', conteo2: '', conteo3: '' }))
  );

  const parcelasFiltradas = parcelas.filter((p) => p.clienteId === clienteId);
  const navesFiltradas = naves.filter((n) => n.parcelaId === parcelaId);

  function updateNem(idx: number, field: keyof FilaNem, val: string) {
    setFilasNem((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }
  function updateFito(idx: number, field: keyof FilaFito, val: string) {
    setFilasFito((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!naveId || !tabla) return;

    // Buscar o crear punto
    let punto = puntos.find((p) => p.naveId === naveId && p.tabla === tabla);
    if (!punto) {
      punto = { id: `pt-${Date.now()}`, naveId, tabla };
      addPunto(punto);
    }

    const nuevo: Analisis = {
      id: `a-${Date.now()}`,
      puntoId: punto.id,
      folio,
      fechaRecepcion: fechaRec,
      fechaEmision: fechaEm,
      tipo: tipoAnalisis,
      tipoMuestreo,
    };

    if (tipoAnalisis === 'nematodos') {
      nuevo.resultadosNematodos = filasNem
        .filter((r) => r.conteo1 || r.conteo2 || r.conteo3)
        .map((r) => ({
          organismo: r.organismo,
          grSuelo: r.grSuelo,
          conteo1: Number(r.conteo1) || 0,
          conteo2: Number(r.conteo2) || 0,
          conteo3: Number(r.conteo3) || 0,
          promedio: calcProm(r.conteo1, r.conteo2, r.conteo3),
          // Conversión: (promedio / grSuelo) * 10000 ≈ ind/100cc — simplificado
          individuosPor100cc: Math.round(calcProm(r.conteo1, r.conteo2, r.conteo3) * (100 / (r.grSuelo / 100))),
        }));
    } else {
      nuevo.resultadosFitopatogenos = filasFito
        .filter((r) => r.conteo1 || r.conteo2 || r.conteo3)
        .map((r) => ({
          organismo: r.organismo,
          medioCultivo: r.medioCultivo,
          conteo1: Number(r.conteo1) || 0,
          conteo2: Number(r.conteo2) || 0,
          conteo3: Number(r.conteo3) || 0,
          promedio: calcProm(r.conteo1, r.conteo2, r.conteo3),
          propagulos: Math.round(calcProm(r.conteo1, r.conteo2, r.conteo3) * 100000),
        }));
    }

    addAnalisis(nuevo);
    setStep('done');
  }

  if (pdfSecciones) {
    return (
      <PdfImportModal
        secciones={pdfSecciones}
        onClose={() => setPdfSecciones(null)}
        onDone={(count) => { setPdfSecciones(null); setPdfDoneCount(count); }}
      />
    );
  }

  if (step === 'done') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-80 gap-4">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 size={30} className="text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Análisis registrado</h2>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Los datos fueron guardados y ya aparecen en el dashboard y reportes.
        </p>
        <button
          onClick={() => {
            setStep('form');
            setFilasNem(ORGANISMOS_NEMATODOS.map((o) => ({ organismo: o, grSuelo: 200, conteo1: '', conteo2: '', conteo3: '' })));
            setFilasFito(ORGANISMOS_FITO.map((o) => ({ organismo: o.nombre, medioCultivo: o.medio, conteo1: '', conteo2: '', conteo3: '' })));
            setTabla('');
          }}
          className="bg-[#1a3320] text-white text-sm px-5 py-2.5 rounded-lg hover:bg-[#254830] transition-colors"
        >
          Registrar otro análisis
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a3320]">Captura de resultados</h1>
        <p className="text-sm text-gray-500">Ingresa los datos manualmente o importa directamente desde el PDF del laboratorio</p>
      </div>

      {/* PDF Upload section */}
      <div className="bg-white rounded-xl p-5 border border-dashed border-green-300 shadow-sm mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-[#1a3320] flex items-center gap-2">
              <FileUp size={16} className="text-green-600" />
              Importar desde PDF
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Sube el reporte PDF del laboratorio Fermier y se detectan los análisis automáticamente
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pdfLoading && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Loader2 size={13} className="animate-spin" /> Analizando PDF...
              </span>
            )}
            {pdfDoneCount !== null && (
              <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                <CheckCircle2 size={13} /> {pdfDoneCount} análisis importados
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfChange}
            />
            <button
              type="button"
              disabled={pdfLoading}
              onClick={() => { setPdfDoneCount(null); setPdfError(''); fileInputRef.current?.click(); }}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <FileUp size={13} />
              Subir PDF
            </button>
          </div>
        </div>
        {pdfError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <AlertTriangle size={13} />
            {pdfError}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">o captura manualmente</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificación */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Identificación</h2>
          <div className="grid grid-cols-2 gap-4">
            <Selector label="Cliente" value={clienteId} onChange={(v) => { setClienteId(v); setParcelaId(''); setNaveId(''); }}>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Selector>
            <Selector label="Parcela" value={parcelaId} onChange={(v) => { setParcelaId(v); setNaveId(''); }}>
              <option value="">Seleccionar parcela</option>
              {parcelasFiltradas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Selector>
            <Selector label="Nave" value={naveId} onChange={setNaveId}>
              <option value="">Seleccionar nave</option>
              {navesFiltradas.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </Selector>
            <Input label="Tabla / Zona de muestreo" value={tabla} onChange={setTabla} placeholder="ej. Tabla 1 y 2" />
            <Input label="Folio" value={folio} onChange={setFolio} placeholder="ej. CLN-N-026" />
            <Selector label="Tipo de muestreo" value={tipoMuestreo} onChange={(v) => setTipoMuestreo(v as TipoMuestreo)}>
              <option value="general">General</option>
              <option value="pre-tratamiento">Pre-tratamiento</option>
              <option value="post-tratamiento">Post-tratamiento</option>
            </Selector>
            <Input label="Fecha recepción" value={fechaRec} onChange={setFechaRec} type="date" />
            <Input label="Fecha emisión" value={fechaEm} onChange={setFechaEm} type="date" />
          </div>
          <div className="flex gap-2 pt-1">
            {(['nematodos', 'fitopatogenos'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoAnalisis(t)}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  tipoAnalisis === t
                    ? 'bg-[#1a3320] text-white border-[#1a3320]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t === 'nematodos' ? 'Nematodos' : 'Fitopatógenos'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de resultados */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">Resultados</h2>

          {/* Hint */}
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-sm bg-gray-300" />
            Haz clic en los campos grises para ingresar los conteos del laboratorio
          </p>

          {tipoAnalisis === 'nematodos' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-1">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Organismo</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">gr suelo</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide bg-green-50 rounded-l-lg">Conteo 1</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide bg-green-50">Conteo 2</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide bg-green-50 rounded-r-lg">Conteo 3</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promedio</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">ind/100cc</th>
                  </tr>
                </thead>
                <tbody>
                  {filasNem.map((r, i) => {
                    const prom = calcProm(r.conteo1, r.conteo2, r.conteo3);
                    const ind  = Math.round(prom * (100 / (r.grSuelo / 100)));
                    const hasData = r.conteo1 || r.conteo2 || r.conteo3;
                    return (
                      <tr key={r.organismo} className={`rounded-lg ${hasData ? 'bg-green-50/40' : 'bg-white'}`}>
                        <td className="px-3 py-2.5 font-semibold text-gray-700 text-sm">{r.organismo}</td>
                        <td className="text-center px-3 py-2.5 text-gray-400 text-xs">200 g</td>
                        <td className="text-center px-2 py-1.5 bg-green-50/60">
                          <NumCell value={r.conteo1} onChange={(v) => updateNem(i, 'conteo1', v)} />
                        </td>
                        <td className="text-center px-2 py-1.5 bg-green-50/60">
                          <NumCell value={r.conteo2} onChange={(v) => updateNem(i, 'conteo2', v)} />
                        </td>
                        <td className="text-center px-2 py-1.5 bg-green-50/60">
                          <NumCell value={r.conteo3} onChange={(v) => updateNem(i, 'conteo3', v)} />
                        </td>
                        <td className="text-center px-3 py-2.5 font-medium text-gray-600 text-sm">
                          {prom > 0 ? prom.toFixed(1) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="text-center px-3 py-2.5 font-bold text-sm"
                          style={{ color: ind > 200 ? '#ef4444' : ind > 0 ? '#16a34a' : '#d1d5db' }}>
                          {ind > 0 ? ind : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-1">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Organismo</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Medio</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide bg-green-50 rounded-l-lg">Conteo 1</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide bg-green-50">Conteo 2</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide bg-green-50 rounded-r-lg">Conteo 3</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Promedio</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Propágulos</th>
                  </tr>
                </thead>
                <tbody>
                  {filasFito.map((r, i) => {
                    const prom = calcProm(r.conteo1, r.conteo2, r.conteo3);
                    const prop = Math.round(prom * 100000);
                    const hasData = r.conteo1 || r.conteo2 || r.conteo3;
                    return (
                      <tr key={r.organismo} className={`rounded-lg ${hasData ? 'bg-green-50/40' : 'bg-white'}`}>
                        <td className="px-3 py-2.5 font-semibold text-gray-700 text-sm">{r.organismo}</td>
                        <td className="px-3 py-2.5 text-xs text-orange-600 font-medium">{r.medioCultivo}</td>
                        <td className="text-center px-2 py-1.5 bg-green-50/60">
                          <NumCell value={r.conteo1} onChange={(v) => updateFito(i, 'conteo1', v)} />
                        </td>
                        <td className="text-center px-2 py-1.5 bg-green-50/60">
                          <NumCell value={r.conteo2} onChange={(v) => updateFito(i, 'conteo2', v)} />
                        </td>
                        <td className="text-center px-2 py-1.5 bg-green-50/60">
                          <NumCell value={r.conteo3} onChange={(v) => updateFito(i, 'conteo3', v)} />
                        </td>
                        <td className="text-center px-3 py-2.5 font-medium text-gray-600 text-sm">
                          {prom > 0 ? prom.toFixed(1) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="text-center px-3 py-2.5 font-bold text-sm text-gray-700">
                          {prop > 0 ? prop.toLocaleString() : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Validación visible */}
        {(!naveId || !tabla) && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle size={13} />
            {!naveId ? 'Selecciona una nave para continuar.' : 'Ingresa la tabla / zona de muestreo.'}
          </p>
        )}

        <button
          type="submit"
          disabled={!naveId || !tabla}
          className="flex items-center gap-2 bg-[#1a3320] text-white px-6 py-3 rounded-xl text-sm font-medium
            hover:bg-[#254830] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PlusCircle size={16} />
          Guardar análisis
        </button>
      </form>
    </div>
  );
}
