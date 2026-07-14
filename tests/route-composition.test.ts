import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const routeFiles = [
  '(app)/(tabs)/index.tsx',
  '(app)/(tabs)/log.tsx',
  '(app)/(tabs)/history.tsx',
  '(app)/(tabs)/settings.tsx',
  '(app)/review.tsx',
  '(app)/manual-entry.tsx',
  '(app)/goals.tsx',
  '(app)/food-library.tsx',
  '(app)/models.tsx',
  '(app)/about-data-sources.tsx',
] as const;

describe('route composition', () => {
  test('keeps Phase 1 route components to imports and screen exports', () => {
    for (const routeFile of routeFiles) {
      const source = readFileSync(join(process.cwd(), 'src', 'app', routeFile), 'utf8').trim();
      expect(source).toMatch(/^import .*;\r?\n\r?\nexport default [A-Za-z]+;$/);
    }
  });
});
