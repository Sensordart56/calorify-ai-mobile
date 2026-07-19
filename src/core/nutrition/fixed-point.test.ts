import { checkedAdd, checkedMultiplyDivide, checkedMultiplyDivideHalfUp, checkedPercentageHalfUp, FIXED_POINT_SCALE, FixedPointError, scaleDecimal, unscaleDecimal } from './fixed-point';

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

  test('cross-cancels and rounds derived values safely', () => {
    expect(checkedMultiplyDivideHalfUp(100_000_000, 100_000_000, 100_000_000)).toBe(100_000_000);
    expect(checkedMultiplyDivideHalfUp(1_000_000, 1, 1_000)).toBe(1_000);
    expect(checkedMultiplyDivideHalfUp(1_000_000, 1_000, 1)).toBe(1_000_000_000);
    expect(checkedMultiplyDivideHalfUp(1, 1, 3)).toBe(0);
    expect(checkedMultiplyDivideHalfUp(1, 1, 2)).toBe(1);
    expect(checkedMultiplyDivideHalfUp(2, 1, 3)).toBe(1);
    expect(checkedMultiplyDivideHalfUp(0, Number.MAX_SAFE_INTEGER, 1)).toBe(0);
    expect(() => checkedMultiplyDivideHalfUp(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 2)).toThrow(FixedPointError);
  });

  test('calculates capped half-up percentages without unsafe multiplication', () => {
    expect(checkedPercentageHalfUp(0, 10)).toBe(0);
    expect(checkedPercentageHalfUp(1, 3)).toBe(33);
    expect(checkedPercentageHalfUp(1, 8)).toBe(13);
    expect(checkedPercentageHalfUp(10, 10)).toBe(100);
    expect(checkedPercentageHalfUp(11, 10)).toBe(100);
    expect(checkedPercentageHalfUp(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER)).toBe(100);
    expect(checkedPercentageHalfUp(1, 0)).toBeNull();
    expect(() => checkedPercentageHalfUp(-1, 10)).toThrow(FixedPointError);
  });
});
