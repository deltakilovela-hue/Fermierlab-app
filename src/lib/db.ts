/**
 * db.ts — Capa de acceso a datos Supabase
 * Cada función devuelve los datos con el mismo shape que el store de Zustand,
 * para que la migración sea transparente para el resto de la app.
 */

import { supabase } from './supabase';
import type {
  Cliente, Parcela, Nave, PuntoMuestreo,
  Analisis, Fumigacion, Conversacion,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function check<T>(data: T | null, error: unknown): T {
  if (error) throw error;
  return data as T;
}

// ── Clientes ──────────────────────────────────────────────────────────────────

export async function getClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre');
  return check(data, error) as Cliente[];
}

export async function insertCliente(c: Cliente) {
  const { error } = await supabase.from('clientes').insert(c);
  if (error) throw error;
}

export async function updateCliente(id: string, data: Partial<Omit<Cliente, 'id'>>) {
  const { error } = await supabase.from('clientes').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteCliente(id: string) {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

// ── Parcelas ──────────────────────────────────────────────────────────────────

export async function getParcelas(): Promise<Parcela[]> {
  const { data, error } = await supabase
    .from('parcelas')
    .select('id, cliente_id, nombre, poligono')
    .order('nombre');
  // Mapear snake_case → camelCase
  return check(data, error).map((r: Record<string, unknown>) => ({
    id:        r.id,
    clienteId: r.cliente_id,
    nombre:    r.nombre,
    poligono:  r.poligono,
  })) as Parcela[];
}

export async function insertParcela(p: Parcela) {
  const { error } = await supabase.from('parcelas').insert({
    id: p.id, cliente_id: p.clienteId, nombre: p.nombre, poligono: p.poligono ?? null,
  });
  if (error) throw error;
}

export async function updateParcela(id: string, data: Partial<Omit<Parcela, 'id'>>) {
  const patch: Record<string, unknown> = { nombre: data.nombre };
  if ('clienteId' in data) patch.cliente_id = data.clienteId;
  if ('poligono'  in data) patch.poligono   = data.poligono;
  const { error } = await supabase.from('parcelas').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteParcela(id: string) {
  const { error } = await supabase.from('parcelas').delete().eq('id', id);
  if (error) throw error;
}

// ── Naves ─────────────────────────────────────────────────────────────────────

export async function getNaves(): Promise<Nave[]> {
  const { data, error } = await supabase
    .from('naves')
    .select('id, parcela_id, numero, nombre')
    .order('numero');
  return check(data, error).map((r: Record<string, unknown>) => ({
    id:        r.id,
    parcelaId: r.parcela_id,
    numero:    r.numero,
    nombre:    r.nombre,
  })) as Nave[];
}

export async function insertNave(n: Nave) {
  const { error } = await supabase.from('naves').insert({
    id: n.id, parcela_id: n.parcelaId, numero: n.numero, nombre: n.nombre,
  });
  if (error) throw error;
}

export async function updateNave(id: string, data: Partial<Omit<Nave, 'id'>>) {
  const patch: Record<string, unknown> = {};
  if ('parcelaId' in data) patch.parcela_id = data.parcelaId;
  if ('numero'    in data) patch.numero     = data.numero;
  if ('nombre'    in data) patch.nombre     = data.nombre;
  const { error } = await supabase.from('naves').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteNave(id: string) {
  const { error } = await supabase.from('naves').delete().eq('id', id);
  if (error) throw error;
}

// ── Puntos de muestreo ────────────────────────────────────────────────────────

export async function getPuntos(): Promise<PuntoMuestreo[]> {
  const { data, error } = await supabase
    .from('puntos')
    .select('id, nave_id, tabla, lat, lng');
  return check(data, error).map((r: Record<string, unknown>) => ({
    id:     r.id,
    naveId: r.nave_id,
    tabla:  r.tabla,
    lat:    r.lat ?? undefined,
    lng:    r.lng ?? undefined,
  })) as PuntoMuestreo[];
}

export async function insertPunto(p: PuntoMuestreo) {
  const { error } = await supabase.from('puntos').insert({
    id: p.id, nave_id: p.naveId, tabla: p.tabla, lat: p.lat ?? null, lng: p.lng ?? null,
  });
  if (error) throw error;
}

// ── Análisis ──────────────────────────────────────────────────────────────────

export async function getAnalisis(): Promise<Analisis[]> {
  const { data, error } = await supabase
    .from('analisis')
    .select('*')
    .order('fecha_recepcion', { ascending: false });
  return check(data, error).map((r: Record<string, unknown>) => ({
    id:                      r.id,
    puntoId:                 r.punto_id,
    folio:                   r.folio,
    fechaRecepcion:          r.fecha_recepcion,
    fechaEmision:            r.fecha_emision,
    tipo:                    r.tipo,
    tipoMuestreo:            r.tipo_muestreo,
    resultadosNematodos:     r.resultados_nematodos ?? undefined,
    resultadosFitopatogenos: r.resultados_fitopatogenos ?? undefined,
  })) as Analisis[];
}

export async function insertAnalisis(a: Analisis) {
  const { error } = await supabase.from('analisis').insert({
    id:                      a.id,
    punto_id:                a.puntoId,
    folio:                   a.folio,
    fecha_recepcion:         a.fechaRecepcion,
    fecha_emision:           a.fechaEmision,
    tipo:                    a.tipo,
    tipo_muestreo:           a.tipoMuestreo,
    resultados_nematodos:    a.resultadosNematodos    ?? null,
    resultados_fitopatogenos:a.resultadosFitopatogenos ?? null,
  });
  if (error) throw error;
}

// ── Fumigaciones ──────────────────────────────────────────────────────────────

export async function getFumigaciones(): Promise<Fumigacion[]> {
  const { data, error } = await supabase
    .from('fumigaciones')
    .select('*')
    .order('fecha_inicio', { ascending: false });
  return check(data, error).map((r: Record<string, unknown>) => ({
    id:             r.id,
    parcelaId:      r.parcela_id,
    naveId:         r.nave_id ?? undefined,
    operadorId:     r.operador_id,
    operadorNombre: r.operador_nombre,
    fechaInicio:    r.fecha_inicio,
    fechaFin:       r.fecha_fin ?? undefined,
    ruta:           r.ruta,
    distanciaM:     r.distancia_m,
    estado:         r.estado,
  })) as Fumigacion[];
}

export async function insertFumigacion(f: Fumigacion) {
  const { error } = await supabase.from('fumigaciones').insert({
    id:              f.id,
    parcela_id:      f.parcelaId,
    nave_id:         f.naveId ?? null,
    operador_id:     f.operadorId,
    operador_nombre: f.operadorNombre,
    fecha_inicio:    f.fechaInicio,
    fecha_fin:       f.fechaFin ?? null,
    ruta:            f.ruta,
    distancia_m:     f.distanciaM,
    estado:          f.estado,
  });
  if (error) throw error;
}

export async function updateFumigacion(id: string, data: Partial<Omit<Fumigacion, 'id'>>) {
  const patch: Record<string, unknown> = {};
  if ('fechaFin'    in data) patch.fecha_fin    = data.fechaFin;
  if ('ruta'        in data) patch.ruta         = data.ruta;
  if ('distanciaM'  in data) patch.distancia_m  = data.distanciaM;
  if ('estado'      in data) patch.estado       = data.estado;
  const { error } = await supabase.from('fumigaciones').update(patch).eq('id', id);
  if (error) throw error;
}

// ── Conversaciones (FermierBot) ───────────────────────────────────────────────

export async function getConversaciones(userId: string): Promise<Conversacion[]> {
  const { data, error } = await supabase
    .from('conversaciones')
    .select('*')
    .eq('user_id', userId)
    .order('actualizada_en', { ascending: false });
  return check(data, error).map((r: Record<string, unknown>) => ({
    id:           r.id,
    titulo:       r.titulo,
    mensajes:     r.mensajes,
    creadaEn:     r.creada_en,
    actualizadaEn:r.actualizada_en,
  })) as Conversacion[];
}

export async function insertConversacion(userId: string, c: Conversacion) {
  const { error } = await supabase.from('conversaciones').insert({
    id:             c.id,
    user_id:        userId,
    titulo:         c.titulo,
    mensajes:       c.mensajes,
    creada_en:      c.creadaEn,
    actualizada_en: c.actualizadaEn,
  });
  if (error) throw error;
}

export async function updateConversacion(id: string, data: Partial<Omit<Conversacion, 'id'>>) {
  const patch: Record<string, unknown> = {};
  if ('titulo'       in data) patch.titulo         = data.titulo;
  if ('mensajes'     in data) patch.mensajes       = data.mensajes;
  if ('actualizadaEn' in data) patch.actualizada_en = data.actualizadaEn;
  const { error } = await supabase.from('conversaciones').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteConversacion(id: string) {
  const { error } = await supabase.from('conversaciones').delete().eq('id', id);
  if (error) throw error;
}
