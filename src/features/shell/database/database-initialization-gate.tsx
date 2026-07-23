import { createContext, type PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';

import type { DatabaseConnection, DatabaseErrorCategory, DatabaseStartupState } from '@/core/database/contracts';
import { classifyDatabaseError, type DatabaseInitializationError } from '@/core/database/errors';
import { openExpoDatabase } from '@/data/sqlite/expo-sqlite-database';
import { resolveConfiguredApplicationVersion } from '@/data/expo-application-version';
import { initializeDatabase } from '@/data/sqlite/migration-runner';
import { installBundledSeedCatalog } from '@/data/sqlite/bundled-seed-catalog';
import { rebuildFoodSearchIndex } from '@/data/sqlite/food-search-index';
import type { SeedCatalogStatus } from '@/core/seed/catalog';
import { ActionButton } from '@/shared/ui/action-button';
import { ErrorState, LoadingState } from '@/shared/ui/state-panels';
import { Screen } from '@/shared/ui/screen';

export const APPLICATION_DATABASE_NAME = 'calorify.db';

type DatabaseInitializer = typeof initializeDatabase;
type ApplicationVersionResolver = () => string;
type DatabaseConnectionRelease = () => Promise<void>;
type DevelopmentFailureDiagnostic = Readonly<{ category: DatabaseErrorCategory; step: string }>;

const DatabaseContext = createContext<DatabaseConnection | null>(null);
const SeedCatalogContext = createContext<SeedCatalogStatus>({ state: 'unavailable', reason: 'asset' });

export function useDatabaseConnection(): DatabaseConnection {
  const connection = useContext(DatabaseContext);
  if (connection === null) throw new Error('The database is not ready.');
  return connection;
}

export function useSeedCatalogStatus(): SeedCatalogStatus { return useContext(SeedCatalogContext); }

function messageFor(phase: DatabaseStartupState['phase']): string {
  switch (phase) {
    case 'opening': return 'Opening local storage.';
    case 'configuring': return 'Configuring local storage safely.';
    case 'migrating': return 'Preparing the local database.';
    case 'checking': return 'Checking local database integrity.';
    default: return 'Preparing Calorify AI.';
  }
}

export function DatabaseInitializationGate({
  children,
  databaseName = APPLICATION_DATABASE_NAME,
  initialize = initializeDatabase,
  resolveApplicationVersion = resolveConfiguredApplicationVersion,
  onConnectionReady,
  onInitializationFailure,
  developmentFailureDiagnostic,
}: PropsWithChildren<{
  readonly databaseName?: string;
  readonly initialize?: DatabaseInitializer;
  readonly resolveApplicationVersion?: ApplicationVersionResolver;
  readonly onConnectionReady?: (release: DatabaseConnectionRelease) => void;
  readonly onInitializationFailure?: (error: DatabaseInitializationError) => void;
  readonly developmentFailureDiagnostic?: DevelopmentFailureDiagnostic | null;
}>) {
  const [state, setState] = useState<DatabaseStartupState>({ phase: 'opening' });
  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [seedCatalog, setSeedCatalog] = useState<SeedCatalogStatus>({ state: 'unavailable', reason: 'asset' });
  const [attempt, setAttempt] = useState(0);
  const currentAttempt = useRef(0);

  useEffect(() => {
    let active = true;
    const attemptId = ++currentAttempt.current;
    let opened: DatabaseConnection | null = null;
    let closed = false;
    const isCurrent = (): boolean => active && currentAttempt.current === attemptId;
    const closeOpened = async (): Promise<void> => {
      if (opened !== null && !closed) {
        closed = true;
        await opened.close().catch(() => undefined);
      }
    };
    async function start(): Promise<void> {
      try {
        setState({ phase: 'opening' });
        opened = await openExpoDatabase(databaseName);
        if (!isCurrent()) {
          await closeOpened();
          return;
        }
        setState({ phase: 'configuring' });
        setState({ phase: 'migrating' });
        const applicationVersion = resolveApplicationVersion();
        await initialize(opened, applicationVersion);
        if (!isCurrent()) {
          await closeOpened();
          return;
        }
        setState({ phase: 'checking' });
        let nextSeedCatalog: SeedCatalogStatus;
        try { nextSeedCatalog = await installBundledSeedCatalog(opened, applicationVersion); }
        catch { nextSeedCatalog = { state: 'unavailable', reason: 'asset' }; }
        await rebuildFoodSearchIndex(opened);
        if (!isCurrent()) {
          await closeOpened();
          return;
        }
        onConnectionReady?.(closeOpened);
        setSeedCatalog(nextSeedCatalog);
        setConnection(opened);
        setState({ phase: 'ready' });
      } catch (error) {
        await closeOpened();
        if (isCurrent()) {
          const classified = classifyDatabaseError(error);
          onInitializationFailure?.(classified);
          setState({ phase: 'failed', errorCategory: classified.category });
        }
      }
    }
    void start();
    return () => {
      active = false;
      void closeOpened();
    };
  }, [attempt, databaseName, initialize, onConnectionReady, onInitializationFailure, resolveApplicationVersion]);

  if (state.phase === 'ready' && connection !== null) {
    return <DatabaseContext.Provider value={connection}><SeedCatalogContext.Provider value={seedCatalog}>{children}</SeedCatalogContext.Provider></DatabaseContext.Provider>;
  }
  if (state.phase === 'failed') {
    return (
      <Screen title="Local database needs attention" description="Your data was not deleted or reset.">
        <ErrorState title="Database unavailable" body="Retry opening the local database. If this continues, keep the app installed and seek recovery support." />
        {__DEV__ && developmentFailureDiagnostic !== null && developmentFailureDiagnostic !== undefined ? (
          <ErrorState title="Development diagnostic" body={`Recovery retry stopped during ${developmentFailureDiagnostic.step} (${developmentFailureDiagnostic.category}).`} />
        ) : null}
        <ActionButton label="Retry database setup" onPress={() => setAttempt((value) => value + 1)} />
      </Screen>
    );
  }
  return <Screen title="Preparing Calorify AI"><LoadingState title="Local database" body={messageFor(state.phase)} /></Screen>;
}
