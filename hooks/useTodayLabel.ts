"use client";

import { useCurrentDay } from "./useCurrentDay";

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "numeric",
  month: "short",
});

export function useTodayLabel() {
  const today = useCurrentDay();
  return today
    ? `Hoy · ${dateFormatter.format(new Date(`${today}T12:00:00-05:00`))}`
    : "Hoy";
}
