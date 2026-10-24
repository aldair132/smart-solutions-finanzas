"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDemo } from "./DemoProvider";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { WelcomeGuide } from "./WelcomeGuide";
import { money, selectMovements, totals } from "@/lib/finance";
import { useTodayLabel } from "@/hooks/useTodayLabel";

export function Overview() {
  const { spaces, movements, user, updateSpace } = useDemo();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const todayLabel = useTodayLabel();
  const summary = totals(selectMovements(movements, undefined, "today"));
  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const id = updateSpace(name);
      setIsAdding(false);
      router.push(`/espacios/${id}`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo crear el negocio.",
      );
    }
  }
  return (
    <main className="overview page">
      <div className="welcome">
        <div>
          <p className="eyebrow">TODO EMPIEZA CON UN PEQUEÑO PASO</p>
          <h1>
            Hola, {user.fullName.split(" ")[0]}
            <span className="greeting-dot">.</span>
          </h1>
          <p className="subtitle">
            Tus negocios y tus finanzas, en un solo lugar.
          </p>
        </div>
        <div className="date-pill">
          <Icon name="calendar" />
          {todayLabel}
        </div>
      </div>
      <WelcomeGuide />
      <div className="overview-grid">
        <section>
          <div className="section-heading">
            <h2>Mis espacios</h2>
            <span className="count-label">{spaces.length} espacios</span>
          </div>
          <div className="space-list">
            {spaces.map((space) => {
              const summary = totals(
                selectMovements(movements, space.id, "today"),
              );
              return (
                <Link
                  href={`/espacios/${space.id}`}
                  className={`space-card ${space.type}`}
                  key={space.id}
                >
                  <div className="space-card-heading">
                    <span
                      className={`space-emoji ${space.id === "comida" ? "peach" : ""}`}
                      aria-hidden="true"
                    >
                      {space.type === "personal" ? "👛" : "🏪"}
                    </span>
                    <div>
                      <span className="card-kicker">
                        {space.type === "personal"
                          ? "TU DÍA A DÍA"
                          : "MI NEGOCIO"}
                      </span>
                      <h3>{space.name}</h3>
                    </div>
                    <Icon name="arrow" />
                  </div>
                  <div
                    className={`card-stats ${space.type === "personal" ? "personal-stats" : ""}`}
                  >
                    {space.type === "business" && (
                      <div>
                        <span>Ventas</span>
                        <strong>{money(summary.income)}</strong>
                      </div>
                    )}
                    <div>
                      <span>Gastos</span>
                      <strong>{money(summary.expense)}</strong>
                    </div>
                    {space.type === "business" && (
                      <div>
                        <span>Resultado</span>
                        <strong
                          className={
                            summary.result < 0 ? "negative" : "positive"
                          }
                        >
                          {money(summary.result)}
                        </strong>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          <button
            className="button outline add-business"
            onClick={() => {
              setName("");
              setError("");
              setIsAdding(true);
            }}
          >
            <Icon name="plus" />
            Agregar negocio
          </button>
        </section>
        <aside className="overview-aside">
          <section className="consolidated">
            <div className="summary-icon">
              <Icon name="chart" />
            </div>
            <p>Resultado general</p>
            <strong className="grand-total">{money(summary.result)}</strong>
            <span className="result-caption">
              {summary.result < 0
                ? "Resultado registrado negativo"
                : "Cada registro cuenta"}
            </span>
            <div className="summary-breakdown">
              <div>
                <span>Ventas</span>
                <strong>{money(summary.income)}</strong>
              </div>
              <div>
                <span>Gastos</span>
                <strong>{money(summary.expense)}</strong>
              </div>
            </div>
            <p className="summary-foot">Según tus registros de hoy</p>
          </section>
          <div className="gentle-note">
            <span>✧</span>
            <p>
              Un poco de orden hoy.
              <br />
              <strong>Más claridad para mañana.</strong>
            </p>
          </div>
        </aside>
      </div>
      <p className="demo-note">
        Datos de ejemplo · Tus cambios se guardan en este dispositivo.
      </p>
      {isAdding && (
        <Dialog
          title="Agregar negocio"
          onClose={() => setIsAdding(false)}
          dirty={Boolean(name)}
        >
          <p className="muted">
            Crea un negocio de demostración. Moneda: soles (PEN).
          </p>
          <form onSubmit={handleCreate}>
            <label>
              Nombre del negocio
              <input
                autoFocus
                required
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Mi tienda"
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="button primary" type="submit">
              Crear negocio
            </button>
          </form>
        </Dialog>
      )}
    </main>
  );
}
