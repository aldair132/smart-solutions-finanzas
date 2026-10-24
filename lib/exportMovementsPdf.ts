import { dateRange, displayTime, localDate, money, totals } from "./finance";
import {
  contentWidth,
  drawFooters,
  drawHeader,
  showPdf,
  drawStatBox,
  pageMargin,
  pdfColors,
  setText,
} from "./pdfTheme";
import type { Movement, Period, Space } from "./types";

const periodLabels: Record<Period, string> = {
  today: "Hoy",
  "7d": "Últimos 7 días",
  month: "Este mes",
};
// Columnas: fecha, concepto, categoría, tipo, importe (alineado a la derecha).
const columns = {
  date: 18,
  concept: 52,
  category: 118,
  kind: 152,
  amount: 192,
};

function drawTableHeader(pdf: import("jspdf").jsPDF, y: number) {
  pdf.setFillColor(...pdfColors.mint);
  pdf.rect(pageMargin, y - 5, contentWidth, 8, "F");
  setText(pdf, pdfColors.ink, 8.5, true);
  pdf.text("Fecha y hora", columns.date, y);
  pdf.text("Concepto", columns.concept, y);
  pdf.text("Categoría", columns.category, y);
  pdf.text("Tipo", columns.kind, y);
  pdf.text("Importe", columns.amount, y, { align: "right" });
}

// Reporte de control para el emprendedor: el detalle de cada registro del periodo.
export async function createMovementsPdf(
  space: Space,
  movements: Movement[],
  period: Period,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const range = dateRange(period);
  const summary = totals(movements);
  const isPersonal = space.type === "personal";
  const generatedAt = new Date().toLocaleString("es-PE", {
    timeZone: space.timeZone,
  });
  const boxWidth = (contentWidth - 8) / 3;
  let rowY = 0;
  pdf.setProperties({ title: `Movimientos · ${space.name}` });
  drawHeader(pdf, {
    tag: "Reporte de movimientos · para tu control",
    title: space.name,
    subtitle: `${periodLabels[period]} · del ${range.startAt.slice(0, 10)} al ${localDate(new Date(Date.parse(range.endAt) - 1).toISOString())} · generado ${generatedAt}`,
  });
  if (!isPersonal)
    drawStatBox(pdf, {
      x: pageMargin,
      y: 42,
      width: boxWidth,
      label: "Ventas",
      value: money(summary.income),
      accent: pdfColors.sales,
    });
  drawStatBox(pdf, {
    x: isPersonal ? pageMargin : pageMargin + boxWidth + 4,
    y: 42,
    width: boxWidth,
    label: "Gastos",
    value: money(summary.expense),
    accent: pdfColors.expense,
  });
  if (!isPersonal)
    drawStatBox(pdf, {
      x: pageMargin + (boxWidth + 4) * 2,
      y: 42,
      width: boxWidth,
      label: "Resultado registrado",
      value: money(summary.result),
      accent: summary.result < 0 ? pdfColors.red : pdfColors.green,
    });
  setText(pdf, pdfColors.muted, 8);
  pdf.text(
    `${movements.length} movimiento${movements.length === 1 ? "" : "s"} · ordenados del más reciente al más antiguo`,
    pageMargin,
    68,
  );
  rowY = 78;
  drawTableHeader(pdf, rowY);
  rowY += 6;
  movements.forEach((movement, index) => {
    const lines: string[] = pdf.splitTextToSize(movement.description, 62);
    const rowHeight = Math.max(8, lines.length * 4.5 + 3.5);
    if (rowY + rowHeight > 276) {
      pdf.addPage();
      rowY = 20;
      drawTableHeader(pdf, rowY);
      rowY += 6;
    }
    if (index % 2 === 0) {
      pdf.setFillColor(...pdfColors.zebra);
      pdf.rect(pageMargin, rowY - 4, contentWidth, rowHeight, "F");
    }
    setText(pdf, pdfColors.ink, 8.5);
    pdf.text(
      `${localDate(movement.occurredAt)} ${displayTime(movement.occurredAt)}`,
      columns.date,
      rowY + 1,
    );
    pdf.text(lines, columns.concept, rowY + 1);
    setText(pdf, pdfColors.muted, 8.5);
    pdf.text(movement.category ?? "—", columns.category, rowY + 1);
    pdf.text(
      movement.kind === "income" ? "Venta" : "Gasto",
      columns.kind,
      rowY + 1,
    );
    setText(
      pdf,
      movement.kind === "income" ? pdfColors.green : pdfColors.red,
      8.5,
      true,
    );
    pdf.text(
      `${movement.kind === "income" ? "+" : "-"} ${money(movement.amountMinor)}`,
      columns.amount,
      rowY + 1,
      { align: "right" },
    );
    rowY += rowHeight;
  });
  if (!movements.length) {
    setText(pdf, pdfColors.muted, 10);
    pdf.text("No hay movimientos en este periodo.", pageMargin, rowY + 6);
  }
  drawFooters(
    pdf,
    "Registros del emprendedor hechos con apoyo de IA (voz, foto o texto). Documento de control interno. Datos de ejemplo en esta demostración.",
  );
  return pdf;
}

export async function exportMovementsPdf(
  space: Space,
  movements: Movement[],
  period: Period,
  previewWindow: Window | null = null,
) {
  const pdf = await createMovementsPdf(space, movements, period);
  const range = dateRange(period);
  await showPdf(
    pdf,
    `movimientos-${space.id}-${range.startAt.slice(0, 10)}-${range.endAt.slice(0, 10)}.pdf`,
    previewWindow,
  );
}
