import { useState, Fragment, useEffect } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Popup,
  Polygon, Polyline, Marker, useMapEvents, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../store/useStore';
import type { Analisis, Nave, Parcela } from '../types';
import { COLORES_ORGANISMOS, UMBRALES_NEMATODOS } from '../types';
import { MapPin, Plus, X, ChevronDown, Pencil, Trash2, CheckCircle2 } from 'lucide-react';

// ── Parcela colors ────────────────────────────────────────────────────────────

const PARCELA_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6'];
function parcelaColor(i: number) { return PARCELA_COLORS[i % PARCELA_COLORS.length]; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function centroid(pts: [number, number][]): [number, number] {
  return [
    pts.reduce((s, [la]) => s + la, 0) / pts.length,
    pts.reduce((s, [, ln]) => s + ln, 0) / pts.length,
  ];
}

function getPuntoColor(puntoId: string, analisis: Analisis[]) {
  const lista = analisis.filter((a) => a.puntoId === puntoId && a.tipo === 'nematodos');
  let sev = 0;
  for (const a of lista) {
    for (const r of a.resultadosNematodos ?? []) {
      const u = UMBRALES_NEMATODOS.find((u) => u.organismo === r.organismo);
      if (u && r.individuosPor100cc >= u.valor) sev = 2;
      else if (u && r.individuosPor100cc >= u.valor * 0.7 && sev < 2) sev = 1;
    }
  }
  if (lista.length === 0) return '#6b7280';
  return sev === 2 ? '#ef4444' : sev === 1 ? '#f97316' : '#16a34a';
}

// ── Map click handler ─────────────────────────────────────────────────────────

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ── Fly-to controller ─────────────────────────────────────────────────────────

interface FlyTarget { lat: number; lng: number; zoom: number; }

function FlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.0, easeLinearity: 0.25 });
    }
  }, [target, map]);
  return null;
}

// ── Add punto panel ───────────────────────────────────────────────────────────

function AddPanel({
  lat, lng, onSave, onCancel, naves, parcelas,
}: {
  lat: number; lng: number;
  onSave: (naveId: string, tabla: string) => void;
  onCancel: () => void;
  naves: Nave[];
  parcelas: Parcela[];
}) {
  const [parcelaId, setParcelaId] = useState('');
  const [naveId, setNaveId]       = useState('');
  const [tabla, setTabla]         = useState('');
  const navesParc = naves.filter((n) => n.parcelaId === parcelaId);

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-64">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
          <MapPin size={13} className="text-green-600" /> Nuevo punto de muestreo
        </p>
        <button onClick={onCancel}><X size={14} className="text-gray-400 hover:text-gray-600" /></button>
      </div>
      <p className="text-[10px] text-gray-400 mb-3">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
      <div className="space-y-2">
        <div className="relative">
          <select value={parcelaId} onChange={(e) => { setParcelaId(e.target.value); setNaveId(''); }}
            className="w-full appearance-none text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 pr-6">
            <option value="">Parcela</option>
            {parcelas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={naveId} onChange={(e) => setNaveId(e.target.value)}
            className="w-full appearance-none text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 pr-6">
            <option value="">Nave</option>
            {navesParc.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <input value={tabla} onChange={(e) => setTabla(e.target.value)}
          placeholder="Tabla / zona (ej. Tabla 1 y 2)"
          className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5" />
        <button disabled={!naveId || !tabla} onClick={() => onSave(naveId, tabla)}
          className="w-full bg-[#1769a5] text-white text-xs py-1.5 rounded-lg disabled:opacity-40 hover:bg-[#11537f] transition-colors">
          Guardar punto
        </button>
      </div>
    </div>
  );
}

// ── Parcela label divIcon ─────────────────────────────────────────────────────

function parcelaIcon(nombre: string, color: string) {
  return L.divIcon({
    className: '',
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="
      position:absolute;
      transform:translate(-50%,-50%);
      background:${color};
      color:#fff;
      padding:3px 10px;
      border-radius:20px;
      font-size:12px;
      font-weight:700;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.45);
      pointer-events:none;
      letter-spacing:0.02em;
    ">${nombre}</div>`,
  });
}

// ── Main page ─────────────────────────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [24.8, -107.4];
const DEFAULT_ZOOM = 13;

export default function Mapa() {
  const { parcelas, naves, puntos, analisis, addPunto, updateParcela } = useStore();

  // Puntos mode
  const [addMode, setAddMode]           = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [filtroParcelaId, setFiltroParcelaId] = useState('');

  // Polígono mode
  const [sidebarTab, setSidebarTab]         = useState<'puntos' | 'parcelas'>('puntos');
  const [dibujarParcelaId, setDibujarParcelaId] = useState<string | null>(null);
  const [borrador, setBorrador]             = useState<[number, number][]>([]);

  // Fly-to
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);

  function flyToPunto(lat: number, lng: number) {
    setFlyTarget({ lat, lng, zoom: 18 });
  }
  function flyToParcela(poligono: [number, number][]) {
    if (poligono.length < 1) return;
    const [lat, lng] = centroid(poligono);
    setFlyTarget({ lat, lng, zoom: 17 });
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const puntosConCoords = puntos.filter((p) => p.lat !== undefined && p.lng !== undefined);
  const puntosFiltrados = filtroParcelaId
    ? puntosConCoords.filter((p) => naves.find((n) => n.id === p.naveId)?.parcelaId === filtroParcelaId)
    : puntosConCoords;

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function handleMapClick(lat: number, lng: number) {
    // Drawing parcela polygon
    if (dibujarParcelaId) {
      setBorrador((prev) => [...prev, [lat, lng]]);
      return;
    }
    // Adding sampling punto
    if (!addMode) return;
    setPendingCoords({ lat, lng });
  }

  function handleSavePunto(naveId: string, tabla: string) {
    if (!pendingCoords) return;
    addPunto({ id: `pt-map-${Date.now()}`, naveId, tabla, lat: pendingCoords.lat, lng: pendingCoords.lng });
    setPendingCoords(null);
    setAddMode(false);
  }

  function iniciarDibujo(parcelaId: string) {
    setAddMode(false);
    setPendingCoords(null);
    setDibujarParcelaId(parcelaId);
    setBorrador([]);
  }

  function finalizarPoligono() {
    if (!dibujarParcelaId || borrador.length < 3) return;
    updateParcela(dibujarParcelaId, { poligono: borrador });
    setDibujarParcelaId(null);
    setBorrador([]);
  }

  function cancelarDibujo() {
    setDibujarParcelaId(null);
    setBorrador([]);
  }

  function limpiarPoligono(parcelaId: string) {
    updateParcela(parcelaId, { poligono: undefined });
  }

  function deshacerUltimo() {
    setBorrador((prev) => prev.slice(0, -1));
  }

  const dibujarNombre = parcelas.find((p) => p.id === dibujarParcelaId)?.nombre ?? '';
  const modoActivo = dibujarParcelaId !== null || addMode;

  return (
    <div className="flex h-screen relative">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <div className="w-56 bg-white border-r border-gray-100 flex flex-col z-10 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-sm font-bold text-[#1769a5]">Mapa de muestreo</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Culiacán, Sinaloa</p>
        </div>

        {/* Tab toggle */}
        <div className="flex border-b border-gray-100 text-xs">
          {(['puntos', 'parcelas'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setSidebarTab(t); cancelarDibujo(); setAddMode(false); setPendingCoords(null); }}
              className={`flex-1 py-2 font-medium transition-colors ${
                sidebarTab === t
                  ? 'text-[#1769a5] border-b-2 border-[#1769a5]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'puntos' ? 'Puntos' : 'Parcelas'}
            </button>
          ))}
        </div>

        {/* ── TAB PUNTOS ─────────────────────────────────────────────────────── */}
        {sidebarTab === 'puntos' && (
          <>
            <div className="p-3 border-b border-gray-100 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Con coordenadas</span>
                <span className="font-semibold text-green-700">{puntosConCoords.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Sin ubicar</span>
                <span className="font-semibold text-gray-400">{puntos.length - puntosConCoords.length}</span>
              </div>
            </div>

            <div className="p-3 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Filtrar parcela</p>
              <div className="relative">
                <select value={filtroParcelaId} onChange={(e) => setFiltroParcelaId(e.target.value)}
                  className="w-full appearance-none text-xs bg-gray-50 border border-gray-100 rounded px-2 py-1.5 pr-6">
                  <option value="">Todas</option>
                  {parcelas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="p-3 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Leyenda</p>
              {[
                { color: '#ef4444', label: 'Sobre umbral' },
                { color: '#f97316', label: 'Precaución' },
                { color: '#16a34a', label: 'Normal' },
                { color: '#6b7280', label: 'Sin análisis' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-gray-600">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Puntos ubicados ({puntosFiltrados.length})
              </p>
              {puntosFiltrados.length === 0 && (
                <p className="text-[11px] text-gray-400 italic">
                  Ningún punto ubicado. Usa "Agregar punto".
                </p>
              )}
              {puntosFiltrados.map((p) => {
                const nave    = naves.find((n) => n.id === p.naveId);
                const parcela = parcelas.find((pa) => pa.id === nave?.parcelaId);
                const color   = getPuntoColor(p.id, analisis);
                const hasCoords = p.lat !== undefined && p.lng !== undefined;
                return (
                  <div
                    key={p.id}
                    onClick={() => hasCoords && flyToPunto(p.lat!, p.lng!)}
                    className={`mb-1 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                      hasCoords
                        ? 'cursor-pointer hover:bg-green-50 active:bg-green-100'
                        : 'opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-gray-700 truncate">{nave?.nombre} · {p.tabla}</span>
                    </div>
                    <p className="text-gray-400 ml-3.5">{parcela?.nombre}</p>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => { setAddMode(!addMode); setPendingCoords(null); }}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                  addMode
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-[#1769a5] text-white hover:bg-[#11537f]'
                }`}
              >
                {addMode ? <><X size={13} /> Cancelar</> : <><Plus size={13} /> Agregar punto</>}
              </button>
              {addMode && (
                <p className="text-[10px] text-gray-400 text-center mt-1.5">
                  Haz clic en el mapa para colocar un punto
                </p>
              )}
            </div>
          </>
        )}

        {/* ── TAB PARCELAS ───────────────────────────────────────────────────── */}
        {sidebarTab === 'parcelas' && (
          <>
            {/* Drawing mode active */}
            {dibujarParcelaId ? (
              <div className="p-3 border-b border-gray-100 bg-blue-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-blue-500 shrink-0" />
                  <p className="text-xs font-semibold text-blue-800">Dibujando: {dibujarNombre}</p>
                </div>
                <p className="text-[11px] text-blue-600 mb-3">
                  {borrador.length === 0
                    ? 'Haz clic en el mapa para marcar los vértices del polígono'
                    : `${borrador.length} vértice${borrador.length !== 1 ? 's' : ''} marcado${borrador.length !== 1 ? 's' : ''}${borrador.length >= 3 ? ' — puedes finalizar' : ''}`}
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    disabled={borrador.length < 3}
                    onClick={finalizarPoligono}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40"
                  >
                    <CheckCircle2 size={13} /> Finalizar polígono
                  </button>
                  {borrador.length > 0 && (
                    <button onClick={deshacerUltimo}
                      className="w-full py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                      ↩ Deshacer último
                    </button>
                  )}
                  <button onClick={cancelarDibujo}
                    className="w-full py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 border-b border-gray-100">
                <p className="text-[10px] text-gray-400">
                  Delimita cada parcela en el mapa satelital para identificarla visualmente.
                </p>
              </div>
            )}

            {/* Parcelas list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {parcelas.map((p, i) => {
                const color    = parcelaColor(i);
                const tienePoligono = p.poligono && p.poligono.length >= 3;
                const estaActiva    = dibujarParcelaId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`rounded-lg border p-2.5 transition-colors ${
                      estaActiva
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-100 bg-white hover:bg-gray-50/50'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 mb-1.5 ${tienePoligono ? 'cursor-pointer' : ''}`}
                      onClick={() => tienePoligono && flyToParcela(p.poligono!)}
                      title={tienePoligono ? 'Ir a la parcela en el mapa' : ''}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color, opacity: tienePoligono ? 1 : 0.4 }}
                      />
                      <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{p.nombre}</span>
                      {tienePoligono && (
                        <span className="text-[10px] text-blue-400 font-medium">↗</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {tienePoligono ? (
                        <>
                          <button
                            onClick={() => iniciarDibujo(p.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-gray-600 border border-gray-200 rounded hover:bg-white"
                          >
                            <Pencil size={10} /> Redibujar
                          </button>
                          <button
                            onClick={() => limpiarPoligono(p.id)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-400 border border-red-100 rounded hover:bg-red-50"
                          >
                            <Trash2 size={10} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => iniciarDibujo(p.id)}
                          className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50 font-medium"
                        >
                          <Pencil size={10} /> Dibujar área
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <div className={`flex-1 relative ${modoActivo ? 'cursor-crosshair' : ''}`}>

        {/* Hint overlay when no points and not adding */}
        {puntosConCoords.length === 0 && !modoActivo && sidebarTab === 'puntos' && (
          <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
            <div className="bg-white/90 border border-gray-200 rounded-2xl px-6 py-5 shadow-lg max-w-xs text-center">
              <MapPin size={28} className="text-green-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700 mb-1">Ningún punto ubicado aún</p>
              <p className="text-xs text-gray-500">
                Usa <strong>"Agregar punto"</strong> y haz clic en el mapa.
              </p>
            </div>
          </div>
        )}

        {/* Drawing mode hint */}
        {dibujarParcelaId && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-[#1769a5]/90 text-white text-xs px-4 py-2 rounded-full shadow-lg pointer-events-none">
            Haz clic en el mapa para marcar los vértices · Mín. 3 puntos para finalizar
          </div>
        )}

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
            maxZoom={20}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            maxZoom={20}
            opacity={0.7}
          />

          <ClickHandler onClick={handleMapClick} />
          <FlyTo target={flyTarget} />

          {/* ── Saved parcela polygons ───────────────────────────────────────── */}
          {parcelas.map((p, i) => {
            if (!p.poligono || p.poligono.length < 3) return null;
            const color  = parcelaColor(i);
            const center = centroid(p.poligono);
            return (
              <Fragment key={p.id}>
                <Polygon
                  positions={p.poligono}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.18,
                    weight: 2.5,
                    opacity: 0.85,
                  }}
                />
                <Marker position={center} icon={parcelaIcon(p.nombre, color)} />
              </Fragment>
            );
          })}

          {/* ── Draft polygon being drawn ─────────────────────────────────────── */}
          {borrador.length >= 2 && (
            <Polyline
              positions={borrador}
              pathOptions={{ color: '#ffffff', weight: 2.5, dashArray: '6 4', opacity: 0.95 }}
            />
          )}
          {borrador.map(([lat, lng], i) => (
            <CircleMarker
              key={`draft-${i}`}
              center={[lat, lng]}
              radius={i === 0 ? 6 : 4}
              pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
            />
          ))}

          {/* ── Sampling points ───────────────────────────────────────────────── */}
          {puntosFiltrados.map((p) => {
            const nave    = naves.find((n) => n.id === p.naveId);
            const parcela = parcelas.find((pa) => pa.id === nave?.parcelaId);
            const color   = getPuntoColor(p.id, analisis);
            const lista   = analisis.filter((a) => a.puntoId === p.id);

            return (
              <CircleMarker
                key={p.id}
                center={[p.lat!, p.lng!]}
                radius={10}
                pathOptions={{ color: 'white', fillColor: color, fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <p className="font-semibold text-gray-800 mb-1">{nave?.nombre} · {p.tabla}</p>
                    <p className="text-xs text-gray-500 mb-2">{parcela?.nombre}</p>
                    {lista.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Sin análisis registrado</p>
                    ) : (
                      lista.flatMap((a) =>
                        (a.resultadosNematodos ?? [])
                          .filter((r) => r.organismo !== 'Saprófitos')
                          .map((r, ri) => (
                            <div key={ri} className="flex justify-between text-xs mb-0.5">
                              <span className="text-gray-600">{r.organismo}</span>
                              <span className="font-medium" style={{ color: COLORES_ORGANISMOS[r.organismo] }}>
                                {r.individuosPor100cc} ind/100cc
                              </span>
                            </div>
                          ))
                      )
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Pending coord preview */}
          {pendingCoords && (
            <CircleMarker
              center={[pendingCoords.lat, pendingCoords.lng]}
              radius={10}
              pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 0.8, weight: 2, dashArray: '4 2' }}
            />
          )}
        </MapContainer>

        {/* Add punto overlay */}
        {pendingCoords && (
          <AddPanel
            lat={pendingCoords.lat}
            lng={pendingCoords.lng}
            onSave={handleSavePunto}
            onCancel={() => setPendingCoords(null)}
            naves={naves}
            parcelas={parcelas}
          />
        )}
      </div>
    </div>
  );
}
