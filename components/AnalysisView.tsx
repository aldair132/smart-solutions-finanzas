"use client";
import Link from "next/link";
import {
  calculateAnalytics,
  type WeekPoint,
  type WeekdayPoint,
} from "@/lib/analytics";
import { money, selectMovements } from "@/lib/finance";
import { selectReceivables, summarizeReceivables } from "@/lib/receivables";
import {
  BarChart,
  ProjectionChart,
  RankedBars,
  type ChartSeries,
} from "./Charts";
import { useDemo } from "./DemoProvider";

// Paleta validada (CVD ΔE 24.7 sobre superficie clara): azul = ventas, naranja = gastos.
const salesColor = "#2a78d6";
const expenseColor = "#eb6834";
const weekSeries: ChartSeries<WeekPoint>[] = [
  { label: "Ventas", color: salesColor, value: (point) => point.incomeMinor },
  {
    label: "Gastos",
    color: expenseColor,
    value: (point) => point.expenseMinor,
  },
];
const expenseOnlySeries: ChartSeries<WeekPoint>[] = [weekSeries[1]];
const weekdaySeries: ChartSeries<WeekdayPoint>[] = [
  {
    label: "Venta promedio",
    color: salesColor,
    value: (point) => point.averageMinor,
  },
];

function Kpi({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "up" | "down";
}) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small className={`kpi-detail ${tone}`}>{detail}</small>}
    </div>
  );
}

export function AnalysisView({ spaceId }: { spaceId: string }) {
  const { spaces, movements, receivables } = useDemo();
  const space = spaces.find((item) => item.id === spaceId);
  if (!space) return null;
  const isPersonal = space.type === "personal";
  const analytics = calculateAnalytics(selectMovements(movements, space.id));
  const receivableSummary = summarizeReceivables(
    selectReceivables(receivables, space.id),
  );
  const change = analytics.incomeChangePercent;
  if (!analytics.recentMovementCount)
    return (
      <>
        <div className="view-heading">
          <p className="eyebrow">TUS NÚMEROS, CLAROS</p>
          <h1>Análisis</h1>
        </div>
        <section className="analysis-card analysis-empty">
          <h2>Aún no hay registros recientes</h2>
          <p>
            El análisis usa tus movimientos de los últimos 90 días. Registra tus
            ventas y gastos de hoy y aquí verás tus ganancias, gráficos y
            proyecciones.
          </p>
          {analytics.olderMovementCount > 0 && (
            <p className="muted">
              Tienes {analytics.olderMovementCount} registro
              {analytics.olderMovementCount === 1 ? "" : "s"} con fechas más
              antiguas (por ejemplo, boletas viejas); no se incluyen aquí.
            </p>
          )}
          <div className="analysis-empty-actions">
            <Link
              className="button primary"
              href={`/espacios/${space.id}?capturar=voz`}
            >
              Registrar por voz
            </Link>
            <Link
              className="button outline"
              href={`/espacios/${space.id}/movimientos?period=month`}
            >
              Ver mis movimientos
            </Link>
          </div>
        </section>
      </>
    );
  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">TUS NÚMEROS, CLAROS</p>
        <h1>Análisis</h1>
        <p className="subtitle">
          Mes en curso: día {analytics.daysElapsed} de {analytics.daysInMonth}.
          Las proyecciones suponen que sigues al mismo ritmo.
        </p>
      </div>
      <section className="kpi-grid" aria-label="Indicadores del mes">
        {!isPersonal && (
          <Kpi
            label="Ventas del mes"
            value={money(analytics.monthIncomeMinor)}
            detail={
              change === null
                ? "Sin datos del mes pasado"
                : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)} % vs. mes pasado a la fecha`
            }
            tone={change === null ? "neutral" : change >= 0 ? "up" : "down"}
          />
        )}
        <Kpi
          label="Gastos del mes"
          value={money(analytics.monthExpenseMinor)}
        />
        {!isPersonal && (
          <Kpi
            label="Ganancia del mes"
            value={money(analytics.monthResultMinor)}
            detail={`Margen ${analytics.marginPercent} %`}
            tone={analytics.monthResultMinor >= 0 ? "up" : "down"}
          />
        )}
        {!isPersonal && (
          <Kpi
            label="Venta promedio"
            value={money(analytics.averageTicketMinor)}
            detail={`Vendiste ${analytics.salesDaysPercent} % de los días`}
          />
        )}
        {!isPersonal && (
          <Kpi
            label="Por cobrar (fiados)"
            value={money(receivableSummary.pendingMinor)}
            detail={`${receivableSummary.pendingCount} fiado${receivableSummary.pendingCount === 1 ? "" : "s"} pendiente${receivableSummary.pendingCount === 1 ? "" : "s"}`}
          />
        )}
      </section>
      {!isPersonal && (
        <section className="analysis-card forecast">
          <div>
            <h2>Si sigues a este ritmo</h2>
            <p className="muted">
              Estimaciones simples a partir de tus registros; no son una
              promesa.
            </p>
          </div>
          <div className="forecast-figures">
            <div>
              <span>Ventas al cierre del mes</span>
              <strong>{money(analytics.projectedIncomeMinor)}</strong>
            </div>
            <div>
              <span>Ganancia al cierre del mes</span>
              <strong>{money(analytics.projectedResultMinor)}</strong>
            </div>
            <div>
              <span>Ganancia estimada próximos 30 días</span>
              <strong>{money(analytics.nextMonthResultMinor)}</strong>
            </div>
          </div>
          {analytics.monthMovementCount > 0 ? (
            <ProjectionChart
              cumulative={analytics.cumulative}
              daysInMonth={analytics.daysInMonth}
              projectedMinor={analytics.projectedIncomeMinor}
              color={salesColor}
            />
          ) : (
            <p className="muted">
              Aún no hay registros este mes. Cuando registres tus primeras
              ventas, aquí verás hacia dónde va tu mes.
            </p>
          )}
        </section>
      )}
      <div className="analysis-grid">
        <section className="analysis-card wide">
          <h2>
            {isPersonal ? "Gastos por semana" : "Ventas y gastos por semana"}
          </h2>
          <BarChart
            points={analytics.weeks}
            series={isPersonal ? expenseOnlySeries : weekSeries}
            title="Últimas 12 semanas"
          />
          <details className="chart-table">
            <summary>Ver datos en tabla</summary>
            <table>
              <thead>
                <tr>
                  <th>Semana del</th>
                  {!isPersonal && <th>Ventas</th>}
                  <th>Gastos</th>
                  {!isPersonal && <th>Ganancia</th>}
                </tr>
              </thead>
              <tbody>
                {analytics.weeks.map((week) => (
                  <tr key={week.label}>
                    <td>{week.label}</td>
                    {!isPersonal && <td>{money(week.incomeMinor)}</td>}
                    <td>{money(week.expenseMinor)}</td>
                    {!isPersonal && (
                      <td>{money(week.incomeMinor - week.expenseMinor)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
        <section className="analysis-card">
          <h2>¿En qué se va tu dinero?</h2>
          <p className="muted small">Últimos 30 días</p>
          <RankedBars
            items={analytics.categories.map((item) => ({
              label: item.category,
              amountMinor: item.amountMinor,
            }))}
            color={expenseColor}
          />
        </section>
        {!isPersonal && (
          <section className="analysis-card">
            <h2>Venta promedio por día</h2>
            <p className="muted small">Últimas 12 semanas</p>
            <BarChart
              points={analytics.weekdays}
              series={weekdaySeries}
              title="Venta promedio por día de la semana"
            />
          </section>
        )}
      </div>
      {analytics.insights.length > 0 && (
        <section className="analysis-card insights">
          <h2>Lo que dicen tus números</h2>
          <ul>
            {analytics.insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
          {!isPersonal && (
            <Link
              className="text-button"
              href={`/espacios/${space.id}/credito`}
            >
              Ver cómo esto mejora tu perfil para crédito →
            </Link>
          )}
        </section>
      )}
    </>
  );
}
