import { requireLocalDate } from './local-date';
test('validates local dates', () => { expect(requireLocalDate('2024-02-29')).toBe('2024-02-29'); expect(() => requireLocalDate('2023-02-29')).toThrow(); });
