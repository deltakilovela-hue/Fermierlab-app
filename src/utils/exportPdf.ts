import jsPDF from 'jspdf';
import { COLORES_ORGANISMOS, UMBRALES_NEMATODOS } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

function setFillFromHex(pdf: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  pdf.setFillColor(r, g, b);
}

function setTextFromHex(pdf: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  pdf.setTextColor(r, g, b);
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

// ── Data types ────────────────────────────────────────────────────────────────

export interface PdfDetalleRow {
  parcela: string;
  nave: string;
  tabla: string;
  tipo: 'nematodos' | 'fitopatogenos';
  tipoMuestreo: string;
  organismo: string;
  c1: number;
  c2: number;
  c3: number;
  promedio: number;
  resultado: string;
  valor: number;
  umbral?: number;
}

export interface ReporteData {
  clienteNombre: string;
  parcelaNombre: string;
  tipoFiltro: 'todos' | 'nematodos' | 'fitopatogenos';
  dataNem: Array<Record<string, string | number>>;
  dataFito: Array<Record<string, string | number>>;
  detalleRows: PdfDetalleRow[];
}

const ORGS_NEM  = ['Meloidogyne', 'Pratylenchus', 'Rotylenchulus', 'Aphelenchus'];
const ORGS_FITO = ['Fusarium spp', 'Fusarium solani', 'Aspergillus', 'Trichoderma', 'B.Anaerobias'];
const VERDE     = '#1769a5';
const M         = 14; // page margin mm

// ── Bar chart ─────────────────────────────────────────────────────────────────

interface ChartOpts {
  data: Array<Record<string, string | number>>;
  labelKey: string;
  orgs: string[];
  title: string;
  thresholds: Array<{ organismo: string; valor: number }>;
  x: number; y: number; w: number; h: number;
}

function drawBarChart(pdf: jsPDF, opts: ChartOpts): number {
  const { data, labelKey, orgs, title, thresholds, x, y, w, h } = opts;
  const activeOrgs = orgs.filter((o) => data.some((r) => r[o] !== undefined));
  if (!activeOrgs.length || !data.length) return y;

  // Title
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(50, 50, 50);
  pdf.text(title, x, y);

  const titleH = 5;
  const legendH = 6;
  const labelH = 5; // x-axis labels
  const plotX = x + 16; // room for y-axis labels
  const plotY = y + titleH;
  const plotW = w - 16;
  const plotH = h - titleH - legendH - labelH;
  const plotBottom = plotY + plotH;

  // Background
  pdf.setFillColor(252, 252, 252);
  pdf.rect(plotX, plotY, plotW, plotH, 'F');
  pdf.setDrawColor(220, 220, 220);
  pdf.rect(plotX, plotY, plotW, plotH, 'S');

  // Max value including thresholds
  const maxVal = Math.max(
    1,
    ...data.flatMap((r) => activeOrgs.map((o) => Number(r[o] || 0))),
    ...thresholds.map((t) => t.valor),
  ) * 1.15;

  // Grid & Y labels
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const gy = plotBottom - (i / gridLines) * plotH;
    pdf.setDrawColor(235, 235, 235);
    pdf.line(plotX, gy, plotX + plotW, gy);
    const v = Math.round(maxVal * i / gridLines);
    pdf.setTextColor(130, 130, 130);
    pdf.text(fmtNum(v), plotX - 1, gy + 1, { align: 'right' });
  }

  // Threshold lines
  for (const t of thresholds) {
    if (t.valor <= maxVal) {
      const ty = plotBottom - (t.valor / maxVal) * plotH;
      pdf.setDrawColor(239, 68, 68);
      pdf.setLineDashPattern([1.5, 0.8], 0);
      pdf.line(plotX, ty, plotX + plotW, ty);
      pdf.setLineDashPattern([], 0);
    }
  }

  // Bars
  const nGroups  = data.length;
  const groupW   = plotW / nGroups;
  const barW     = Math.min(Math.max(1, (groupW - 3) / activeOrgs.length), 8);
  const groupPad = (groupW - barW * activeOrgs.length) / 2;

  data.forEach((row, gi) => {
    const gx = plotX + gi * groupW;

    // X label
    const rawLabel = String(row[labelKey] ?? '');
    const label = rawLabel.length > Math.floor(groupW / 1.8) + 2
      ? rawLabel.slice(0, Math.floor(groupW / 1.8)) + '..'
      : rawLabel;
    pdf.setFontSize(5);
    pdf.setTextColor(80, 80, 80);
    pdf.text(label, gx + groupW / 2, plotBottom + 3.5, { align: 'center' });

    activeOrgs.forEach((org, oi) => {
      const val = Number(row[org] || 0);
      if (!val) return;
      const barH = Math.max(0.5, (val / maxVal) * plotH);
      const bx   = gx + groupPad + oi * barW;
      const by   = plotBottom - barH;
      setFillFromHex(pdf, COLORES_ORGANISMOS[org] ?? '#6b7280');
      pdf.rect(bx, by, barW - 0.3, barH, 'F');
    });
  });

  // Legend
  const legendY = plotBottom + labelH + 1;
  let lx = plotX;
  pdf.setFontSize(5.5);
  activeOrgs.forEach((org) => {
    setFillFromHex(pdf, COLORES_ORGANISMOS[org] ?? '#6b7280');
    pdf.rect(lx, legendY - 2, 3, 2.5, 'F');
    pdf.setTextColor(70, 70, 70);
    pdf.text(org, lx + 4, legendY);
    lx += pdf.getTextWidth(org) + 7;
    if (lx > x + w - 20) { lx = plotX; /* wrap if too wide */ }
  });

  return y + h + 2;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportPdf(data: ReporteData) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth();   // 215.9
  const H = pdf.internal.pageSize.getHeight();  // 279.4
  let y = 0;

  // ── Header bar ────────────────────────────────────────────────────────────
  const headerH = 24;
  setFillFromHex(pdf, VERDE);
  pdf.rect(0, 0, W, headerH, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FERMIER', M, 10);

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Laboratorio y Asesoria Agricola  |  Culiacan, Sinaloa', M, 16.5);

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REPORTE DE ANALISIS', W - M, 10, { align: 'right' });

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const hoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  pdf.text(hoy, W - M, 16.5, { align: 'right' });

  y = headerH + 6;

  // ── Info block ────────────────────────────────────────────────────────────
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(8.5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Cliente:', M, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.clienteNombre, M + 20, y);

  if (data.parcelaNombre) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Parcela:', M + 95, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.parcelaNombre, M + 115, y);
  }

  y += 5;
  const tipoLabel = data.tipoFiltro === 'todos'
    ? 'Todos (Nematodos + Fitopatogenos)'
    : data.tipoFiltro === 'nematodos'
    ? 'Nematodos (ind/100cc)'
    : 'Fitopatogenos (UFC/g)';

  pdf.setFont('helvetica', 'bold');
  pdf.text('Tipo:', M, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(tipoLabel, M + 20, y);

  y += 5;
  pdf.setDrawColor(210, 210, 210);
  pdf.line(M, y, W - M, y);
  y += 5;

  // ── Charts ────────────────────────────────────────────────────────────────
  const showNem  = data.tipoFiltro === 'todos' || data.tipoFiltro === 'nematodos';
  const showFito = data.tipoFiltro === 'todos' || data.tipoFiltro === 'fitopatogenos';

  if (showNem && data.dataNem.some((r) => ORGS_NEM.some((o) => r[o]))) {
    y = drawBarChart(pdf, {
      data: data.dataNem,
      labelKey: 'nave',
      orgs: ORGS_NEM,
      title: 'Nematodos — promedio ind/100cc por nave',
      thresholds: UMBRALES_NEMATODOS,
      x: M, y, w: W - M * 2, h: 58,
    });
    y += 4;
  }

  if (showFito && data.dataFito.length > 0) {
    y = drawBarChart(pdf, {
      data: data.dataFito,
      labelKey: 'label',
      orgs: ORGS_FITO,
      title: 'Fitopatogenos — UFC/g por punto de muestreo',
      thresholds: [],
      x: M, y, w: W - M * 2, h: 58,
    });
    y += 4;
  }

  // Separator
  pdf.setDrawColor(210, 210, 210);
  pdf.line(M, y, W - M, y);
  y += 5;

  // ── Table ─────────────────────────────────────────────────────────────────
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  setTextFromHex(pdf, VERDE);
  pdf.text('RESULTADOS DETALLADOS', M, y);
  y += 4;

  // Column definitions
  const cols: Array<{ label: string; w: number; right?: boolean }> = [
    { label: 'Parcela',   w: 22 },
    { label: 'Nave',      w: 14 },
    { label: 'Tabla',     w: 20 },
    { label: 'Tipo',      w: 14 },
    { label: 'Muestreo',  w: 20 },
    { label: 'Organismo', w: 29 },
    { label: 'C1',        w: 9,  right: true },
    { label: 'C2',        w: 9,  right: true },
    { label: 'C3',        w: 9,  right: true },
    { label: 'Prom',      w: 10, right: true },
    { label: 'Resultado', w: 27, right: true },
  ];

  const colX: number[] = [M];
  for (let i = 1; i < cols.length; i++) {
    colX.push(colX[i - 1] + cols[i - 1].w);
  }

  const rowH = 5.5;

  // ── Draw header row ─────────────────────────────────────────────────
  function drawTableHeader(py: number) {
    pdf.setFillColor(232, 240, 233);
    pdf.rect(M, py, W - M * 2, rowH, 'F');
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(50, 80, 55);
    cols.forEach((col, i) => {
      const tx = col.right ? colX[i] + col.w - 1 : colX[i] + 1;
      pdf.text(col.label, tx, py + rowH - 1.8, { align: col.right ? 'right' : 'left' });
    });
    return py + rowH;
  }

  y = drawTableHeader(y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);

  for (const row of data.detalleRows) {
    // Page break check
    if (y + rowH > H - 14) {
      // Footer on current page
      drawFooter(pdf, W, H);
      pdf.addPage();
      y = M;
      y = drawTableHeader(y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
    }

    // Row separator
    pdf.setDrawColor(235, 235, 235);
    pdf.line(M, y, W - M, y);

    // Highlight if over threshold
    const sobreUmbral = row.umbral !== undefined && row.valor >= row.umbral;
    if (sobreUmbral) {
      pdf.setFillColor(255, 246, 246);
      pdf.rect(M, y, W - M * 2, rowH, 'F');
    }

    const vals: (string | null)[] = [
      row.parcela,
      row.nave,
      row.tabla,
      row.tipo === 'nematodos' ? 'Nem.' : 'Fito.',
      row.tipoMuestreo.replace('-', ' '),
      null, // organismo — drawn with color
      String(row.c1),
      String(row.c2),
      String(row.c3),
      row.promedio.toFixed(1),
      sobreUmbral ? `${row.resultado} !` : row.resultado,
    ];

    vals.forEach((val, i) => {
      if (val === null) return;
      if (i === vals.length - 1 && sobreUmbral) {
        pdf.setTextColor(180, 40, 40);
      } else {
        pdf.setTextColor(65, 65, 65);
      }
      const tx = cols[i].right ? colX[i] + cols[i].w - 1 : colX[i] + 1;
      pdf.text(val, tx, y + rowH - 1.8, { align: cols[i].right ? 'right' : 'left' });
    });

    // Organismo with color
    const orgColor = COLORES_ORGANISMOS[row.organismo];
    if (orgColor) {
      setTextFromHex(pdf, orgColor);
    } else {
      pdf.setTextColor(65, 65, 65);
    }
    pdf.text(row.organismo, colX[5] + 1, y + rowH - 1.8);

    y += rowH;
  }

  // Bottom border
  pdf.setDrawColor(200, 200, 200);
  pdf.line(M, y, W - M, y);

  // Footer
  drawFooter(pdf, W, H);

  // ── Save ──────────────────────────────────────────────────────────────────
  const safe = (s: string) => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const fname = `FermierLab_${safe(data.clienteNombre)}_${safe(data.parcelaNombre || 'All')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fname);
}

function drawFooter(pdf: jsPDF, W: number, H: number) {
  pdf.setFontSize(6);
  pdf.setTextColor(160, 160, 160);
  pdf.text(
    'FERMIER — Laboratorio y Asesoria Agricola | Culiacan, Sinaloa',
    W / 2, H - 7,
    { align: 'center' },
  );
}
