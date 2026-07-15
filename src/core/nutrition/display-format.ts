import { FIXED_POINT_SCALE, checkedMultiplyDivideHalfUp } from './fixed-point';

function formatRounded(value: number, divisor: number, decimals: number): string {
  const rounded = checkedMultiplyDivideHalfUp(value, 1, divisor);
  if (decimals === 0) return String(rounded);
  const whole = Math.floor(rounded / 10);
  return `${whole}.${String(rounded % 10)}`;
}

export function formatCalories(valueScaled: number): string {
  return formatRounded(valueScaled, FIXED_POINT_SCALE, 0);
}

export function formatMacroGrams(valueScaled: number): string {
  return `${formatRounded(valueScaled, 100_000, 1)} g`;
}
