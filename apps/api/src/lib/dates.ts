/** Calendar date (YYYY-MM-DD) of `date` as observed in `timeZone`. */
export function dayKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Pure calendar arithmetic on YYYY-MM-DD keys (timezone-independent). */
export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysSinceEpoch(key: string): number {
  return Math.floor(new Date(`${key}T00:00:00.000Z`).getTime() / 86_400_000);
}

export function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
