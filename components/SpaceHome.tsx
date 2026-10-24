"use client";
import { MessageDialog } from "./MessageDialog";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AiCaptureDialog } from "./AiCaptureDialog";
import { useDemo } from "./DemoProvider";
import { Icon } from "./Icon";
import { MovementList } from "./MovementList";
import { MovementDialog, type CaptureMethod } from "./MovementDialog";
import { PeriodTotals } from "./PeriodTotals";
import { displayDate, money, selectMovements } from "@/lib/finance";
import { selectReceivables, summarizeReceivables } from "@/lib/receivables";
export function SpaceHome({ spaceId }: { spaceId: string }) {
  const { spaces, movements, receivables, aiMode, aiStatusFailed, today } = useDemo();
  const space = spaces.find((item) => item.id === spaceId);
  const [kind, setKind] = useState<"income" | "expense" | null>(
    space?.type === "personal" ? "expense" : null,
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  // La guía de bienvenida abre la captura directamente: ?capturar=voz|foto.
  const requestedCapture = searchParams.get("capturar");
  const [method, setMethod] = useState<CaptureMethod | null>(() =>
    requestedCapture === "voz"
      ? "voice"
      : requestedCapture === "foto"
        ? "image"
        : null,
  );
  const [notice, setNotice] = useState("");
  const recentMovements = selectMovements(movements, spaceId).slice(0, 5);
  const todayMovements = selectMovements(movements, spaceId, "today");
  const receivableSummary = summarizeReceivables(
    selectReceivables(receivables, spaceId),
  );
  useEffect(() => {
    if (requestedCapture) router.replace(`/espacios/${spaceId}`);
  }, [requestedCapture, router, spaceId]);
  function openCapture(method: CaptureMethod) {
    if (method === "text" && !kind) {
      setNotice("Para escribir, primero elige venta o gasto.");
      return;
    }
    setNotice("");
    setMethod(method);
  }
  if (!space) return null;
  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">UN NEGOCIO MÁS ORDENADO, PASO A PASO</p>
        <h1>El día de tu {space.type === "personal" ? "cuenta" : "negocio"}</h1>
      </div>
      <div className="home-grid">
        <section className="register-panel">
          <h2>¿Qué quieres registrar?</h2>
          <div className="kind-options">
            {space.type !== "personal" && (
              <button
                className={`button ${kind === "income" ? "primary" : "outline"}`}
                aria-pressed={kind === "income"}
                onClick={() => {
                  setKind("income");
                  setNotice("");
                }}
              >
                <Icon name="cart" />
                Venta
              </button>
            )}
            <button
              className={`button ${kind === "expense" ? "primary" : "outline"}`}
              aria-pressed={kind === "expense"}
              onClick={() => {
                setKind("expense");
                setNotice("");
              }}
            >
              <Icon name="receipt" />
              {space.type === "personal" ? "Registrar gasto" : "Gasto"}
            </button>
          </div>
          <div className="capture-panel">
            <p>Habla, toma una foto o escribe</p>
            <div className="capture-methods">
              <button onClick={() => openCapture("voice")}>
                <span>
                  <Icon name="mic" />
                </span>
                Voz
              </button>
              <button onClick={() => openCapture("image")}>
                <span>
                  <Icon name="camera" />
                </span>
                Foto
              </button>
              <button onClick={() => openCapture("text")}>
                <span>
                  <Icon name="receipt" />
                </span>
                Escribir
              </button>
            </div>
            <small>
              Dicta varias ventas y gastos a la vez o fotografía tu boleta o
              cuaderno. La IA prepara el registro; tú confirmas.
            </small>
            <span className={`simulation-label ${aiMode ?? ""}`}>
              {aiStatusFailed
                ? "No se pudo comprobar la IA"
                : aiMode === "ai"
                ? "IA configurada"
                : aiMode === "demo"
                  ? "IA en modo demostración"
                  : "Consultando configuración…"}
            </span>
          </div>
          {notice && <MessageDialog message={notice} onClose={() => setNotice("")} />}
          <div className="section-heading">
            <h2>Hoy</h2>
            <span className="count-label">{today ? displayDate(`${today}T12:00:00-05:00`) : "Hoy"}</span>
          </div>
          <PeriodTotals
            movements={todayMovements}
            personal={space.type === "personal"}
          />
          {space.type === "business" && (
            <Link
              className="receivable-link"
              href={`/espacios/${spaceId}/fiados?from=inicio`}
            >
              <Icon name="hand" />
              <span>
                Fiados por cobrar
                <strong>{money(receivableSummary.pendingMinor)}</strong>
              </span>
              <small>
                {receivableSummary.pendingCount} fiado
                {receivableSummary.pendingCount === 1 ? "" : "s"} pendiente
                {receivableSummary.pendingCount === 1 ? "" : "s"}
              </small>
              <Icon name="arrow" />
            </Link>
          )}
        </section>
        <section className="recent-panel">
          <div className="section-heading">
            <h2>Últimos 5 movimientos</h2>
            <Link href={`/espacios/${spaceId}/movimientos`}>
              Ver todos <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <MovementList movements={recentMovements} space={space} />
          <p className="list-note">Pequeños registros. Grandes decisiones.</p>
        </section>
      </div>
      {(method === "voice" || method === "image") && (
        <AiCaptureDialog
          space={space}
          kindHint={kind}
          method={method}
          onClose={() => setMethod(null)}
          onSaved={(count, pastDatedCount) =>
            setNotice(
              `${count} registro${count === 1 ? "" : "s"} guardado${count === 1 ? "" : "s"}.` +
                (pastDatedCount
                  ? ` ${pastDatedCount} con la fecha de su comprobante (anterior a hoy): búscalo${pastDatedCount === 1 ? "" : "s"} en Movimientos.`
                  : ""),
            )
          }
        />
      )}
      {method === "text" && kind && (
        <MovementDialog
          space={space}
          kind={kind}
          method={method}
          onClose={() => setMethod(null)}
          onSaved={() =>
            setNotice(
              kind === "income" ? "Venta registrada." : "Gasto registrado.",
            )
          }
        />
      )}
    </>
  );
}
