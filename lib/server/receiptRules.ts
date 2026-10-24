import type { DraftKind } from "@/lib/types";

// Palabras que no identifican a un negocio: sufijos legales y rubros genéricos.
const genericWords = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "e",
  "en",
  "sac",
  "saa",
  "sa",
  "srl",
  "eirl",
  "sc",
  "cia",
  "bodega",
  "tienda",
  "minimarket",
  "market",
  "farmacia",
  "botica",
  "restaurante",
  "restaurant",
  "puesto",
  "comida",
  "comercial",
  "distribuidora",
  "distribuciones",
  "inversiones",
  "negocio",
  "productos",
  "servicios",
  "grupo",
  "empresa",
  "corporacion",
]);

function significantWords(name: string) {
  return name
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !genericWords.has(word));
}

function editDistance(first: string, second: string) {
  const row = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let i = 1; i <= first.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= second.length; j++) {
      const current = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (first[i - 1] === second[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[second.length];
}

// ¿El comprobante lo emitió el propio negocio? Tolera un error de lectura por palabra
// ("Lorito" ≈ "Lolito") en palabras de 5 letras o más.
export function isIssuedByBusiness(issuer: string, businessName: string) {
  const issuerWords = significantWords(issuer);
  const businessWords = significantWords(businessName);
  return issuerWords.some((issuerWord) =>
    businessWords.some((businessWord) =>
      issuerWord.length >= 5 && businessWord.length >= 5
        ? editDistance(issuerWord, businessWord) <= 1
        : issuerWord === businessWord,
    ),
  );
}

// En comprobantes, venta o compra lo decide el emisor (regla fija), no el modelo:
// si lo emite el negocio es venta; si lo emite otro, es compra.
export function decideReceiptKind(
  modelKind: DraftKind,
  issuer: string | null,
  businessName: string | undefined,
): DraftKind {
  if (modelKind === "credit_sale" || modelKind === "credit_collection")
    return modelKind;
  if (!issuer?.trim() || !businessName?.trim()) return modelKind;
  return isIssuedByBusiness(issuer, businessName) ? "income" : "expense";
}
