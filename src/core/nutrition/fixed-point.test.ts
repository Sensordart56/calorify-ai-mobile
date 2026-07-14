import { checkedAdd, checkedMultiplyDivide, FIXED_POINT_SCALE, FixedPointError, scaleDecimal, unscaleDecimal } from './fixed-point';

describe('fixed-point nutrition values', () => {
  test('round-trips canonical decimals at the approved scale', () => {
    expect(scaleDecimal('12.345678')).toBe(12 * FIXED_POINT_SCALE + 345_678);
    expect(unscaleDecimal(12 * FIXED_POINT_SCALE + 345_678)).toBe('12.345678');
    expect(unscaleDecimal(scaleDecimal('12.340000'))).toBe('12.34');
  });

  test('rejects precision and unsafe values rather than rounding', () => {
    expect(() => scaleDecimal('1.0000001')).toThrow(FixedPointError);
    expect(() => scaleDecimal('9007199255')).toThrow(FixedPointError);
  });

  test('checks addition and multiplication boundaries', () => {
    expect(checkedAdd(1, 2)).toBe(3);
    expect(() => checkedAdd(Number.MAX_SAFE_INTEGER, 1)).toThrow(FixedPointError);
    expect(checkedMultiplyDivide(2_000_000, 3, 3)).toBe(2_000_000);
    expect(() => checkedMultiplyDivide(Number.MAX_SAFE_INTEGER, 2, 1)).toThrow(FixedPointError);
    expect(() => checkedMultiplyDivide(1, 1, 2)).toThrow(FixedPointError);
  });
});
