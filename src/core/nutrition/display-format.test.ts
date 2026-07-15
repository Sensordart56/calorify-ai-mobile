import { formatCalories, formatMacroGrams } from './display-format';
test('formats only from scaled values with required precision', () => {
  expect(formatCalories(1_500_000)).toBe('2');
  expect(formatMacroGrams(5_040_000)).toBe('5.0 g');
});
