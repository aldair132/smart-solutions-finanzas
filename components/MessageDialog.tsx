"use client";

import { useState } from "react";
import { Dialog } from "./Dialog";
import styles from "./Dialog.module.css";

export function MessageDialog({
  message,
  tone = "info",
  onClose,
}: {
  message: string;
  tone?: "info" | "error";
  onClose?: () => void;
}) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  function closeMessage() {
    setDismissedMessage(message);
    onClose?.();
  }
  if (!message || dismissedMessage === message) return null;
  return (
    <Dialog
      title={tone === "error" ? "Revisa lo que ocurrió" : "Información"}
      description={message}
      role={tone === "error" ? "alertdialog" : "dialog"}
      className={styles.message}
      onClose={closeMessage}
    >
      <div className="dialog-actions">
        <button type="button" autoFocus className="button primary" onClick={closeMessage}>
          Entendido
        </button>
      </div>
    </Dialog>
  );
}
