// Recuerda el último espacio abierto en este navegador para que la barra de la
// portada lleve directo a él. Es solo una comodidad: si falla, se usa el primero.
const storageKey = "smart-solutions-last-space";

export function readLastSpaceId() {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function saveLastSpaceId(spaceId: string) {
  try {
    window.localStorage.setItem(storageKey, spaceId);
  } catch {
    // Sin almacenamiento disponible: la portada usará el primer negocio.
  }
}
