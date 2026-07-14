export const FIXED_POINT_SCALE = 1_000_000;
export const MAX_SAFE_SCALED_VALUE = Number.MAX_SAFE_INTEGER;

export class FixedPointError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'FixedPointError';
  }
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_SAFE_SCALED_VALUE) {
    throw new FixedPointError(`${label} is outside the supported fixed-point range.`);
  }
}

function parseDecimal(value: string): readonly [string, string] {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new FixedPointError('A non-negative canonical decimal string is required.');
  }

  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > 6) {
    throw new FixedPointError('More than six fractional digits requires an approved rounding policy.');
  }

  return [whole, fraction];
}

export function scaleDecimal(value: string): number {
  const [whole, fraction] = parseDecimal(value);
  const wholeValue = Number(whole);
  if (!Number.isSafeInteger(wholeValue)) {
    throw new FixedPointError('The decimal whole component is unsafe.');
  }

  const fractionValue = Number((fraction + '000000').slice(0, 6));
  const scaled = wholeValue * FIXED_POINT_SCALE + fractionValue;
  assertSafeInteger(scaled, 'Scaled value');
  return scaled;
}

export function unscaleDecimal(value: number): string {
  assertSafeInteger(value, 'Scaled value');
  const whole = Math.floor(value / FIXED_POINT_SCALE);
  const fraction = String(value % FIXED_POINT_SCALE).padStart(6, '0').replace(/0+$/, '');
  return fraction.length === 0 ? String(whole) : `${whole}.${fraction}`;
}

export function checkedAdd(left: number, right: number): number {
  assertSafeInteger(left, 'Left operand');
  assertSafeInteger(right, 'Right operand');
  if (left > MAX_SAFE_SCALED_VALUE - right) {
    throw new FixedPointError('Fixed-point addition would overflow.');
  }
  return left + right;
}

export function checkedMultiplyDivide(value: number, multiplier: number, divisor: number): number {
  assertSafeInteger(value, 'Value');
  assertSafeInteger(multiplier, 'Multiplier');
  if (!Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new FixedPointError('A positive safe-integer divisor is required.');
  }
  if (value !== 0 && multiplier > Math.floor(MAX_SAFE_SCALED_VALUE / value)) {
    throw new FixedPointError('Fixed-point multiplication would overflow.');
  }
  const product = value * multiplier;
  if (product % divisor !== 0) {
    throw new FixedPointError('The operation requires rounding, which is not approved.');
  }
  return product / divisor;
}
