"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { displayDate, money } from "@/lib/finance";
import { demoDate } from "@/lib/mockData";
import {
  getDaysOpen,
  getReceivableBalance,
  selectReceivables,
  summarizeReceivables,
} from "@/lib/receivables";
import type { Receivable } from "@/lib/types";
import { useDemo } from "./DemoProvider";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";

function parseAmountMinor(amount: string) {
  const normalizedAmount = amount.replace(",", ".").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) return null;
  const amountMinor = Math.round(Number(normalizedAmount) * 100);
  return amountMinor > 0 ? amountMinor : null;
}

export function ReceivablesView({ spaceId }: { spaceId: string }) {
  const { spaces, receivables, addReceivables, collectReceivable } = useDemo();
  const [collecting, setCollecting] = useState<Receivable | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const space = spaces.find((item) => item.id === spaceId);
  if (!space) return null;
  if (space.type === "personal")
    return (
      <section className="credit-empty">
        <h1>Fiados</h1>
        <p className="subtitle">
          Los fiados se registran en cada negocio, no en la cuenta personal.
        </p>
      </section>
    );
  const spaceReceivables = selectReceivables(receivables, space.id);
  const pending = spaceReceivables.filter(
    (receivable) => getReceivableBalance(receivable) > 0,
  );
  const collected = spaceReceivables.filter(
    (receivable) => getReceivableBalance(receivable) === 0,
  );
  const summary = summarizeReceivables(spaceReceivables);
  return (
    <>
      <div className="view-heading">
        <p className="eyebrow">LO QUE TE DEBEN</p>
        <h1>Fiados</h1>
        <p className="subtitle">
          Dilo por voz: «Le fié 15 soles a doña Carmen» o «Don Julio me pagó
          10». La IA lo anota aquí.
        </p>
      </div>
      <section className="receivable-summary">
        <div>
          <span>Por cobrar</span>
          <strong>{money(summary.pendingMinor)}</strong>
          <small>
            {summary.pendingCount} cliente
            {summary.pendingCount === 1 ? "" : "s"}
          </small>
        </div>
        <div>
          <span>Ya cobrado</span>
          <strong>{summary.collectionRatePercent} %</strong>
          <small>de lo que fiaste</small>
        </div>
        <div>
          <span>Más antiguo</span>
          <strong>{summary.oldestPendingDays} días</strong>
          <small>sin pagar</small>
        </div>
      </section>
      <div className="section-heading">
        <h2>Pendientes</h2>
        <button className="button outline" onClick={() => setIsAdding(true)}>
          <Icon name="plus" />
          Anotar fiado
        </button>
      </div>
      <p role="status" className="status-message">
        {notice}
      </p>
      {!pending.length && (
        <div className="empty-state">
          <Icon name="check" />
          <h3>Nadie te debe</h3>
          <p>Cuando fíes, aparecerá aquí.</p>
        </div>
      )}
      <div className="movement-list">
        {pending.map((receivable) => (
          <div className="receivable-row" key={receivable.id}>
            <div>
              <strong>{receivable.customer}</strong>
              <small>
                {receivable.description} · hace {getDaysOpen(receivable)} días
                {receivable.paidMinor > 0 &&
                  ` · abonó ${money(receivable.paidMinor)}`}
              </small>
            </div>
            <strong className="negative">
              {money(getReceivableBalance(receivable))}
            </strong>
            <button
              className="button primary"
              onClick={() => setCollecting(receivable)}
            >
              Cobrar
            </button>
          </div>
        ))}
      </div>
      {collected.length > 0 && (
        <>
          <div className="section-heading">
            <h2>Cobrados</h2>
            <span className="count-label">{collected.length}</span>
          </div>
          <div className="movement-list">
            {collected.map((receivable) => (
              <div className="receivable-row paid" key={receivable.id}>
                <div>
                  <strong>{receivable.customer}</strong>
                  <small>
                    {receivable.description}
                    {receivable.paidAt &&
                      ` · pagó el ${displayDate(receivable.paidAt)}`}
                  </small>
                </div>
                <strong className="positive">
                  {money(receivable.amountMinor)}
                </strong>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="muted small">
        Los fiados no suman a tus ventas hasta que los cobras; cada cobro entra
        como venta en{" "}
        <Link href={`/espacios/${space.id}/movimientos`}>Movimientos</Link>.
      </p>
      {collecting && (
        <CollectDialog
          receivable={collecting}
          onClose={() => setCollecting(null)}
          onConfirm={(amountMinor) => {
            collectReceivable({
              receivableId: collecting.id,
              amountMinor,
              occurredAt: `${demoDate}T13:00:00-05:00`,
              source: "text",
            });
            setNotice(`Cobro de ${money(amountMinor)} registrado.`);
            setCollecting(null);
          }}
        />
      )}
      {isAdding && (
        <NewReceivableDialog
          onClose={() => setIsAdding(false)}
          onConfirm={(input) => {
            addReceivables([
              {
                ...input,
                spaceId: space.id,
                createdAt: `${demoDate}T13:00:00-05:00`,
              },
            ]);
            setNotice(`Fiado a ${input.customer} anotado.`);
            setIsAdding(false);
          }}
        />
      )}
    </>
  );
}

function CollectDialog({
  receivable,
  onClose,
  onConfirm,
}: {
  receivable: Receivable;
  onClose: () => void;
  onConfirm: (amountMinor: number) => void;
}) {
  const balanceMinor = getReceivableBalance(receivable);
  const [amount, setAmount] = useState(String(balanceMinor / 100));
  const [error, setError] = useState("");
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const amountMinor = parseAmountMinor(amount);
    event.preventDefault();
    if (!amountMinor || amountMinor > balanceMinor) {
      setError(`Escribe un importe entre S/ 0.01 y ${money(balanceMinor)}.`);
      return;
    }
    onConfirm(amountMinor);
  }
  return (
    <Dialog title={`Cobrar a ${receivable.customer}`} onClose={onClose}>
      <p className="dialog-space">Debe {money(balanceMinor)}</p>
      <form onSubmit={handleSubmit}>
        <label>
          ¿Cuánto te pagó? (S/)
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary">Registrar cobro</button>
      </form>
    </Dialog>
  );
}

function NewReceivableDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (input: {
    customer: string;
    description: string;
    amountMinor: number;
  }) => void;
}) {
  const [customer, setCustomer] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const amountMinor = parseAmountMinor(amount);
    event.preventDefault();
    if (!customer.trim() || !amountMinor) {
      setError("Indica el cliente y un importe válido.");
      return;
    }
    onConfirm({ customer, description, amountMinor });
  }
  return (
    <Dialog
      title="Anotar fiado"
      onClose={onClose}
      dirty={Boolean(customer || amount)}
    >
      <form onSubmit={handleSubmit}>
        <label>
          Cliente
          <input
            required
            maxLength={60}
            value={customer}
            onChange={(event) => setCustomer(event.target.value)}
            placeholder="Ej.: Sra. Carmen"
          />
        </label>
        <label>
          ¿Qué se llevó?
          <input
            maxLength={120}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ej.: Arroz y aceite"
          />
        </label>
        <label>
          Importe (S/)
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary">Guardar fiado</button>
      </form>
    </Dialog>
  );
}
