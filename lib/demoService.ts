import { initialState } from "./mockData";
import type { DemoState, Movement, Space, User } from "./types";

export function loadDemo(): DemoState {
  // TODO(BACKEND): leer sesión, espacios y movimientos autorizados; sin entrada, salida DemoState. API por acordar; propagar errores sin sustituir por ceros.
  return structuredClone(initialState);
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
const storageKey = "smart-solutions-demo-v1";

export function loadStoredDemo(): DemoState | null {
  // TODO(BACKEND): reemplazar por la lectura autenticada de loadDemo; localStorage solo conserva la demo en este navegador.
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    const state = JSON.parse(stored) as DemoState;
    return Array.isArray(state.spaces) && Array.isArray(state.movements)
      ? state
      : null;
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
