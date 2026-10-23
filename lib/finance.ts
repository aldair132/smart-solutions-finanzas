import { demoDate } from "./mockData";
import type { Movement, Period } from "./types";

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
export function dateRange(period: Period) {
  const startDate =
    period === "month"
      ? "2026-10-01"
      : period === "7d"
        ? "2026-10-17"
        : demoDate;
  return {
    startAt: `${startDate}T00:00:00-05:00`,
    endAt: "2026-10-24T00:00:00-05:00",
  };
}
export function selectMovements(
  movements: Movement[],
  spaceId?: string,
  period?: Period,
) {
  const range = period ? dateRange(period) : null;
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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function displayDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}
export function displayTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
