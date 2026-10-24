import type { Period } from "./types";

export type MovementRange = { startAt: string; endAt: string };

function calendarDay(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export function getRecentMonths(today: string) {
  const [year, month] = today.split("-").map(Number);
  const formatter = new Intl.DateTimeFormat("es-PE", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
  return Array.from({ length: 3 }, (_, offset) => {
    const start = calendarDay(year, month - 1 - offset, 1);
    const label = formatter.format(new Date(`${start}T12:00:00Z`));
    return { value: start.slice(0, 7), label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
}

export function getMovementRange(period: Period, today: string, requestedMonth?: string | null): MovementRange {
  const [year, month, day] = today.split("-").map(Number);
  const recentMonths = getRecentMonths(today);
  const selectedMonth = recentMonths.find((item) => item.value === requestedMonth)?.value ?? recentMonths[0].value;
  const [selectedYear, selectedMonthNumber] = selectedMonth.split("-").map(Number);
  const tomorrow = calendarDay(year, month - 1, day + 1);
  const startDay = period === "month"
    ? `${selectedMonth}-01`
    : calendarDay(year, month - 1, period === "7d" ? day - 6 : day);
  const endDay = period === "month" && selectedMonth !== today.slice(0, 7)
    ? calendarDay(selectedYear, selectedMonthNumber, 1)
    : tomorrow;

  return { startAt: `${startDay}T00:00:00-05:00`, endAt: `${endDay}T00:00:00-05:00` };
}
