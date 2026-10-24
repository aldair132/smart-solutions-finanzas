import { getBusinessDay, isValidBusinessDay } from "./businessDate";
import type { DraftKind, ExtractionResult, ReceiptItem } from "./types";

export type EditableDraft = {
  key: string;
  photoIndex: number | null;
  date: string;
  kind: DraftKind;
  customer: string;
  description: string;
  amount: string;
  category: string;
  issuer: string;
  items: ReceiptItem[];
};
export type DraftField = "description" | "amount" | "customer" | "date";
// Los errores impiden guardar; los avisos solo piden atención.
export type DraftValidation = {
  errors: Partial<Record<DraftField, string>>;
  warnings: Partial<Record<DraftField, string>>;
};
export type DraftTotals = {
  incomeMinor: number;
  expenseMinor: number;
  creditMinor: number;
};

export const draftKindLabels: Record<DraftKind, string> = {
  income: "Venta",
  expense: "Gasto",
  credit_sale: "Fiado",
  credit_collection: "Cobro",
};
const maxAmountMinor = 100_000_000;
const largeAmountMinor = 1_000_000;
const dayMs = 86_400_000;

export function isCreditKind(kind: DraftKind) {
  return kind === "credit_sale" || kind === "credit_collection";
}

export function parseAmountMinor(amount: string) {
  const normalizedAmount = amount.replace(",", ".").replace(/\s/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) return null;
  const amountMinor = Math.round(Number(normalizedAmount) * 100);
  return amountMinor > 0 ? amountMinor : null;
}

// "12,5" → "12.50" al salir del campo, para que el usuario vea el valor final.
export function normalizeAmount(amount: string) {
  const amountMinor = parseAmountMinor(amount);
  return amountMinor === null ? amount.trim() : (amountMinor / 100).toFixed(2);
}

export function toEditableDrafts(result: ExtractionResult): EditableDraft[] {
  return result.drafts.map((draft) => ({
    key: crypto.randomUUID(),
    kind: draft.kind,
    photoIndex: draft.photoIndex,
    date: draft.date ?? "",
    customer: draft.customer ?? "",
    description: draft.description,
    amount:
      draft.amountMinor === null ? "" : (draft.amountMinor / 100).toFixed(2),
    category: draft.category,
    issuer: draft.issuer ?? "",
    items: draft.items,
  }));
}

export function createEmptyDraft(kind: DraftKind): EditableDraft {
  return {
    key: crypto.randomUUID(),
    kind,
    photoIndex: null,
    date: "",
    customer: "",
    description: "",
    amount: "",
    category: kind === "expense" ? "Otros" : "Ventas",
    issuer: "",
    items: [],
  };
}

export function validateDate(
  date: string,
  referenceDay = getBusinessDay(),
): Pick<DraftValidation, "errors" | "warnings"> {
  const today = Date.parse(`${referenceDay}T00:00:00-05:00`);
  const value = Date.parse(`${date}T00:00:00-05:00`);
  if (!date) return { errors: {}, warnings: {} };
  if (!isValidBusinessDay(date))
    return { errors: { date: "Fecha no válida." }, warnings: {} };
  if (value > today)
    return {
      errors: { date: "La fecha no puede ser posterior a hoy." },
      warnings: {},
    };
  if (today - value > 365 * dayMs)
    return {
      errors: {},
      warnings: { date: "Tiene más de un año. ¿Es correcta?" },
    };
  return { errors: {}, warnings: {} };
}

export function validateDraft(
  draft: EditableDraft,
  { isPersonal }: { isPersonal: boolean },
): DraftValidation {
  const amountMinor = parseAmountMinor(draft.amount);
  const dateValidation = validateDate(draft.date);
  const errors: DraftValidation["errors"] = { ...dateValidation.errors };
  const warnings: DraftValidation["warnings"] = { ...dateValidation.warnings };
  if (!draft.description.trim()) errors.description = "Escribe qué fue.";
  if (!draft.amount.trim())
    errors.amount = "La IA no pudo leer el monto: escríbelo.";
  else if (amountMinor === null)
    errors.amount = "Usa números, con hasta 2 decimales (ej.: 12.50).";
  else if (amountMinor > maxAmountMinor)
    errors.amount = "El monto parece demasiado alto.";
  else if (amountMinor >= largeAmountMinor)
    warnings.amount = "Monto alto: verifica que no falte un punto decimal.";
  else if (draft.items.length) {
    const itemsMinor = sumItems(draft.items);
    // Tolera redondeos y descuentos pequeños de la boleta.
    if (Math.abs(itemsMinor - amountMinor) > 50)
      warnings.amount = `Los productos suman ${(itemsMinor / 100).toFixed(2)}: revisa el total.`;
  }
  if (!isPersonal && isCreditKind(draft.kind) && !draft.customer.trim())
    errors.customer = "Indica a quién le fiaste o quién te pagó.";
  return { errors, warnings };
}

export function sumItems(items: ReceiptItem[]) {
  return items.reduce((sum, item) => sum + item.amountMinor, 0);
}

export function hasErrors(validation: DraftValidation) {
  return Object.keys(validation.errors).length > 0;
}

export function needsReview(validation: DraftValidation) {
  return hasErrors(validation) || Object.keys(validation.warnings).length > 0;
}

// Un cobro es dinero que entra; un fiado aún no.
export function summarizeDrafts(
  drafts: EditableDraft[],
  isPersonal: boolean,
): DraftTotals {
  return drafts.reduce(
    (totals, draft) => {
      const amountMinor = parseAmountMinor(draft.amount) ?? 0;
      if (isPersonal || draft.kind === "expense")
        return { ...totals, expenseMinor: totals.expenseMinor + amountMinor };
      if (draft.kind === "credit_sale")
        return { ...totals, creditMinor: totals.creditMinor + amountMinor };
      return { ...totals, incomeMinor: totals.incomeMinor + amountMinor };
    },
    { incomeMinor: 0, expenseMinor: 0, creditMinor: 0 },
  );
}
