import type { ResolutionMethod } from '@/core/domain/manual-logging';
import type { FoodListItem } from '@/core/application/manual-logging-ports';

export type LexicalResolutionMethod = Extract<ResolutionMethod, 'exact' | 'alias' | 'fts'>;
export type FoodResolutionCandidate = Readonly<{
  food: FoodListItem;
  method: LexicalResolutionMethod;
  matchedText: string;
}>;

export type FoodResolution =
  | Readonly<{ kind: 'automatic'; normalizedInput: string; candidate: FoodResolutionCandidate }>
  | Readonly<{ kind: 'review'; normalizedInput: string; candidates: readonly FoodResolutionCandidate[] }>
  | Readonly<{ kind: 'unresolved'; normalizedInput: string }>;

export function normalizeFoodText(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ')
    .replace(/[\p{P}\p{Z}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ');
  if (normalized.length < 1 || normalized.length > 256) throw new Error('Food search is invalid.');
  return normalized;
}

export function buildFtsPrefixExpression(normalizedInput: string): string {
  return normalizedInput.split(' ').filter(Boolean).map((token) => `"${token.replace(/"/gu, '""')}"*`).join(' AND ');
}
