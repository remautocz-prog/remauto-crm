export function defaultAppointmentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultAppointmentTime(): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const roundedMinutes = minutes < 30 ? 30 : 0;
  const roundedHours = minutes < 30 ? hours : hours + 1;
  const hh = String(Math.min(roundedHours, 23)).padStart(2, "0");
  const mm = String(roundedMinutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function parseMoneyInput(value: string): number {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function monthBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
