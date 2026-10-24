import { displayDate, localDate, totals } from "./finance";
import { getBusinessDay } from "./businessDate";
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
  asOfDate: string;
  hasHistory: boolean;
  hasTrendComparison: boolean;
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

function daysAgo(movement: Movement, referenceDay: string) {
  const movementDay = Date.parse(
    `${localDate(movement.occurredAt)}T12:00:00-05:00`,
  );
  const today = Date.parse(`${referenceDay}T12:00:00-05:00`);
  return Math.round((today - movementDay) / dayMs);
}
function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
function sumIncome(movements: Movement[]) {
  return totals(movements).income;
}
function calculateStability(windowMovements: Movement[], referenceDay: string) {
  const weeklyIncome = Array.from({ length: 12 }, (_, week) =>
    sumIncome(
      windowMovements.filter(
        (movement) => Math.floor(daysAgo(movement, referenceDay) / 7) === week,
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
function buildMonths(windowMovements: Movement[], referenceDay: string): MonthlySummary[] {
  return [2, 1, 0].map((monthIndex) => {
    const monthMovements = windowMovements.filter(
      (movement) => Math.floor(daysAgo(movement, referenceDay) / 30) === monthIndex,
    );
    const firstDay = new Date(
      Date.parse(`${referenceDay}T12:00:00-05:00`) - (monthIndex * 30 + 29) * dayMs,
    );
    const lastDay = new Date(
      Date.parse(`${referenceDay}T12:00:00-05:00`) - monthIndex * 30 * dayMs,
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

export function calculateCreditProfile(movements: Movement[], referenceDay = getBusinessDay()): CreditProfile {
  const windowMovements = movements.filter(
    (movement) =>
      movement.kind !== "transfer" &&
      daysAgo(movement, referenceDay) >= 0 &&
      daysAgo(movement, referenceDay) < windowDays,
  );
  const activeDays = new Set(
    windowMovements.map((movement) => localDate(movement.occurredAt)),
  ).size;
  const oldestDaysAgo = Math.max(0, ...windowMovements.map((movement) => daysAgo(movement, referenceDay)));
  const summary = totals(windowMovements);
  const months = buildMonths(windowMovements, referenceDay);
  const recentIncome = months[2].incomeMinor;
  const previousIncome = months[1].incomeMinor;
  const hasHistory = windowMovements.length > 0;
  const hasTrendComparison = previousIncome > 0;
  const marginPercent = summary.income
    ? Math.round((summary.result / summary.income) * 100)
    : 0;
  const stabilityPercent = calculateStability(windowMovements, referenceDay);
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
      detail: hasTrendComparison
        ? `${trendPercent >= 0 ? "+" : ""}${trendPercent} % frente al periodo anterior de 30 días`
        : "Aún no hay ventas del periodo anterior para comparar",
      points: hasTrendComparison ? Math.round(clamp((trendPercent + 20) / 20) * 10) : 0,
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
      detail: `${hasHistory ? oldestDaysAgo + 1 : 0} días de historial`,
      points: hasHistory ? Math.round(clamp((oldestDaysAgo + 1) / windowDays) * 10) : 0,
      maxPoints: 10,
    },
  ];
  const score = factors.reduce((sum, factor) => sum + factor.points, 0);
  return {
    asOfDate: referenceDay,
    hasHistory,
    hasTrendComparison,
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
