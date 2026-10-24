import { getBusinessDay } from "./businessDate";
import type { Receivable } from "./types";

export type ReceivableSummary = {
  pendingMinor: number;
  pendingCount: number;
  collectedMinor: number;
  totalMinor: number;
  collectionRatePercent: number;
  oldestPendingDays: number;
};

const dayMs = 86_400_000;

export function getReceivableBalance(receivable: Receivable) {
  return Math.max(0, receivable.amountMinor - receivable.paidMinor);
}

export function getDaysOpen(receivable: Receivable, referenceDay = getBusinessDay()) {
  const today = Date.parse(`${referenceDay}T23:59:59-05:00`);
  return Math.max(
    0,
    Math.floor((today - Date.parse(receivable.createdAt)) / dayMs),
  );
}

export function selectReceivables(receivables: Receivable[], spaceId: string) {
  return receivables
    .filter((receivable) => receivable.spaceId === spaceId)
    .sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt),
    );
}

export function summarizeReceivables(
  receivables: Receivable[],
): ReceivableSummary {
  const pending = receivables.filter(
    (receivable) => getReceivableBalance(receivable) > 0,
  );
  const totalMinor = receivables.reduce(
    (sum, receivable) => sum + receivable.amountMinor,
    0,
  );
  const collectedMinor = receivables.reduce(
    (sum, receivable) => sum + receivable.paidMinor,
    0,
  );
  return {
    pendingMinor: pending.reduce(
      (sum, receivable) => sum + getReceivableBalance(receivable),
      0,
    ),
    pendingCount: pending.length,
    collectedMinor,
    totalMinor,
    collectionRatePercent: totalMinor
      ? Math.round((collectedMinor / totalMinor) * 100)
      : 0,
    oldestPendingDays: Math.max(0, ...pending.map((receivable) => getDaysOpen(receivable))),
  };
}

export function normalizeCustomerName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^(?:(?:sr|sra|senor|senora|don|dona|vecino|vecina)\.?\s+)+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Nombre completo normalizado: "doña Carmen" ≈ "Sra. Carmen"; "Ana" no coincide con "Mariana".
export function findOpenReceivables(
  receivables: Receivable[],
  spaceId: string,
  customer: string,
) {
  const wanted = normalizeCustomerName(customer);
  if (!wanted) return [];
  return receivables
    .filter(
      (receivable) =>
        receivable.spaceId === spaceId &&
        getReceivableBalance(receivable) > 0 &&
        normalizeCustomerName(receivable.customer) === wanted,
    )
    .sort(
      (first, second) =>
        Date.parse(first.createdAt) - Date.parse(second.createdAt),
    );
}

export function findOpenReceivable(receivables: Receivable[], spaceId: string, customer: string) {
  return findOpenReceivables(receivables, spaceId, customer)[0];
}

export function getCollectionCustomers(receivables: Receivable[], spaceId: string) {
  const customers = new Map<string, string>();
  for (const receivable of receivables) {
    if (receivable.spaceId !== spaceId || getReceivableBalance(receivable) <= 0) continue;
    customers.set(normalizeCustomerName(receivable.customer), receivable.customer);
  }
  return [...customers.values()].sort((first, second) => first.localeCompare(second, "es"));
}
