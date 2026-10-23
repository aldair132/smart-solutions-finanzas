"use client";
import { useState, type FormEvent } from "react";
import { demoDate } from "@/lib/mockData";
import { displayDate, displayTime, localDate, money } from "@/lib/finance";
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
  const [description, setDescription] = useState(movement?.description ?? "");
  const [amount, setAmount] = useState(
    movement ? String(movement.amountMinor / 100) : "",
  );
  const [date, setDate] = useState(
    movement
      ? `${localDate(movement.occurredAt)}T${displayTime(movement.occurredAt)}`
      : `${demoDate}T13:00`,
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
          <button className="button primary" onClick={() => setEditing(true)}>
            Editar movimiento
          </button>
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
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
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
