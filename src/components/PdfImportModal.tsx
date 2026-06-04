import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { ParsedSeccion } from '../utils/parsePdf';
import type { Analisis, PuntoMuestreo } from '../types';
import { CheckCircle2, XCircle, ChevronDown, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  secciones: ParsedSeccion[];
  onClose: () => void;
  onDone: (count: number) => void;
}

export default function PdfImportModal({ secciones, onClose, onDone }: Props) {
  const { clientes, parcelas, naves, puntos, addAnalisis, addPunto } = useStore();
  const [selected, setSelected] = useState<boolean[]>(secciones.map(() => true));
  const [parcelaOverride, setParcelaOverride] = useState<string[]>(secciones.map(() => ''));
  const [naveOverride, setNaveOverride] = useState<string[]>(secciones.map(() => ''));
  const [saving, setSaving] = useState(false);

  function toggle(i: number) {
    setSelected((prev) => prev.map((v, j) => (j === i ? !v : v)));
  }

  function resolveParcelaId(i: number): string | undefined {
    if (parcelaOverride[i]) return parcelaOverride[i];
    const s = secciones[i];
    return parcelas.find((p) =>
      p.nombre.toLowerCase().includes(s.parcelaNombre.toLowerCase()) ||
      s.parcelaNombre.toLowerCase().includes(p.nombre.toLowerCase())
    )?.id;
  }

  function resolveNaveId(i: number): string | undefined {
    if (naveOverride[i]) return naveOverride[i];
    const parcelaId = resolveParcelaId(i);
    if (!parcelaId) return undefined;
    const s = secciones[i];
    return naves.find((n) => n.parcelaId === parcelaId && n.numero === s.naveNumero)?.id;
  }

  async function handleSave() {
    setSaving(true);
    let count = 0;
    for (let i = 0; i < secciones.length; i++) {
      if (!selected[i]) continue;
      const s = secciones[i];
      const naveId = resolveNaveId(i);
      if (!naveId) continue;

      let punto: PuntoMuestreo | undefined = puntos.find(
        (p) => p.naveId === naveId && p.tabla === s.tabla
      );
      if (!punto) {
        punto = { id: `pt-${Date.now()}-${i}`, naveId, tabla: s.tabla };
        addPunto(punto);
      }

      const nuevo: Analisis = {
        id: `a-pdf-${Date.now()}-${i}`,
        puntoId: punto.id,
        folio: s.folio,
        fechaRecepcion: s.fechaRecepcion,
        fechaEmision: s.fechaEmision,
        tipo: s.tipo,
        tipoMuestreo: s.tipoMuestreo,
        resultadosNematodos: s.resultadosNematodos,
        resultadosFitopatogenos: s.resultadosFitopatogenos,
      };
      addAnalisis(nuevo);
      count++;
    }
    setSaving(false);
    onDone(count);
  }

  const selectedCount = selected.filter(Boolean).length;
  const allResolved = secciones.every((_, i) => !selected[i] || resolveNaveId(i));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Importar desde PDF</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Se encontraron <strong>{secciones.length}</strong> análisis. Revisa y confirma.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {secciones.map((s, i) => {
            const parcelaId = resolveParcelaId(i);
            const naveId = resolveNaveId(i);
            const resolved = !!naveId;
            const navesForParcela = naves.filter((n) => n.parcelaId === (parcelaOverride[i] || parcelaId));

            return (
              <div
                key={i}
                className={`border rounded-xl p-4 transition-colors ${
                  selected[i]
                    ? resolved ? 'border-green-200 bg-green-50/30' : 'border-orange-200 bg-orange-50/30'
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(i)}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selected[i] ? 'bg-green-600 border-green-600' : 'border-gray-300'
                    }`}
                  >
                    {selected[i] && <CheckCircle2 size={12} className="text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.tipo === 'nematodos' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {s.tipo === 'nematodos' ? 'Nematodos' : 'Fitopatógenos'}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{s.tipoMuestreo.replace('-', ' ')}</span>
                      <span className="text-xs text-gray-400">Folio: {s.folio}</span>
                    </div>

                    <p className="text-xs font-medium text-gray-700 mb-2">
                      {s.clienteNombre} — {s.parcelaNombre} — {s.naveNombre} — {s.tabla}
                    </p>

                    {/* Resultados mini-tabla */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(s.resultadosNematodos ?? s.resultadosFitopatogenos ?? []).map((r, ri) => (
                        <span key={ri} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                          {'organismo' in r ? r.organismo : ''}{' '}
                          {'individuosPor100cc' in r
                            ? `${r.individuosPor100cc} ind/100cc`
                            : `propagulos: ${r.propagulos}`}
                        </span>
                      ))}
                    </div>

                    {/* Selects para resolver nave */}
                    {selected[i] && (
                      <div className="flex gap-2 flex-wrap">
                        <div className="relative">
                          <select
                            value={parcelaOverride[i] || parcelaId || ''}
                            onChange={(e) => {
                              const v = [...parcelaOverride]; v[i] = e.target.value;
                              setParcelaOverride(v);
                              const nv = [...naveOverride]; nv[i] = ''; setNaveOverride(nv);
                            }}
                            className="appearance-none text-xs bg-white border border-gray-200 rounded px-2 py-1 pr-6 cursor-pointer"
                          >
                            <option value="">— Seleccionar parcela —</option>
                            {parcelas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                          <select
                            value={naveOverride[i] || naveId || ''}
                            onChange={(e) => { const v = [...naveOverride]; v[i] = e.target.value; setNaveOverride(v); }}
                            className="appearance-none text-xs bg-white border border-gray-200 rounded px-2 py-1 pr-6 cursor-pointer"
                          >
                            <option value="">— Seleccionar nave —</option>
                            {navesForParcela.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {!resolved && (
                          <span className="flex items-center gap-1 text-[10px] text-orange-600">
                            <AlertTriangle size={10} /> Selecciona parcela y nave
                          </span>
                        )}
                        {resolved && (
                          <span className="flex items-center gap-1 text-[10px] text-green-600">
                            <CheckCircle2 size={10} /> Listo
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {selectedCount} de {secciones.length} seleccionados
            {!allResolved && selectedCount > 0 && (
              <span className="text-orange-500 ml-2">— Algunos necesitan nave asignada</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || selectedCount === 0}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-[#1a3320] text-white rounded-lg hover:bg-[#254830] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Guardar {selectedCount} análisis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
