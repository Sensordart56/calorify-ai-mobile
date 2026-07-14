import { requireUtcTimestamp, UtcTimestampError } from './utc-timestamp';

describe('UTC timestamp boundary validation', () => {
  test.each(['2024-02-29T23:59:59Z', '2024-02-29T23:59:59.123Z', '2026-07-15T00:00:00Z', '2026-07-15T00:00:00.000Z'])('accepts canonical UTC timestamps', (value) => {
    expect(requireUtcTimestamp(value)).toBe(value);
  });

  test.each([
    '',
    '2026-07-15 00:00:00Z',
    '2026-07-15T00:00:00+05:30',
    '2026-07-15T00:00Z',
    '2023-02-29T00:00:00Z',
    '2024-02-30T00:00:00Z',
    '2026-13-01T00:00:00Z',
    '2026-00-01T00:00:00Z',
    '2026-07-15T24:00:00Z',
    '2026-07-15T23:60:00Z',
    '2026-07-15T23:59:60Z',
    null,
  ])('rejects non-canonical or impossible timestamps', (value) => {
    expect(() => requireUtcTimestamp(value)).toThrow(UtcTimestampError);
  });
});
