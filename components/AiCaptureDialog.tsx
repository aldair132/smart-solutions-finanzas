"use client";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { movementCategories } from "@/lib/aiSchemas";
import { compressImage, extractMovementDrafts } from "@/lib/aiService";
import { money } from "@/lib/finance";
import { demoDate } from "@/lib/mockData";
import { findOpenReceivable } from "@/lib/receivables";
import type { AiMode, DraftKind, ExtractionResult, Space } from "@/lib/types";
import { useDemo } from "./DemoProvider";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

type EditableDraft = {
  key: string;
  kind: DraftKind;
  customer: string;
  description: string;
  amount: string;
  category: string;
};
type CapturedImage = Awaited<ReturnType<typeof compressImage>>;
type ExtractionRequest = Parameters<typeof extractMovementDrafts>[0];
const draftKindLabels: Record<DraftKind, string> = {
  income: "Venta",
  expense: "Gasto",
  credit_sale: "Fiado",
  credit_collection: "Cobro",
};
const voiceExamples = [
  "Vendí 3 menús a 12 soles y una gaseosa a 3",
  "Compré 2 balones de gas a 50 y pagué 15 de transporte",
  "Le fié 15 soles a doña Carmen y don Julio me pagó 10 de lo que debía",
];

function toEditableDrafts(result: ExtractionResult): EditableDraft[] {
  return result.drafts.map((draft) => ({
    key: crypto.randomUUID(),
    kind: draft.kind,
    customer: draft.customer ?? "",
    description: draft.description,
    amount: draft.amountMinor === null ? "" : String(draft.amountMinor / 100),
    category: draft.category,
  }));
}
function isCreditKind(kind: DraftKind) {
  return kind === "credit_sale" || kind === "credit_collection";
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
  const {
    addMovements,
    addReceivables,
    collectReceivable,
    receivables,
    supportsAudio,
  } = useDemo();
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
  const recorder = useAudioRecorder((audio) =>
    runExtraction({ space, kindHint, sourceType: "voice", audio }),
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
  async function runExtraction(request: ExtractionRequest) {
    if (isProcessing) return;
    setIsProcessing(true);
    setError("");
    try {
      const extraction = await extractMovementDrafts(request);
      setDrafts(toEditableDrafts(extraction));
      setResult({ mode: extraction.mode, notes: extraction.notes });
      // Con audio o imagen, la IA devuelve lo que escuchó o leyó.
      if (extraction.transcript && !("text" in request))
        setTranscript(extraction.transcript);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No pudimos procesarlo.",
      );
    } finally {
      setIsProcessing(false);
    }
  }
  function processCapture() {
    speech.stopListening();
    if (method === "voice") {
      runExtraction({ space, kindHint, sourceType: "voice", text: transcript });
      return;
    }
    if (image)
      runExtraction({
        space,
        kindHint,
        sourceType: "image",
        image: { mediaType: image.mediaType, data: image.data },
      });
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
        customer: "",
        description: "",
        amount: "",
        category: "Otros",
      },
    ]);
  }
  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!drafts?.length) {
      setError("No hay movimientos para guardar.");
      return;
    }
    const invalidDraft = drafts.find(
      (draft) =>
        !draft.description.trim() ||
        !parseAmountMinor(draft.amount) ||
        (isCreditKind(draft.kind) && !draft.customer.trim()),
    );
    if (invalidDraft) {
      setError(
        "Completa concepto, importe válido y, en fiados y cobros, el cliente.",
      );
      return;
    }
    try {
      saveDrafts(drafts, `${date}:00-05:00`);
      onSaved(drafts.length);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo guardar.",
      );
    }
  }
  // Ventas y gastos son movimientos; un fiado queda por cobrar y un cobro reduce su saldo.
  function saveDrafts(confirmedDrafts: EditableDraft[], occurredAt: string) {
    const movements = confirmedDrafts.filter(
      (draft) => isPersonal || !isCreditKind(draft.kind),
    );
    addMovements(
      movements.map((draft) => ({
        spaceId: space.id,
        kind: isPersonal || draft.kind === "expense" ? "expense" : "income",
        amountMinor: parseAmountMinor(draft.amount)!,
        description: draft.description,
        category: draft.category,
        occurredAt,
        source: method,
      })),
    );
    if (isPersonal) return;
    addReceivables(
      confirmedDrafts
        .filter((draft) => draft.kind === "credit_sale")
        .map((draft) => ({
          spaceId: space.id,
          // Reutiliza el nombre ya guardado ("doña Carmen" → "Sra. Carmen").
          customer:
            findOpenReceivable(receivables, space.id, draft.customer)
              ?.customer ?? draft.customer,
          description: draft.description,
          amountMinor: parseAmountMinor(draft.amount)!,
          createdAt: occurredAt,
        })),
    );
    for (const draft of confirmedDrafts) {
      if (draft.kind !== "credit_collection") continue;
      const receivable = findOpenReceivable(
        receivables,
        space.id,
        draft.customer,
      );
      if (receivable)
        collectReceivable({
          receivableId: receivable.id,
          amountMinor: parseAmountMinor(draft.amount)!,
          occurredAt,
          source: method,
        });
      else
        addMovements([
          {
            spaceId: space.id,
            kind: "income",
            amountMinor: parseAmountMinor(draft.amount)!,
            description: `Cobro de fiado: ${draft.customer}`,
            category: "Ventas",
            occurredAt,
            source: method,
          },
        ]);
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
          {supportsAudio ? (
            <button
              type="button"
              className={`mic-button ${recorder.isRecording ? "listening" : ""}`}
              aria-pressed={recorder.isRecording}
              disabled={isProcessing}
              onClick={
                recorder.isRecording
                  ? recorder.stopRecording
                  : recorder.startRecording
              }
            >
              <Icon name="mic" />
              {isProcessing
                ? "La IA está escuchando tu audio…"
                : recorder.isRecording
                  ? `Grabando ${recorder.seconds}s · toca para terminar`
                  : "Toca, habla y vuelve a tocar"}
            </button>
          ) : speech.isSupported ? (
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
          {(recorder.recorderError || speech.speechError) && (
            <p className="error" role="alert">
              {recorder.recorderError || speech.speechError}
            </p>
          )}
          <label>
            {supportsAudio
              ? "¿Prefieres escribir?"
              : "Lo que dijiste (puedes corregirlo)"}
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
            disabled={
              !transcript.trim() || isProcessing || recorder.isRecording
            }
            onClick={processCapture}
          >
            {isProcessing ? "La IA está ordenando…" : "Ordenar texto con IA"}
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
            {method === "image" && transcript && <p>«{transcript}»</p>}
            {result.notes && <p>{result.notes}</p>}
          </div>
          {method === "voice" && (
            <div className="transcript-review">
              <label>
                Lo que entendió la IA (corrígelo si algo está mal)
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="text-button"
                disabled={!transcript.trim() || isProcessing}
                onClick={processCapture}
              >
                {isProcessing
                  ? "Ordenando…"
                  : "Volver a ordenar con este texto"}
              </button>
            </div>
          )}
          <p className="muted">Revisa y corrige antes de confirmar.</p>
          {drafts.map((draft) => (
            <fieldset className="draft-card" key={draft.key}>
              <legend className="sr-only">Movimiento</legend>
              {!isPersonal && (
                <div className="draft-kind" role="group" aria-label="Tipo">
                  {(Object.keys(draftKindLabels) as DraftKind[]).map((kind) => (
                    <button
                      type="button"
                      key={kind}
                      aria-pressed={draft.kind === kind}
                      className={draft.kind === kind ? "selected" : ""}
                      onClick={() => updateDraft(draft.key, { kind })}
                    >
                      {draftKindLabels[kind]}
                    </button>
                  ))}
                </div>
              )}
              {!isPersonal && isCreditKind(draft.kind) && (
                <label>
                  Cliente
                  <input
                    required
                    maxLength={60}
                    value={draft.customer}
                    placeholder="Ej.: Sra. Carmen"
                    onChange={(event) =>
                      updateDraft(draft.key, { customer: event.target.value })
                    }
                  />
                  {draft.kind === "credit_collection" && (
                    <small className="muted">
                      {findOpenReceivable(receivables, space.id, draft.customer)
                        ? "Se descontará de su fiado pendiente."
                        : "No tiene fiado pendiente: se registrará como cobro."}
                    </small>
                  )}
                </label>
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
