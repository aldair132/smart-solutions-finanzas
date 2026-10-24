"use client";
import { MessageDialog } from "./MessageDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDemo } from "./DemoProvider";
import { Icon } from "./Icon";
import { PeriodTotals } from "./PeriodTotals";
import { MovementList } from "./MovementList";
import { Dialog } from "./Dialog";
import {
  displayDate,
  localDate,
  selectMovements,
} from "@/lib/finance";
import { exportMovementsPdf } from "@/lib/exportMovementsPdf";
import type { Period } from "@/lib/types";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { getMovementRange, getRecentMonths } from "@/lib/movementPeriods";
import styles from "./MovementPeriodFilter.module.css";
export function MovementsView({ spaceId }: { spaceId: string }) {
  const { spaces, movements } = useDemo();
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useCurrentDay();
  const requestedPeriod = searchParams.get("period");
  const period: Period =
    requestedPeriod === "7d" || requestedPeriod === "month"
      ? requestedPeriod
      : "today";
  const space = spaces.find((item) => item.id === spaceId);
  const months = today ? getRecentMonths(today) : [];
  const selectedMonth = months.find((item) => item.value === searchParams.get("month"))?.value ?? months[0]?.value;
  const range = today ? getMovementRange(period, today, selectedMonth) : null;
  const filtered = range ? selectMovements(movements, spaceId, period, range) : [];
  const dates = [
    ...new Set(filtered.map((item) => localDate(item.occurredAt))),
  ];
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const periods: { value: Period; label: string }[] = [
    { value: "today", label: "Hoy" },
    { value: "7d", label: "7 días" },
  ];
  function changePeriod(nextPeriod: Period, month?: string) {
    const query = new URLSearchParams({ period: nextPeriod });
    if (nextPeriod === "month" && month) query.set("month", month);
    router.replace(`/espacios/${spaceId}/movimientos?${query}`, { scroll: false });
  }
  async function downloadReport() {
    if (!space || !range || exporting) return;
    // Pestaña abierta en el clic (antes de esperar) para que no la bloquee el navegador.
    const previewWindow = window.open("", "_blank");
    setExporting(true);
    setError("");
    try {
      await exportMovementsPdf(space, filtered, period, previewWindow, range);
    } catch {
      previewWindow?.close();
      setError("No pudimos generar el informe. Intenta otra vez.");
    } finally {
      setExporting(false);
    }
  }
  if (!space) return null;
  if (!range) return <p role="status">Cargando movimientos…</p>;
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
              onClick={() => changePeriod(item.value)}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isMonthPickerOpen}
            className={`${styles.monthButton} ${period === "month" ? "selected" : ""}`}
            onClick={() => setIsMonthPickerOpen(true)}
          >
            <Icon name="calendar" />
            <span>{period === "month"
              ? months.find((month) => month.value === selectedMonth)?.label
              : "Elegir mes"}</span>
          </button>
        </div>
        <button
          className="button outline export-button"
          onClick={downloadReport}
          disabled={exporting || !filtered.length}
        >
          <Icon name="receipt" />
          {exporting ? "Generando…" : "Ver detalle de movimientos (PDF)"}
        </button>
      </div>
      {isMonthPickerOpen && (
        <Dialog
          title="Elegir mes"
          className={styles.modal}
          onClose={() => setIsMonthPickerOpen(false)}
        >
          <p className="muted">Últimos 3 meses</p>
          <ul className={styles.monthList} aria-label="Meses disponibles">
            {months.map((month, index) => {
              const isSelected = period === "month" && selectedMonth === month.value;
              return (
                <li key={month.value}>
                  <button
                    type="button"
                    className={`${styles.monthCard} ${isSelected ? styles.selectedCard : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setIsMonthPickerOpen(false);
                      changePeriod("month", month.value);
                    }}
                  >
                    <span className={styles.calendarIcon}><Icon name="calendar" /></span>
                    <span className={styles.monthCopy}>
                      <strong>{month.label}</strong>
                      <small>{index === 0 ? "Hasta hoy" : "Mes completo"}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog>
      )}
      <p className="filter-caption">
        {displayDate(range.startAt)} – {displayDate(new Date(Date.parse(range.endAt) - 1).toISOString())} · {filtered.length}{" "}
        {filtered.length === 1 ? "registro" : "registros"}
      </p>
      {error && (
        <MessageDialog tone="error" message={error} onClose={() => setError("")} />
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
