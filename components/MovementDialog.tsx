"use client";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { extractExample } from "@/lib/demoService";
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
  const [prepared, setPrepared] = useState(method === "text");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const preview = useImagePreview(file);
  function prepareExample() {
    const draft = extractExample(space.id, kind);
    setDescription(draft.description);
    setAmount(String(draft.amountMinor / 100));
    setPrepared(true);
    setDirty(true);
  }
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
        <>
          {method !== "text" && (
            <div className="extraction-box">
              <strong>Extracción simulada</strong>
              <p>
                {method === "voice"
                  ? "Usaremos un audio ficticio de ejemplo; no se activa el micrófono."
                  : "La imagen se previsualiza en tu dispositivo. La propuesta es un ejemplo, no un análisis de su contenido."}
              </p>
              {method === "image" && (
                <>
                  <label>
                    Imagen del comprobante
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        setFile(event.target.files?.[0] ?? null);
                        setPrepared(false);
                      }}
                    />
                  </label>
                  {preview && (
                    <Image
                      unoptimized
                      width={400}
                      height={180}
                      className="capture-preview"
                      src={preview}
                      alt="Comprobante seleccionado"
                    />
                  )}
                </>
              )}
              <button
                className="button outline"
                disabled={method === "image" && !file}
                onClick={prepareExample}
              >
                {method === "voice"
                  ? "Usar audio de ejemplo"
                  : "Simular extracción"}
              </button>
              {prepared && method === "voice" && (
                <p>
                  Ejemplo: «{kind === "income" ? "Vendí" : "Compré"} productos
                  por veinticinco soles».
                </p>
              )}
            </div>
          )}
          {prepared && (
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
              <p className="muted small">Guardado local de demostración.</p>
            </form>
          )}
        </>
      )}
    </Dialog>
  );
}
function useImagePreview(file: File | null) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  return file ? preview : "";
}
