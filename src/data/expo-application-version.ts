import Constants from 'expo-constants';

import { requireApplicationVersion } from '@/core/application/app-version';

export function resolveConfiguredApplicationVersion(): string {
  return requireApplicationVersion(Constants.expoConfig?.version);
}
