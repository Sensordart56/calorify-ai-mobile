import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const routeFiles = [
  '(tabs)/index.tsx',
  '(tabs)/log.tsx',
  '(tabs)/history.tsx',
  '(tabs)/settings.tsx',
  'review.tsx',
  'manual-entry.tsx',
  'goals.tsx',
  'food-library.tsx',
  'models.tsx',
  'about-data-sources.tsx',
] as const;

describe('route composition', () => {
  test('keeps Phase 1 route components to imports and screen exports', () => {
    for (const routeFile of routeFiles) {
      const source = readFileSync(join(process.cwd(), 'src', 'app', routeFile), 'utf8').trim();
      expect(source).toMatch(/^import .*;\r?\n\r?\nexport default [A-Za-z]+;$/);
    }
  });
});
