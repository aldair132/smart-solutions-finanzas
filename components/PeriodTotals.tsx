import { money, totals } from "@/lib/finance";
import type { Movement } from "@/lib/types";
import { Icon } from "./Icon";
export function PeriodTotals({
  movements,
  personal = false,
}: {
  movements: Movement[];
  personal?: boolean;
}) {
  const summary = totals(movements);
  return (
    <div className={`period-totals ${personal ? "single" : ""}`}>
      {!personal && (
        <div>
          <Icon name="cart" />
          <span>
            Ventas<strong>{money(summary.income)}</strong>
          </span>
        </div>
      )}
      <div>
        <Icon name="receipt" />
        <span>
          Gastos<strong>{money(summary.expense)}</strong>
        </span>
      </div>
    </div>
  );
}
