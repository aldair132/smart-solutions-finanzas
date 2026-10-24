"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { money } from "@/lib/finance";

export type ChartSeries<Point> = {
  label: string;
  color: string;
  value: (point: Point) => number;
};

const chartHeight = 220;
const padding = { top: 12, right: 8, bottom: 26, left: 52 };
const plotHeight = chartHeight - padding.top - padding.bottom;

// El SVG usa el ancho real del contenedor: así el texto conserva su tamaño
// en lugar de agrandarse o encogerse al escalar.
function useChartWidth() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(640);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) =>
      setChartWidth(Math.max(280, Math.round(entry.contentRect.width))),
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  return {
    frameRef,
    chartWidth,
    plotWidth: chartWidth - padding.left - padding.right,
  };
}

function compactMoney(amountMinor: number) {
  const soles = amountMinor / 100;
  if (soles >= 1000)
    return `S/ ${(soles / 1000).toFixed(soles >= 10000 ? 0 : 1)}k`;
  return `S/ ${Math.round(soles)}`;
}
// Tope "redondo" para el eje: 3 líneas de guía legibles.
function niceMaximum(value: number) {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find(
    (candidate) => candidate * magnitude >= value,
  )!;
  return step * magnitude;
}
// Barra con punta redondeada de 4 px y base recta sobre el eje.
function barPath(x: number, y: number, width: number, height: number) {
  const radius = Math.min(4, width / 2, height);
  const bottom = y + height;
  return `M${x},${bottom}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + width - radius}Q${x + width},${y} ${x + width},${y + radius}V${bottom}Z`;
}

function YAxis({
  maximum,
  chartWidth,
}: {
  maximum: number;
  chartWidth: number;
}) {
  return (
    <g className="chart-axis">
      {[0, 0.5, 1].map((share) => {
        const y = padding.top + plotHeight * (1 - share);
        return (
          <g key={share}>
            <line
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={y}
              y2={y}
            />
            <text x={padding.left - 8} y={y + 4} textAnchor="end">
              {compactMoney(maximum * share)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function ChartLegend<Point>({
  series,
}: {
  series: ChartSeries<Point>[];
}) {
  if (series.length < 2) return null;
  return (
    <div className="chart-legend">
      {series.map((item) => (
        <span key={item.label}>
          <i style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function BarChart<Point extends { label: string }>({
  points,
  series,
  title,
}: {
  points: Point[];
  series: ChartSeries<Point>[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { frameRef, chartWidth, plotWidth } = useChartWidth();
  const maximum = niceMaximum(
    Math.max(
      ...points.flatMap((point) => series.map((item) => item.value(point))),
    ),
  );
  const groupWidth = plotWidth / points.length;
  const barWidth = Math.min(24, (groupWidth - 8) / series.length - 2);
  const groupInner = series.length * barWidth + (series.length - 1) * 2;
  const activePoint = activeIndex === null ? null : points[activeIndex];
  return (
    <div className="chart">
      <ChartLegend series={series} />
      <div className="chart-frame" ref={frameRef}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={title}
        >
          <YAxis maximum={maximum} chartWidth={chartWidth} />
          {points.map((point, index) => {
            const groupX =
              padding.left + index * groupWidth + (groupWidth - groupInner) / 2;
            return (
              <g key={point.label}>
                {series.map((item, seriesIndex) => {
                  const height = (item.value(point) / maximum) * plotHeight;
                  return (
                    <path
                      key={item.label}
                      d={barPath(
                        groupX + seriesIndex * (barWidth + 2),
                        padding.top + plotHeight - height,
                        barWidth,
                        Math.max(height, 0),
                      )}
                      fill={item.color}
                      opacity={
                        activeIndex === null || activeIndex === index ? 1 : 0.45
                      }
                    />
                  );
                })}
                {(points.length <= 8 || index % 2 === 1) && (
                  <text
                    className="chart-label"
                    x={padding.left + index * groupWidth + groupWidth / 2}
                    y={chartHeight - 8}
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                )}
                <rect
                  className="chart-hit"
                  x={padding.left + index * groupWidth}
                  y={padding.top}
                  width={groupWidth}
                  height={plotHeight}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => setActiveIndex(index)}
                />
              </g>
            );
          })}
        </svg>
        {activePoint && activeIndex !== null && (
          <div
            className="chart-tooltip"
            style={{
              left: `${((padding.left + (activeIndex + 0.5) * groupWidth) / chartWidth) * 100}%`,
            }}
          >
            <strong>{activePoint.label}</strong>
            {series.map((item) => (
              <span key={item.label}>
                <i style={{ background: item.color }} aria-hidden="true" />
                {item.label}: {money(item.value(activePoint))}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Ventas acumuladas del mes (línea) y proyección hasta fin de mes (punteada).
export function ProjectionChart({
  cumulative,
  daysInMonth,
  projectedMinor,
  color,
}: {
  cumulative: { day: number; incomeMinor: number }[];
  daysInMonth: number;
  projectedMinor: number;
  color: string;
}) {
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const { frameRef, chartWidth, plotWidth } = useChartWidth();
  const maximum = niceMaximum(
    Math.max(projectedMinor, ...cumulative.map((point) => point.incomeMinor)),
  );
  const x = (day: number) =>
    padding.left + ((day - 1) / (daysInMonth - 1)) * plotWidth;
  const y = (amountMinor: number) =>
    padding.top + plotHeight * (1 - amountMinor / maximum);
  const last = cumulative[cumulative.length - 1];
  const actualPath = cumulative
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x(point.day)},${y(point.incomeMinor)}`,
    )
    .join("");
  const active = cumulative.find((point) => point.day === activeDay);
  return (
    <div className="chart">
      <div className="chart-legend">
        <span>
          <i style={{ background: color }} aria-hidden="true" />
          Vendido
        </span>
        <span>
          <i
            className="dashed"
            style={{ borderColor: color }}
            aria-hidden="true"
          />
          Proyección
        </span>
      </div>
      <div className="chart-frame" ref={frameRef}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`Ventas acumuladas: ${money(last?.incomeMinor ?? 0)} al día ${last?.day}; proyección ${money(projectedMinor)} al día ${daysInMonth}`}
          onMouseLeave={() => setActiveDay(null)}
        >
          <YAxis maximum={maximum} chartWidth={chartWidth} />
          {last && (
            <line
              x1={x(last.day)}
              y1={y(last.incomeMinor)}
              x2={x(daysInMonth)}
              y2={y(projectedMinor)}
              stroke={color}
              strokeWidth={2}
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
          )}
          <path
            d={actualPath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {last && (
            <>
              <circle
                cx={x(last.day)}
                cy={y(last.incomeMinor)}
                r={5}
                fill={color}
                className="chart-marker"
              />
              <text
                className="chart-value"
                x={x(daysInMonth) - 4}
                y={y(projectedMinor) - 10}
                textAnchor="end"
              >
                {compactMoney(projectedMinor)}
              </text>
            </>
          )}
          {[1, Math.ceil(daysInMonth / 2), daysInMonth].map((day) => (
            <text
              key={day}
              className="chart-label"
              x={x(day)}
              y={chartHeight - 8}
              textAnchor="middle"
            >
              Día {day}
            </text>
          ))}
          {active && (
            <line
              className="chart-crosshair"
              x1={x(active.day)}
              x2={x(active.day)}
              y1={padding.top}
              y2={padding.top + plotHeight}
            />
          )}
          {cumulative.map((point) => (
            <rect
              key={point.day}
              className="chart-hit"
              x={x(point.day) - plotWidth / daysInMonth / 2}
              y={padding.top}
              width={plotWidth / daysInMonth}
              height={plotHeight}
              onMouseEnter={() => setActiveDay(point.day)}
              onClick={() => setActiveDay(point.day)}
            />
          ))}
        </svg>
        {active && (
          <div
            className="chart-tooltip"
            style={{ left: `${(x(active.day) / chartWidth) * 100}%` }}
          >
            <strong>Día {active.day}</strong>
            <span>Acumulado: {money(active.incomeMinor)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Barras horizontales en HTML: etiqueta y valor siempre visibles.
export function RankedBars({
  items,
  color,
}: {
  items: { label: string; amountMinor: number }[];
  color: string;
}) {
  const maximum = Math.max(1, ...items.map((item) => item.amountMinor));
  const total = items.reduce((sum, item) => sum + item.amountMinor, 0);
  if (!items.length)
    return <p className="muted">Sin gastos en los últimos 30 días.</p>;
  return (
    <ul className="ranked-bars">
      {items.map((item) => (
        <li key={item.label}>
          <span className="ranked-label">{item.label}</span>
          <span className="ranked-track" aria-hidden="true">
            <i
              style={{
                width: `${(item.amountMinor / maximum) * 100}%`,
                background: color,
              }}
            />
          </span>
          <span className="ranked-value">
            {money(item.amountMinor)} ·{" "}
            {Math.round((item.amountMinor / total) * 100)} %
          </span>
        </li>
      ))}
    </ul>
  );
}
