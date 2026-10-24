"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Dialog.module.css";
export function Dialog({
  title,
  children,
  onClose,
  dirty = false,
  size = "default",
  className = "",
  description,
  role = "dialog",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  dirty?: boolean;
  // "large": ancho cómodo en escritorio y pantalla completa en el celular.
  size?: "default" | "large";
  className?: string;
  description?: string;
  role?: "dialog" | "alertdialog";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = `${titleId}-description`;
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  function requestClose() {
    if (dirty) setIsDiscardOpen(true);
    else onClose();
  }
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={[size === "large" ? "dialog-large" : "", className]
        .filter(Boolean)
        .join(" ")}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        requestClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      role={role}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Cerrar"
          onClick={requestClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {description && <p id={descriptionId} className="muted">{description}</p>}
      {children}
      {isDiscardOpen && (
        <Dialog
          title="¿Descartar los cambios?"
          description="Tienes cambios sin guardar. Si sales ahora, se perderán."
          role="alertdialog"
          className={styles.message}
          onClose={() => setIsDiscardOpen(false)}
        >
          <div className="dialog-actions">
            <button type="button" autoFocus className="button outline" onClick={() => setIsDiscardOpen(false)}>
              Seguir editando
            </button>
            <button type="button" className="button primary" onClick={onClose}>
              Descartar y salir
            </button>
          </div>
        </Dialog>
      )}
    </dialog>
  );
}
