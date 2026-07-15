import { useState } from 'react';
import { ActionButton } from '@/shared/ui/action-button';
import { ErrorState, LoadingState } from '@/shared/ui/state-panels';
import { Screen } from '@/shared/ui/screen';
import { runManualLoggingVerification, type ManualLoggingVerificationResult } from '@/features/shell/database/manual-logging-verification';

export default function ManualLoggingVerificationRoute() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<readonly ManualLoggingVerificationResult[] | null>(null);
  if (!__DEV__) return <Screen title="Page not found" description="This route is not part of the production application." />;
  async function runAll(): Promise<void> { setRunning(true); setResults(await runManualLoggingVerification()); setRunning(false); }
  return <Screen title="Manual logging verification" description="Development-only checks using a disposable database.">
    <LoadingState title="Disposable test database" body="The production database is never opened or reset here." />
    <ActionButton label="Run all cases" disabled={running} onPress={() => void runAll()} />
    {results?.map((result) => <ErrorState key={result.id} title={result.id} body={result.passed ? 'Passed' : `Failed: ${result.category ?? 'database'}`} />)}
  </Screen>;
}
