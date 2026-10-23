import { calculateCreditProfile } from "./creditProfile";
import { money, selectMovements, totals } from "./finance";
import { demoDate } from "./mockData";
import type { Movement, Period, Space } from "./types";

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

// Resumen compacto para el asistente: cifras ya calculadas, nunca la lista completa.
export function buildAssistantContext(
  spaces: Space[],
  movements: Movement[],
  currentSpaceId: string,
) {
  return {
    fechaHoy: demoDate,
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
        perfilCredito: profile && {
          puntaje: profile.score,
          ventasPromedioMensual: money(profile.avgMonthlyIncomeMinor),
          margenPorcentaje: profile.marginPercent,
          diasConRegistro: profile.activeDays,
          cuotaReferencial: money(profile.paymentCapacityMinor),
        },
      };
    }),
  };
}
