import type { jsPDF } from "jspdf";

type Rgb = [number, number, number];

// Paleta de la app y del análisis (azul ventas / naranja gastos validados para daltonismo).
export const pdfColors = {
  ink: [23, 59, 42] as Rgb,
  muted: [70, 99, 84] as Rgb,
  green: [22, 101, 52] as Rgb,
  mint: [232, 245, 238] as Rgb,
  border: [214, 231, 220] as Rgb,
  zebra: [247, 251, 248] as Rgb,
  sales: [42, 120, 214] as Rgb,
  expense: [235, 104, 52] as Rgb,
  red: [155, 44, 44] as Rgb,
  white: [255, 255, 255] as Rgb,
};
export const pageWidth = 210;
export const pageMargin = 16;
export const contentWidth = pageWidth - pageMargin * 2;

export function setText(pdf: jsPDF, color: Rgb, size: number, bold = false) {
  pdf.setTextColor(...color);
  pdf.setFontSize(size);
  pdf.setFont("helvetica", bold ? "bold" : "normal");
}

// Banda superior: etiqueta de propósito, título y subtítulo.
export function drawHeader(
  pdf: jsPDF,
  { tag, title, subtitle }: { tag: string; title: string; subtitle: string },
) {
  pdf.setFillColor(...pdfColors.green);
  pdf.rect(0, 0, pageWidth, 34, "F");
  setText(pdf, [159, 216, 180], 8, true);
  pdf.text(tag.toUpperCase(), pageMargin, 11);
  setText(pdf, pdfColors.white, 17, true);
  pdf.text(title, pageMargin, 21);
  setText(pdf, [215, 235, 223], 9);
  pdf.text(subtitle, pageMargin, 28);
  setText(pdf, pdfColors.white, 9, true);
  pdf.text("Smart Solutions", pageWidth - pageMargin, 11, { align: "right" });
}

export function drawStatBox(
  pdf: jsPDF,
  {
    x,
    y,
    width,
    label,
    value,
    detail,
    accent = pdfColors.ink,
  }: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: string;
    detail?: string;
    accent?: Rgb;
  },
) {
  pdf.setFillColor(...pdfColors.mint);
  pdf.roundedRect(x, y, width, detail ? 22 : 18, 2, 2, "F");
  setText(pdf, pdfColors.muted, 8);
  pdf.text(label, x + 4, y + 6);
  setText(pdf, accent, 13, true);
  pdf.text(value, x + 4, y + 13.5);
  if (detail) {
    setText(pdf, pdfColors.muted, 7.5);
    pdf.text(detail, x + 4, y + 19);
  }
}

export function drawSectionTitle(pdf: jsPDF, title: string, y: number) {
  setText(pdf, pdfColors.ink, 11, true);
  pdf.text(title, pageMargin, y);
  pdf.setDrawColor(...pdfColors.border);
  pdf.line(pageMargin, y + 2, pageWidth - pageMargin, y + 2);
}

// Abre el PDF en una pestaña para leerlo sin descargar (el jurado no instala nada).
// La pestaña se abre en el clic del usuario para que el navegador no la bloquee;
// si aun así no existe, se descarga como respaldo.
export async function showPdf(
  pdf: jsPDF,
  fileName: string,
  previewWindow: Window | null,
) {
  if (previewWindow && !previewWindow.closed) {
    previewWindow.location.href = String(pdf.output("bloburl"));
    return;
  }
  await pdf.save(fileName, { returnPromise: true });
}

// Pie con número de página en todas las hojas; se llama al final.
export function drawFooters(pdf: jsPDF, note: string) {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(...pdfColors.border);
    pdf.line(pageMargin, 283, pageWidth - pageMargin, 283);
    setText(pdf, pdfColors.muted, 7.5);
    pdf.text(pdf.splitTextToSize(note, 150), pageMargin, 288);
    pdf.text(`Página ${page} de ${pageCount}`, pageWidth - pageMargin, 288, {
      align: "right",
    });
  }
}
