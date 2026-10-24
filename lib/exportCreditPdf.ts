import type { jsPDF } from "jspdf";
import { creditLevelLabels, type CreditProfile } from "./creditProfile";
import { money } from "./finance";
import {
  contentWidth,
  drawFooters,
  drawHeader,
  drawSectionTitle,
  drawStatBox,
  pageMargin,
  pageWidth,
  pdfColors,
  setText,
  showPdf,
} from "./pdfTheme";
import type { ReceivableSummary } from "./receivables";
import type { CreditAdvice, Space } from "./types";

function drawScore(pdf: jsPDF, profile: CreditProfile, y: number) {
  const barWidth = contentWidth - 46;
  pdf.setFillColor(...pdfColors.mint);
  pdf.roundedRect(pageMargin, y, contentWidth, 26, 2, 2, "F");
  setText(pdf, pdfColors.green, 26, true);
  pdf.text(String(profile.score), pageMargin + 6, y + 17);
  setText(pdf, pdfColors.muted, 8);
  pdf.text("de 100", pageMargin + 6, y + 22.5);
  setText(pdf, pdfColors.ink, 12, true);
  pdf.text(creditLevelLabels[profile.level], pageMargin + 40, y + 9);
  setText(pdf, pdfColors.muted, 8);
  pdf.text(
    "Preparación para solicitar un crédito según los registros de los últimos 90 días.",
    pageMargin + 40,
    y + 15,
  );
  pdf.setFillColor(...pdfColors.border);
  pdf.roundedRect(pageMargin + 40, y + 19, barWidth, 3, 1.5, 1.5, "F");
  pdf.setFillColor(...pdfColors.green);
  pdf.roundedRect(
    pageMargin + 40,
    y + 19,
    (barWidth * profile.score) / 100,
    3,
    1.5,
    1.5,
    "F",
  );
}

// Barras agrupadas ventas/gastos por periodo de 30 días, con etiquetas de valor.
function drawMonthlyChart(pdf: jsPDF, profile: CreditProfile, y: number) {
  const chartHeight = 42;
  const maximum = Math.max(
    1,
    ...profile.months.flatMap((month) => [
      month.incomeMinor,
      month.expenseMinor,
    ]),
  );
  const groupWidth = contentWidth / profile.months.length;
  const barWidth = 14;
  pdf.setFillColor(...pdfColors.sales);
  pdf.rect(pageMargin, y - 6, 3, 3, "F");
  setText(pdf, pdfColors.muted, 7.5);
  pdf.text("Ventas", pageMargin + 5, y - 3.6);
  pdf.setFillColor(...pdfColors.expense);
  pdf.rect(pageMargin + 20, y - 6, 3, 3, "F");
  pdf.text("Gastos", pageMargin + 25, y - 3.6);
  pdf.setDrawColor(...pdfColors.border);
  pdf.line(
    pageMargin,
    y + chartHeight,
    pageWidth - pageMargin,
    y + chartHeight,
  );
  profile.months.forEach((month, index) => {
    const centerX = pageMargin + groupWidth * index + groupWidth / 2;
    const bars = [
      {
        value: month.incomeMinor,
        color: pdfColors.sales,
        x: centerX - barWidth - 1,
      },
      { value: month.expenseMinor, color: pdfColors.expense, x: centerX + 1 },
    ];
    for (const bar of bars) {
      const height = (bar.value / maximum) * (chartHeight - 8);
      pdf.setFillColor(...bar.color);
      pdf.rect(bar.x, y + chartHeight - height, barWidth, height, "F");
      setText(pdf, pdfColors.ink, 7);
      pdf.text(
        money(bar.value),
        bar.x + barWidth / 2,
        y + chartHeight - height - 1.5,
        {
          align: "center",
        },
      );
    }
    setText(pdf, pdfColors.muted, 7.5);
    pdf.text(month.label, centerX, y + chartHeight + 5, { align: "center" });
    setText(
      pdf,
      month.resultMinor < 0 ? pdfColors.red : pdfColors.green,
      7.5,
      true,
    );
    pdf.text(
      `Resultado ${money(month.resultMinor)}`,
      centerX,
      y + chartHeight + 9.5,
      {
        align: "center",
      },
    );
  });
}

function drawFactors(pdf: jsPDF, profile: CreditProfile, startY: number) {
  let rowY = startY;
  profile.factors.forEach((factor, index) => {
    if (index % 2 === 0) {
      pdf.setFillColor(...pdfColors.zebra);
      pdf.rect(pageMargin, rowY - 4.5, contentWidth, 7, "F");
    }
    setText(pdf, pdfColors.ink, 8.5, true);
    pdf.text(factor.label, pageMargin + 2, rowY);
    setText(pdf, pdfColors.muted, 8.5);
    pdf.text(factor.detail, pageMargin + 62, rowY);
    setText(pdf, pdfColors.ink, 8.5, true);
    pdf.text(
      `${factor.points}/${factor.maxPoints}`,
      pageWidth - pageMargin - 2,
      rowY,
      {
        align: "right",
      },
    );
    rowY += 7;
  });
  return rowY;
}

function drawDeclaration(pdf: jsPDF, y: number) {
  pdf.setDrawColor(...pdfColors.border);
  pdf.roundedRect(pageMargin, y, contentWidth, 34, 2, 2, "S");
  setText(pdf, pdfColors.ink, 9, true);
  pdf.text("Declaración y autorización del titular", pageMargin + 4, y + 7);
  setText(pdf, pdfColors.muted, 8);
  pdf.text(
    pdf.splitTextToSize(
      "Declaro que estos registros corresponden a mi negocio y autorizo compartir este reporte con la entidad indicada, solo para evaluar mi solicitud.",
      contentWidth - 8,
    ),
    pageMargin + 4,
    y + 13,
  );
  pdf.line(pageMargin + 4, y + 27, pageMargin + 74, y + 27);
  pdf.line(pageMargin + 96, y + 27, pageWidth - pageMargin - 4, y + 27);
  pdf.text("Firma del titular", pageMargin + 4, y + 31);
  pdf.text("Entidad y fecha", pageMargin + 96, y + 31);
}

function drawAdvice(pdf: jsPDF, advice: CreditAdvice, startY: number) {
  let y = startY;
  setText(pdf, pdfColors.ink, 9.5);
  const summaryLines: string[] = pdf.splitTextToSize(
    advice.summary,
    contentWidth,
  );
  pdf.text(summaryLines, pageMargin, y);
  y += summaryLines.length * 5 + 4;
  for (const group of [
    { title: "Fortalezas", items: advice.strengths },
    { title: "Para mejorar", items: advice.improvements },
  ]) {
    setText(pdf, pdfColors.green, 9.5, true);
    pdf.text(group.title, pageMargin, y);
    y += 5;
    setText(pdf, pdfColors.ink, 9);
    for (const item of group.items) {
      const lines: string[] = pdf.splitTextToSize(
        `•  ${item}`,
        contentWidth - 4,
      );
      pdf.text(lines, pageMargin + 2, y);
      y += lines.length * 4.6 + 1;
    }
    y += 3;
  }
  return y;
}

// Documento formal para la entidad financiera: resumen evaluable, no el detalle de registros.
export async function exportCreditPdf(
  space: Space,
  profile: CreditProfile,
  advice: CreditAdvice | null,
  receivableSummary: ReceivableSummary,
  previewWindow: Window | null = null,
) {
  if (!profile.hasHistory)
    throw new Error("Registra ventas o gastos recientes antes de generar el reporte para crédito.");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const boxWidth = (contentWidth - 9) / 4;
  const kpis = [
    {
      label: "Ventas promedio / mes",
      value: money(profile.avgMonthlyIncomeMinor),
      accent: pdfColors.sales,
    },
    {
      label: "Gastos promedio / mes",
      value: money(profile.avgMonthlyExpenseMinor),
      accent: pdfColors.expense,
    },
    {
      label: "Resultado promedio / mes",
      value: money(profile.avgMonthlyResultMinor),
      accent: pdfColors.green,
      detail: `Margen ${profile.marginPercent} %`,
    },
    {
      label: "Cuota referencial",
      value: money(profile.paymentCapacityMinor),
      accent: pdfColors.ink,
      detail: "30 % del resultado",
    },
    {
      label: "Días con registro",
      value: `${profile.activeDays} de ${profile.windowDays}`,
      accent: pdfColors.ink,
    },
    {
      label: "Estabilidad semanal",
      value: `${profile.stabilityPercent} %`,
      accent: pdfColors.ink,
    },
    {
      label: "Tendencia último mes",
      value: profile.hasTrendComparison
        ? `${profile.trendPercent >= 0 ? "+" : ""}${profile.trendPercent} %`
        : "Sin comparación",
      accent: profile.trendPercent < 0 ? pdfColors.red : pdfColors.green,
    },
    {
      label: "Fiados por cobrar",
      value: money(receivableSummary.pendingMinor),
      accent: pdfColors.ink,
      detail: `${receivableSummary.collectionRatePercent} % cobrado`,
    },
  ];
  let y = 0;
  pdf.setProperties({ title: `Reporte para crédito · ${space.name}` });
  drawHeader(pdf, {
    tag: "Reporte financiero · para la entidad",
    title: "Perfil para solicitud de crédito",
    subtitle: `${space.name} · últimos ${profile.windowDays} días al ${profile.asOfDate} · moneda PEN`,
  });
  drawScore(pdf, profile, 42);
  kpis.forEach((kpi, index) => {
    drawStatBox(pdf, {
      x: pageMargin + (index % 4) * (boxWidth + 3),
      y: 74 + Math.floor(index / 4) * 26,
      width: boxWidth,
      ...kpi,
    });
  });
  drawSectionTitle(pdf, "Ventas y gastos por periodo de 30 días", 130);
  drawMonthlyChart(pdf, profile, 144);
  drawSectionTitle(pdf, "Cómo se calcula el puntaje", 208);
  y = drawFactors(pdf, profile, 217);
  pdf.addPage();
  y = 20;
  if (advice) {
    drawSectionTitle(pdf, "Lectura del asistente", y);
    y = drawAdvice(pdf, advice, y + 9);
  }
  drawDeclaration(pdf, y + 4);
  drawFooters(
    pdf,
    "Información declarada por el emprendedor y registrada con apoyo de IA. No es una evaluación crediticia ni garantiza la aprobación. Datos de ejemplo en esta demostración.",
  );
  await showPdf(
    pdf,
    `reporte-credito-${space.id}-${profile.asOfDate}.pdf`,
    previewWindow,
  );
}
