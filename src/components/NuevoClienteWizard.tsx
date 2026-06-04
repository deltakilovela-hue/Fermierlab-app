import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  X, Plus, Trash2, ChevronRight, ChevronLeft,
  CheckCircle2, Map, FlaskConical,
} from 'lucide-react';

// ── uid ───────────────────────────────────────────────────────────────────────
function uid() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

// ── Types ─────────────────────────────────────────────────────────────────────
interface NaveInput    { id: string; numero: string; nombre: string; }
interface ParcelaInput { id: string; nombre: string; naves: NaveInput[]; }

function emptyNave():    NaveInput    { return { id: uid(), numero: '', nombre: '' }; }
function emptyParcela(): ParcelaInput { return { id: uid(), nombre: '', naves: [emptyNave()] }; }

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ current }: { current: number }) {
  const labels = ['Cliente', 'Parcelas', 'Naves'];
  return (
    <div className="flex items-center gap-0 px-6 pt-5 pb-1">
      {labels.map((label, i) => {
        const num   = i + 1;
        const past  = current > num;
        const active = current === num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  past   ? 'bg-green-500 text-white' :
                  active ? 'bg-[#1a3320] text-white' :
                           'bg-gray-100 text-gray-400'
                }`}
              >
                {past ? '✓' : num}
              </div>
              <span className={`mt-1 text-[10px] font-medium ${active ? 'text-[#1a3320]' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`w-16 h-px mx-1 mb-3 ${past ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text', autoFocus = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white
          focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD
// ─────────────────────────────────────────────────────────────────────────────

export default function NuevoClienteWizard({ onClose }: { onClose: () => void }) {
  const { addCliente, addParcela, addNave } = useStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1 — cliente
  const [nombre,   setNombre]   = useState('');
  const [cultivo,  setCultivo]  = useState('');
  const [correo,   setCorreo]   = useState('');
  const [telefono, setTelefono] = useState('');
  const [negocio,  setNegocio]  = useState('');

  // Steps 2-3 — parcelas + naves
  const [parcelas, setParcelas] = useState<ParcelaInput[]>([emptyParcela()]);

  // Step 4 — summary
  const [summary, setSummary] = useState({ nombre: '', nparcelas: 0, nnaves: 0 });

  // ── Parcela helpers ──────────────────────────────────────────────────────────
  function addParcelaRow() { setParcelas((p) => [...p, emptyParcela()]); }

  function removeParcela(pid: string) {
    setParcelas((ps) => ps.length > 1 ? ps.filter((p) => p.id !== pid) : ps);
  }

  function setPNombre(pid: string, v: string) {
    setParcelas((ps) => ps.map((p) => p.id === pid ? { ...p, nombre: v } : p));
  }

  // ── Nave helpers ─────────────────────────────────────────────────────────────
  function addNaveRow(pid: string) {
    setParcelas((ps) => ps.map((p) =>
      p.id === pid ? { ...p, naves: [...p.naves, emptyNave()] } : p,
    ));
  }

  function removeNave(pid: string, nid: string) {
    setParcelas((ps) => ps.map((p) =>
      p.id === pid
        ? { ...p, naves: p.naves.length > 1 ? p.naves.filter((n) => n.id !== nid) : p.naves }
        : p,
    ));
  }

  function setNaveField(pid: string, nid: string, field: 'numero' | 'nombre', val: string) {
    setParcelas((ps) => ps.map((p) =>
      p.id === pid
        ? { ...p, naves: p.naves.map((n) => n.id === nid ? { ...n, [field]: val } : n) }
        : p,
    ));
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  const canStep1 = nombre.trim().length > 0;
  const canStep2 = parcelas.every((p) => p.nombre.trim().length > 0);

  function goNext() {
    if (step === 1 && canStep1) { setStep(2); return; }
    if (step === 2 && canStep2) { setStep(3); return; }
    if (step === 3) { handleFinish(); }
  }

  function goBack() {
    if (step === 1) { onClose(); return; }
    setStep((s) => s - 1);
  }

  // ── Finish ───────────────────────────────────────────────────────────────────
  function handleFinish() {
    const cId = uid();
    addCliente({
      id: cId,
      nombre:   nombre.trim(),
      cultivo:  cultivo.trim(),
      correo:   correo.trim()   || undefined,
      telefono: telefono.trim() || undefined,
      negocio:  negocio.trim()  || undefined,
    });

    let totalNaves = 0;
    for (const p of parcelas) {
      const pId = uid();
      addParcela({ id: pId, nombre: p.nombre.trim(), clienteId: cId });
      const validNaves = p.naves.filter((n) => n.nombre.trim());
      for (const n of validNaves) {
        addNave({ id: uid(), nombre: n.nombre.trim(), numero: Number(n.numero) || 0, parcelaId: pId });
      }
      totalNaves += validNaves.length;
    }

    setSummary({ nombre: nombre.trim(), nparcelas: parcelas.length, nnaves: totalNaves });
    setStep(4);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#1a3320]">Alta de nuevo cliente</h2>
            {step < 4 && (
              <p className="text-xs text-gray-400 mt-0.5">
                Completa los 3 pasos para dejar el cliente listo
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* ── Step indicator ───────────────────────────────────────────────────── */}
        {step < 4 && <StepDots current={step} />}

        {/* ── Content ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 1 — Cliente */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Datos generales del cliente. El correo, teléfono o nombre de negocio
                podrán usarse como identificador de acceso.
              </p>

              {/* Fila 1: Nombre + Cultivo */}
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Nombre del cliente *"
                  value={nombre}
                  onChange={setNombre}
                  placeholder="Juan Pérez"
                  autoFocus
                />
                <Field
                  label="Cultivo principal"
                  value={cultivo}
                  onChange={setCultivo}
                  placeholder="Tomate, Chile, Pepino…"
                />
              </div>

              {/* Fila 2: Negocio */}
              <Field
                label="Nombre del negocio / empresa"
                value={negocio}
                onChange={setNegocio}
                placeholder="Agrícola El Rancho S.A. de C.V."
              />

              {/* Fila 3: Correo + Teléfono */}
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Correo electrónico"
                  value={correo}
                  onChange={setCorreo}
                  placeholder="correo@empresa.com"
                  type="email"
                />
                <Field
                  label="Teléfono"
                  value={telefono}
                  onChange={setTelefono}
                  placeholder="6691234567"
                  type="tel"
                />
              </div>

              {/* Hint de acceso */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-600 flex gap-2 items-start">
                <span className="mt-0.5">ℹ️</span>
                <span>
                  El cliente podrá iniciar sesión usando su <strong>ID</strong>, nombre, negocio,
                  correo o teléfono. Contraseña temporal: <strong>cliente2026</strong>
                </span>
              </div>
            </div>
          )}

          {/* Step 2 — Parcelas */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                ¿Cuántas parcelas tiene <strong className="text-gray-700">{nombre}</strong>?
                Agrega el nombre de cada una.
              </p>
              <div className="space-y-2 mt-1">
                {parcelas.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center
                      text-xs font-bold text-blue-600 shrink-0">
                      {i + 1}
                    </div>
                    <input
                      value={p.nombre}
                      onChange={(e) => setPNombre(p.id, e.target.value)}
                      placeholder={`Nombre de parcela ${i + 1} (ej. El Bajío 2)`}
                      autoFocus={i === parcelas.length - 1 && i > 0}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white
                        focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                    />
                    <button
                      onClick={() => removeParcela(p.id)}
                      disabled={parcelas.length === 1}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addParcelaRow}
                className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium py-1 mt-1"
              >
                <Plus size={13} /> Agregar otra parcela
              </button>
            </div>
          )}

          {/* Step 3 — Naves */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">
                Agrega las naves de cada parcela. Puedes dejarlas vacías si aún no las conoces.
              </p>
              {parcelas.map((p) => (
                <div key={p.id} className="space-y-2">
                  {/* Parcela label */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{p.nombre}</span>
                  </div>
                  {/* Nave rows */}
                  {p.naves.map((n, ni) => (
                    <div key={n.id} className="flex items-center gap-2 pl-4">
                      <input
                        type="number"
                        min={1}
                        value={n.numero}
                        onChange={(e) => setNaveField(p.id, n.id, 'numero', e.target.value)}
                        placeholder="N°"
                        className="w-14 text-center border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white
                          focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                      />
                      <input
                        value={n.nombre}
                        onChange={(e) => setNaveField(p.id, n.id, 'nombre', e.target.value)}
                        placeholder={`Nave ${ni + 1}`}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white
                          focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                      />
                      <button
                        onClick={() => removeNave(p.id, n.id)}
                        disabled={p.naves.length === 1}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addNaveRow(p.id)}
                    className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium py-1 pl-4"
                  >
                    <Plus size={13} /> Agregar nave
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div className="flex flex-col items-center py-6 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={34} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">¡Cliente registrado!</h3>
                <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
                  <strong className="text-gray-700">{summary.nombre}</strong> quedó dado de alta
                  con {summary.nparcelas} parcela{summary.nparcelas !== 1 ? 's' : ''} y{' '}
                  {summary.nnaves} nave{summary.nnaves !== 1 ? 's' : ''}.
                </p>
              </div>

              <p className="text-xs text-gray-400 mt-1">¿Qué deseas hacer ahora?</p>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <button
                  onClick={() => { onClose(); navigate('/mapa'); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1a3320] text-white
                    px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#254830] transition-colors"
                >
                  <Map size={15} /> Dibujar en mapa
                </button>
                <button
                  onClick={() => { onClose(); navigate('/captura'); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200
                    text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <FlaskConical size={15} /> Capturar análisis
                </button>
              </div>

              <button
                onClick={onClose}
                className="text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors"
              >
                Volver a Configuración
              </button>
            </div>
          )}

        </div>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        {step < 4 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600
                rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={14} />
              {step === 1 ? 'Cancelar' : 'Anterior'}
            </button>
            <button
              onClick={goNext}
              disabled={
                (step === 1 && !canStep1) ||
                (step === 2 && !canStep2)
              }
              className="flex items-center gap-2 px-5 py-2 bg-[#1a3320] text-white rounded-lg
                text-sm font-medium hover:bg-[#254830] disabled:opacity-40 transition-colors"
            >
              {step === 3 ? 'Finalizar y guardar' : 'Siguiente'}
              <ChevronRight size={14} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
