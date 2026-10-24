"use client";
import { MessageDialog } from "./MessageDialog";
import { useState, type FormEvent } from "react";
import { getBusinessDateTime, getBusinessDay, isValidBusinessDay } from "@/lib/businessDate";
import { displayDate, displayTime, localDate, money } from "@/lib/finance";
import { isCollectionMovement } from "@/lib/demoTransactions";
import type { Movement, Space } from "@/lib/types";
import { useDemo } from "./DemoProvider";
import { Dialog } from "./Dialog";
export type CaptureMethod = "voice" | "image" | "text";
export function MovementDialog({
  space,
  kind,
  method,
  movement,
  onClose,
  onSaved,
}: {
  space: Space;
  kind: "income" | "expense";
  method: CaptureMethod;
  movement?: Movement;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { updateMovement } = useDemo();
  const isCollection = movement ? isCollectionMovement(movement) : false;
  const [description, setDescription] = useState(movement?.description ?? "");
  const [amount, setAmount] = useState(
    movement ? String(movement.amountMinor / 100) : "",
  );
  const [date, setDate] = useState(
    movement
      ? `${localDate(movement.occurredAt)}T${displayTime(movement.occurredAt)}`
      : getBusinessDateTime(),
  );
  const [editing, setEditing] = useState(!movement);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  function handleSave(event: FormEvent<HTMLFormElement>) {
    const normalizedAmount = amount.replace(",", ".");
    event.preventDefault();
    if (saving) return;
    if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) {
      setError("Escribe un importe con hasta dos decimales.");
      return;
    }
    if (!isValidBusinessDay(date.slice(0, 10)) || date.slice(0, 10) > getBusinessDay()) {
      setError("Elige una fecha válida hasta hoy.");
      return;
    }
    setSaving(true);
    try {
      updateMovement({
        id: movement?.id,
        spaceId: space.id,
        kind,
        amountMinor: Math.round(Number(normalizedAmount) * 100),
        description,
        occurredAt: `${date}:00-05:00`,
        category: movement?.category,
        source: movement?.source ?? method,
      });
      onSaved?.();
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo guardar.",
      );
      setSaving(false);
    }
  }
  return (
    <Dialog
      title={
        movement
          ? "Detalle del movimiento"
          : `Registrar ${kind === "income" ? "venta" : "gasto"}`
      }
      onClose={onClose}
      dirty={dirty}
    >
      <p className="dialog-space">{space.name} · PEN</p>
      {!editing && movement ? (
        <>
          <div className="detail-amount">
            {kind === "income" ? "+" : "−"} {money(movement.amountMinor)}
          </div>
          <dl className="detail-list">
            <dt>Concepto</dt>
            <dd>{movement.description}</dd>
            <dt>Tipo</dt>
            <dd>{kind === "income" ? "Venta" : "Gasto"}</dd>
            <dt>Fecha</dt>
            <dd>
              {displayDate(movement.occurredAt)} ·{" "}
              {displayTime(movement.occurredAt)}
            </dd>
            {movement.category && (
              <>
                <dt>Categoría</dt>
                <dd>{movement.category}</dd>
              </>
            )}
          </dl>
          {isCollection ? (
            <p className="muted">Este cobro está vinculado a un fiado. Su edición está deshabilitada para conservar el saldo correcto.</p>
          ) : (
            <button className="button primary" onClick={() => setEditing(true)}>
              Editar movimiento
            </button>
          )}
        </>
      ) : (
        <form onSubmit={handleSave} onChange={() => setDirty(true)}>
          <p className="muted">Revisa los datos antes de confirmar.</p>
          <label>
            Concepto
            <input
              required
              maxLength={120}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="¿Qué registraste?"
            />
          </label>
          <label>
            Importe en soles
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>
          {movement?.category && (
            <p className="muted">Categoría: {movement.category}</p>
          )}
          <label>
            Fecha y hora · Lima
            <input
              required
              type="datetime-local"
              max={`${getBusinessDay()}T23:59`}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          {error && (
            <MessageDialog tone="error" message={error} onClose={() => setError("")} />
          )}
          <button className="button primary" disabled={saving}>
            {saving
              ? "Guardando…"
              : movement
                ? "Guardar cambios"
                : "Confirmar registro"}
          </button>
          <p className="muted small">Se guarda en este dispositivo.</p>
        </form>
      )}
    </Dialog>
  );
}
