import { money } from "@/lib/finance";
import { sumItems } from "@/lib/draftReview";
import type { ReceiptItem } from "@/lib/types";

// Detalle desplegable de una boleta: qué se compró o vendió y cuánto costó cada cosa.
export function ReceiptItems({
  items,
  issuer,
  defaultOpen = false,
}: {
  items: ReceiptItem[];
  issuer?: string;
  defaultOpen?: boolean;
}) {
  if (!items.length) return null;
  return (
    <details className="receipt-items" open={defaultOpen}>
      <summary>
        Ver {items.length} producto{items.length === 1 ? "" : "s"}
        {issuer ? ` · ${issuer}` : ""}
      </summary>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.description}-${index}`}>
            <span>
              {item.quantity ? <b>{item.quantity} ×</b> : null}{" "}
              {item.description}
            </span>
            <strong>{money(item.amountMinor)}</strong>
          </li>
        ))}
      </ul>
      <p className="receipt-items-total">
        <span>Suma de productos</span>
        <strong>{money(sumItems(items))}</strong>
      </p>
    </details>
  );
}
