"use client";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { movementCategories } from "@/lib/aiSchemas";
import { compressImage, extractMovementDrafts } from "@/lib/aiService";
import { money } from "@/lib/finance";
import { demoDate } from "@/lib/mockData";
import type { AiMode, ExtractionResult, Space } from "@/lib/types";
import { useDemo } from "./DemoProvider";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

type EditableDraft = {
  key: string;
  kind: "income" | "expense";
  description: string;
  amount: string;
  category: string;
};
type CapturedImage = Awaited<ReturnType<typeof compressImage>>;
const voiceExamples = [
  "Vendí 3 menús a 12 soles y una gaseosa a 3",
  "Compré 2 balones de gas a 50 y pagué 15 de transporte",
  "Hoy vendí 280 soles en abarrotes",
];

function toEditableDrafts(result: ExtractionResult): EditableDraft[] {
  return result.drafts.map((draft) => ({
    key: crypto.randomUUID(),
    kind: draft.kind,
    description: draft.description,
    amount: draft.amountMinor === null ? "" : String(draft.amountMinor / 100),
    category: draft.category,
  }));
}
function parseAmountMinor(amount: string) {
  const normalizedAmount = amount.replace(",", ".").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) return null;
  const amountMinor = Math.round(Number(normalizedAmount) * 100);
  return amountMinor > 0 ? amountMinor : null;
}

export function AiCaptureDialog({
  space,
  kindHint,
  method,
  onClose,
  onSaved,
}: {
  space: Space;
  kindHint: "income" | "expense" | null;
  method: "voice" | "image";
  onClose: () => void;
  onSaved: (count: number) => void;
}) {
  const { addMovements } = useDemo();
  const [transcript, setTranscript] = useState("");
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [drafts, setDrafts] = useState<EditableDraft[] | null>(null);
  const [result, setResult] = useState<{ mode: AiMode; notes: string } | null>(
    null,
  );
  const [date, setDate] = useState(`${demoDate}T13:00`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const speech = useSpeechRecognition((text) =>
    setTranscript((current) => `${current} ${text}`.trim()),
  );
  const isPersonal = space.type === "personal";
  const isDirty = Boolean(transcript || image || drafts);
  async function handleImage(file: File | undefined) {
    setError("");
    if (!file) return;
    try {
      setImage(await compressImage(file));
    } catch {
      setError("No pudimos abrir esa imagen. Prueba con una foto JPG o PNG.");
    }
  }
  async function processCapture() {
    if (isProcessing) return;
    speech.stopListening();
    setIsProcessing(true);
    setError("");
    try {
      const extraction =
        method === "voice"
          ? await extractMovementDrafts({
              space,
              kindHint,
              sourceType: "voice",
              text: transcript,
            })
          : await extractMovementDrafts({
              space,
              kindHint,
              sourceType: "image",
              image: { mediaType: image!.mediaType, data: image!.data },
            });
      setDrafts(toEditableDrafts(extraction));
      setResult({ mode: extraction.mode, notes: extraction.notes });
      if (extraction.transcript && method === "image")
        setTranscript(extraction.transcript);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No pudimos procesarlo.",
      );
    } finally {
      setIsProcessing(false);
    }
  }
  function updateDraft(key: string, changes: Partial<EditableDraft>) {
    setDrafts((current) =>
      (current ?? []).map((draft) =>
        draft.key === key ? { ...draft, ...changes } : draft,
      ),
    );
  }
  function addEmptyDraft() {
    setDrafts((current) => [
      ...(current ?? []),
      {
        key: crypto.randomUUID(),
        kind: kindHint ?? "income",
        description: "",
        amount: "",
        category: "Otros",
      },
    ]);
  }
  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    const occurredAt = `${date}:00-05:00`;
    event.preventDefault();
    if (!drafts?.length) {
      setError("No hay movimientos para guardar.");
      return;
    }
    const invalidDraft = drafts.find(
      (draft) => !draft.description.trim() || !parseAmountMinor(draft.amount),
    );
    if (invalidDraft) {
      setError("Completa el concepto y un importe válido en cada movimiento.");
      return;
    }
    try {
      addMovements(
        drafts.map((draft) => ({
          spaceId: space.id,
          kind: isPersonal ? "expense" : draft.kind,
          amountMinor: parseAmountMinor(draft.amount)!,
          description: draft.description,
          category: draft.category,
          occurredAt,
          source: method,
        })),
      );
      onSaved(drafts.length);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo guardar.",
      );
    }
  }
  return (
    <Dialog
      title={method === "voice" ? "Registrar por voz" : "Registrar con foto"}
      onClose={onClose}
      dirty={isDirty}
    >
      <p className="dialog-space">{space.name} · PEN</p>
      {!drafts && method === "voice" && (
        <div className="ai-capture">
          {speech.isSupported ? (
            <button
              type="button"
              className={`mic-button ${speech.isListening ? "listening" : ""}`}
              aria-pressed={speech.isListening}
              onClick={
                speech.isListening
                  ? speech.stopListening
                  : speech.startListening
              }
            >
              <Icon name="mic" />
              {speech.isListening
                ? "Escuchando… toca para terminar"
                : "Toca y habla"}
            </button>
          ) : (
            <p className="muted">
              Tu navegador no permite dictado. Escribe lo que dirías en voz
              alta; la IA lo ordena igual.
            </p>
          )}
          {speech.interimText && (
            <p className="interim-text" aria-live="polite">
              {speech.interimText}
            </p>
          )}
          {speech.speechError && (
            <p className="error" role="alert">
              {speech.speechError}
            </p>
          )}
          <label>
            Lo que dijiste (puedes corregirlo)
            <textarea
              rows={3}
              maxLength={4000}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Ej.: Vendí 3 menús a 12 soles y compré gas a 50"
            />
          </label>
          <div className="example-chips" aria-label="Ejemplos">
            {voiceExamples.map((example) => (
              <button
                type="button"
                key={example}
                onClick={() => setTranscript(example)}
              >
                {example}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="button primary"
            disabled={!transcript.trim() || isProcessing}
            onClick={processCapture}
          >
            {isProcessing ? "La IA está ordenando…" : "Ordenar con IA"}
          </button>
        </div>
      )}
      {!drafts && method === "image" && (
        <div className="ai-capture">
          <p className="muted">
            Boleta, factura, ticket o la página de tu cuaderno de cuentas.
          </p>
          <label className="photo-picker">
            <Icon name="camera" />
            {image ? "Cambiar foto" : "Tomar o elegir foto"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => handleImage(event.target.files?.[0])}
            />
          </label>
          {image && (
            <Image
              unoptimized
              width={400}
              height={220}
              className="capture-preview"
              src={image.previewUrl}
              alt="Foto seleccionada"
            />
          )}
          <button
            type="button"
            className="button primary"
            disabled={!image || isProcessing}
            onClick={processCapture}
          >
            {isProcessing ? "La IA está leyendo…" : "Leer con IA"}
          </button>
        </div>
      )}
      {drafts && result && (
        <form onSubmit={handleConfirm}>
          <div className={`ai-result ${result.mode}`}>
            <strong>
              {result.mode === "ai"
                ? `La IA encontró ${drafts.length} movimiento${drafts.length === 1 ? "" : "s"}`
                : "Extracción de ejemplo (modo demostración)"}
            </strong>
            {transcript && <p>«{transcript}»</p>}
            {result.notes && <p>{result.notes}</p>}
          </div>
          <p className="muted">Revisa y corrige antes de confirmar.</p>
          {drafts.map((draft) => (
            <fieldset className="draft-card" key={draft.key}>
              <legend className="sr-only">Movimiento</legend>
              {!isPersonal && (
                <div className="draft-kind" role="group" aria-label="Tipo">
                  {(["income", "expense"] as const).map((kind) => (
                    <button
                      type="button"
                      key={kind}
                      aria-pressed={draft.kind === kind}
                      className={draft.kind === kind ? "selected" : ""}
                      onClick={() => updateDraft(draft.key, { kind })}
                    >
                      {kind === "income" ? "Venta" : "Gasto"}
                    </button>
                  ))}
                </div>
              )}
              <label>
                Concepto
                <input
                  required
                  maxLength={120}
                  value={draft.description}
                  onChange={(event) =>
                    updateDraft(draft.key, { description: event.target.value })
                  }
                />
              </label>
              <div className="draft-row">
                <label>
                  Importe S/
                  <input
                    required
                    inputMode="decimal"
                    value={draft.amount}
                    aria-invalid={!parseAmountMinor(draft.amount)}
                    placeholder="Revisar"
                    onChange={(event) =>
                      updateDraft(draft.key, { amount: event.target.value })
                    }
                  />
                </label>
                <label>
                  Categoría
                  <select
                    value={draft.category}
                    onChange={(event) =>
                      updateDraft(draft.key, { category: event.target.value })
                    }
                  >
                    {movementCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setDrafts((current) =>
                    (current ?? []).filter((item) => item.key !== draft.key),
                  )
                }
              >
                Quitar
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            className="button outline"
            onClick={addEmptyDraft}
          >
            <Icon name="plus" />
            Agregar otro
          </button>
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
          <button className="button primary" disabled={!drafts.length}>
            Confirmar {drafts.length} registro{drafts.length === 1 ? "" : "s"} ·{" "}
            {money(
              drafts.reduce(
                (sum, draft) => sum + (parseAmountMinor(draft.amount) ?? 0),
                0,
              ),
            )}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setDrafts(null);
              setResult(null);
            }}
          >
            Volver a intentar
          </button>
        </form>
      )}
      {!drafts && error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
