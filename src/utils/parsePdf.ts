import * as pdfjsLib from 'pdfjs-dist';
import type { ResultadoNematodo, ResultadoFitopatogeno, TipoAnalisis, TipoMuestreo } from '../types';

// Use CDN worker to avoid Vite bundling issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version}/pdf.worker.min.js`;

export interface ParsedSeccion {
  tipo: TipoAnalisis;
  tipoMuestreo: TipoMuestreo;
  clienteNombre: string;
  parcelaNombre: string;
  naveNumero: number;
  naveNombre: string;
  tabla: string;
  folio: string;
  fechaRecepcion: string;
  fechaEmision: string;
  resultadosNematodos?: ResultadoNematodo[];
  resultadosFitopatogenos?: ResultadoFitopatogeno[];
}

const NEM_ORGS = ['Rotylenchulus', 'Pratylenchus', 'Meloidogyne', 'Aphelenchus', 'Saprófitos', 'Saprofitos'];
const FITO_ORGS: Record<string, string> = {
  'Fusarium spp': 'Komada',
  'Fusarium solani': 'Komada',
  'Aspergillus': 'PDA-AL',
  'Trichoderma': 'PDA-AL',
  'B.Anaerobias': 'AN',
};

function parseNum(s: string): number {
  // Handle Spanish number format: "7,333" → 7.333, "1.467" → 1467 (period = thousands)
  const cleaned = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function extractPageText(page: pdfjsLib.PDFPageProxy): Promise<string> {
  return page.getTextContent().then((content) => {
    return content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
  });
}

function extractMetadata(fullText: string) {
  // Folio: CLN-N-026
  const folioMatch = fullText.match(/Folio[:\s]+([A-Z0-9\-]+)/i);
  const folio = folioMatch?.[1]?.trim() ?? '';

  // Fechas
  const fechaRecMatch = fullText.match(/recepci[oó]n[:\s]*(\d{2}\/\d{2}\/\d{2,4})/i);
  const fechaEmMatch = fullText.match(/EMISI[OÓ]N[:\s]*(\d{2}\/\d{2}\/\d{2,4})/i);

  function parseDate(s: string | undefined): string {
    if (!s) return new Date().toISOString().slice(0, 10);
    const parts = s.split('/');
    if (parts.length !== 3) return new Date().toISOString().slice(0, 10);
    const [d, m, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Cliente nombre
  const clienteMatch = fullText.match(/Nombre[:\s]+([^\n]+?)(?:\s+Examen|\s+Cultiv)/i);
  const clienteNombre = clienteMatch?.[1]?.trim() ?? 'Cliente importado';

  // Cultivo (detectado pero no utilizado actualmente)
  // const cultivoMatch = fullText.match(/Cultiv[oó][:\s]+([^\s]+)/i);

  // Tipo de muestreo
  const tipoMuestreo: TipoMuestreo = fullText.toLowerCase().includes('postratamiento') || fullText.toLowerCase().includes('post-tratamiento')
    ? 'post-tratamiento'
    : fullText.toLowerCase().includes('pretratamiento') || fullText.toLowerCase().includes('pre-tratamiento')
    ? 'pre-tratamiento'
    : 'general';

  return {
    folio,
    fechaRecepcion: parseDate(fechaRecMatch?.[1]),
    fechaEmision: parseDate(fechaEmMatch?.[1]),
    clienteNombre,
    tipoMuestreo,
  };
}

function parseNematodeSections(fullText: string): Array<{ naveNum: number; naveNombre: string; tabla: string; parcelaNombre: string; lines: string }> {
  const sections: Array<{ naveNum: number; naveNombre: string; tabla: string; parcelaNombre: string; lines: string }> = [];

  // Match: "ANÁLISIS FITOPATOLÓGICO NAVE 1 – TABLA 1 Y 2 (BAJÍO 1)"
  // or: "ANÁLISIS FITOPATOLÓGICO NAVE 1 TABLA 1 Y 2 (BAJÍO 1)"
  const headerRe = /AN[AÁ]LISIS\s+FITOPATOL[OÓ]GICO\s+NAVE\s+(\d+)\s*[–\-]?\s*TABLA\s+([^\(]+?)\s*(?:\(([^\)]+)\))?(?=\s+(?:Conteo|Nematodos|$))/gi;

  let match: RegExpExecArray | null;
  const positions: Array<{ idx: number; naveNum: number; tabla: string; parcela: string }> = [];

  while ((match = headerRe.exec(fullText)) !== null) {
    positions.push({
      idx: match.index,
      naveNum: parseInt(match[1]),
      tabla: `Tabla ${match[2].trim()}`,
      parcela: match[3]?.trim() ?? '',
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const end = positions[i + 1]?.idx ?? fullText.length;
    const chunk = fullText.slice(p.idx, end);
    // Determine parcela name from parenthetical or from the chunk
    const parcelaNombre = p.parcela || 'Parcela importada';
    sections.push({
      naveNum: p.naveNum,
      naveNombre: `Nave ${p.naveNum}`,
      tabla: p.tabla,
      parcelaNombre,
      lines: chunk,
    });
  }

  return sections;
}

function parseNematodeResults(text: string): ResultadoNematodo[] {
  const results: ResultadoNematodo[] = [];
  const orgsPattern = NEM_ORGS.join('|').replace('Saprófitos', 'Sapr[oó]fitos');
  const re = new RegExp(`(${orgsPattern})\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+([\\d,.]+)\\s+([\\d,.]+)`, 'gi');

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const organismo = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    const normalOrg = organismo.replace('Saprofitos', 'Saprófitos');
    results.push({
      organismo: normalOrg,
      grSuelo: parseInt(m[2]),
      conteo1: parseInt(m[3]),
      conteo2: parseInt(m[4]),
      conteo3: parseInt(m[5]),
      promedio: parseNum(m[6]),
      individuosPor100cc: Math.round(parseNum(m[7])),
    });
  }
  return results;
}

function parseFitoSections(fullText: string): Array<{ naveNum: number; tabla: string; lines: string }> {
  const sections: Array<{ naveNum: number; tabla: string; lines: string }> = [];

  // Match: "ANA LISIS FITÓPATÓLÓ GICÓ NAVE 8 TABLA 1" or "ANÁLISIS FITOPATOLÓGICO NAVE 8 TABLA 1"
  // Also: "ANÁLISIS FITOPATOLÓGICO MUESTRA 8 TABLA 2"
  const headerRe = /(?:ANA\s*LISIS|AN[AÁ]LISIS)\s+FIT[OÓ]PATOL[OÓ][^\s]*\s+(?:NAVE|MUESTRA)\s+(\d+)\s+TABLA\s+(\d+)/gi;

  let match: RegExpExecArray | null;
  const positions: Array<{ idx: number; naveNum: number; tabla: string }> = [];

  while ((match = headerRe.exec(fullText)) !== null) {
    positions.push({
      idx: match.index,
      naveNum: parseInt(match[1]),
      tabla: `Tabla ${match[2]}`,
    });
  }

  // Deduplicate by nave+tabla
  const seen = new Set<string>();
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const key = `${p.naveNum}-${p.tabla}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const end = positions[i + 1]?.idx ?? fullText.length;
    sections.push({
      naveNum: p.naveNum,
      tabla: p.tabla,
      lines: fullText.slice(p.idx, end),
    });
  }

  return sections;
}

function parseFitoResults(text: string): ResultadoFitopatogeno[] {
  const results: ResultadoFitopatogeno[] = [];
  const orgsList = Object.keys(FITO_ORGS).join('|').replace('.', '\\.');
  // Pattern: optional "a) " prefix, then organism, then medio, then 3 counts
  const re = new RegExp(`(?:[a-z]\\)\\s*)?(${orgsList})\\s+(Komada|PDA-AL|AN)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+([\\d,.]+)\\s+([\\d,.]+)`, 'gi');

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const org = m[1].trim();
    const prom = parseNum(m[6]);
    const prop = Math.round(parseNum(m[7]));
    results.push({
      organismo: org,
      medioCultivo: m[2],
      conteo1: parseInt(m[3]),
      conteo2: parseInt(m[4]),
      conteo3: parseInt(m[5]),
      promedio: prom,
      propagulos: prop,
    });
  }

  // Also try without medio (B.Anaerobias pattern without "a)")
  const reAlt = /B\.Anaerobias\s+AN\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d,.]+)\s+([\d,.]+)/gi;
  let m2: RegExpExecArray | null;
  while ((m2 = reAlt.exec(text)) !== null) {
    if (results.some((r) => r.organismo === 'B.Anaerobias')) continue;
    results.push({
      organismo: 'B.Anaerobias',
      medioCultivo: 'AN',
      conteo1: parseInt(m2[1]),
      conteo2: parseInt(m2[2]),
      conteo3: parseInt(m2[3]),
      promedio: parseNum(m2[4]),
      propagulos: Math.round(parseNum(m2[5])),
    });
  }

  return results;
}

export async function parsePdfFile(file: File): Promise<ParsedSeccion[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    fullText += await extractPageText(page) + '\n';
  }

  const meta = extractMetadata(fullText);
  const isNematodos = /nematol[oó]gico|nematodos\s+fitopar[aá]sitos/i.test(fullText);
  const isFito = /detecci[oó]n\s+de\s+microorganismos|medio\s+cultivo/i.test(fullText);

  const secciones: ParsedSeccion[] = [];

  if (isNematodos) {
    const sections = parseNematodeSections(fullText);
    for (const s of sections) {
      const resultadosNematodos = parseNematodeResults(s.lines);
      if (resultadosNematodos.length === 0) continue;

      // Extract parcela from the parenthetical or infer from context
      let parcelaNombre = s.parcelaNombre;
      // Try to refine: "BAJÍO 1" → "El Bajío 1", "BAJÍO 2" → "El Bajío 2"
      if (/baj[íi]o\s*1/i.test(parcelaNombre)) parcelaNombre = 'El Bajío 1';
      else if (/baj[íi]o\s*2/i.test(parcelaNombre)) parcelaNombre = 'El Bajío 2';
      else if (/alto/i.test(parcelaNombre)) parcelaNombre = 'El Alto';

      // Get client name from full text header
      const clienteMatch = fullText.match(/Nombre[:\s]+([^\n]+?)(?:\s+Examen|\s+Cultiv|\s+Folio)/i);
      const clienteNombre = clienteMatch?.[1]?.trim()?.replace(/\s+/g, ' ') ?? 'Cliente importado';

      secciones.push({
        tipo: 'nematodos',
        tipoMuestreo: meta.tipoMuestreo,
        clienteNombre,
        parcelaNombre,
        naveNumero: s.naveNum,
        naveNombre: s.naveNombre,
        tabla: s.tabla,
        folio: meta.folio,
        fechaRecepcion: meta.fechaRecepcion,
        fechaEmision: meta.fechaEmision,
        resultadosNematodos,
      });
    }
  }

  if (isFito) {
    const sections = parseFitoSections(fullText);

    // Extract parcela from the full text (Nombre field)
    const nombreMatch = fullText.match(/Nombre[:\s]+([^\n]+?)(?:\s+Examen|\s+Cultiv|\s+Folio)/i);
    const rawNombre = nombreMatch?.[1]?.trim()?.replace(/\s+/g, ' ') ?? '';
    // Extract parcela from name: "AGRÍCOLA LA PRIMAVERA EL ALTO - postratamiento" → "El Alto"
    let parcelaNombre = 'Parcela importada';
    if (/el alto/i.test(rawNombre)) parcelaNombre = 'El Alto';
    else if (/el baj[íi]o\s*1/i.test(rawNombre)) parcelaNombre = 'El Bajío 1';
    else if (/el baj[íi]o\s*2/i.test(rawNombre)) parcelaNombre = 'El Bajío 2';

    const clienteMatch = rawNombre.match(/^([^-]+)/);
    const clienteNombre = clienteMatch?.[1]?.trim() ?? 'Cliente importado';

    for (const s of sections) {
      const resultadosFitopatogenos = parseFitoResults(s.lines);
      if (resultadosFitopatogenos.length === 0) continue;
      secciones.push({
        tipo: 'fitopatogenos',
        tipoMuestreo: meta.tipoMuestreo,
        clienteNombre,
        parcelaNombre,
        naveNumero: s.naveNum,
        naveNombre: `Nave ${s.naveNum}`,
        tabla: s.tabla,
        folio: meta.folio,
        fechaRecepcion: meta.fechaRecepcion,
        fechaEmision: meta.fechaEmision,
        resultadosFitopatogenos,
      });
    }
  }

  return secciones;
}
