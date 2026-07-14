import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const appRoot = join(process.cwd(), 'src', 'app');
const rootLayout = readFileSync(join(appRoot, '_layout.tsx'), 'utf8');
const productLayout = readFileSync(join(appRoot, '(app)', '_layout.tsx'), 'utf8');

describe('Phase 2 database route boundary', () => {
  test('always mounts the root Stack without opening or gating the production database', () => {
    expect(rootLayout).toContain('<Stack screenOptions={{ headerShown: false }}>');
    expect(rootLayout).toContain('<Stack.Screen name="(app)" />');
    expect(rootLayout).toContain('<Stack.Screen name="database-verification" />');
    expect(rootLayout).toContain('<Stack.Screen name="+not-found" />');
    expect(rootLayout).not.toMatch(/usePathname|DatabaseInitializationGate|openExpoDatabase|calorify\.db/);
  });

  test('keeps the verification and not-found routes outside the gated product group', () => {
    expect(existsSync(join(appRoot, 'database-verification.tsx'))).toBe(true);
    expect(existsSync(join(appRoot, '+not-found.tsx'))).toBe(true);
    expect(existsSync(join(appRoot, '(app)', 'database-verification.tsx'))).toBe(false);
    expect(existsSync(join(appRoot, '(app)', '+not-found.tsx'))).toBe(false);
  });

  test('wraps only the product navigator in the database gate', () => {
    expect(productLayout).toContain('<DatabaseInitializationGate>');
    expect(productLayout).toContain('<Stack.Screen name="(tabs)" />');
    expect(productLayout).toContain('<Stack.Screen name="review"');
    expect(productLayout).toContain('<Stack.Screen name="about-data-sources"');
    expect(productLayout).not.toMatch(/database-verification|\+not-found/);
  });

  test('a failing product gate cannot structurally block the root verification route', () => {
    const verificationScreen = '<Stack.Screen name="database-verification" />';
    expect(rootLayout.indexOf(verificationScreen)).toBeGreaterThan(rootLayout.indexOf('<Stack'));
    expect(rootLayout).not.toContain('DatabaseInitializationGate');
    expect(productLayout).toContain('DatabaseInitializationGate');
  });

  test('keeps product files in the pathless group so public destinations are unchanged', () => {
    for (const route of ['review', 'manual-entry', 'goals', 'food-library', 'models', 'about-data-sources']) {
      expect(existsSync(join(appRoot, '(app)', `${route}.tsx`))).toBe(true);
      expect(existsSync(join(appRoot, `${route}.tsx`))).toBe(false);
    }
    for (const tab of ['index', 'log', 'history', 'settings']) {
      expect(existsSync(join(appRoot, '(app)', '(tabs)', `${tab}.tsx`))).toBe(true);
      expect(existsSync(join(appRoot, '(tabs)', `${tab}.tsx`))).toBe(false);
    }
  });
});
