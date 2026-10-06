// Datumhjälp för svenska kalenderdatum (YYYY-MM-DD). Fristående från generatorn
// så att klientkod kan använda den utan att dra in städer och aktiviteter.

export function daysBetween(fromIso: string, toIso: string): number {
  const ms =
    Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
