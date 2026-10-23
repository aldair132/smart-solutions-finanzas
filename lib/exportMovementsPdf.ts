import { dateRange, displayTime, localDate, money, totals } from "./finance";
import type { Movement, Period, Space } from "./types";

export async function createMovementsPdf(
  space: Space,
  movements: Movement[],
  period: Period,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const range = dateRange(period);
  const summary = totals(movements);
  const generatedAt = new Date().toLocaleString("es-PE", {
    timeZone: space.timeZone,
  });
  let rowY = 66;
  function addHeader() {
    pdf.setTextColor(23, 59, 42);
    pdf.setFontSize(18);
    pdf.text(pdf.splitTextToSize(space.name, 175), 16, 20);
    pdf.setFontSize(10);
    pdf.text(`Moneda: PEN | Generado: ${generatedAt}`, 16, 37);
    pdf.text(
      `Desde ${range.startAt.slice(0, 10)} 00:00 hasta ${range.endAt.slice(0, 10)} 00:00 (excluido)`,
      16,
      44,
    );
    pdf.text("Zona horaria: America/Lima", 16, 50);
    pdf.setFillColor(232, 245, 238);
    pdf.rect(16, 55, 178, 8, "F");
    pdf.text("Fecha / hora", 18, 60);
    pdf.text("Concepto", 62, 60);
    pdf.text("Tipo", 140, 60);
    pdf.text("Importe", 192, 60, { align: "right" });
    pdf.setFontSize(9);
    pdf.text("Datos de ejemplo · Registro informativo", 16, 287);
  }
  addHeader();
  for (const movement of movements) {
    const lines: string[] = pdf.splitTextToSize(movement.description, 70);
    const rowHeight = Math.max(11, lines.length * 5 + 5);
    if (rowY + rowHeight > 266) {
      pdf.addPage();
      addHeader();
      rowY = 66;
    }
    pdf.setFontSize(9);
    pdf.text(
      `${localDate(movement.occurredAt)} ${displayTime(movement.occurredAt)}`,
      18,
      rowY + 5,
    );
    pdf.text(lines, 62, rowY + 5);
    pdf.text(movement.kind === "income" ? "Venta" : "Gasto", 140, rowY + 5);
    pdf.text(
      `${movement.kind === "income" ? "+" : "-"} ${money(movement.amountMinor)}`,
      192,
      rowY + 5,
      { align: "right" },
    );
    pdf.setDrawColor(214, 231, 220);
    pdf.line(16, rowY + rowHeight, 194, rowY + rowHeight);
    rowY += rowHeight;
  }
  if (rowY > 236) {
    pdf.addPage();
    addHeader();
    rowY = 66;
  }
  pdf.setFontSize(11);
  if (space.type !== "personal")
    pdf.text(`Ventas: ${money(summary.income)}`, 16, rowY + 12);
  pdf.text(`Gastos: ${money(summary.expense)}`, 16, rowY + 20);
  pdf.text(`Resultado registrado: ${money(summary.result)}`, 16, rowY + 28);
  return pdf;
}

export async function exportMovementsPdf(space: Space, movements: Movement[], period: Period) {
  const pdf = await createMovementsPdf(space, movements, period);
  const range = dateRange(period);
  await pdf.save(`movimientos-${space.id}-${range.startAt.slice(0, 10)}-${range.endAt.slice(0, 10)}.pdf`, { returnPromise: true });
}
