import { localDate, totals } from "./finance";
import { demoDate } from "./mockData";
import type { Movement } from "./types";

export type WeekPoint = {
  label: string;
  incomeMinor: number;
  expenseMinor: number;
};
export type CategoryShare = { category: string; amountMinor: number };
export type WeekdayPoint = {
  label: string;
  name: string;
  averageMinor: number;
};
export type CumulativePoint = { day: number; incomeMinor: number };
export type AnalyticsSummary = {
  monthMovementCount: number;
  recentMovementCount: number;
  olderMovementCount: number;
  monthIncomeMinor: number;
  monthExpenseMinor: number;
  monthResultMinor: number;
  marginPercent: number;
  incomeChangePercent: number | null;
  projectedIncomeMinor: number;
  projectedResultMinor: number;
  nextMonthResultMinor: number;
  averageTicketMinor: number;
  salesDaysPercent: number;
  daysElapsed: number;
  daysInMonth: number;
  weeks: WeekPoint[];
  categories: CategoryShare[];
  weekdays: WeekdayPoint[];
  cumulative: CumulativePoint[];
  insights: string[];
};

const dayMs = 86_400_000;
const weekdayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const weekdayNames = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const monthNames = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "set",
  "oct",
  "nov",
  "dic",
];

function toDayNumber(isoDate: string) {
  return Math.round(Date.parse(`${isoDate}T12:00:00Z`) / dayMs);
}
function daysAgo(movement: Movement) {
  return toDayNumber(demoDate) - toDayNumber(localDate(movement.occurredAt));
}
function percentChange(current: number, previous: number) {
  return previous ? Math.round(((current - previous) / previous) * 100) : null;
}
function formatShortDate(dayNumber: number) {
  const date = new Date(dayNumber * dayMs);
  return `${date.getUTCDate()} ${monthNames[date.getUTCMonth()]}`;
}

function buildWeeks(movements: Movement[]): WeekPoint[] {
  return Array.from({ length: 12 }, (_, index) => {
    const weekIndex = 11 - index;
    const weekMovements = movements.filter(
      (movement) => Math.floor(daysAgo(movement) / 7) === weekIndex,
    );
    const summary = totals(weekMovements);
    return {
      label: formatShortDate(toDayNumber(demoDate) - weekIndex * 7 - 6),
      incomeMinor: summary.income,
      expenseMinor: summary.expense,
    };
  });
}

function buildCategories(movements: Movement[]): CategoryShare[] {
  const byCategory = new Map<string, number>();
  for (const movement of movements) {
    if (movement.kind !== "expense" || daysAgo(movement) >= 30) continue;
    const category = movement.category ?? "Otros";
    byCategory.set(
      category,
      (byCategory.get(category) ?? 0) + movement.amountMinor,
    );
  }
  const sorted = [...byCategory.entries()]
    .map(([category, amountMinor]) => ({ category, amountMinor }))
    .sort((first, second) => second.amountMinor - first.amountMinor);
  if (sorted.length <= 5) return sorted;
  const others = sorted
    .slice(4)
    .reduce((sum, item) => sum + item.amountMinor, 0);
  return [...sorted.slice(0, 4), { category: "Otras", amountMinor: others }];
}

// Promedio de ventas por día de la semana en las últimas 12 semanas.
function buildWeekdays(movements: Movement[]): WeekdayPoint[] {
  const salesByWeekday = Array.from({ length: 7 }, () => 0);
  for (const movement of movements) {
    if (movement.kind !== "income" || daysAgo(movement) >= 84) continue;
    const weekday = new Date(
      `${localDate(movement.occurredAt)}T12:00:00Z`,
    ).getUTCDay();
    salesByWeekday[weekday] += movement.amountMinor;
  }
  // Lunes primero, como se lee la semana en un negocio.
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
    label: weekdayLabels[weekday],
    name: weekdayNames[weekday],
    averageMinor: Math.round(salesByWeekday[weekday] / 12),
  }));
}

function buildCumulative(monthMovements: Movement[], daysElapsed: number) {
  let runningMinor = 0;
  return Array.from({ length: daysElapsed }, (_, index) => {
    const day = index + 1;
    runningMinor += monthMovements
      .filter(
        (movement) =>
          movement.kind === "income" &&
          Number(localDate(movement.occurredAt).slice(8, 10)) === day,
      )
      .reduce((sum, movement) => sum + movement.amountMinor, 0);
    return { day, incomeMinor: runningMinor };
  });
}

function buildInsights(summary: Omit<AnalyticsSummary, "insights">) {
  const insights: string[] = [];
  const bestDay = [...summary.weekdays].sort(
    (first, second) => second.averageMinor - first.averageMinor,
  )[0];
  const topCategory = summary.categories[0];
  const totalExpenses = summary.categories.reduce(
    (sum, item) => sum + item.amountMinor,
    0,
  );
  if (bestDay?.averageMinor)
    insights.push(`Tu mejor día de ventas es el ${bestDay.name}.`);
  if (topCategory && totalExpenses)
    insights.push(
      `${topCategory.category} es tu mayor gasto: ${Math.round((topCategory.amountMinor / totalExpenses) * 100)} % de lo que gastaste en 30 días.`,
    );
  if (summary.incomeChangePercent !== null)
    insights.push(
      summary.incomeChangePercent >= 0
        ? `Vendes ${summary.incomeChangePercent} % más que el mes pasado a esta misma fecha.`
        : `Vendes ${Math.abs(summary.incomeChangePercent)} % menos que el mes pasado a esta misma fecha.`,
    );
  return insights;
}

export function calculateAnalytics(movements: Movement[]): AnalyticsSummary {
  const today = new Date(`${demoDate}T12:00:00Z`);
  const daysElapsed = today.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const monthPrefix = demoDate.slice(0, 7);
  const previousMonthDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
  );
  const previousPrefix = previousMonthDate.toISOString().slice(0, 7);
  const operational = movements.filter(
    (movement) => movement.kind !== "transfer",
  );
  const monthMovements = operational.filter((movement) =>
    localDate(movement.occurredAt).startsWith(monthPrefix),
  );
  const previousSamePeriod = operational.filter((movement) => {
    const date = localDate(movement.occurredAt);
    return (
      date.startsWith(previousPrefix) &&
      Number(date.slice(8, 10)) <= daysElapsed
    );
  });
  const lastThirtyDays = operational.filter(
    (movement) => daysAgo(movement) < 30,
  );
  const previousThirtyDays = operational.filter(
    (movement) => daysAgo(movement) >= 30 && daysAgo(movement) < 60,
  );
  const month = totals(monthMovements);
  const recent = totals(lastThirtyDays);
  const previous = totals(previousThirtyDays);
  const recentSales = lastThirtyDays.filter(
    (movement) => movement.kind === "income",
  );
  const salesDays = new Set(
    recentSales.map((movement) => localDate(movement.occurredAt)),
  );
  // Estimación prudente: el ritmo de los últimos 30 días con la tendencia acotada a ±15 %.
  const trend = Math.max(
    -0.15,
    Math.min(
      0.15,
      previous.result
        ? (recent.result - previous.result) / Math.abs(previous.result)
        : 0,
    ),
  );
  const partialSummary = {
    monthMovementCount: monthMovements.length,
    recentMovementCount: operational.filter(
      (movement) => daysAgo(movement) >= 0 && daysAgo(movement) < 90,
    ).length,
    olderMovementCount: operational.filter(
      (movement) => daysAgo(movement) >= 90,
    ).length,
    monthIncomeMinor: month.income,
    monthExpenseMinor: month.expense,
    monthResultMinor: month.result,
    marginPercent: month.income
      ? Math.round((month.result / month.income) * 100)
      : 0,
    incomeChangePercent: percentChange(
      month.income,
      totals(previousSamePeriod).income,
    ),
    projectedIncomeMinor: Math.round(
      (month.income / daysElapsed) * daysInMonth,
    ),
    projectedResultMinor: Math.round(
      (month.result / daysElapsed) * daysInMonth,
    ),
    nextMonthResultMinor: Math.round(recent.result * (1 + trend)),
    averageTicketMinor: recentSales.length
      ? Math.round(recent.income / recentSales.length)
      : 0,
    salesDaysPercent: Math.round((salesDays.size / 30) * 100),
    daysElapsed,
    daysInMonth,
    weeks: buildWeeks(operational),
    categories: buildCategories(operational),
    weekdays: buildWeekdays(operational),
    cumulative: buildCumulative(monthMovements, daysElapsed),
  };
  return { ...partialSummary, insights: buildInsights(partialSummary) };
}
