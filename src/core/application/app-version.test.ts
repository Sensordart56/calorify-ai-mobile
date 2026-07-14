import { ApplicationVersionError, requireApplicationVersion } from './app-version';

describe('application version boundary validation', () => {
  test('accepts a configured non-empty application version', () => {
    expect(requireApplicationVersion('1.0.0')).toBe('1.0.0');
  });

  test.each(['', ' 1.0.0', '1.0.0 ', null, 'x'.repeat(129)])('rejects unavailable or malformed configured versions', (value) => {
    expect(() => requireApplicationVersion(value)).toThrow(ApplicationVersionError);
  });
});
