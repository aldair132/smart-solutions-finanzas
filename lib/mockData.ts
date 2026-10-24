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
      category: "Ventas",
      occurredAt: "2026-10-23T10:30:00-05:00",
    },
    {
      id: "2",
      spaceId: "bodega",
      kind: "expense",
      amountMinor: 2000,
      description: "Bolsas",
      category: "Insumos",
      occurredAt: "2026-10-23T09:45:00-05:00",
    },
    {
      id: "3",
      spaceId: "bodega",
      kind: "income",
      amountMinor: 4000,
      description: "Bebidas",
      category: "Ventas",
      occurredAt: "2026-10-23T09:10:00-05:00",
    },
    {
      id: "4",
      spaceId: "bodega",
      kind: "expense",
      amountMinor: 1500,
      description: "Limpieza",
      category: "Insumos",
      occurredAt: "2026-10-23T08:50:00-05:00",
    },
    {
      id: "5",
      spaceId: "bodega",
      kind: "income",
      amountMinor: 2000,
      description: "Pan",
      category: "Ventas",
      occurredAt: "2026-10-23T08:15:00-05:00",
    },
    {
      id: "6",
      spaceId: "comida",
      kind: "income",
      amountMinor: 25000,
      description: "Venta de almuerzos",
      category: "Ventas",
      occurredAt: "2026-10-23T12:00:00-05:00",
    },
    {
      id: "7",
      spaceId: "comida",
      kind: "expense",
      amountMinor: 10000,
      description: "Insumos",
      category: "Insumos",
      occurredAt: "2026-10-23T07:30:00-05:00",
    },
    {
      id: "8",
      spaceId: "personal",
      kind: "expense",
      amountMinor: 4000,
      description: "Transporte",
      category: "Transporte",
      occurredAt: "2026-10-23T08:00:00-05:00",
    },
    ...createMovementHistory("2026-10-23"),
  ],
  // Fiados de ejemplo (clientes ficticios): pendientes y ya cobrados.
  receivables: [
    {
      id: "f1",
      spaceId: "bodega",
      customer: "Sra. Carmen",
      description: "Abarrotes de la semana",
      amountMinor: 4500,
      paidMinor: 1500,
      createdAt: "2026-10-16T18:20:00-05:00",
    },
    {
      id: "f2",
      spaceId: "bodega",
      customer: "Don Julio",
      description: "Gaseosas y pan",
      amountMinor: 1850,
      paidMinor: 0,
      createdAt: "2026-10-21T09:10:00-05:00",
    },
    {
      id: "f3",
      spaceId: "bodega",
      customer: "Vecina Lucía",
      description: "Arroz y aceite",
      amountMinor: 3200,
      paidMinor: 3200,
      createdAt: "2026-10-05T11:00:00-05:00",
      paidAt: "2026-10-12T17:30:00-05:00",
    },
    {
      id: "f4",
      spaceId: "comida",
      customer: "Taller del frente",
      description: "5 menús",
      amountMinor: 6000,
      paidMinor: 0,
      createdAt: "2026-10-20T13:15:00-05:00",
    },
    {
      id: "f5",
      spaceId: "comida",
      customer: "Sr. Pedro",
      description: "Almuerzos de la quincena",
      amountMinor: 12000,
      paidMinor: 12000,
      createdAt: "2026-09-28T13:00:00-05:00",
      paidAt: "2026-10-15T19:00:00-05:00",
    },
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
              customer: null,
              description: "Compra de mercadería",
              amountMinor: 8650,
              category: "Mercadería",
              photoIndex: 1,
              date: null,
            },
          ]
        : [
            {
              kind: "income",
              customer: null,
              description: "Venta de 3 menús",
              amountMinor: 3600,
              category: "Ventas",
              photoIndex: null,
              date: null,
            },
            {
              kind: "expense",
              customer: null,
              description: "Balón de gas",
              amountMinor: 5000,
              category: "Servicios",
              photoIndex: null,
              date: null,
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
