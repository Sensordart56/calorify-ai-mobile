import { useCallback, useEffect, useRef, useState } from 'react';

import type { DatabaseConnection } from '@/core/database/contracts';
import { DatabaseInitializationError, type DatabaseInitializationError as DatabaseInitializationFailure } from '@/core/database/errors';
import { resolveConfiguredApplicationVersion } from '@/data/expo-application-version';
import { initializeDatabase, type DatabaseInitializationStep } from '@/data/sqlite/migration-runner';
import { DISPOSABLE_RECOVERY_DATABASE, resetDisposableDevelopmentDatabase } from '@/data/sqlite/expo-sqlite-database';
import { ActionButton } from '@/shared/ui/action-button';
import { ErrorState, LoadingState } from '@/shared/ui/state-panels';
import { Screen } from '@/shared/ui/screen';
import { DatabaseInitializationGate } from './database-initialization-gate';

async function defaultResetRecoveryDatabase(): Promise<void> {
  await resetDisposableDevelopmentDatabase(DISPOSABLE_RECOVERY_DATABASE);
}

export function RecoveryVerification({
  onReturn,
  resetRecoveryDatabase = defaultResetRecoveryDatabase,
}: {
  readonly onReturn: () => void;
  readonly resetRecoveryDatabase?: () => Promise<void>;
}) {
  const failOnce = useRef(true);
  const releaseConnection = useRef<(() => Promise<void>) | null>(null);
  const initializationStep = useRef<DatabaseInitializationStep | 'opening' | 'intentional-injected'>('opening');
  const [prepared, setPrepared] = useState(false);
  const [cleanupFailed, setCleanupFailed] = useState(false);
  const [failureDiagnostic, setFailureDiagnostic] = useState<Readonly<{ category: DatabaseInitializationFailure['category']; step: string }> | null>(null);
  const initialize = useCallback(async (connection: DatabaseConnection, appVersion: string): Promise<void> => {
    setFailureDiagnostic(null);
    if (failOnce.current) {
      failOnce.current = false;
      initializationStep.current = 'intentional-injected';
      throw new DatabaseInitializationError('migration', 'Injected development-only recovery verification failure.');
    }
    await initializeDatabase(connection, appVersion, undefined, undefined, (step) => { initializationStep.current = step; });
  }, []);
  const resolveApplicationVersion = useCallback((): string => {
    initializationStep.current = 'application-version';
    return resolveConfiguredApplicationVersion();
  }, []);
  const rememberFailure = useCallback((error: DatabaseInitializationFailure): void => {
    setFailureDiagnostic({ category: error.category, step: initializationStep.current });
  }, []);
  const rememberConnectionRelease = useCallback((release: () => Promise<void>): void => {
    releaseConnection.current = release;
  }, []);
  useEffect(() => {
    let active = true;
    void resetRecoveryDatabase()
      .then(() => { if (active) setPrepared(true); })
      .catch(() => { if (active) setCleanupFailed(true); });
    return () => {
      active = false;
    };
  }, [resetRecoveryDatabase]);

  async function returnToCases(): Promise<void> {
    try {
      if (releaseConnection.current === null) throw new Error('The recovery database is not ready to close.');
      await releaseConnection.current();
      await resetRecoveryDatabase();
      onReturn();
    } catch {
      setCleanupFailed(true);
    }
  }

  if (cleanupFailed) {
    return (
      <Screen title="Recovery verification cleanup failed" description="The disposable recovery database could not be cleaned safely.">
        <ErrorState title="Disposable database retained" body="Keep the app open and retry this development-only check." />
      </Screen>
    );
  }
  if (!prepared) {
    return <Screen title="Preparing recovery verification"><LoadingState title="Disposable recovery database" body="Resetting the development-only database." /></Screen>;
  }

  return (
    <DatabaseInitializationGate
      databaseName={DISPOSABLE_RECOVERY_DATABASE}
      initialize={initialize}
      resolveApplicationVersion={resolveApplicationVersion}
      onConnectionReady={rememberConnectionRelease}
      onInitializationFailure={rememberFailure}
      developmentFailureDiagnostic={failureDiagnostic}
    >
      <Screen title="Recovery verification complete" description="Retry initialized only the disposable recovery database.">
        <ActionButton label="Return to database cases" onPress={() => void returnToCases()} />
      </Screen>
    </DatabaseInitializationGate>
  );
}
