"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { getCreditAdvice } from "@/lib/aiService";
import {
  calculateCreditProfile,
  creditLevelLabels,
  type CreditProfile,
} from "@/lib/creditProfile";
import { exportCreditPdf } from "@/lib/exportCreditPdf";
import { money, selectMovements } from "@/lib/finance";
import type { CreditAdvice, Space } from "@/lib/types";
import { useDemo } from "./DemoProvider";
import { Icon } from "./Icon";

function buildAdviceContext(space: Space, profile: CreditProfile) {
  return {
    negocio: space.name,
    ventasPromedioMensual: money(profile.avgMonthlyIncomeMinor),
    gastosPromedioMensual: money(profile.avgMonthlyExpenseMinor),
    resultadoPromedioMensual: money(profile.avgMonthlyResultMinor),
    margenPorcentaje: profile.marginPercent,
    diasConRegistro: `${profile.activeDays} de ${profile.windowDays}`,
    estabilidadSemanalPorcentaje: profile.stabilityPercent,
    tendenciaUltimoMesPorcentaje: profile.trendPercent,
    registrosConFotoPorcentaje: profile.evidencePercent,
    cuotaReferencial: money(profile.paymentCapacityMinor),
    puntaje: profile.score,
    factores: profile.factors.map(
      (factor) => `${factor.label}: ${factor.points}/${factor.maxPoints}`,
    ),
  };
}

export function CreditView({ spaceId }: { spaceId: string }) {
  const { spaces, movements } = useDemo();
  const [advice, setAdvice] = useState<CreditAdvice | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const space = spaces.find((item) => item.id === spaceId);
  if (!space) return null;
  if (space.type === "personal")
    return (
      <section className="credit-empty">
        <h1>Tu perfil para crédito</h1>
        <p className="subtitle">
          El perfil se calcula con las ventas y gastos de cada negocio. Elige
          uno:
        </p>
        <div className="credit-business-links">
          {spaces
            .filter((item) => item.type === "business")
            .map((item) => (
              <Link
                key={item.id}
                className="button outline"
                href={`/espacios/${item.id}/credito`}
              >
                {item.name}
              </Link>
            ))}
        </div>
      </section>
    );
  const currentSpace = space;
  const profile = calculateCreditProfile(selectMovements(movements, space.id));
  const maxMonthIncome = Math.max(
    1,
    ...profile.months.map((month) => month.incomeMinor),
  );
  async function handleAdvice() {
    setIsLoadingAdvice(true);
    setError("");
    try {
      setAdvice(
        await getCreditAdvice(buildAdviceContext(currentSpace, profile)),
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No disponible.");
    } finally {
      setIsLoadingAdvice(false);
    }
  }
  async function handleExport() {
    setIsExporting(true);
    try {
      await exportCreditPdf(currentSpace, profile, advice);
    } finally {
      setIsExporting(false);
    }
  }
  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">TUS REGISTROS, TU HISTORIAL</p>
        <h1>Perfil para crédito</h1>
        <p className="subtitle">
          Lo que registras cada día se convierte en un historial que puedes
          mostrar a una caja municipal, cooperativa o microfinanciera.
        </p>
      </div>
      <div className="credit-grid">
        <section className={`credit-score ${profile.level}`}>
          <div
            className="score-ring"
            style={{ "--score": profile.score } as CSSProperties}
            role="img"
            aria-label={`Preparación ${profile.score} de 100`}
          >
            <strong>{profile.score}</strong>
            <span>de 100</span>
          </div>
          <div>
            <p className="card-kicker">Preparación para solicitar</p>
            <h2>{creditLevelLabels[profile.level]}</h2>
            <p className="muted">
              Últimos {profile.windowDays} días. No es una aprobación: es tu
              historial ordenado para conversar con la entidad.
            </p>
          </div>
        </section>
        <section className="credit-indicators">
          <div>
            <span>Ventas promedio / mes</span>
            <strong>{money(profile.avgMonthlyIncomeMinor)}</strong>
          </div>
          <div>
            <span>Resultado promedio / mes</span>
            <strong>{money(profile.avgMonthlyResultMinor)}</strong>
          </div>
          <div>
            <span>Margen</span>
            <strong>{profile.marginPercent} %</strong>
          </div>
          <div>
            <span>Cuota referencial</span>
            <strong>{money(profile.paymentCapacityMinor)}</strong>
            <small>30 % de tu resultado mensual</small>
          </div>
        </section>
        <section className="credit-months">
          <h2>Ventas por periodo de 30 días</h2>
          {profile.months.map((month) => (
            <div className="month-bar" key={month.label}>
              <span>{month.label}</span>
              <div aria-hidden="true">
                <i
                  style={{
                    width: `${(month.incomeMinor / maxMonthIncome) * 100}%`,
                  }}
                />
              </div>
              <strong>{money(month.incomeMinor)}</strong>
              <small>
                Gastos {money(month.expenseMinor)} · Resultado{" "}
                {money(month.resultMinor)}
              </small>
            </div>
          ))}
        </section>
        <section className="credit-factors">
          <h2>¿Cómo se calcula?</h2>
          {profile.factors.map((factor) => (
            <div className="factor-row" key={factor.label}>
              <div>
                <strong>{factor.label}</strong>
                <small>{factor.detail}</small>
              </div>
              <span>
                {factor.points}/{factor.maxPoints}
              </span>
              <meter min={0} max={factor.maxPoints} value={factor.points} />
            </div>
          ))}
        </section>
        <section className="credit-advice">
          <div className="section-heading">
            <h2>Lectura de tu asistente</h2>
            {advice && (
              <span className="count-label">
                {advice.mode === "ai" ? "Generado con IA" : "Ejemplo demo"}
              </span>
            )}
          </div>
          {!advice && (
            <button
              className="button primary"
              onClick={handleAdvice}
              disabled={isLoadingAdvice}
            >
              <Icon name="help" />
              {isLoadingAdvice
                ? "Analizando tu negocio…"
                : "Explícame mi perfil"}
            </button>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {advice && (
            <div className="advice-body">
              <p>{advice.summary}</p>
              <h3>Lo que haces bien</h3>
              <ul>
                {advice.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Para mejorar tu perfil</h3>
              <ul>
                {advice.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="button outline"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Icon name="download" />
            {isExporting
              ? "Generando PDF…"
              : "Descargar reporte para la entidad"}
          </button>
          <p className="muted small">
            {/* TODO(BACKEND): compartir el reporte con una entidad requiere consentimiento explícito, firma y registro de acceso; hoy solo se descarga en el dispositivo. */}
            El reporte se genera en tu dispositivo. Tú decides con quién
            compartirlo.
          </p>
        </section>
      </div>
    </>
  );
}
