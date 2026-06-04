import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Cliente, Parcela, Nave } from '../types';
import {
  Plus, Pencil, Trash2, Check, X,
  Building2, Map, LayoutList, AlertCircle, UserPlus,
} from 'lucide-react';
import NuevoClienteWizard from '../components/NuevoClienteWizard';

// ── helpers ──────────────────────────────────────────────────────────────────

function uid() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 w-full"
      />
    </div>
  );
}

// ── SelectField ───────────────────────────────────────────────────────────────

function SelectField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
      >
        <option value="">— Seleccionar —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Save / Cancel buttons ─────────────────────────────────────────────────────

function Btns({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 items-end pb-0.5">
      <button
        onClick={onSave}
        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
      >
        <Check size={12} /> Guardar
      </button>
      <button
        onClick={onCancel}
        className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
      >
        <X size={12} /> Cancelar
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTES TAB
// ─────────────────────────────────────────────────────────────────────────────

function ClientesTab() {
  const { clientes, parcelas, addCliente, updateCliente, deleteCliente } = useStore();

  const [editId, setEditId]         = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCultivo, setEditCultivo] = useState('');
  const [adding, setAdding]         = useState(false);
  const [newNombre, setNewNombre]   = useState('');
  const [newCultivo, setNewCultivo] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function startEdit(c: Cliente) {
    setEditId(c.id);
    setEditNombre(c.nombre);
    setEditCultivo(c.cultivo ?? '');
  }

  function saveEdit() {
    if (!editId || !editNombre.trim()) return;
    updateCliente(editId, { nombre: editNombre.trim(), cultivo: editCultivo.trim() });
    setEditId(null);
  }

  function handleAdd() {
    if (!newNombre.trim()) return;
    addCliente({ id: uid(), nombre: newNombre.trim(), cultivo: newCultivo.trim() });
    setNewNombre(''); setNewCultivo(''); setAdding(false);
  }

  function countParcelas(cId: string) { return parcelas.filter((p) => p.clienteId === cId).length; }
  function hasChildren(cId: string)   { return countParcelas(cId) > 0; }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {clientes.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">No hay clientes registrados</div>
        )}
        {clientes.map((c, i) => (
          <div key={c.id} className={i > 0 ? 'border-t border-gray-100' : ''}>

            {editId === c.id ? (
              <div className="p-4 bg-green-50/40">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-40">
                    <Field label="Nombre *" value={editNombre} onChange={setEditNombre} placeholder="Agrícola..." />
                  </div>
                  <div className="flex-1 min-w-40">
                    <Field label="Cultivo" value={editCultivo} onChange={setEditCultivo} placeholder="Tomate, Chile..." />
                  </div>
                  <Btns onSave={saveEdit} onCancel={() => setEditId(null)} />
                </div>
              </div>

            ) : deleteConfirm === c.id ? (
              <div className="px-5 py-3 bg-red-50 flex items-center gap-3">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-700 flex-1">
                  {hasChildren(c.id)
                    ? `No se puede eliminar: tiene ${countParcelas(c.id)} parcela(s) asociada(s).`
                    : `¿Eliminar "${c.nombre}"? Esta acción no se puede deshacer.`}
                </p>
                <div className="flex gap-2">
                  {!hasChildren(c.id) && (
                    <button
                      onClick={() => { deleteCliente(c.id); setDeleteConfirm(null); }}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600"
                    >
                      Eliminar
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

            ) : (
              <div className="flex items-center gap-4 px-5 py-3.5 group hover:bg-gray-50/50">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Building2 size={14} className="text-green-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">{c.nombre}</p>
                  <p className="text-xs text-gray-400">{c.cultivo || 'Sin cultivo especificado'}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {countParcelas(c.id)} parcela{countParcelas(c.id) !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(c)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-white"
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(c.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 border border-red-100 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Nuevo cliente</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <Field label="Nombre *" value={newNombre} onChange={setNewNombre} placeholder="Agrícola El Rancho" />
            </div>
            <div className="flex-1 min-w-40">
              <Field label="Cultivo" value={newCultivo} onChange={setNewCultivo} placeholder="Tomate, Chile..." />
            </div>
            <Btns
              onSave={handleAdd}
              onCancel={() => { setAdding(false); setNewNombre(''); setNewCultivo(''); }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors"
        >
          <Plus size={14} /> Agregar cliente
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARCELAS TAB
// ─────────────────────────────────────────────────────────────────────────────

function ParcelasTab() {
  const { clientes, parcelas, naves, addParcela, updateParcela, deleteParcela } = useStore();

  const [filterClienteId, setFilterClienteId] = useState('');
  const [editId, setEditId]                   = useState<string | null>(null);
  const [editNombre, setEditNombre]           = useState('');
  const [editClienteId, setEditClienteId]     = useState('');
  const [adding, setAdding]                   = useState(false);
  const [newNombre, setNewNombre]             = useState('');
  const [newClienteId, setNewClienteId]       = useState(clientes[0]?.id ?? '');
  const [deleteConfirm, setDeleteConfirm]     = useState<string | null>(null);

  const filtered = filterClienteId
    ? parcelas.filter((p) => p.clienteId === filterClienteId)
    : parcelas;

  function startEdit(p: Parcela) {
    setEditId(p.id);
    setEditNombre(p.nombre);
    setEditClienteId(p.clienteId);
  }

  function saveEdit() {
    if (!editId || !editNombre.trim() || !editClienteId) return;
    updateParcela(editId, { nombre: editNombre.trim(), clienteId: editClienteId });
    setEditId(null);
  }

  function handleAdd() {
    if (!newNombre.trim() || !newClienteId) return;
    addParcela({ id: uid(), nombre: newNombre.trim(), clienteId: newClienteId });
    setNewNombre(''); setAdding(false);
  }

  function countNaves(pId: string)  { return naves.filter((n) => n.parcelaId === pId).length; }
  function hasChildren(pId: string) { return countNaves(pId) > 0; }
  function clienteNombre(cId: string) { return clientes.find((c) => c.id === cId)?.nombre ?? '—'; }

  const clienteOptions = clientes.map((c) => ({ value: c.id, label: c.nombre }));

  return (
    <div className="space-y-3">
      {/* Filtro */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium shrink-0">Filtrar por cliente:</span>
        <select
          value={filterClienteId}
          onChange={(e) => setFilterClienteId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
        >
          <option value="">Todos</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} parcela{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            No hay parcelas{filterClienteId ? ' para este cliente' : ' registradas'}
          </div>
        )}
        {filtered.map((p, i) => (
          <div key={p.id} className={i > 0 ? 'border-t border-gray-100' : ''}>

            {editId === p.id ? (
              <div className="p-4 bg-green-50/40">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-40">
                    <Field label="Nombre *" value={editNombre} onChange={setEditNombre} />
                  </div>
                  <div className="flex-1 min-w-40">
                    <SelectField label="Cliente *" value={editClienteId} onChange={setEditClienteId} options={clienteOptions} />
                  </div>
                  <Btns onSave={saveEdit} onCancel={() => setEditId(null)} />
                </div>
              </div>

            ) : deleteConfirm === p.id ? (
              <div className="px-5 py-3 bg-red-50 flex items-center gap-3">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-700 flex-1">
                  {hasChildren(p.id)
                    ? `No se puede eliminar: tiene ${countNaves(p.id)} nave(s) asociada(s).`
                    : `¿Eliminar "${p.nombre}"?`}
                </p>
                <div className="flex gap-2">
                  {!hasChildren(p.id) && (
                    <button
                      onClick={() => { deleteParcela(p.id); setDeleteConfirm(null); }}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600"
                    >
                      Eliminar
                    </button>
                  )}
                  <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>

            ) : (
              <div className="flex items-center gap-4 px-5 py-3.5 group hover:bg-gray-50/50">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Map size={14} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{clienteNombre(p.clienteId)}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {countNaves(p.id)} nave{countNaves(p.id) !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(p)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-white"
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(p.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 border border-red-100 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Nueva parcela</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <Field label="Nombre *" value={newNombre} onChange={setNewNombre} placeholder="El Bajío 3..." />
            </div>
            <div className="flex-1 min-w-40">
              <SelectField label="Cliente *" value={newClienteId} onChange={setNewClienteId} options={clienteOptions} />
            </div>
            <Btns
              onSave={handleAdd}
              onCancel={() => { setAdding(false); setNewNombre(''); }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors"
        >
          <Plus size={14} /> Agregar parcela
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVES TAB
// ─────────────────────────────────────────────────────────────────────────────

function NavesTab() {
  const { clientes, parcelas, naves, puntos, addNave, updateNave, deleteNave } = useStore();

  const [filterParcelaId, setFilterParcelaId] = useState('');
  const [editId, setEditId]                   = useState<string | null>(null);
  const [editData, setEditData]               = useState({ nombre: '', numero: '', parcelaId: '' });
  const [adding, setAdding]                   = useState(false);
  const [newData, setNewData]                 = useState({ nombre: '', numero: '', parcelaId: parcelas[0]?.id ?? '' });
  const [deleteConfirm, setDeleteConfirm]     = useState<string | null>(null);

  const filtered = filterParcelaId
    ? naves.filter((n) => n.parcelaId === filterParcelaId)
    : naves;

  function startEdit(n: Nave) {
    setEditId(n.id);
    setEditData({ nombre: n.nombre, numero: String(n.numero), parcelaId: n.parcelaId });
  }

  function saveEdit() {
    if (!editId || !editData.nombre.trim() || !editData.parcelaId) return;
    updateNave(editId, {
      nombre: editData.nombre.trim(),
      numero: Number(editData.numero) || 0,
      parcelaId: editData.parcelaId,
    });
    setEditId(null);
  }

  function handleAdd() {
    if (!newData.nombre.trim() || !newData.parcelaId) return;
    addNave({ id: uid(), nombre: newData.nombre.trim(), numero: Number(newData.numero) || 0, parcelaId: newData.parcelaId });
    setNewData((d) => ({ nombre: '', numero: '', parcelaId: d.parcelaId }));
    setAdding(false);
  }

  function countPuntos(nId: string)  { return puntos.filter((p) => p.naveId === nId).length; }
  function hasChildren(nId: string)  { return countPuntos(nId) > 0; }

  function parcelaNombre(pId: string) {
    const p = parcelas.find((p) => p.id === pId);
    if (!p) return '—';
    const c = clientes.find((c) => c.id === p.clienteId);
    return `${c ? c.nombre + ' › ' : ''}${p.nombre}`;
  }

  const parcelaOptions = parcelas.map((p) => ({
    value: p.id,
    label: `${clientes.find((c) => c.id === p.clienteId)?.nombre ?? ''} › ${p.nombre}`,
  }));

  return (
    <div className="space-y-3">
      {/* Filtro */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
        <span className="text-xs text-gray-400 font-medium shrink-0">Filtrar por parcela:</span>
        <select
          value={filterParcelaId}
          onChange={(e) => setFilterParcelaId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
        >
          <option value="">Todas</option>
          {parcelas.map((p) => (
            <option key={p.id} value={p.id}>
              {clientes.find((c) => c.id === p.clienteId)?.nombre} › {p.nombre}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} nave{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            No hay naves{filterParcelaId ? ' en esta parcela' : ' registradas'}
          </div>
        )}
        {filtered.map((n, i) => (
          <div key={n.id} className={i > 0 ? 'border-t border-gray-100' : ''}>

            {editId === n.id ? (
              <div className="p-4 bg-green-50/40">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="w-24">
                    <Field label="Número" value={editData.numero} onChange={(v) => setEditData((d) => ({ ...d, numero: v }))} placeholder="7" />
                  </div>
                  <div className="flex-1 min-w-36">
                    <Field label="Nombre *" value={editData.nombre} onChange={(v) => setEditData((d) => ({ ...d, nombre: v }))} placeholder="Nave 7" />
                  </div>
                  <div className="flex-1 min-w-40">
                    <SelectField label="Parcela *" value={editData.parcelaId} onChange={(v) => setEditData((d) => ({ ...d, parcelaId: v }))} options={parcelaOptions} />
                  </div>
                  <Btns onSave={saveEdit} onCancel={() => setEditId(null)} />
                </div>
              </div>

            ) : deleteConfirm === n.id ? (
              <div className="px-5 py-3 bg-red-50 flex items-center gap-3">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-700 flex-1">
                  {hasChildren(n.id)
                    ? `No se puede eliminar: tiene ${countPuntos(n.id)} punto(s) de muestreo.`
                    : `¿Eliminar "${n.nombre}"?`}
                </p>
                <div className="flex gap-2">
                  {!hasChildren(n.id) && (
                    <button
                      onClick={() => { deleteNave(n.id); setDeleteConfirm(null); }}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600"
                    >
                      Eliminar
                    </button>
                  )}
                  <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>

            ) : (
              <div className="flex items-center gap-4 px-5 py-3.5 group hover:bg-gray-50/50">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-xs font-bold text-amber-700">
                  {n.numero || '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">{n.nombre}</p>
                  <p className="text-xs text-gray-400">{parcelaNombre(n.parcelaId)}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {countPuntos(n.id)} punto{countPuntos(n.id) !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(n)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-white"
                  >
                    <Pencil size={11} /> Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(n.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 border border-red-100 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Nueva nave</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-24">
              <Field label="Número" value={newData.numero} onChange={(v) => setNewData((d) => ({ ...d, numero: v }))} placeholder="13" />
            </div>
            <div className="flex-1 min-w-36">
              <Field label="Nombre *" value={newData.nombre} onChange={(v) => setNewData((d) => ({ ...d, nombre: v }))} placeholder="Nave 13" />
            </div>
            <div className="flex-1 min-w-40">
              <SelectField label="Parcela *" value={newData.parcelaId} onChange={(v) => setNewData((d) => ({ ...d, parcelaId: v }))} options={parcelaOptions} />
            </div>
            <Btns
              onSave={handleAdd}
              onCancel={() => { setAdding(false); setNewData((d) => ({ nombre: '', numero: '', parcelaId: d.parcelaId })); }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors"
        >
          <Plus size={14} /> Agregar nave
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Configuracion() {
  const { clientes, parcelas, naves } = useStore();
  const [tab, setTab] = useState<'clientes' | 'parcelas' | 'naves'>('clientes');
  const [showWizard, setShowWizard] = useState(false);

  const tabs = [
    { key: 'clientes' as const, label: 'Clientes',  Icon: Building2, count: clientes.length },
    { key: 'parcelas' as const, label: 'Parcelas',  Icon: Map,       count: parcelas.length },
    { key: 'naves'    as const, label: 'Naves',     Icon: LayoutList, count: naves.length   },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {showWizard && <NuevoClienteWizard onClose={() => setShowWizard(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1a3320]">Configuración</h1>
          <p className="text-sm text-gray-500">Gestiona clientes, parcelas y naves del sistema</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3320] text-white text-sm font-medium
            rounded-xl hover:bg-[#254830] transition-colors shadow-sm shrink-0"
        >
          <UserPlus size={15} /> Alta de cliente
        </button>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm">
        {tabs.map(({ key, label, Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-[#1a3320] text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon size={14} />
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              tab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'clientes' && <ClientesTab />}
      {tab === 'parcelas' && <ParcelasTab />}
      {tab === 'naves'    && <NavesTab />}
    </div>
  );
}
