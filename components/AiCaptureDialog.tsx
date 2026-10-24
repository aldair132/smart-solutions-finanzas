"use client";
import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { compressImage, extractMovementDrafts } from "@/lib/aiService";
import {
  createEmptyDraft,
  hasErrors,
  isCreditKind,
  needsReview,
  parseAmountMinor,
  summarizeDrafts,
  toEditableDrafts,
  validateDraft,
  type EditableDraft,
} from "@/lib/draftReview";
import { money } from "@/lib/finance";
import { demoDate } from "@/lib/mockData";
import { findOpenReceivable } from "@/lib/receivables";
import type { AiMode, Space } from "@/lib/types";
import { useDemo } from "./DemoProvider";
import { Dialog } from "./Dialog";
import { DraftCard } from "./DraftCard";
import { Icon } from "./Icon";

type CapturedImage = Awaited<ReturnType<typeof compressImage>> & {
  key: string;
};
const maxPhotos = 6;
type ExtractionRequest = Parameters<typeof extractMovementDrafts>[0];
const voiceExamples = [
  "Vendí 3 menús a 12 soles y una gaseosa a 3",
  "Compré 2 balones de gas a 50 y pagué 15 de transporte",
  "Le fié 15 soles a doña Carmen y don Julio me pagó 10 de lo que debía",
];

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
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [drafts, setDrafts] = useState<EditableDraft[] | null>(null);
  const [result, setResult] = useState<{ mode: AiMode; notes: string } | null>(
    null,
  );
  const [date, setDate] = useState(`${demoDate}T13:00`);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const reviewListRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const speech = useSpeechRecognition((text) =>
    setTranscript((current) => `${current} ${text}`.trim()),
  );
  const recorder = useAudioRecorder((audio) =>
    runExtraction({ space, kindHint, sourceType: "voice", audio }),
  );
  const isPersonal = space.type === "personal";
  const validations = new Map(
    (drafts ?? []).map((draft) => [
      draft.key,
      validateDraft(draft, { isPersonal }),
    ]),
  );
  const invalidCount = [...validations.values()].filter(hasErrors).length;
  const totals = summarizeDrafts(drafts ?? [], isPersonal);
  const needsDefaultDate =
    method === "voice" || (drafts ?? []).some((draft) => !draft.date);
  const isDirty = Boolean(transcript || images.length || drafts);
  async function handleImages(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    const freeSlots = maxPhotos - images.length;
    setError("");
    if (!files.length) return;
    if (files.length > freeSlots)
      setError(
        `Puedes leer hasta ${maxPhotos} fotos a la vez; se agregaron las primeras.`,
      );
    try {
      const compressed = await Promise.all(
        files.slice(0, freeSlots).map(async (file) => ({
          ...(await compressImage(file)),
          key: crypto.randomUUID(),
        })),
      );
      setImages((current) => [...current, ...compressed].slice(0, maxPhotos));
    } catch {
      setError("No pudimos abrir una de las imágenes. Prueba con JPG o PNG.");
    }
  }
  async function runExtraction(request: ExtractionRequest) {
    if (isProcessing) return;
    setIsProcessing(true);
    setError("");
    try {
      const extraction = await extractMovementDrafts(request);
      const extractedDrafts = toEditableDrafts(extraction);
      setDrafts(extractedDrafts);
      // Solo se abren los borradores dudosos; los correctos quedan como resumen.
      setExpandedKeys(
        new Set(
          extractedDrafts
            .filter((draft) =>
              needsReview(validateDraft(draft, { isPersonal })),
            )
            .map((draft) => draft.key),
        ),
      );
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
    if (images.length)
      runExtraction({
        space,
        kindHint,
        sourceType: "image",
        images: images.map(({ mediaType, data }) => ({ mediaType, data })),
      });
  }
  function updateDraft(key: string, changes: Partial<EditableDraft>) {
    setDrafts((current) =>
      (current ?? []).map((draft) =>
        draft.key === key ? { ...draft, ...changes } : draft,
      ),
    );
  }
  function toggleExpanded(key: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function removeDraft(key: string) {
    setDrafts((current) =>
      (current ?? []).filter((draft) => draft.key !== key),
    );
  }
  function addEmptyDraft() {
    const draft = createEmptyDraft(
      isPersonal ? "expense" : (kindHint ?? "income"),
    );
    setDrafts((current) => [...(current ?? []), draft]);
    setExpandedKeys((current) => new Set(current).add(draft.key));
  }
  function focusFirstInvalid(invalidKeys: string[]) {
    // Espera a que se abran las tarjetas antes de enfocar el primer campo con error.
    requestAnimationFrame(() => {
      const card = reviewListRef.current?.querySelector<HTMLElement>(
        `[data-draft-key="${invalidKeys[0]}"]`,
      );
      card?.scrollIntoView({ block: "center", behavior: "smooth" });
      card?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  }
  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    if (!drafts?.length) {
      setError("No hay movimientos para guardar.");
      return;
    }
    const invalidKeys = drafts
      .filter((draft) => hasErrors(validateDraft(draft, { isPersonal })))
      .map((draft) => draft.key);
    if (invalidKeys.length) {
      setExpandedKeys((current) => new Set([...current, ...invalidKeys]));
      setError("");
      focusFirstInvalid(invalidKeys);
      return;
    }
    setIsSaving(true);
    try {
      saveDrafts(drafts);
      onSaved(drafts.length);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo guardar.",
      );
      setIsSaving(false);
    }
  }
  // Ventas y gastos son movimientos; un fiado queda por cobrar y un cobro reduce su saldo.
  // Usa la fecha del comprobante si la IA la leyó; si no, la fecha elegida abajo.
  function getOccurredAt(draft: EditableDraft) {
    const [defaultDay, defaultTime] = date.split("T");
    return `${draft.date || defaultDay}T${defaultTime}:00-05:00`;
  }
  function saveDrafts(confirmedDrafts: EditableDraft[]) {
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
        occurredAt: getOccurredAt(draft),
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
          createdAt: getOccurredAt(draft),
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
          occurredAt: getOccurredAt(draft),
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
            occurredAt: getOccurredAt(draft),
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
                  : () => recorder.startRecording()
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
          <div className="photo-pickers">
            <label className="photo-picker">
              <Icon name="camera" />
              Tomar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={images.length >= maxPhotos}
                onChange={(event) => {
                  handleImages(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            <label className="photo-picker">
              <Icon name="plus" />
              Elegir varias
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={images.length >= maxPhotos}
                onChange={(event) => {
                  handleImages(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {images.length > 0 && (
            <div className="photo-grid">
              {images.map((image, index) => (
                <figure key={image.key}>
                  <Image
                    unoptimized
                    width={160}
                    height={160}
                    src={image.previewUrl}
                    alt={`Foto ${index + 1}`}
                  />
                  <figcaption>Foto {index + 1}</figcaption>
                  <button
                    type="button"
                    className="photo-remove"
                    aria-label={`Quitar foto ${index + 1}`}
                    onClick={() =>
                      setImages((current) =>
                        current.filter((item) => item.key !== image.key),
                      )
                    }
                  >
                    <Icon name="close" />
                  </button>
                </figure>
              ))}
            </div>
          )}
          <p className="muted small">
            {images.length}/{maxPhotos} fotos · la IA las lee todas juntas y
            avisa si dos son el mismo comprobante.
          </p>
          <button
            type="button"
            className="button primary"
            disabled={!images.length || isProcessing}
            onClick={processCapture}
          >
            {isProcessing
              ? "La IA está leyendo tus fotos…"
              : images.length > 1
                ? `Leer ${images.length} fotos con IA`
                : "Leer con IA"}
          </button>
        </div>
      )}
      {drafts && result && (
        <form className="review-form" onSubmit={handleConfirm} noValidate>
          <div className={`ai-result ${result.mode}`}>
            <strong>
              {result.mode === "ai"
                ? `La IA encontró ${drafts.length} movimiento${drafts.length === 1 ? "" : "s"}`
                : "Extracción de ejemplo (modo demostración)"}
            </strong>
            {result.notes && <p>{result.notes}</p>}
          </div>
          {method === "voice" && (
            <details className="transcript-review">
              <summary>Lo que entendió la IA · corregir</summary>
              <textarea
                rows={3}
                maxLength={4000}
                value={transcript}
                aria-label="Texto entendido por la IA"
                onChange={(event) => setTranscript(event.target.value)}
              />
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
            </details>
          )}
          {drafts.length > 0 && (
            <div className="review-totals" aria-label="Resumen">
              {totals.incomeMinor > 0 && (
                <span className="income">
                  Entra {money(totals.incomeMinor)}
                </span>
              )}
              {totals.expenseMinor > 0 && (
                <span className="expense">
                  Sale {money(totals.expenseMinor)}
                </span>
              )}
              {totals.creditMinor > 0 && (
                <span className="credit">
                  Fiado {money(totals.creditMinor)}
                </span>
              )}
            </div>
          )}
          <div className="review-list" ref={reviewListRef}>
            {drafts.map((draft) => (
              <DraftCard
                key={draft.key}
                draft={draft}
                validation={validations.get(draft.key)!}
                photoUrl={
                  draft.photoIndex
                    ? (images[draft.photoIndex - 1]?.previewUrl ?? null)
                    : null
                }
                isPersonal={isPersonal}
                showDate
                fallbackDate={date.slice(0, 10)}
                isExpanded={expandedKeys.has(draft.key)}
                collectionHint={
                  draft.kind === "credit_collection" && draft.customer.trim()
                    ? findOpenReceivable(receivables, space.id, draft.customer)
                      ? "Se descontará de su fiado pendiente."
                      : "No tiene fiado pendiente: se registrará como cobro."
                    : null
                }
                onToggle={() => toggleExpanded(draft.key)}
                onChange={(changes) => updateDraft(draft.key, changes)}
                onRemove={() => removeDraft(draft.key)}
              />
            ))}
            {!drafts.length && (
              <p className="muted">
                Quitaste todos los movimientos. Agrega uno o vuelve a intentar.
              </p>
            )}
          </div>
          <button
            type="button"
            className="button outline"
            onClick={addEmptyDraft}
          >
            <Icon name="plus" />
            Agregar movimiento
          </button>
          {needsDefaultDate && (
            <label>
              {method === "image"
                ? "Fecha y hora para los que no tienen fecha · Lima"
                : "Fecha y hora · Lima"}
              <input
                required
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          )}
          <div className="review-footer">
            {invalidCount > 0 && (
              <p className="field-error" role="status">
                {invalidCount === 1
                  ? "1 movimiento necesita un dato"
                  : `${invalidCount} movimientos necesitan datos`}
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary"
              disabled={!drafts.length || isSaving}
            >
              {isSaving
                ? "Guardando…"
                : `Guardar ${drafts.length} movimiento${drafts.length === 1 ? "" : "s"}`}
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
          </div>
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
