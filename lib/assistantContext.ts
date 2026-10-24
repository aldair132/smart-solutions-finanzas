import { calculateAnalytics } from "./analytics";
import { calculateCreditProfile } from "./creditProfile";
import { money, selectMovements, totals } from "./finance";
import { getBusinessDay } from "./businessDate";
import { selectReceivables, summarizeReceivables } from "./receivables";
import type { Movement, Period, Receivable, Space } from "./types";

const periodLabels: Record<Period, string> = {
  today: "hoy",
  "7d": "ultimos7dias",
  month: "mesActual",
};

function summarizePeriod(movements: Movement[]) {
  const summary = totals(movements);
  return {
    ventas: money(summary.income),
    gastos: money(summary.expense),
    resultado: money(summary.result),
  };
}
function topExpenseCategories(movements: Movement[]) {
  const byCategory = new Map<string, number>();
  for (const movement of movements) {
    if (movement.kind !== "expense") continue;
    const category = movement.category ?? movement.description;
    byCategory.set(
      category,
      (byCategory.get(category) ?? 0) + movement.amountMinor,
    );
  }
  return [...byCategory.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 4)
    .map(([category, amountMinor]) => `${category}: ${money(amountMinor)}`);
}

function describeReceivables(spaceReceivables: Receivable[]) {
  const summary = summarizeReceivables(spaceReceivables);
  return {
    porCobrar: money(summary.pendingMinor),
    clientesQueDeben: spaceReceivables
      .filter((receivable) => receivable.amountMinor > receivable.paidMinor)
      .map(
        (receivable) =>
          `${receivable.customer}: ${money(receivable.amountMinor - receivable.paidMinor)}`,
      ),
    porcentajeCobrado: summary.collectionRatePercent,
    diasDelFiadoMasAntiguo: summary.oldestPendingDays,
  };
}

function describeAnalytics(spaceMovements: Movement[]) {
  const analytics = calculateAnalytics(spaceMovements);
  const bestDay = [...analytics.weekdays].sort(
    (first, second) => second.averageMinor - first.averageMinor,
  )[0];
  return {
    ventasDelMes: money(analytics.monthIncomeMinor),
    variacionVentasVsMesPasadoPorcentaje: analytics.incomeChangePercent,
    gananciaDelMes: money(analytics.monthResultMinor),
    margenPorcentaje: analytics.marginPercent,
    proyeccionVentasCierreMes: money(analytics.projectedIncomeMinor),
    proyeccionGananciaCierreMes: money(analytics.projectedResultMinor),
    ventaPromedio: money(analytics.averageTicketMinor),
    mejorDiaDeVentas: bestDay?.averageMinor ? bestDay.name : null,
    ultimas4Semanas: analytics.weeks
      .slice(-4)
      .map(
        (week) =>
          `semana del ${week.label}: ventas ${money(week.incomeMinor)}, gastos ${money(week.expenseMinor)}`,
      ),
  };
}

// Resumen compacto para el asistente: cifras ya calculadas, nunca la lista completa.
export function buildAssistantContext(
  spaces: Space[],
  movements: Movement[],
  receivables: Receivable[],
  currentSpaceId: string,
) {
  return {
    fechaHoy: getBusinessDay(),
    moneda: "PEN",
    espacioActual: spaces.find((space) => space.id === currentSpaceId)?.name,
    espacios: spaces.map((space) => {
      const spaceMovements = selectMovements(movements, space.id);
      const periods = Object.fromEntries(
        (Object.keys(periodLabels) as Period[]).map((period) => [
          periodLabels[period],
          summarizePeriod(selectMovements(spaceMovements, space.id, period)),
        ]),
      );
      const profile =
        space.type === "business"
          ? calculateCreditProfile(spaceMovements)
          : null;
      return {
        nombre: space.name,
        tipo: space.type === "business" ? "negocio" : "cuenta personal",
        ...periods,
        principalesGastosDelMes: topExpenseCategories(
          selectMovements(spaceMovements, space.id, "month"),
        ),
        ultimosMovimientos: spaceMovements
          .slice(0, 5)
          .map(
            (movement) =>
              `${movement.occurredAt.slice(0, 16)} ${movement.kind === "income" ? "venta" : "gasto"} ${movement.description} ${money(movement.amountMinor)}`,
          ),
        fiados:
          space.type === "business"
            ? describeReceivables(selectReceivables(receivables, space.id))
            : undefined,
        analisis:
          space.type === "business"
            ? describeAnalytics(spaceMovements)
            : undefined,
        perfilCredito: profile && {
          historialDisponible: profile.hasHistory,
          puntaje: profile.hasHistory ? profile.score : null,
          ventasPromedioMensual: money(profile.avgMonthlyIncomeMinor),
          margenPorcentaje: profile.marginPercent,
          diasConRegistro: profile.activeDays,
          cuotaReferencial: profile.hasHistory ? money(profile.paymentCapacityMinor) : null,
        },
      };
    }),
  };
}
