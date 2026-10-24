"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
export function Dialog({
  title,
  children,
  onClose,
  dirty = false,
  size = "default",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  dirty?: boolean;
  // "large": ancho cómodo en escritorio y pantalla completa en el celular.
  size?: "default" | "large";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  function requestClose() {
    if (!dirty || window.confirm("¿Descartar los cambios sin guardar?"))
      onClose();
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
      className={size === "large" ? "dialog-large" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Cerrar"
          onClick={requestClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
