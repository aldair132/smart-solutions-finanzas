import { creditLevelLabels, type CreditProfile } from "./creditProfile";
import { money } from "./finance";
import type { ReceivableSummary } from "./receivables";
import { demoDate } from "./mockData";
import type { CreditAdvice, Space } from "./types";

export async function exportCreditPdf(
  space: Space,
  profile: CreditProfile,
  advice: CreditAdvice | null,
  receivableSummary: ReceivableSummary,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const generatedAt = new Date().toLocaleString("es-PE", {
    timeZone: space.timeZone,
  });
  let rowY = 0;
  pdf.setProperties({ title: `Reporte financiero · ${space.name}` });
  pdf.setFillColor(22, 101, 52);
  pdf.rect(0, 0, 210, 30, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(17);
  pdf.text("Reporte financiero del negocio", 16, 14);
  pdf.setFontSize(10);
  pdf.text(
    `Últimos ${profile.windowDays} días · Corte ${demoDate} · Generado ${generatedAt}`,
    16,
    23,
  );
  pdf.setTextColor(23, 59, 42);
  pdf.setFontSize(15);
  pdf.text(pdf.splitTextToSize(space.name, 175), 16, 42);
  pdf.setFontSize(11);
  pdf.text(
    `Preparación: ${profile.score}/100 · ${creditLevelLabels[profile.level]}`,
    16,
    51,
  );
  const indicators: [string, string][] = [
    ["Ventas promedio mensuales", money(profile.avgMonthlyIncomeMinor)],
    ["Gastos promedio mensuales", money(profile.avgMonthlyExpenseMinor)],
    ["Resultado promedio mensual", money(profile.avgMonthlyResultMinor)],
    ["Margen", `${profile.marginPercent} %`],
    ["Días con registro", `${profile.activeDays} de ${profile.windowDays}`],
    ["Estabilidad semanal de ventas", `${profile.stabilityPercent} %`],
    [
      "Tendencia último mes",
      `${profile.trendPercent >= 0 ? "+" : ""}${profile.trendPercent} %`,
    ],
    ["Registros con comprobante fotografiado", `${profile.evidencePercent} %`],
    [
      "Fiados por cobrar · % cobrado históricamente",
      `${money(receivableSummary.pendingMinor)} · ${receivableSummary.collectionRatePercent} %`,
    ],
    [
      "Cuota mensual referencial (30 % del resultado)",
      money(profile.paymentCapacityMinor),
    ],
  ];
  rowY = 62;
  pdf.setFillColor(232, 245, 238);
  pdf.rect(16, rowY - 6, 178, 8, "F");
  pdf.setFontSize(10);
  pdf.text("Indicador", 18, rowY - 1);
  pdf.text("Valor", 192, rowY - 1, { align: "right" });
  rowY += 6;
  for (const [label, value] of indicators) {
    pdf.text(label, 18, rowY);
    pdf.text(value, 192, rowY, { align: "right" });
    pdf.setDrawColor(214, 231, 220);
    pdf.line(16, rowY + 3, 194, rowY + 3);
    rowY += 9;
  }
  rowY += 6;
  pdf.setFillColor(232, 245, 238);
  pdf.rect(16, rowY - 6, 178, 8, "F");
  pdf.text("Periodo (30 días)", 18, rowY - 1);
  pdf.text("Ventas", 120, rowY - 1, { align: "right" });
  pdf.text("Gastos", 156, rowY - 1, { align: "right" });
  pdf.text("Resultado", 192, rowY - 1, { align: "right" });
  rowY += 6;
  for (const month of profile.months) {
    pdf.text(month.label, 18, rowY);
    pdf.text(money(month.incomeMinor), 120, rowY, { align: "right" });
    pdf.text(money(month.expenseMinor), 156, rowY, { align: "right" });
    pdf.text(money(month.resultMinor), 192, rowY, { align: "right" });
    pdf.line(16, rowY + 3, 194, rowY + 3);
    rowY += 9;
  }
  if (advice) {
    rowY += 6;
    pdf.setFontSize(12);
    pdf.text("Lectura del asistente", 16, rowY);
    pdf.setFontSize(10);
    rowY += 7;
    const adviceLines: string[] = pdf.splitTextToSize(
      [
        advice.summary,
        ...advice.strengths.map((item) => `+ ${item}`),
        ...advice.improvements.map((item) => `> ${item}`),
      ].join("\n"),
      178,
    );
    pdf.text(adviceLines, 16, rowY);
  }
  pdf.setFontSize(8);
  pdf.setTextColor(70, 99, 84);
  pdf.text(
    pdf.splitTextToSize(
      "Información declarada por el emprendedor y registrada con apoyo de IA. No constituye una evaluación crediticia ni garantiza la aprobación de un crédito. Datos de ejemplo en esta demostración.",
      178,
    ),
    16,
    280,
  );
  await pdf.save(`reporte-financiero-${space.id}-${demoDate}.pdf`, {
    returnPromise: true,
  });
}
