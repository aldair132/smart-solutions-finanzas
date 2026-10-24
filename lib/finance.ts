import { businessTimeZone, getBusinessDay } from "./businessDate";
import { getMovementRange } from "./movementPeriods";
import type { Movement, Period } from "./types";
import type { MovementRange } from "./movementPeriods";

export function money(amountMinor: number) {
  return `S/ ${(amountMinor / 100).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function totals(movements: Movement[]) {
  const income = movements
    .filter((item) => item.kind === "income")
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const expense = movements
    .filter((item) => item.kind === "expense")
    .reduce((sum, item) => sum + item.amountMinor, 0);
  return { income, expense, result: income - expense };
}
export function dateRange(period: Period, today = getBusinessDay()) {
  return getMovementRange(period, today);
}
export function selectMovements(
  movements: Movement[],
  spaceId?: string,
  period?: Period,
  selectedRange?: MovementRange,
) {
  const range = selectedRange ?? (period ? dateRange(period) : null);
  return movements
    .filter(
      (item) =>
        (!spaceId || item.spaceId === spaceId) &&
        (!range ||
          (Date.parse(item.occurredAt) >= Date.parse(range.startAt) &&
            Date.parse(item.occurredAt) < Date.parse(range.endAt))),
    )
    .sort(
      (first, second) =>
        Date.parse(second.occurredAt) - Date.parse(first.occurredAt),
    );
}
export function localDate(value: string) {
  return getBusinessDay(new Date(value));
}
// El año solo aparece si no es el actual: «26 de julio de 2025».
export function displayDate(value: string) {
  const isOtherYear =
    getBusinessDay(new Date(value)).slice(0, 4) !== getBusinessDay().slice(0, 4);
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: businessTimeZone,
    day: "numeric",
    month: "long",
    ...(isOtherYear && { year: "numeric" }),
  }).format(new Date(value));
}
export function displayTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: businessTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
