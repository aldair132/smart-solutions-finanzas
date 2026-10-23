import { captureExample, initialState } from "./mockData";
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
export function extractExample(spaceId: string, kind: "income" | "expense") {
  // TODO(IA): API del backend por acordar; entrada spaceId, kind y archivo/audio; salida borrador con importe/concepto/fecha o null si inciertos. Nunca guardar sin revisión y confirmación.
  return {
    ...captureExample,
    spaceId,
    kind,
    description:
      kind === "expense" ? "Compra de productos" : captureExample.description,
  };
}
