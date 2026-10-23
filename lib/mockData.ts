import { createMovementHistory } from "./mockHistory";
import type {
  AiMode,
  CreditAdvice,
  DemoState,
  ExtractionResult,
} from "./types";

export const demoDate = "2026-10-23";
export const initialState: DemoState = {
  user: { id: "rosa", fullName: "Rosa Martínez" },
  spaces: [
    {
      id: "bodega",
      name: "Bodega Doña Rosa",
      type: "business",
      currency: "PEN",
      timeZone: "America/Lima",
    },
    {
      id: "comida",
      name: "Puesto de comida",
      type: "business",
      currency: "PEN",
      timeZone: "America/Lima",
    },
    {
      id: "personal",
      name: "Cuenta personal",
      type: "personal",
      currency: "PEN",
      timeZone: "America/Lima",
    },
  ],
  movements: [
    {
      id: "1",
      spaceId: "bodega",
      kind: "income",
      amountMinor: 9000,
      description: "Abarrotes",
      occurredAt: "2026-10-23T10:30:00-05:00",
    },
    {
      id: "2",
      spaceId: "bodega",
      kind: "expense",
      amountMinor: 2000,
      description: "Bolsas",
      occurredAt: "2026-10-23T09:45:00-05:00",
    },
    {
      id: "3",
      spaceId: "bodega",
      kind: "income",
      amountMinor: 4000,
      description: "Bebidas",
      occurredAt: "2026-10-23T09:10:00-05:00",
    },
    {
      id: "4",
      spaceId: "bodega",
      kind: "expense",
      amountMinor: 1500,
      description: "Limpieza",
      occurredAt: "2026-10-23T08:50:00-05:00",
    },
    {
      id: "5",
      spaceId: "bodega",
      kind: "income",
      amountMinor: 2000,
      description: "Pan",
      occurredAt: "2026-10-23T08:15:00-05:00",
    },
    {
      id: "6",
      spaceId: "comida",
      kind: "income",
      amountMinor: 25000,
      description: "Venta de almuerzos",
      occurredAt: "2026-10-23T12:00:00-05:00",
    },
    {
      id: "7",
      spaceId: "comida",
      kind: "expense",
      amountMinor: 10000,
      description: "Insumos",
      occurredAt: "2026-10-23T07:30:00-05:00",
    },
    {
      id: "8",
      spaceId: "personal",
      kind: "expense",
      amountMinor: 4000,
      description: "Transporte",
      occurredAt: "2026-10-23T08:00:00-05:00",
    },
    ...createMovementHistory("2026-10-23"),
  ],
};
const demoMode: AiMode = "demo";

// Respuestas de respaldo cuando el servidor no tiene GEMINI_API_KEY ni ANTHROPIC_API_KEY.
export function getDemoExtraction(
  sourceType: "voice" | "image",
  kindHint: "income" | "expense" | null,
): ExtractionResult {
  const isExpense = kindHint === "expense";
  return {
    mode: demoMode,
    transcript:
      sourceType === "voice"
        ? "Ejemplo: vendí 3 menús a 12 soles y compré gas a 50"
        : "Ejemplo de boleta: Distribuidora · Total S/ 86.50",
    notes:
      "Modo demostración: configura la clave de IA en el servidor para analizar tu audio o imagen real.",
    drafts:
      sourceType === "image" || isExpense
        ? [
            {
              kind: "expense",
              description: "Compra de mercadería",
              amountMinor: 8650,
              category: "Mercadería",
            },
          ]
        : [
            {
              kind: "income",
              description: "Venta de 3 menús",
              amountMinor: 3600,
              category: "Ventas",
            },
            {
              kind: "expense",
              description: "Balón de gas",
              amountMinor: 5000,
              category: "Servicios",
            },
          ],
  };
}
export function getDemoAssistantAnswer() {
  return "Estoy en modo demostración y aún no puedo analizar tu pregunta. Mientras tanto, revisa tus totales en Movimientos o en la pestaña Crédito.";
}
export function getDemoCreditAdvice(): CreditAdvice {
  return {
    mode: demoMode,
    summary:
      "Tu negocio registra ventas casi todos los días y mantiene un resultado positivo. Es una buena base para conversar con una caja o cooperativa.",
    strengths: [
      "Registras ventas de forma constante.",
      "Tus ventas superan a tus gastos cada mes.",
    ],
    improvements: [
      "Registra también los días con pocas ventas para no dejar huecos.",
      "Toma foto a tus boletas de compra como respaldo.",
    ],
  };
}
