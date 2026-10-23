"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDemo } from "./DemoProvider";
import { Icon } from "./Icon";
import { PeriodTotals } from "./PeriodTotals";
import { MovementList } from "./MovementList";
import {
  dateRange,
  displayDate,
  localDate,
  selectMovements,
} from "@/lib/finance";
import { exportMovementsPdf } from "@/lib/exportMovementsPdf";
import type { Period } from "@/lib/types";
export function MovementsView({ spaceId }: { spaceId: string }) {
  const { spaces, movements } = useDemo();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPeriod = searchParams.get("period");
  const period: Period =
    requestedPeriod === "7d" || requestedPeriod === "month"
      ? requestedPeriod
      : "today";
  const space = spaces.find((item) => item.id === spaceId);
  const filtered = selectMovements(movements, spaceId, period);
  const dates = [
    ...new Set(filtered.map((item) => localDate(item.occurredAt))),
  ];
  const range = dateRange(period);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const periods: { value: Period; label: string }[] = [
    { value: "today", label: "Hoy" },
    { value: "7d", label: "7 días" },
    { value: "month", label: "Este mes" },
  ];
  async function downloadReport() {
    if (!space || exporting) return;
    setExporting(true);
    setError("");
    try {
      await exportMovementsPdf(space, filtered, period);
    } catch {
      setError("No pudimos generar el informe. Intenta descargarlo otra vez.");
    } finally {
      setExporting(false);
    }
  }
  if (!space) return null;
  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">CADA MOVIMIENTO, EN SU LUGAR</p>
        <h1>Movimientos</h1>
        <p className="subtitle">Un registro claro de tu día a día.</p>
      </div>
      <div className="movements-toolbar">
        <div className="period-filter" aria-label="Periodo">
          {periods.map((item) => (
            <button
              key={item.value}
              aria-pressed={period === item.value}
              className={period === item.value ? "selected" : ""}
              onClick={() =>
                router.replace(
                  `/espacios/${spaceId}/movimientos?period=${item.value}`,
                  { scroll: false },
                )
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          className="button outline export-button"
          onClick={downloadReport}
          disabled={exporting || !filtered.length}
        >
          <Icon name="download" />
          {exporting ? "Generando…" : "Descargar informe PDF"}
        </button>
      </div>
      <p className="filter-caption">
        {displayDate(range.startAt)} – 23 de octubre de 2026 · {filtered.length}{" "}
        {filtered.length === 1 ? "registro" : "registros"}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="history-grid">
        <section>
          {dates.map((date) => (
            <section className="date-group" key={date}>
              <h2>{displayDate(`${date}T12:00:00-05:00`)}</h2>
              <MovementList
                movements={filtered.filter(
                  (item) => localDate(item.occurredAt) === date,
                )}
                space={space}
              />
            </section>
          ))}
          {!filtered.length && (
            <div className="empty-state">
              <Icon name="receipt" />
              <h2>No hay movimientos en este periodo</h2>
              <p>Registra un movimiento para habilitar la descarga.</p>
            </div>
          )}
        </section>
        <aside className="history-summary">
          <p className="eyebrow">RESUMEN DEL PERIODO</p>
          <PeriodTotals
            movements={filtered}
            personal={space.type === "personal"}
          />
          <p className="muted small">
            Según tus registros del periodo seleccionado.
          </p>
        </aside>
      </div>
    </>
  );
}
