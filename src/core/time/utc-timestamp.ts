export class UtcTimestampError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'UtcTimestampError';
  }
}

const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export function requireUtcTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !UTC_TIMESTAMP_PATTERN.test(value)) {
    throw new UtcTimestampError('A canonical UTC RFC 3339 timestamp is required.');
  }
  const milliseconds = Date.parse(value);
  const expectedRoundTrip = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== expectedRoundTrip) {
    throw new UtcTimestampError('A real canonical UTC RFC 3339 timestamp is required.');
  }
  return value;
}
