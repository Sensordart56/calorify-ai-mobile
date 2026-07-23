import { buildFtsPrefixExpression, normalizeFoodText } from './food-resolution';

describe('lexical food normalization', () => {
  test.each([
    ['  CRÈME—BRÛLÉE  ', 'crème brûlée'],
    ["O’Brien's   oats", 'o brien s oats'],
    ['Ａｐｐｌｅ\u0000 raw', 'apple raw'],
  ])('normalizes %p deterministically', (input, expected) => expect(normalizeFoodText(input)).toBe(expected));

  test('rejects empty input and builds a quoted prefix expression', () => {
    expect(() => normalizeFoodText('---')).toThrow('Food search is invalid.');
    expect(buildFtsPrefixExpression('green apple')).toBe('"green"* AND "apple"*');
  });
});
