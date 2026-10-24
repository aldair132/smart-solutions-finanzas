"use client";

import Link from "next/link";
import { useState } from "react";
import type { Space } from "@/lib/types";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import styles from "./SpaceSelector.module.css";

export function SpaceSelector({
  spaces,
  selectedSpace,
  onSelect,
}: {
  spaces: Space[];
  selectedSpace: Space;
  onSelect: (spaceId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(spaceId: string) {
    setIsOpen(false);
    if (spaceId !== selectedSpace.id) onSelect(spaceId);
  }

  return (
    <>
      <button
        type="button"
        className="space-selector"
        aria-label={`Cambiar espacio: ${selectedSpace.name}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <span className="selector-emoji" aria-hidden="true">
          {selectedSpace.type === "personal" ? "👛" : "🏪"}
        </span>
        <span className="selector-name">{selectedSpace.name}</span>
        <Icon name="arrow" className="selector-chevron" />
      </button>
      {isOpen && (
        <Dialog
          title="Cambiar espacio"
          className={styles.modal}
          onClose={() => setIsOpen(false)}
        >
          <ul className={styles.list} aria-label="Tus espacios">
            {spaces.map((space) => {
              const isSelected = space.id === selectedSpace.id;

              return (
                <li key={space.id}>
                  <button
                    type="button"
                    className={`${styles.option} ${isSelected ? styles.selected : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => handleSelect(space.id)}
                  >
                    <span className={styles.emoji} aria-hidden="true">
                      {space.type === "personal" ? "👛" : "🏪"}
                    </span>
                    <span className={styles.copy}>
                      <strong>{space.name}</strong>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={styles.footer}>
            <Link
              className="button outline"
              href="/"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="home" />
              Ver todos mis espacios
            </Link>
          </div>
        </Dialog>
      )}
    </>
  );
}
