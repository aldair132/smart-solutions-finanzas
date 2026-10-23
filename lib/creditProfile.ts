import { displayDate, localDate, totals } from "./finance";
import { demoDate } from "./mockData";
import type { Movement } from "./types";

export type CreditFactor = {
  label: string;
  detail: string;
  points: number;
  maxPoints: number;
};
export type MonthlySummary = {
  label: string;
  incomeMinor: number;
  expenseMinor: number;
  resultMinor: number;
};
export type CreditLevel = "initial" | "progress" | "ready";
export type CreditProfile = {
  windowDays: number;
  activeDays: number;
  avgMonthlyIncomeMinor: number;
  avgMonthlyExpenseMinor: number;
  avgMonthlyResultMinor: number;
  marginPercent: number;
  stabilityPercent: number;
  trendPercent: number;
  evidencePercent: number;
  paymentCapacityMinor: number;
  score: number;
  level: CreditLevel;
  months: MonthlySummary[];
  factors: CreditFactor[];
};

const windowDays = 90;
const dayMs = 86_400_000;
// Cuota referencial: 30 % del resultado mensual, criterio prudente usado en microfinanzas.
const paymentCapacityShare = 0.3;

function daysAgo(movement: Movement) {
  const movementDay = Date.parse(
    `${localDate(movement.occurredAt)}T12:00:00-05:00`,
  );
  const today = Date.parse(`${demoDate}T12:00:00-05:00`);
  return Math.round((today - movementDay) / dayMs);
}
function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
function sumIncome(movements: Movement[]) {
  return totals(movements).income;
}
function calculateStability(windowMovements: Movement[]) {
  const weeklyIncome = Array.from({ length: 12 }, (_, week) =>
    sumIncome(
      windowMovements.filter(
        (movement) => Math.floor(daysAgo(movement) / 7) === week,
      ),
    ),
  );
  const average =
    weeklyIncome.reduce((sum, value) => sum + value, 0) / weeklyIncome.length;
  if (!average) return 0;
  const variance =
    weeklyIncome.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    weeklyIncome.length;
  return Math.round(clamp(1 - Math.sqrt(variance) / average) * 100);
}
function buildMonths(windowMovements: Movement[]): MonthlySummary[] {
  return [2, 1, 0].map((monthIndex) => {
    const monthMovements = windowMovements.filter(
      (movement) => Math.floor(daysAgo(movement) / 30) === monthIndex,
    );
    const firstDay = new Date(
      Date.parse(`${demoDate}T12:00:00-05:00`) - (monthIndex * 30 + 29) * dayMs,
    );
    const lastDay = new Date(
      Date.parse(`${demoDate}T12:00:00-05:00`) - monthIndex * 30 * dayMs,
    );
    const summary = totals(monthMovements);
    return {
      label: `${displayDate(firstDay.toISOString())} – ${displayDate(lastDay.toISOString())}`,
      incomeMinor: summary.income,
      expenseMinor: summary.expense,
      resultMinor: summary.result,
    };
  });
}
function getLevel(score: number): CreditLevel {
  if (score >= 75) return "ready";
  if (score >= 50) return "progress";
  return "initial";
}

export function calculateCreditProfile(movements: Movement[]): CreditProfile {
  const windowMovements = movements.filter(
    (movement) =>
      movement.kind !== "transfer" &&
      daysAgo(movement) >= 0 &&
      daysAgo(movement) < windowDays,
  );
  const activeDays = new Set(
    windowMovements.map((movement) => localDate(movement.occurredAt)),
  ).size;
  const oldestDaysAgo = Math.max(0, ...windowMovements.map(daysAgo));
  const summary = totals(windowMovements);
  const months = buildMonths(windowMovements);
  const recentIncome = months[2].incomeMinor;
  const previousIncome = months[1].incomeMinor;
  const marginPercent = summary.income
    ? Math.round((summary.result / summary.income) * 100)
    : 0;
  const stabilityPercent = calculateStability(windowMovements);
  const trendPercent = previousIncome
    ? Math.round(((recentIncome - previousIncome) / previousIncome) * 100)
    : 0;
  const evidencePercent = windowMovements.length
    ? Math.round(
        (windowMovements.filter((movement) => movement.source === "image")
          .length /
          windowMovements.length) *
          100,
      )
    : 0;
  const avgMonthlyResultMinor = Math.round(summary.result / 3);
  const factors: CreditFactor[] = [
    {
      label: "Constancia de registro",
      detail: `${activeDays} de ${windowDays} días con registros`,
      points: Math.round(clamp(activeDays / windowDays) * 30),
      maxPoints: 30,
    },
    {
      label: "Margen del negocio",
      detail: `${marginPercent} % de tus ventas queda como resultado`,
      points: Math.round(clamp(marginPercent / 25) * 20),
      maxPoints: 20,
    },
    {
      label: "Estabilidad de ventas",
      detail: `${stabilityPercent} % de estabilidad semanal`,
      points: Math.round((stabilityPercent / 100) * 20),
      maxPoints: 20,
    },
    {
      label: "Tendencia",
      detail: `${trendPercent >= 0 ? "+" : ""}${trendPercent} % frente al mes anterior`,
      points: Math.round(clamp((trendPercent + 20) / 20) * 10),
      maxPoints: 10,
    },
    {
      label: "Comprobantes fotografiados",
      detail: `${evidencePercent} % de registros con foto`,
      points: Math.round(clamp(evidencePercent / 30) * 10),
      maxPoints: 10,
    },
    {
      label: "Antigüedad del historial",
      detail: `${oldestDaysAgo + 1} días de historial`,
      points: Math.round(clamp((oldestDaysAgo + 1) / windowDays) * 10),
      maxPoints: 10,
    },
  ];
  const score = factors.reduce((sum, factor) => sum + factor.points, 0);
  return {
    windowDays,
    activeDays,
    avgMonthlyIncomeMinor: Math.round(summary.income / 3),
    avgMonthlyExpenseMinor: Math.round(summary.expense / 3),
    avgMonthlyResultMinor,
    marginPercent,
    stabilityPercent,
    trendPercent,
    evidencePercent,
    paymentCapacityMinor: Math.max(
      0,
      Math.round(avgMonthlyResultMinor * paymentCapacityShare),
    ),
    score,
    level: getLevel(score),
    months,
    factors,
  };
}

export const creditLevelLabels: Record<CreditLevel, string> = {
  initial: "Perfil en construcción",
  progress: "Buen camino",
  ready: "Listo para presentar",
};
