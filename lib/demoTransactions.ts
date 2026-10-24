import { saveMovement, saveReceivable } from "./demoService";
import { money } from "./finance";
import { findOpenReceivable, findOpenReceivables, getReceivableBalance } from "./receivables";
import type { CaptureSource, DemoState, DraftKind, Movement } from "./types";

export type CollectionInput = {
  amountMinor: number;
  occurredAt: string;
  source: CaptureSource;
} & ({ receivableId: string } | { spaceId: string; customer: string });

export type CaptureEntry = {
  kind: DraftKind;
  customer: string;
  description: string;
  category: string;
  amountMinor: number;
  occurredAt: string;
};

export type CaptureInput = {
  spaceId: string;
  source: CaptureSource;
  entries: CaptureEntry[];
};

// Las filas antiguas carecen de receivableId. Se protegen también por su concepto heredado.
export function isCollectionMovement(movement: Pick<Movement, "description" | "receivableId">) {
  return Boolean(movement.receivableId) || /^Cobro de fiado:/i.test(movement.description.trim());
}

export function collectDemoReceivable(state: DemoState, input: CollectionInput): DemoState {
  const pending = "receivableId" in input
    ? state.receivables.filter((item) => item.id === input.receivableId)
    : findOpenReceivables(state.receivables, input.spaceId, input.customer);
  const availableMinor = pending.reduce((sum, item) => sum + getReceivableBalance(item), 0);
  const customer = pending[0]?.customer ?? ("customer" in input ? input.customer : "este cliente");
  const allocations = new Map<string, number>();
  let remainingMinor = input.amountMinor;

  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
    throw new Error("Escribe un importe mayor que cero con hasta dos decimales.");
  if (!pending.length || availableMinor === 0)
    throw new Error(`No hay fiados pendientes para «${customer}». Elige un cliente con deuda o revisa el nombre completo.`);
  if (input.amountMinor > availableMinor)
    throw new Error(`«${customer}» debe ${money(availableMinor)} y el cobro es ${money(input.amountMinor)}. Corrige el importe; no se guardó ningún cambio.`);

  const movements: Movement[] = [];
  for (const receivable of pending) {
    const amountMinor = Math.min(remainingMinor, getReceivableBalance(receivable));
    if (!amountMinor) continue;
    if (Date.parse(input.occurredAt) < Date.parse(receivable.createdAt))
      throw new Error("La fecha del cobro no puede ser anterior al fiado que estás cobrando.");
    allocations.set(receivable.id, amountMinor);
    movements.push(saveMovement({
      spaceId: receivable.spaceId,
      kind: "income",
      amountMinor,
      description: `Cobro de fiado: ${receivable.customer}`,
      category: "Ventas",
      occurredAt: input.occurredAt,
      source: input.source,
      receivableId: receivable.id,
    }));
    remainingMinor -= amountMinor;
    if (!remainingMinor) break;
  }
  // TODO(BACKEND): reemplazar por transacción autorizada de cobro. Entrada: cliente/receivableId, espacio, importe, fecha y source; salida: movimientos vinculados y deudas actualizadas. Rechazar excedentes y guardar todo o nada.
  return {
    ...state,
    movements: [...state.movements, ...movements],
    receivables: state.receivables.map((receivable) => {
      const amountMinor = allocations.get(receivable.id);
      if (!amountMinor) return receivable;
      const paidMinor = receivable.paidMinor + amountMinor;
      return {
        ...receivable,
        paidMinor,
        paidAt: paidMinor === receivable.amountMinor ? input.occurredAt : receivable.paidAt,
      };
    }),
  };
}

// Calcula todo sobre una copia temporal. Un error en cualquier fila descarta el lote entero.
export function saveDemoCapture(state: DemoState, input: CaptureInput): DemoState {
  const space = state.spaces.find((item) => item.id === input.spaceId);
  let nextState = state;
  if (!space) throw new Error("No encontramos ese espacio.");
  if (!input.entries.length) throw new Error("No hay registros para guardar.");

  for (const entry of input.entries) {
    if (space.type === "business" && entry.kind === "credit_collection") {
      nextState = collectDemoReceivable(nextState, {
        spaceId: space.id,
        customer: entry.customer,
        amountMinor: entry.amountMinor,
        occurredAt: entry.occurredAt,
        source: input.source,
      });
    } else if (space.type === "business" && entry.kind === "credit_sale") {
      const existingCustomer = findOpenReceivable(nextState.receivables, space.id, entry.customer)?.customer;
      const receivable = saveReceivable({
        spaceId: space.id,
        customer: existingCustomer ?? entry.customer,
        amountMinor: entry.amountMinor,
        description: entry.description,
        createdAt: entry.occurredAt,
      });
      nextState = { ...nextState, receivables: [...nextState.receivables, receivable] };
    } else {
      const movement = saveMovement({
        spaceId: space.id,
        kind: space.type === "personal" || entry.kind === "expense" ? "expense" : "income",
        amountMinor: entry.amountMinor,
        description: entry.description,
        category: entry.category,
        occurredAt: entry.occurredAt,
        source: input.source,
      });
      nextState = { ...nextState, movements: [...nextState.movements, movement] };
    }
  }
  // TODO(BACKEND): enviar CaptureInput confirmado (espacio, source y entries) a la API del compañero; salida: estado/movimientos/fiados del lote. Validar pertenencia, saldos e idempotencia y guardar todo en una transacción.
  return nextState;
}
