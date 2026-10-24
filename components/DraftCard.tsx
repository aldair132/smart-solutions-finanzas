"use client";
import Image from "next/image";
import { useId, type ReactNode } from "react";
import { movementCategories } from "@/lib/aiSchemas";
import {
  draftKindLabels,
  hasErrors,
  isCreditKind,
  normalizeAmount,
  parseAmountMinor,
  type DraftField,
  type DraftValidation,
  type EditableDraft,
} from "@/lib/draftReview";
import { displayDate, money } from "@/lib/finance";
import type { DraftKind } from "@/lib/types";
import { ReceiptItems } from "./ReceiptItems";
import { Icon } from "./Icon";

type DraftCardProps = {
  draft: EditableDraft;
  validation: DraftValidation;
  photoUrl: string | null;
  isPersonal: boolean;
  showDate: boolean;
  // Fecha que se usará si el borrador no trae una (AAAA-MM-DD).
  fallbackDate: string;
  isExpanded: boolean;
  collectionHint: string | null;
  collectionCustomers: string[];
  onToggle: () => void;
  onChange: (changes: Partial<EditableDraft>) => void;
  onRemove: () => void;
};

function FieldMessage({
  id,
  field,
  validation,
}: {
  id: string;
  field: DraftField;
  validation: DraftValidation;
}) {
  const error = validation.errors[field];
  const warning = validation.warnings[field];
  if (error)
    return (
      <small id={id} className="field-error">
        {error}
      </small>
    );
  if (warning)
    return (
      <small id={id} className="field-warning">
        {warning}
      </small>
    );
  return null;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="draft-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function DraftCard({
  draft,
  validation,
  photoUrl,
  isPersonal,
  showDate,
  fallbackDate,
  isExpanded,
  collectionHint,
  collectionCustomers,
  onToggle,
  onChange,
  onRemove,
}: DraftCardProps) {
  const fieldId = useId();
  const amountMinor = parseAmountMinor(draft.amount);
  const isInvalid = hasErrors(validation);
  const hasWarnings = Object.keys(validation.warnings).length > 0;
  const kindLabel = isPersonal ? "Gasto" : draftKindLabels[draft.kind];
  const sign =
    isPersonal || draft.kind === "expense"
      ? "−"
      : draft.kind === "credit_sale"
        ? ""
        : "+";
  const messageId = (field: DraftField) => `${fieldId}-${field}`;
  const fieldState = (field: DraftField) => ({
    "aria-invalid": Boolean(validation.errors[field]),
    "aria-describedby":
      validation.errors[field] || validation.warnings[field]
        ? messageId(field)
        : undefined,
  });
  return (
    <article
      className={`draft-card ${isExpanded ? "expanded" : ""} ${isInvalid ? "invalid" : hasWarnings ? "warning" : ""}`}
      data-draft-key={draft.key}
    >
      <div className="draft-summary">
        {photoUrl ? (
          <Image
            unoptimized
            width={52}
            height={52}
            src={photoUrl}
            alt={`Foto ${draft.photoIndex}`}
            className="draft-thumb"
          />
        ) : (
          <span className="draft-thumb placeholder" aria-hidden="true">
            <Icon name={draft.kind === "expense" ? "receipt" : "cart"} />
          </span>
        )}
        <div className="draft-summary-text">
          <span className={`kind-pill ${isPersonal ? "expense" : draft.kind}`}>
            {kindLabel}
            {draft.photoIndex && ` · Foto ${draft.photoIndex}`}
          </span>
          <strong>{draft.description || "Sin concepto"}</strong>
          <small>
            {isCreditKind(draft.kind) && draft.customer
              ? `${draft.customer} · `
              : ""}
            {displayDate(`${draft.date || fallbackDate}T12:00:00-05:00`)}
            {" · "}
            {draft.category}
          </small>
        </div>
        <div className="draft-summary-side">
          <strong className={amountMinor ? "" : "missing"}>
            {amountMinor ? `${sign} ${money(amountMinor)}` : "Falta monto"}
          </strong>
          {(isInvalid || hasWarnings) && (
            <span className={`review-chip ${isInvalid ? "error" : ""}`}>
              Revisar
            </span>
          )}
        </div>
      </div>
      <ReceiptItems items={draft.items} issuer={draft.issuer} />
      <div className="draft-actions">
        <button
          type="button"
          className="text-button"
          aria-expanded={isExpanded}
          onClick={onToggle}
        >
          {isExpanded ? "Listo" : "Editar"}
        </button>
        <button
          type="button"
          className="icon-text-button danger"
          onClick={onRemove}
          aria-label={`Quitar ${draft.description || "movimiento"}`}
        >
          <Icon name="close" />
          Quitar
        </button>
      </div>
      {isExpanded && (
        <div className="draft-editor">
          {photoUrl && (
            <Image
              unoptimized
              width={480}
              height={300}
              src={photoUrl}
              alt={`Foto ${draft.photoIndex} ampliada`}
              className="draft-photo-large"
            />
          )}
          {!isPersonal && (
            <div
              className="segmented"
              role="radiogroup"
              aria-label="Tipo de movimiento"
            >
              {(Object.keys(draftKindLabels) as DraftKind[]).map((kind) => (
                <button
                  type="button"
                  role="radio"
                  key={kind}
                  aria-checked={draft.kind === kind}
                  onClick={() => onChange({ kind })}
                >
                  {draftKindLabels[kind]}
                </button>
              ))}
            </div>
          )}
          {!isPersonal && isCreditKind(draft.kind) && (
            <>
              <Field label="Cliente">
                <input
                  maxLength={60}
                  value={draft.customer}
                  placeholder="Ej.: Sra. Carmen"
                  onChange={(event) => onChange({ customer: event.target.value })}
                  {...fieldState("customer")}
                />
                <FieldMessage
                  id={messageId("customer")}
                  field="customer"
                  validation={validation}
                />
                {collectionHint && (
                  <small className="muted">{collectionHint}</small>
                )}
              </Field>
              {draft.kind === "credit_collection" && collectionCustomers.length > 0 && (
                <span className="example-chips" role="group" aria-label="Clientes con fiados pendientes">
                  {collectionCustomers.map((customer) => (
                    <button
                      type="button"
                      key={customer}
                      aria-pressed={draft.customer === customer}
                      onClick={() => onChange({ customer })}
                    >
                      {customer}
                    </button>
                  ))}
                </span>
              )}
            </>
          )}
          <Field label="Concepto">
            <input
              maxLength={120}
              value={draft.description}
              placeholder="¿Qué fue?"
              onChange={(event) =>
                onChange({ description: event.target.value })
              }
              {...fieldState("description")}
            />
            <FieldMessage
              id={messageId("description")}
              field="description"
              validation={validation}
            />
          </Field>
          <div className="draft-grid">
            <Field label="Monto">
              <span className="money-input">
                <span aria-hidden="true">S/</span>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft.amount}
                  placeholder="0.00"
                  onChange={(event) => onChange({ amount: event.target.value })}
                  onBlur={() =>
                    onChange({ amount: normalizeAmount(draft.amount) })
                  }
                  {...fieldState("amount")}
                />
              </span>
              <FieldMessage
                id={messageId("amount")}
                field="amount"
                validation={validation}
              />
            </Field>
            <Field label="Categoría">
              <select
                value={draft.category}
                onChange={(event) => onChange({ category: event.target.value })}
              >
                {movementCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>
          </div>
          {showDate && (
            <Field label={draft.photoIndex ? "Fecha del comprobante" : "Fecha"}>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => onChange({ date: event.target.value })}
                {...fieldState("date")}
              />
              <FieldMessage
                id={messageId("date")}
                field="date"
                validation={validation}
              />
              {!draft.date && !validation.errors.date && (
                <small className="muted">
                  Sin fecha: se usará la fecha general de abajo.
                </small>
              )}
            </Field>
          )}
        </div>
      )}
    </article>
  );
}
