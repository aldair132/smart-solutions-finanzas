// Calendario compartido de la demo: el día cambia a medianoche de Lima.
export const businessTimeZone = "America/Lima";
export const businessOffset = "-05:00";

export function getBusinessDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function getBusinessDateTime(now = new Date()) {
  const time = new Intl.DateTimeFormat("es-PE", {
    timeZone: businessTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return `${getBusinessDay(now)}T${time}`;
}

export function getBusinessTimestamp(now = new Date()) {
  return `${getBusinessDateTime(now)}:00${businessOffset}`;
}

export function isValidBusinessDay(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(Date.parse(`${day}T12:00:00${businessOffset}`)) &&
    getBusinessDay(new Date(`${day}T12:00:00${businessOffset}`)) === day;
}

export function shiftBusinessTimestamp(value: string, fromDay: string, toDay: string) {
  const offsetDays = Math.round(
    (Date.parse(`${toDay}T12:00:00Z`) - Date.parse(`${fromDay}T12:00:00Z`)) / 86_400_000,
  );
  const shifted = new Date(Date.parse(value) + offsetDays * 86_400_000);
  return `${getBusinessDay(shifted)}${value.slice(10)}`;
}
