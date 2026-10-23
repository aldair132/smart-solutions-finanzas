import type { DemoState } from "./types";

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
  ],
};
export const captureExample = {
  description: "Venta de productos",
  amountMinor: 2500,
  occurredAt: "2026-10-23T13:00:00-05:00",
};
