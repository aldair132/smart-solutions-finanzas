import type { CaptureSource, Movement } from "./types";

type HistoryItem = {
  kind: "income" | "expense";
  description: string;
  category: string;
  minSoles: number;
  maxSoles: number;
  chance: number;
};
type SpaceHistoryPlan = {
  spaceId: string;
  daysSkippedPercent: number;
  weekendBoost: number;
  items: HistoryItem[];
};

export const historyDays = 90;
const historyPlans: SpaceHistoryPlan[] = [
  {
    spaceId: "bodega",
    daysSkippedPercent: 8,
    weekendBoost: 1.3,
    items: [
      {
        kind: "income",
        description: "Abarrotes",
        category: "Ventas",
        minSoles: 60,
        maxSoles: 140,
        chance: 1,
      },
      {
        kind: "income",
        description: "Bebidas",
        category: "Ventas",
        minSoles: 25,
        maxSoles: 70,
        chance: 0.95,
      },
      {
        kind: "income",
        description: "Pan",
        category: "Ventas",
        minSoles: 15,
        maxSoles: 35,
        chance: 0.9,
      },
      {
        kind: "income",
        description: "Recargas y snacks",
        category: "Ventas",
        minSoles: 10,
        maxSoles: 40,
        chance: 0.6,
      },
      {
        kind: "expense",
        description: "Reposición de mercadería",
        category: "Mercadería",
        minSoles: 220,
        maxSoles: 420,
        chance: 0.52,
      },
      {
        kind: "expense",
        description: "Bolsas y limpieza",
        category: "Insumos",
        minSoles: 8,
        maxSoles: 25,
        chance: 0.35,
      },
      {
        kind: "expense",
        description: "Luz y agua",
        category: "Servicios",
        minSoles: 6,
        maxSoles: 12,
        chance: 0.2,
      },
    ],
  },
  {
    spaceId: "comida",
    daysSkippedPercent: 14,
    weekendBoost: 1.4,
    items: [
      {
        kind: "income",
        description: "Venta de almuerzos",
        category: "Ventas",
        minSoles: 170,
        maxSoles: 320,
        chance: 1,
      },
      {
        kind: "income",
        description: "Desayunos",
        category: "Ventas",
        minSoles: 30,
        maxSoles: 80,
        chance: 0.7,
      },
      {
        kind: "expense",
        description: "Insumos del mercado",
        category: "Insumos",
        minSoles: 120,
        maxSoles: 200,
        chance: 0.95,
      },
      {
        kind: "expense",
        description: "Balón de gas",
        category: "Servicios",
        minSoles: 48,
        maxSoles: 55,
        chance: 0.12,
      },
      {
        kind: "expense",
        description: "Descartables",
        category: "Insumos",
        minSoles: 12,
        maxSoles: 30,
        chance: 0.3,
      },
      {
        kind: "expense",
        description: "Pago de ayudante",
        category: "Personal",
        minSoles: 35,
        maxSoles: 45,
        chance: 0.85,
      },
    ],
  },
  {
    spaceId: "personal",
    daysSkippedPercent: 20,
    weekendBoost: 1,
    items: [
      {
        kind: "expense",
        description: "Transporte",
        category: "Transporte",
        minSoles: 6,
        maxSoles: 14,
        chance: 0.8,
      },
      {
        kind: "expense",
        description: "Comida de casa",
        category: "Personal",
        minSoles: 20,
        maxSoles: 60,
        chance: 0.5,
      },
    ],
  },
];
const sources: CaptureSource[] = ["voice", "voice", "image", "text"];

// Generador determinista: el historial es igual en cada carga y en servidor/cliente.
function createRandom(seed: number) {
  let state = seed;
  return function nextRandom() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function shiftDate(isoDate: string, daysBack: number) {
  const date = new Date(`${isoDate}T12:00:00-05:00`);
  date.setUTCDate(date.getUTCDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

export function createMovementHistory(lastDate: string): Movement[] {
  const nextRandom = createRandom(2026);
  const movements: Movement[] = [];
  for (let daysBack = 1; daysBack <= historyDays; daysBack++) {
    const day = shiftDate(lastDate, daysBack);
    const weekDay = new Date(`${day}T12:00:00-05:00`).getUTCDay();
    const isWeekend = weekDay === 0 || weekDay === 6;
    // Crecimiento leve: los meses recientes venden un poco más.
    const growth = 1 + (historyDays - daysBack) * 0.002;
    for (const plan of historyPlans) {
      if (nextRandom() * 100 < plan.daysSkippedPercent) continue;
      plan.items.forEach((item, itemIndex) => {
        if (nextRandom() > item.chance) return;
        const boost =
          item.kind === "income" && isWeekend ? plan.weekendBoost : 1;
        const soles =
          (item.minSoles + nextRandom() * (item.maxSoles - item.minSoles)) *
          boost *
          (item.kind === "income" ? growth : 1);
        const hour = 7 + Math.floor(nextRandom() * 12);
        const minute = Math.floor(nextRandom() * 6) * 10;
        movements.push({
          id: `h-${plan.spaceId}-${day}-${itemIndex}`,
          spaceId: plan.spaceId,
          kind: item.kind,
          amountMinor: Math.round(soles * 10) * 10,
          description: item.description,
          category: item.category,
          source: sources[Math.floor(nextRandom() * sources.length)],
          occurredAt: `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-05:00`,
        });
      });
    }
  }
  return movements;
}
