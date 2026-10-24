"use client";
import { useState } from "react";
import type { Movement, Space } from "@/lib/types";
import { displayDate, displayTime, localDate, money } from "@/lib/finance";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { Icon } from "./Icon";
import { MovementDialog } from "./MovementDialog";
export function MovementList({
  movements,
  space,
}: {
  movements: Movement[];
  space: Space;
}) {
  const today = useCurrentDay();
  const [selected, setSelected] = useState<Movement | null>(null);
  if (!movements.length)
    return (
      <div className="empty-state">
        <Icon name="receipt" />
        <h3>Aún no registraste movimientos</h3>
        <p>Tus registros aparecerán aquí.</p>
      </div>
    );
  return (
    <>
      <div className="movement-list">
        {movements.map((movement) => (
          <button
            className="movement-row"
            key={movement.id}
            onClick={() => setSelected(movement)}
          >
            <span className="movement-icon">
              <Icon name={movement.kind === "income" ? "cart" : "receipt"} />
            </span>
            <span className="movement-description">
              <strong>{movement.description}</strong>
              <small>
                {movement.kind === "income" ? "Venta" : "Gasto"} ·{" "}
                {localDate(movement.occurredAt) !== today
                  ? `${displayDate(movement.occurredAt)} · `
                  : ""}
                {displayTime(movement.occurredAt)}
              </small>
            </span>
            <strong
              className={movement.kind === "income" ? "positive" : "negative"}
            >
              {movement.kind === "income" ? "+" : "−"}{" "}
              {money(movement.amountMinor)}
            </strong>
            <Icon name="arrow" />
          </button>
        ))}
      </div>
      {selected && (
        <MovementDialog
          space={space}
          kind={selected.kind === "income" ? "income" : "expense"}
          movement={selected}
          method="text"
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
