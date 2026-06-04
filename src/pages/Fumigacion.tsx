import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, useMap } from 'react-leaflet';
import { useStore, haversineM } from '../store/useStore';
import type { Fumigacion as FumigacionType } from '../types';
import {
  Play, Square, Navigation, Clock, Ruler, CheckCircle2,
  ChevronDown, AlertTriangle, History, Trash2, MapPin,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function fmtDistancia(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function centroide(pts: [number, number][]): [number, number] {
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [lat, lng];
}

// ── FlyTo helper ─────────────────────────────────────────────────────────────
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 17, { duration: 1.2 });
  }, [target, map]);
  return null;
}

// ── Colores por estado ────────────────────────────────────────────────────────
const COLOR_ACTIVA     = '#f97316'; // naranja
const COLOR_COMPLETADA = '#16a34a'; // verde
const COLOR_CANCELADA  = '#6b7280'; // gris

function estadoColor(e: FumigacionType['estado']) {
  return e === 'activa' ? COLOR_ACTIVA : e === 'completada' ? COLOR_COMPLETADA : COLOR_CANCELADA;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Fumigacion() {
  const { sesion, parcelas, naves, clientes, fumigaciones, addFumigacion, updateFumigacion } = useStore();

  // ── Selección ────────────────────────────────────────────────────────────────
  const [parcelaId, setParcelaId] = useState(parcelas[0]?.id ?? '');
  const [naveId, setNaveId]       = useState('');
  const [tab, setTab]             = useState<'nueva' | 'historial'>('nueva');

  const parcela = parcelas.find((p) => p.id === parcelaId);
  const navesDeP = naves.filter((n) => n.parcelaId === parcelaId);
  const clienteDeP = clientes.find((c) => c.id === parcela?.clienteId);

  // ── Estado de tracking ───────────────────────────────────────────────────────
  const [estado, setEstado]           = useState<'idle' | 'activa' | 'done'>('idle');
  const [ruta, setRuta]               = useState<[number, number][]>([]);
  const [distanciaM, setDistanciaM]   = useState(0);
  const [posActual, setPosActual]     = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget]     = useState<[number, number] | null>(null);
  const [startTime, setStartTime]     = useState<number | null>(null);
  const [elapsed, setElapsed]         = useState(0);
  const [fumigacionId, setFumigacionId] = useState<string | null>(null);
  const [gpsError, setGpsError]       = useState('');

  const watchIdRef = useRef<number | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (estado === 'activa') {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - (startTime ?? Date.now()));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [estado, startTime]);

  // ── GPS onSuccess ────────────────────────────────────────────────────────────
  const onGpsSuccess = useCallback((pos: GeolocationPosition) => {
    const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
    setPosActual(coords);
    setFlyTarget(coords);

    setRuta((prev) => {
      if (prev.length === 0) return [coords];
      const dist = haversineM(prev[prev.length - 1], coords);
      if (dist < 1) return prev; // filtrar puntos muy cercanos
      const newRuta = [...prev, coords];
      setDistanciaM((d) => d + dist);

      // Actualizar fumigacion en store en tiempo real
      setFumigacionId((fid) => {
        if (fid) {
          updateFumigacion(fid, { ruta: newRuta, distanciaM: distanciaM + dist });
        }
        return fid;
      });
      return newRuta;
    });
  }, [distanciaM, updateFumigacion]);

  const onGpsError = useCallback((err: GeolocationPositionError) => {
    setGpsError(`GPS: ${err.message}`);
  }, []);

  // ── Iniciar ──────────────────────────────────────────────────────────────────
  function iniciar() {
    if (!navigator.geolocation) {
      setGpsError('Tu dispositivo no soporta GPS');
      return;
    }
    setGpsError('');
    setRuta([]);
    setDistanciaM(0);
    const now = Date.now();
    setStartTime(now);
    setElapsed(0);

    const fid = uid();
    const nuevaFumigacion: FumigacionType = {
      id: fid,
      parcelaId,
      naveId: naveId || undefined,
      operadorId: sesion?.id ?? 'desconocido',
      operadorNombre: sesion?.nombre ?? 'Operador',
      fechaInicio: new Date(now).toISOString(),
      ruta: [],
      distanciaM: 0,
      estado: 'activa',
    };
    addFumigacion(nuevaFumigacion);
    setFumigacionId(fid);
    setEstado('activa');

    watchIdRef.current = navigator.geolocation.watchPosition(onGpsSuccess, onGpsError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
  }

  // ── Finalizar ────────────────────────────────────────────────────────────────
  function finalizar() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (fumigacionId) {
      updateFumigacion(fumigacionId, {
        estado: 'completada',
        fechaFin: new Date().toISOString(),
        ruta,
        distanciaM,
      });
    }
    setEstado('done');
  }

  // ── Cancelar ─────────────────────────────────────────────────────────────────
  function cancelar() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (fumigacionId) {
      updateFumigacion(fumigacionId, { estado: 'cancelada', fechaFin: new Date().toISOString() });
    }
    setEstado('idle');
    setRuta([]);
    setDistanciaM(0);
    setFumigacionId(null);
  }

  function resetearNueva() {
    setEstado('idle');
    setRuta([]);
    setDistanciaM(0);
    setFumigacionId(null);
    setPosActual(null);
  }

  // ── Centro del mapa ──────────────────────────────────────────────────────────
  const mapaCenter: [number, number] = parcela?.poligono
    ? centroide(parcela.poligono)
    : [24.8, -107.4]; // Culiacán por defecto

  // ── Historial filtrado ───────────────────────────────────────────────────────
  const historial = [...fumigaciones]
    .filter((f) => f.parcelaId === parcelaId)
    .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#0f1f14] text-white overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a3320] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Navigation size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Fumigación GPS</p>
            <p className="text-[10px] text-green-300 leading-tight">
              {clienteDeP?.nombre ?? '—'} · {parcela?.nombre ?? '—'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-white/10 p-1 gap-1">
          <button
            onClick={() => setTab('nueva')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'nueva' ? 'bg-white text-[#1a3320]' : 'text-white/60 hover:text-white'
            }`}
          >
            Nueva
          </button>
          <button
            onClick={() => setTab('historial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'historial' ? 'bg-white text-[#1a3320]' : 'text-white/60 hover:text-white'
            }`}
          >
            <History size={12} />
            Historial
            {historial.length > 0 && (
              <span className="bg-amber-400 text-[#1a3320] rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {historial.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── TAB NUEVA ────────────────────────────────────────────────────────── */}
      {tab === 'nueva' && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Selectores */}
          {estado === 'idle' && (
            <div className="flex gap-3 px-4 py-3 bg-[#1a3320]/60 shrink-0">
              {/* Parcela */}
              <div className="flex-1 relative">
                <select
                  value={parcelaId}
                  onChange={(e) => { setParcelaId(e.target.value); setNaveId(''); }}
                  className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl
                    px-3 py-2.5 text-sm text-white pr-8 focus:outline-none focus:border-amber-400"
                >
                  {parcelas.map((p) => (
                    <option key={p.id} value={p.id} className="text-gray-900">{p.nombre}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
              </div>
              {/* Nave (opcional) */}
              <div className="flex-1 relative">
                <select
                  value={naveId}
                  onChange={(e) => setNaveId(e.target.value)}
                  className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl
                    px-3 py-2.5 text-sm text-white pr-8 focus:outline-none focus:border-amber-400"
                >
                  <option value="" className="text-gray-900">Toda la parcela</option>
                  {navesDeP.map((n) => (
                    <option key={n.id} value={n.id} className="text-gray-900">{n.nombre}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
              </div>
            </div>
          )}

          {/* ── MAPA ─────────────────────────────────────────────────────────── */}
          <div className="flex-1 relative">
            <MapContainer
              key={parcelaId}
              center={mapaCenter}
              zoom={17}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Esri"
                maxZoom={20}
              />
              <FlyTo target={flyTarget} />

              {/* Polígono de la parcela */}
              {parcela?.poligono && (
                <Polygon
                  positions={parcela.poligono}
                  pathOptions={{ color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.08, weight: 2, dashArray: '6 4' }}
                />
              )}

              {/* Ruta recorrida */}
              {ruta.length > 1 && (
                <Polyline
                  positions={ruta}
                  pathOptions={{ color: COLOR_ACTIVA, weight: 4, lineCap: 'round', lineJoin: 'round' }}
                />
              )}

              {/* Posición actual */}
              {posActual && (
                <>
                  <CircleMarker
                    center={posActual}
                    radius={14}
                    pathOptions={{ color: '#fff', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}
                  />
                  <CircleMarker
                    center={posActual}
                    radius={24}
                    pathOptions={{ color: '#3b82f6', fillColor: 'transparent', fillOpacity: 0, weight: 1.5, opacity: 0.4 }}
                  />
                </>
              )}

              {/* Inicio de ruta */}
              {ruta.length > 0 && (
                <CircleMarker
                  center={ruta[0]}
                  radius={7}
                  pathOptions={{ color: '#fff', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }}
                />
              )}
            </MapContainer>

            {/* ── Stats overlay (durante tracking) ─────────────────────────── */}
            {estado === 'activa' && (
              <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2 pointer-events-none">
                <div className="flex-1 bg-black/70 backdrop-blur rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Clock size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase tracking-wider">Tiempo</p>
                    <p className="text-lg font-bold font-mono leading-tight">{fmtDuration(elapsed)}</p>
                  </div>
                </div>
                <div className="flex-1 bg-black/70 backdrop-blur rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Ruler size={16} className="text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-white/50 uppercase tracking-wider">Recorrido</p>
                    <p className="text-lg font-bold font-mono leading-tight">{fmtDistancia(distanciaM)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Pantalla de completado ────────────────────────────────────── */}
            {estado === 'done' && (
              <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-[#1a3320] rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={36} className="text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">¡Fumigación completada!</h3>
                  <p className="text-sm text-white/60 mb-6">Ruta guardada correctamente</p>

                  <div className="flex gap-4 justify-center mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">{fmtDuration(elapsed)}</p>
                      <p className="text-xs text-white/50">duración</p>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">{fmtDistancia(distanciaM)}</p>
                      <p className="text-xs text-white/50">recorrido</p>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{ruta.length}</p>
                      <p className="text-xs text-white/50">puntos GPS</p>
                    </div>
                  </div>

                  <button
                    onClick={resetearNueva}
                    className="w-full py-3 rounded-2xl bg-green-600 hover:bg-green-500 font-bold text-sm transition-colors"
                  >
                    Nueva fumigación
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── GPS error ────────────────────────────────────────────────────── */}
          {gpsError && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/60 border-t border-red-700/40 shrink-0">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-300">{gpsError}</p>
            </div>
          )}

          {/* ── Botones de acción ─────────────────────────────────────────── */}
          <div className="px-4 py-4 bg-[#1a3320]/80 border-t border-white/10 shrink-0">
            {estado === 'idle' && (
              <button
                onClick={iniciar}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98]
                  text-[#1a1a0a] font-bold text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-amber-500/20"
              >
                <Play size={20} fill="currentColor" />
                Iniciar fumigación
              </button>
            )}

            {estado === 'activa' && (
              <div className="flex gap-3">
                <button
                  onClick={cancelar}
                  className="flex-none px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20
                    font-semibold text-sm flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  Cancelar
                </button>
                <button
                  onClick={finalizar}
                  className="flex-1 py-4 rounded-2xl bg-green-600 hover:bg-green-500 active:scale-[0.98]
                    font-bold text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-600/20"
                >
                  <Square size={18} fill="currentColor" />
                  Finalizar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB HISTORIAL ────────────────────────────────────────────────────── */}
      {tab === 'historial' && (
        <div className="flex-1 overflow-y-auto">
          {/* Selector de parcela en historial */}
          <div className="px-4 py-3 bg-[#1a3320]/60 border-b border-white/10 sticky top-0 z-10">
            <div className="relative">
              <select
                value={parcelaId}
                onChange={(e) => setParcelaId(e.target.value)}
                className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl
                  px-3 py-2.5 text-sm text-white pr-8 focus:outline-none focus:border-amber-400"
              >
                {parcelas.map((p) => (
                  <option key={p.id} value={p.id} className="text-gray-900">{p.nombre}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
            </div>
          </div>

          {historial.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <History size={40} className="text-white/20 mb-3" />
              <p className="text-white/40 text-sm">No hay fumigaciones registradas para esta parcela</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {historial.map((f) => {
                const inicio = new Date(f.fechaInicio);
                const durMs = f.fechaFin
                  ? new Date(f.fechaFin).getTime() - inicio.getTime()
                  : null;
                const nave = naves.find((n) => n.id === f.naveId);
                return (
                  <div key={f.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    {/* Header de card */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: estadoColor(f.estado) }}
                          />
                          <span className="text-xs font-semibold capitalize" style={{ color: estadoColor(f.estado) }}>
                            {f.estado}
                          </span>
                        </div>
                        <p className="text-sm font-bold">
                          {inicio.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' '}
                          <span className="font-normal text-white/50">
                            {inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1">
                          <MapPin size={10} />
                          {nave ? nave.nombre : 'Parcela completa'} · {f.operadorNombre}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-white/40 uppercase tracking-wide">Distancia</p>
                        <p className="text-sm font-bold text-blue-400">{fmtDistancia(f.distanciaM)}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-white/40 uppercase tracking-wide">Duración</p>
                        <p className="text-sm font-bold text-amber-400">
                          {durMs !== null ? fmtDuration(durMs) : '—'}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-white/40 uppercase tracking-wide">Puntos</p>
                        <p className="text-sm font-bold text-green-400">{f.ruta.length}</p>
                      </div>
                    </div>

                    {/* Mini mapa de la ruta */}
                    {f.ruta.length > 1 && (
                      <div className="mt-3 rounded-xl overflow-hidden" style={{ height: 160 }}>
                        <MapContainer
                          key={f.id}
                          center={centroide(f.ruta)}
                          zoom={17}
                          style={{ width: '100%', height: '100%' }}
                          zoomControl={false}
                          dragging={false}
                          scrollWheelZoom={false}
                          doubleClickZoom={false}
                        >
                          <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="Esri"
                            maxZoom={20}
                          />
                          {parcela?.poligono && (
                            <Polygon
                              positions={parcela.poligono}
                              pathOptions={{ color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.08, weight: 2, dashArray: '4 3' }}
                            />
                          )}
                          <Polyline
                            positions={f.ruta}
                            pathOptions={{ color: estadoColor(f.estado), weight: 3, lineCap: 'round', lineJoin: 'round' }}
                          />
                          <CircleMarker center={f.ruta[0]} radius={5} pathOptions={{ color: '#fff', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }} />
                          {f.ruta.length > 1 && (
                            <CircleMarker center={f.ruta[f.ruta.length - 1]} radius={5} pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }} />
                          )}
                        </MapContainer>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
