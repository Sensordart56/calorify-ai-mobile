import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MANUAL_LOGGING_VERIFICATION_CASE_IDS } from './manual-logging-verification';

describe('Phase 3 manual logging verification authority', () => {
  test('uses exactly the approved serial case IDs', () => {
    expect(MANUAL_LOGGING_VERIFICATION_CASE_IDS).toEqual([
      'migration-001-upgrade', 'migration-002-rollback', 'meal-create-and-integrity', 'meal-transaction-rollback', 'goal-and-today-queries',
    ]);
  });

  test('keeps disposable authority literal and excludes production and Phase 2 database names', () => {
    const source = readFileSync(join(process.cwd(), 'src/features/shell/database/manual-logging-verification.ts'), 'utf8');
    expect(source).toContain('DISPOSABLE_PHASE_THREE_DATABASE');
    expect(source).not.toContain('calorify.db');
    expect(source).not.toContain('calorify-phase2');
  });
});
