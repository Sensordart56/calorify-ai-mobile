export class LocalDateError extends Error {
  public constructor(message: string) { super(message); this.name = 'LocalDateError'; }
}

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function requireLocalDate(value: unknown): string {
  if (typeof value !== 'string' || !localDatePattern.test(value)) throw new LocalDateError('A canonical local date is required.');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new LocalDateError('A real local date is required.');
  return value;
}
