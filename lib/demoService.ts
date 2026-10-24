import { fixtureDate, initialState } from "./mockData";
import { getBusinessDay, shiftBusinessTimestamp } from "./businessDate";
import type { DemoState, Movement, Receivable, Space, User } from "./types";

export function loadDemo(today = getBusinessDay()): DemoState {
  const state = structuredClone(initialState);
  // TODO(BACKEND): leer sesión, espacios y movimientos autorizados; sin entrada, salida DemoState. API por acordar; propagar errores sin sustituir por ceros.
  return {
    ...state,
    demoSeedDate: today,
    movements: state.movements.map((movement) => ({
      ...movement,
      occurredAt: shiftBusinessTimestamp(movement.occurredAt, fixtureDate, today),
    })),
    receivables: state.receivables.map((receivable) => ({
      ...receivable,
      createdAt: shiftBusinessTimestamp(receivable.createdAt, fixtureDate, today),
      ...(receivable.paidAt ? { paidAt: shiftBusinessTimestamp(receivable.paidAt, fixtureDate, today) } : {}),
    })),
  };
}
export function saveSpace(
  spaces: Space[],
  name: string,
  spaceId?: string,
): Space {
  const cleanName = name.trim();
  const existingSpace = spaces.find((space) => space.id === spaceId);
  if (!cleanName || cleanName.length > 60)
    throw new Error("Escribe un nombre de 1 a 60 caracteres.");
  if (
    spaces.some(
      (space) =>
        space.id !== spaceId &&
        space.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase(),
    )
  )
    throw new Error("Ya existe un espacio con ese nombre.");
  // TODO(BACKEND): crear/actualizar espacio con spaceId opcional y name; salida Space. API por acordar; validar sesión, pertenencia y duplicados en servidor.
  return {
    id: spaceId ?? crypto.randomUUID(),
    name: cleanName,
    type: existingSpace?.type ?? "business",
    currency: "PEN",
    timeZone: "America/Lima",
  };
}
export function saveMovement(
  movement: Omit<Movement, "id"> & { id?: string },
): Movement {
  if (
    !movement.description.trim() ||
    !Number.isSafeInteger(movement.amountMinor) ||
    movement.amountMinor <= 0 ||
    !Number.isFinite(Date.parse(movement.occurredAt))
  )
    throw new Error(
      "Revisa el concepto, la fecha y el importe mayor que cero.",
    );
  // TODO(BACKEND): crear/editar tras confirmación; entrada campos Movement e id opcional, salida Movement. API por acordar; validar sesión/espacio, conservar formulario ante errores.
  return {
    ...movement,
    description: movement.description.trim(),
    id: movement.id ?? crypto.randomUUID(),
  };
}
export function saveUser(user: User, fullName: string): User {
  if (!fullName.trim() || fullName.trim().length > 60)
    throw new Error("Escribe un nombre de 1 a 60 caracteres.");
  // TODO(BACKEND): actualizar cuenta autenticada con fullName; salida User; API por acordar, errores sin anunciar éxito.
  return { ...user, fullName: fullName.trim() };
}
export function deleteSpace(spaces: Space[], spaceId: string) {
  const space = spaces.find((item) => item.id === spaceId);
  if (!space) throw new Error("No encontramos este negocio.");
  if (space.type === "personal")
    throw new Error("La cuenta personal no se puede eliminar.");
  // TODO(BACKEND): eliminar el espacio (spaceId) con sus movimientos y fiados en una transacción; validar sesión y pertenencia. Salida: confirmación sin contenido.
  return space.id;
}
export function saveReceivable(
  receivable: Omit<Receivable, "id" | "paidMinor"> & { id?: string },
): Receivable {
  if (
    !receivable.customer.trim() ||
    !Number.isSafeInteger(receivable.amountMinor) ||
    receivable.amountMinor <= 0
  )
    throw new Error("Indica el cliente y un importe mayor que cero.");
  // TODO(BACKEND): crear fiado con spaceId, customer, description, amountMinor y createdAt; salida Receivable con id del servidor. Validar sesión y pertenencia del espacio.
  return {
    ...receivable,
    customer: receivable.customer.trim().slice(0, 60),
    description: receivable.description.trim().slice(0, 120) || "Venta fiada",
    paidMinor: 0,
    id: receivable.id ?? crypto.randomUUID(),
  };
}
// v2: agrega fiados; una demo guardada con v1 vuelve a los datos de ejemplo.
const storageKey = "smart-solutions-demo-v2";

// Migra una sola vez los ejemplos intactos del reloj fijo anterior.
// Las filas creadas o editadas por el usuario mantienen su fecha original.
export function migrateDemoDates(state: DemoState, today = getBusinessDay()): DemoState {
  const fresh = loadDemo(today);
  const matchesFixture = (item: Movement | Receivable, fixture: Movement | Receivable | undefined) =>
    fixture !== undefined && JSON.stringify(item) === JSON.stringify(fixture);
  if (state.demoSeedDate) return state;
  return {
    ...state,
    demoSeedDate: today,
    movements: state.movements.map((movement) => {
      const fixture = initialState.movements.find((item) => item.id === movement.id);
      return matchesFixture(movement, fixture)
        ? fresh.movements.find((item) => item.id === movement.id)!
        : movement;
    }),
    receivables: state.receivables.map((receivable) => {
      const fixture = initialState.receivables.find((item) => item.id === receivable.id);
      return matchesFixture(receivable, fixture)
        ? fresh.receivables.find((item) => item.id === receivable.id)!
        : receivable;
    }),
  };
}

export function loadStoredDemo(): DemoState | null {
  // TODO(BACKEND): reemplazar por la lectura autenticada de loadDemo; localStorage solo conserva la demo en este navegador.
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    const state = JSON.parse(stored) as DemoState;
    if (!Array.isArray(state.spaces) || !Array.isArray(state.movements))
      return null;
    return migrateDemoDates({ ...state, receivables: state.receivables ?? [] });
  } catch {
    return null;
  }
}
export function storeDemo(state: DemoState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Sin almacenamiento (modo privado): la demo sigue en memoria.
  }
}
export function clearStoredDemo() {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nada que limpiar.
  }
}
