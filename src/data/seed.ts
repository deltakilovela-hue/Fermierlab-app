import type { Cliente, Parcela, Nave, PuntoMuestreo, Analisis } from '../types';

export const clientes: Cliente[] = [
  {
    id: 'c1',
    nombre: 'Agrícola La Primavera',
    cultivo: 'Tomate',
    correo: 'laprimavera@demo.com',
    telefono: '6691234567',
    negocio: 'La Primavera',
  },
];

export const parcelas: Parcela[] = [
  { id: 'p1', clienteId: 'c1', nombre: 'El Bajío 1' },
  { id: 'p2', clienteId: 'c1', nombre: 'El Bajío 2' },
  { id: 'p3', clienteId: 'c1', nombre: 'El Alto' },
];

export const naves: Nave[] = [
  // El Bajío 1
  { id: 'n1', parcelaId: 'p1', numero: 1, nombre: 'Nave 1' },
  { id: 'n2', parcelaId: 'p1', numero: 2, nombre: 'Nave 2' },
  { id: 'n3', parcelaId: 'p1', numero: 3, nombre: 'Nave 3' },
  { id: 'n4', parcelaId: 'p1', numero: 4, nombre: 'Nave 4' },
  { id: 'n5', parcelaId: 'p1', numero: 5, nombre: 'Nave 5' },
  { id: 'n6', parcelaId: 'p1', numero: 6, nombre: 'Nave 6' },
  // El Bajío 2
  { id: 'n7', parcelaId: 'p2', numero: 7, nombre: 'Nave 7' },
  { id: 'n8', parcelaId: 'p2', numero: 8, nombre: 'Nave 8' },
  { id: 'n9', parcelaId: 'p2', numero: 9, nombre: 'Nave 9' },
  { id: 'n10', parcelaId: 'p2', numero: 10, nombre: 'Nave 10' },
  { id: 'n11', parcelaId: 'p2', numero: 11, nombre: 'Nave 11' },
  { id: 'n12', parcelaId: 'p2', numero: 12, nombre: 'Nave 12' },
  // El Alto
  { id: 'n13', parcelaId: 'p3', numero: 8, nombre: 'Nave 8' },
];

export const puntos: PuntoMuestreo[] = [
  { id: 'pt1', naveId: 'n1', tabla: 'Tabla 1 y 2' },
  { id: 'pt2', naveId: 'n1', tabla: 'Tabla 3 y 4' },
  { id: 'pt3', naveId: 'n2', tabla: 'Tabla 1 y 2' },
  { id: 'pt4', naveId: 'n2', tabla: 'Tabla 3 y 4' },
  { id: 'pt5', naveId: 'n3', tabla: 'Tabla 1 y 2' },
  { id: 'pt6', naveId: 'n3', tabla: 'Tabla 3 y 4' },
  { id: 'pt7', naveId: 'n4', tabla: 'Tabla 1 y 2' },
  { id: 'pt8', naveId: 'n4', tabla: 'Tabla 3 y 4' },
  { id: 'pt9', naveId: 'n5', tabla: 'Tabla 1 y 2' },
  { id: 'pt10', naveId: 'n5', tabla: 'Tabla 3 y 4' },
  { id: 'pt11', naveId: 'n6', tabla: 'Tabla 1 y 2' },
  { id: 'pt12', naveId: 'n6', tabla: 'Tabla 3 y 4' },
  { id: 'pt13', naveId: 'n7', tabla: 'Tabla 1 y 2' },
  { id: 'pt14', naveId: 'n7', tabla: 'Tabla 3 y 4' },
  { id: 'pt15', naveId: 'n8', tabla: 'Tabla 1 y 2' },
  { id: 'pt16', naveId: 'n8', tabla: 'Tabla 3 y 4' },
  { id: 'pt17', naveId: 'n9', tabla: 'Tabla 1 y 2' },
  { id: 'pt18', naveId: 'n9', tabla: 'Tabla 3 y 4' },
  { id: 'pt19', naveId: 'n10', tabla: 'Tabla 1 y 2' },
  { id: 'pt20', naveId: 'n10', tabla: 'Tabla 3 y 4' },
  { id: 'pt21', naveId: 'n11', tabla: 'Tabla 1 y 2' },
  { id: 'pt22', naveId: 'n11', tabla: 'Tabla 3 y 4' },
  { id: 'pt23', naveId: 'n12', tabla: 'Tabla única' },
  // El Alto - Nave 8 (fitopatógenos)
  { id: 'pt24', naveId: 'n13', tabla: 'Tabla 1' },
  { id: 'pt25', naveId: 'n13', tabla: 'Tabla 2' },
  { id: 'pt26', naveId: 'n13', tabla: 'Tabla 3' },
  { id: 'pt27', naveId: 'n13', tabla: 'Tabla 4' },
  { id: 'pt28', naveId: 'n13', tabla: 'Tabla 5' },
];

export const analisis: Analisis[] = [
  // ─── NEMATODOS El Bajío 1 y 2 — Muestreo general abril 2026 ───
  {
    id: 'a1', puntoId: 'pt1', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 8, conteo2: 14, conteo3: 21, promedio: 14, individuosPor100cc: 287 },
      { organismo: 'Pratylenchus',  grSuelo: 200, conteo1: 10, conteo2: 7,  conteo3: 12, promedio: 10, individuosPor100cc: 193 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 3,  conteo2: 9,  conteo3: 4,  promedio: 5,  individuosPor100cc: 107 },
    ],
  },
  {
    id: 'a2', puntoId: 'pt2', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 6,  conteo2: 11, conteo3: 7,  promedio: 8,  individuosPor100cc: 160 },
      { organismo: 'Meloidogyne',   grSuelo: 200, conteo1: 9,  conteo2: 13, conteo3: 6,  promedio: 9,  individuosPor100cc: 187 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 2,  conteo2: 4,  conteo3: 1,  promedio: 2,  individuosPor100cc: 47  },
    ],
  },
  {
    id: 'a3', puntoId: 'pt3', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 4,  conteo2: 3,  conteo3: 7,  promedio: 5,  individuosPor100cc: 93  },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 23, conteo2: 19, conteo3: 31, promedio: 24, individuosPor100cc: 487 },
    ],
  },
  {
    id: 'a4', puntoId: 'pt4', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 9,  conteo2: 6,  conteo3: 9,  promedio: 8,  individuosPor100cc: 160 },
      { organismo: 'Aphelenchus',   grSuelo: 200, conteo1: 3,  conteo2: 0,  conteo3: 5,  promedio: 3,  individuosPor100cc: 53  },
      { organismo: 'Meloidogyne',   grSuelo: 200, conteo1: 8,  conteo2: 11, conteo3: 4,  promedio: 8,  individuosPor100cc: 153 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 21, conteo2: 32, conteo3: 26, promedio: 26, individuosPor100cc: 527 },
    ],
  },
  {
    id: 'a5', puntoId: 'pt5', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 3,  conteo2: 0,  conteo3: 1,  promedio: 1,  individuosPor100cc: 27 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 5,  conteo2: 2,  conteo3: 7,  promedio: 5,  individuosPor100cc: 93 },
    ],
  },
  {
    id: 'a6', puntoId: 'pt6', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 12, conteo2: 5,  conteo3: 11, promedio: 9,  individuosPor100cc: 187 },
      { organismo: 'Pratylenchus',  grSuelo: 200, conteo1: 6,  conteo2: 4,  conteo3: 14, promedio: 8,  individuosPor100cc: 160 },
      { organismo: 'Meloidogyne',   grSuelo: 200, conteo1: 13, conteo2: 16, conteo3: 9,  promedio: 13, individuosPor100cc: 253 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 18, conteo2: 22, conteo3: 19, promedio: 20, individuosPor100cc: 393 },
    ],
  },
  {
    id: 'a7', puntoId: 'pt7', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 6,  conteo2: 3,  conteo3: 1,  promedio: 3,  individuosPor100cc: 67  },
      { organismo: 'Pratylenchus',  grSuelo: 200, conteo1: 2,  conteo2: 4,  conteo3: 0,  promedio: 2,  individuosPor100cc: 40  },
      { organismo: 'Meloidogyne',   grSuelo: 200, conteo1: 0,  conteo2: 2,  conteo3: 1,  promedio: 1,  individuosPor100cc: 20  },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 18, conteo2: 13, conteo3: 12, promedio: 14, individuosPor100cc: 287 },
    ],
  },
  {
    id: 'a8', puntoId: 'pt8', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 16, conteo2: 9,  conteo3: 10, promedio: 12, individuosPor100cc: 233 },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 13, conteo2: 21, conteo3: 15, promedio: 16, individuosPor100cc: 327 },
    ],
  },
  {
    id: 'a9', puntoId: 'pt9', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 3,  conteo2: 9,  conteo3: 7,  promedio: 6,  individuosPor100cc: 127 },
      { organismo: 'Meloidogyne',  grSuelo: 200, conteo1: 2,  conteo2: 4,  conteo3: 0,  promedio: 2,  individuosPor100cc: 40  },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 5,  conteo2: 11, conteo3: 10, promedio: 9,  individuosPor100cc: 173 },
    ],
  },
  {
    id: 'a10', puntoId: 'pt10', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 11, conteo2: 19, conteo3: 8,  promedio: 13, individuosPor100cc: 253 },
      { organismo: 'Pratylenchus',  grSuelo: 200, conteo1: 3,  conteo2: 4,  conteo3: 14, promedio: 7,  individuosPor100cc: 140 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 23, conteo2: 17, conteo3: 21, promedio: 20, individuosPor100cc: 407 },
    ],
  },
  {
    id: 'a11', puntoId: 'pt11', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 14, conteo2: 7,  conteo3: 3,  promedio: 8,  individuosPor100cc: 160 },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 6,  conteo2: 17, conteo3: 8,  promedio: 10, individuosPor100cc: 207 },
    ],
  },
  {
    id: 'a12', puntoId: 'pt12', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 13, conteo2: 5,  conteo3: 2,  promedio: 7,  individuosPor100cc: 133 },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 18, conteo2: 15, conteo3: 11, promedio: 15, individuosPor100cc: 293 },
    ],
  },
  // El Bajío 2
  {
    id: 'a13', puntoId: 'pt13', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'post-tratamiento',
    resultadosNematodos: [
      { organismo: 'Meloidogyne', grSuelo: 200, conteo1: 33, conteo2: 42, conteo3: 26, promedio: 34, individuosPor100cc: 673 },
      { organismo: 'Saprófitos',  grSuelo: 200, conteo1: 4,  conteo2: 18, conteo3: 9,  promedio: 10, individuosPor100cc: 207 },
    ],
  },
  {
    id: 'a14', puntoId: 'pt14', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'post-tratamiento',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 3,  conteo2: 7,  conteo3: 12, promedio: 7,  individuosPor100cc: 147 },
      { organismo: 'Meloidogyne',  grSuelo: 200, conteo1: 28, conteo2: 37, conteo3: 19, promedio: 28, individuosPor100cc: 560 },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 8,  conteo2: 11, conteo3: 16, promedio: 12, individuosPor100cc: 233 },
    ],
  },
  {
    id: 'a15', puntoId: 'pt15', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'post-tratamiento',
    resultadosNematodos: [
      { organismo: 'Meloidogyne', grSuelo: 200, conteo1: 122, conteo2: 96, conteo3: 103, promedio: 107, individuosPor100cc: 2140 },
      { organismo: 'Saprófitos',  grSuelo: 200, conteo1: 13,  conteo2: 21, conteo3: 12,  promedio: 15,  individuosPor100cc: 307  },
    ],
  },
  {
    id: 'a16', puntoId: 'pt16', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'post-tratamiento',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 105, conteo2: 142, conteo3: 90, promedio: 112, individuosPor100cc: 2247 },
      { organismo: 'Meloidogyne',  grSuelo: 200, conteo1: 6,   conteo2: 0,   conteo3: 3,  promedio: 3,   individuosPor100cc: 60   },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 15,  conteo2: 21,  conteo3: 9,  promedio: 15,  individuosPor100cc: 300  },
    ],
  },
  {
    id: 'a17', puntoId: 'pt17', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 2,  conteo2: 1,  conteo3: 6,  promedio: 3,  individuosPor100cc: 60  },
      { organismo: 'Meloidogyne',  grSuelo: 200, conteo1: 27, conteo2: 31, conteo3: 15, promedio: 24, individuosPor100cc: 487 },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 18, conteo2: 4,  conteo3: 9,  promedio: 10, individuosPor100cc: 207 },
    ],
  },
  {
    id: 'a18', puntoId: 'pt18', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 11, conteo2: 9,  conteo3: 2,  promedio: 7,  individuosPor100cc: 147 },
      { organismo: 'Meloidogyne',  grSuelo: 200, conteo1: 21, conteo2: 13, conteo3: 29, promedio: 21, individuosPor100cc: 420 },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 8,  conteo2: 6,  conteo3: 3,  promedio: 6,  individuosPor100cc: 113 },
    ],
  },
  {
    id: 'a19', puntoId: 'pt19', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 3,  conteo2: 1,  conteo3: 4,  promedio: 3,  individuosPor100cc: 53  },
      { organismo: 'Meloidogyne',  grSuelo: 200, conteo1: 20, conteo2: 34, conteo3: 46, promedio: 33, individuosPor100cc: 667 },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 8,  conteo2: 5,  conteo3: 17, promedio: 10, individuosPor100cc: 200 },
    ],
  },
  {
    id: 'a20', puntoId: 'pt20', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Meloidogyne', grSuelo: 200, conteo1: 28, conteo2: 16, conteo3: 32, promedio: 25, individuosPor100cc: 507 },
      { organismo: 'Saprófitos',  grSuelo: 200, conteo1: 8,  conteo2: 5,  conteo3: 17, promedio: 10, individuosPor100cc: 200 },
    ],
  },
  {
    id: 'a21', puntoId: 'pt21', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'post-tratamiento',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 3,  conteo2: 8,  conteo3: 1,  promedio: 4,  individuosPor100cc: 80   },
      { organismo: 'Meloidogyne',   grSuelo: 200, conteo1: 71, conteo2: 35, conteo3: 94, promedio: 67, individuosPor100cc: 1333 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 23, conteo2: 38, conteo3: 14, promedio: 25, individuosPor100cc: 500  },
    ],
  },
  {
    id: 'a22', puntoId: 'pt22', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'post-tratamiento',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 5,  conteo2: 0,  conteo3: 1,  promedio: 2,  individuosPor100cc: 40   },
      { organismo: 'Meloidogyne',   grSuelo: 200, conteo1: 68, conteo2: 79, conteo3: 101, promedio: 83, individuosPor100cc: 1653 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 27, conteo2: 16, conteo3: 23, promedio: 22, individuosPor100cc: 440  },
    ],
  },
  {
    id: 'a23', puntoId: 'pt23', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-24', fechaEmision: '2026-04-28',
    tipo: 'nematodos', tipoMuestreo: 'general',
    resultadosNematodos: [
      { organismo: 'Meloidogyne', grSuelo: 200, conteo1: 0,  conteo2: 3,  conteo3: 1,  promedio: 1,  individuosPor100cc: 27  },
      { organismo: 'Saprófitos',  grSuelo: 200, conteo1: 19, conteo2: 13, conteo3: 7,  promedio: 13, individuosPor100cc: 260 },
    ],
  },
  // ─── NEMATODOS El Bajío 2 — Naves 7, 8, 11 — PRE-tratamiento (marzo 2026) ───
  {
    id: 'pre1', puntoId: 'pt13', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-15', fechaEmision: '2026-03-20',
    tipo: 'nematodos', tipoMuestreo: 'pre-tratamiento',
    resultadosNematodos: [
      { organismo: 'Meloidogyne', grSuelo: 200, conteo1: 55, conteo2: 70, conteo3: 50, promedio: 58, individuosPor100cc: 1167 },
      { organismo: 'Saprófitos',  grSuelo: 200, conteo1: 4,  conteo2: 9,  conteo3: 6,  promedio: 6,  individuosPor100cc: 127  },
    ],
  },
  {
    id: 'pre2', puntoId: 'pt14', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-15', fechaEmision: '2026-03-20',
    tipo: 'nematodos', tipoMuestreo: 'pre-tratamiento',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 8,  conteo2: 15, conteo3: 12, promedio: 12, individuosPor100cc: 233  },
      { organismo: 'Meloidogyne',  grSuelo: 200, conteo1: 45, conteo2: 60, conteo3: 38, promedio: 48, individuosPor100cc: 953  },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 9,  conteo2: 13, conteo3: 17, promedio: 13, individuosPor100cc: 260  },
    ],
  },
  {
    id: 'pre3', puntoId: 'pt15', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-15', fechaEmision: '2026-03-20',
    tipo: 'nematodos', tipoMuestreo: 'pre-tratamiento',
    resultadosNematodos: [
      { organismo: 'Meloidogyne', grSuelo: 200, conteo1: 180, conteo2: 210, conteo3: 165, promedio: 185, individuosPor100cc: 3700 },
      { organismo: 'Saprófitos',  grSuelo: 200, conteo1: 15,  conteo2: 22,  conteo3: 13,  promedio: 17,  individuosPor100cc: 333  },
    ],
  },
  {
    id: 'pre4', puntoId: 'pt16', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-15', fechaEmision: '2026-03-20',
    tipo: 'nematodos', tipoMuestreo: 'pre-tratamiento',
    resultadosNematodos: [
      { organismo: 'Pratylenchus', grSuelo: 200, conteo1: 200, conteo2: 250, conteo3: 185, promedio: 212, individuosPor100cc: 4233 },
      { organismo: 'Meloidogyne',  grSuelo: 200, conteo1: 15,  conteo2: 8,   conteo3: 10,  promedio: 11,  individuosPor100cc: 220  },
      { organismo: 'Saprófitos',   grSuelo: 200, conteo1: 16,  conteo2: 22,  conteo3: 10,  promedio: 16,  individuosPor100cc: 320  },
    ],
  },
  {
    id: 'pre5', puntoId: 'pt21', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-15', fechaEmision: '2026-03-20',
    tipo: 'nematodos', tipoMuestreo: 'pre-tratamiento',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 5,   conteo2: 12,  conteo3: 4,   promedio: 7,   individuosPor100cc: 140  },
      { organismo: 'Meloidogyne',   grSuelo: 200, conteo1: 120, conteo2: 85,  conteo3: 145, promedio: 117, individuosPor100cc: 2333 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 25,  conteo2: 40,  conteo3: 18,  promedio: 28,  individuosPor100cc: 553  },
    ],
  },
  {
    id: 'pre6', puntoId: 'pt22', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-15', fechaEmision: '2026-03-20',
    tipo: 'nematodos', tipoMuestreo: 'pre-tratamiento',
    resultadosNematodos: [
      { organismo: 'Rotylenchulus', grSuelo: 200, conteo1: 8,   conteo2: 3,   conteo3: 5,   promedio: 5,   individuosPor100cc: 107  },
      { organismo: 'Meloidogyne',   grSuelo: 200, conteo1: 110, conteo2: 125, conteo3: 160, promedio: 132, individuosPor100cc: 2633 },
      { organismo: 'Saprófitos',    grSuelo: 200, conteo1: 30,  conteo2: 20,  conteo3: 28,  promedio: 26,  individuosPor100cc: 520  },
    ],
  },
  // ─── FITOPATÓGENOS El Alto — Nave 8 — PRE-tratamiento (marzo 2026) ───
  {
    id: 'pre7', puntoId: 'pt24', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-20', fechaEmision: '2026-03-25',
    tipo: 'fitopatogenos', tipoMuestreo: 'pre-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium spp',  medioCultivo: 'Komada', conteo1: 22,  conteo2: 28,  conteo3: 20,  promedio: 23.3, propagulos: 4667     },
      { organismo: 'Aspergillus',   medioCultivo: 'PDA-AL', conteo1: 8,   conteo2: 5,   conteo3: 7,   promedio: 6.7,  propagulos: 6700     },
      { organismo: 'Trichoderma',   medioCultivo: 'PDA-AL', conteo1: 0,   conteo2: 1,   conteo3: 0,   promedio: 0.3,  propagulos: 33333    },
      { organismo: 'B.Anaerobias',  medioCultivo: 'AN',     conteo1: 178, conteo2: 215, conteo3: 192, promedio: 195,  propagulos: 19500000 },
    ],
  },
  {
    id: 'pre8', puntoId: 'pt25', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-20', fechaEmision: '2026-03-25',
    tipo: 'fitopatogenos', tipoMuestreo: 'pre-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium spp',  medioCultivo: 'Komada', conteo1: 25,  conteo2: 18,  conteo3: 22,  promedio: 21.7, propagulos: 4333     },
      { organismo: 'Aspergillus',   medioCultivo: 'PDA-AL', conteo1: 9,   conteo2: 6,   conteo3: 8,   promedio: 7.7,  propagulos: 7700     },
      { organismo: 'Trichoderma',   medioCultivo: 'PDA-AL', conteo1: 0,   conteo2: 0,   conteo3: 1,   promedio: 0.3,  propagulos: 33333    },
      { organismo: 'B.Anaerobias',  medioCultivo: 'AN',     conteo1: 185, conteo2: 200, conteo3: 210, promedio: 198,  propagulos: 19833333 },
    ],
  },
  {
    id: 'pre9', puntoId: 'pt26', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-20', fechaEmision: '2026-03-25',
    tipo: 'fitopatogenos', tipoMuestreo: 'pre-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium spp',  medioCultivo: 'Komada', conteo1: 30,  conteo2: 25,  conteo3: 28,  promedio: 27.7, propagulos: 5533     },
      { organismo: 'Aspergillus',   medioCultivo: 'PDA-AL', conteo1: 5,   conteo2: 3,   conteo3: 4,   promedio: 4,    propagulos: 4000     },
      { organismo: 'Trichoderma',   medioCultivo: 'PDA-AL', conteo1: 0,   conteo2: 0,   conteo3: 0,   promedio: 0,    propagulos: 0        },
      { organismo: 'B.Anaerobias',  medioCultivo: 'AN',     conteo1: 95,  conteo2: 112, conteo3: 88,  promedio: 98,   propagulos: 9833333  },
    ],
  },
  {
    id: 'pre10', puntoId: 'pt27', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-20', fechaEmision: '2026-03-25',
    tipo: 'fitopatogenos', tipoMuestreo: 'pre-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium solani', medioCultivo: 'Komada', conteo1: 150, conteo2: 185, conteo3: 160, promedio: 165, propagulos: 16500000 },
      { organismo: 'Aspergillus',     medioCultivo: 'PDA-AL', conteo1: 4,   conteo2: 6,   conteo3: 5,   promedio: 5,   propagulos: 500000   },
      { organismo: 'Trichoderma',     medioCultivo: 'PDA-AL', conteo1: 5,   conteo2: 8,   conteo3: 6,   promedio: 6.3, propagulos: 100000   },
      { organismo: 'B.Anaerobias',    medioCultivo: 'AN',     conteo1: 220, conteo2: 180, conteo3: 260, promedio: 220, propagulos: 22000000 },
    ],
  },
  {
    id: 'pre11', puntoId: 'pt28', folio: 'CLN-N-024',
    fechaRecepcion: '2026-03-20', fechaEmision: '2026-03-25',
    tipo: 'fitopatogenos', tipoMuestreo: 'pre-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium solani', medioCultivo: 'Komada', conteo1: 145, conteo2: 180, conteo3: 155, promedio: 160, propagulos: 16000000 },
      { organismo: 'Aspergillus',     medioCultivo: 'PDA-AL', conteo1: 5,   conteo2: 7,   conteo3: 6,   promedio: 6,   propagulos: 600000   },
      { organismo: 'Trichoderma',     medioCultivo: 'PDA-AL', conteo1: 4,   conteo2: 6,   conteo3: 5,   promedio: 5,   propagulos: 80000    },
      { organismo: 'B.Anaerobias',    medioCultivo: 'AN',     conteo1: 215, conteo2: 175, conteo3: 250, promedio: 213, propagulos: 21333333 },
    ],
  },
  // ─── FITOPATÓGENOS El Alto — Nave 8 — Post-tratamiento ───
  {
    id: 'a24', puntoId: 'pt24', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-18', fechaEmision: '2026-04-24',
    tipo: 'fitopatogenos', tipoMuestreo: 'post-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium spp', medioCultivo: 'Komada', conteo1: 3,  conteo2: 12, conteo3: 7,  promedio: 7.3,  propagulos: 1467  },
      { organismo: 'Aspergillus',  medioCultivo: 'PDA-AL', conteo1: 2,  conteo2: 0,  conteo3: 1,  promedio: 1,    propagulos: 1000  },
      { organismo: 'Trichoderma', medioCultivo: 'PDA-AL', conteo1: 1,  conteo2: 3,  conteo3: 1,  promedio: 2,    propagulos: 166667 },
      { organismo: 'B.Anaerobias', medioCultivo: 'AN',     conteo1: 45, conteo2: 111,conteo3: 98, promedio: 85,   propagulos: 8466667 },
    ],
  },
  {
    id: 'a25', puntoId: 'pt25', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-18', fechaEmision: '2026-04-24',
    tipo: 'fitopatogenos', tipoMuestreo: 'post-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium spp', medioCultivo: 'Komada', conteo1: 8,  conteo2: 11, conteo3: 4,  promedio: 7.7,  propagulos: 1533  },
      { organismo: 'Aspergillus',  medioCultivo: 'PDA-AL', conteo1: 2,  conteo2: 1,  conteo3: 6,  promedio: 3,    propagulos: 3000  },
      { organismo: 'Trichoderma', medioCultivo: 'PDA-AL', conteo1: 3,  conteo2: 1,  conteo3: 1,  promedio: 2,    propagulos: 166667 },
      { organismo: 'B.Anaerobias', medioCultivo: 'AN',     conteo1: 67, conteo2: 83, conteo3: 101,promedio: 84,   propagulos: 8366667 },
    ],
  },
  {
    id: 'a26', puntoId: 'pt26', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-18', fechaEmision: '2026-04-24',
    tipo: 'fitopatogenos', tipoMuestreo: 'post-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium spp', medioCultivo: 'Komada', conteo1: 14, conteo2: 11, conteo3: 6,  promedio: 10.3, propagulos: 2067  },
      { organismo: 'Aspergillus',  medioCultivo: 'PDA-AL', conteo1: 2,  conteo2: 0,  conteo3: 1,  promedio: 1,    propagulos: 1000  },
      { organismo: 'Trichoderma', medioCultivo: 'PDA-AL', conteo1: 0,  conteo2: 1,  conteo3: 1,  promedio: 1,    propagulos: 66667 },
      { organismo: 'B.Anaerobias', medioCultivo: 'AN',     conteo1: 48, conteo2: 56, conteo3: 35, promedio: 46,   propagulos: 4633333 },
    ],
  },
  {
    id: 'a27', puntoId: 'pt27', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-18', fechaEmision: '2026-04-24',
    tipo: 'fitopatogenos', tipoMuestreo: 'post-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium solani', medioCultivo: 'Komada', conteo1: 13, conteo2: 43, conteo3: 71, promedio: 42,  propagulos: 4233333 },
      { organismo: 'Aspergillus',     medioCultivo: 'PDA-AL', conteo1: 7,  conteo2: 3,  conteo3: 1,  promedio: 4,   propagulos: 366667  },
      { organismo: 'Trichoderma',    medioCultivo: 'PDA-AL', conteo1: 2,  conteo2: 6,  conteo3: 4,  promedio: 4,   propagulos: 4000    },
      { organismo: 'B.Anaerobias',    medioCultivo: 'AN',     conteo1: 122,conteo2: 84, conteo3: 146,promedio: 117, propagulos: 11733333 },
    ],
  },
  {
    id: 'a28', puntoId: 'pt28', folio: 'CLN-N-026',
    fechaRecepcion: '2026-04-18', fechaEmision: '2026-04-24',
    tipo: 'fitopatogenos', tipoMuestreo: 'post-tratamiento',
    resultadosFitopatogenos: [
      { organismo: 'Fusarium solani', medioCultivo: 'Komada', conteo1: 13, conteo2: 43, conteo3: 71, promedio: 42,  propagulos: 4233333 },
      { organismo: 'Aspergillus',     medioCultivo: 'PDA-AL', conteo1: 7,  conteo2: 3,  conteo3: 1,  promedio: 4,   propagulos: 366667  },
      { organismo: 'Trichoderma',    medioCultivo: 'PDA-AL', conteo1: 2,  conteo2: 6,  conteo3: 4,  promedio: 4,   propagulos: 4000    },
      { organismo: 'B.Anaerobias',    medioCultivo: 'AN',     conteo1: 122,conteo2: 84, conteo3: 146,promedio: 117, propagulos: 11733333 },
    ],
  },
];
