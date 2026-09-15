// Date-only values: rearrange components without local-timezone conversion.
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[2]}-${match[3]}-${match[1]}` : "—";
}

export function parseDisplayDate(value: string): string | undefined {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return undefined;
  const iso = `${match[3]}-${match[1]}-${match[2]}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === iso
    ? iso
    : undefined;
}
