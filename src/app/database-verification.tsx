import { useState } from 'react';

import { RecoveryVerification } from '@/features/shell/database/recovery-verification';
import { ActionButton } from '@/shared/ui/action-button';
import { ErrorState, LoadingState } from '@/shared/ui/state-panels';
import { Screen } from '@/shared/ui/screen';
import { runDatabaseVerification, type VerificationResult } from '@/features/shell/database/database-verification';

export default function DatabaseVerificationRoute() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<readonly VerificationResult[] | null>(null);
  const [recoveryVerification, setRecoveryVerification] = useState(false);

  if (!__DEV__) {
    return <Screen title="Page not found" description="This route is not part of the production application." />;
  }

  if (recoveryVerification) {
    return <RecoveryVerification onReturn={() => setRecoveryVerification(false)} />;
  }

  async function runAll(): Promise<void> {
    setRunning(true);
    setResults(await runDatabaseVerification());
    setRunning(false);
  }

  return (
    <Screen title="Database verification" description="Development-only checks using a disposable database.">
      <LoadingState title="Disposable test database" body="The production database is never opened or reset here." />
      <ActionButton label="Run all cases" disabled={running} onPress={() => void runAll()} />
      <ActionButton label="Verify recovery and Retry" disabled={running} onPress={() => setRecoveryVerification(true)} />
      {results?.map((result) => (
        <ErrorState key={result.id} title={result.id} body={result.passed ? 'Passed' : `Failed: ${result.category ?? 'database'}`} />
      ))}
    </Screen>
  );
}
