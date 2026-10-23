"use client";
import Link from "next/link";
import { useState } from "react";
import { AiCaptureDialog } from "./AiCaptureDialog";
import { useDemo } from "./DemoProvider";
import { Icon } from "./Icon";
import { MovementList } from "./MovementList";
import { MovementDialog, type CaptureMethod } from "./MovementDialog";
import { PeriodTotals } from "./PeriodTotals";
import { selectMovements } from "@/lib/finance";
export function SpaceHome({ spaceId }: { spaceId: string }) {
  const { spaces, movements, aiMode } = useDemo();
  const space = spaces.find((item) => item.id === spaceId);
  const [kind, setKind] = useState<"income" | "expense" | null>(
    space?.type === "personal" ? "expense" : null,
  );
  const [method, setMethod] = useState<CaptureMethod | null>(null);
  const [notice, setNotice] = useState("");
  const recentMovements = selectMovements(movements, spaceId).slice(0, 5);
  const todayMovements = selectMovements(movements, spaceId, "today");
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
              {aiMode === "ai"
                ? "IA activa"
                : aiMode === "demo"
                  ? "IA en modo demostración"
                  : "Comprobando IA…"}
            </span>
          </div>
          <p role="status" className="status-message">
            {notice}
          </p>
          <div className="section-heading">
            <h2>Hoy</h2>
            <span className="count-label">23 de octubre</span>
          </div>
          <PeriodTotals
            movements={todayMovements}
            personal={space.type === "personal"}
          />
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
          onSaved={(count) =>
            setNotice(
              `${count} movimiento${count === 1 ? "" : "s"} registrado${count === 1 ? "" : "s"}.`,
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
