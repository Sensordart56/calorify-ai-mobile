import type { Nutrients } from '@/core/domain/manual-logging';

export type SeedCatalogStatus = Readonly<
  | { state: 'active'; releaseId: string; foodCount: number }
  | { state: 'unavailable'; reason: 'asset' | 'integrity' | 'storage' }
>;

export type SeedCatalogFood = Readonly<{
  id: string;
  sourceId: string;
  sourceRecordId: string;
  stableSourceKey: string;
  datasetVersion: string;
  sourceUrl: string;
  payloadHash: string;
  revisionId: string;
  canonicalName: string;
  normalizedName: string;
  basisQuantityScaled: number;
  basisUnit: 'gram';
  nutrients: Nutrients;
}>;

export type SeedCatalogAlias = Readonly<{ id: string; foodId: string; alias: string; normalizedAlias: string; locale: string | null }>;
export type SeedCatalogPortion = Readonly<{ id: string; foodId: string; sourceId: string; label: string; normalizedLabel: string; quantityScaled: number; equivalentQuantityScaled: number; equivalentUnit: 'gram' }>;

export type VerifiedSeedCatalog = Readonly<{
  releaseId: string;
  generatedAt: string;
  foods: readonly SeedCatalogFood[];
  aliases: readonly SeedCatalogAlias[];
  portions: readonly SeedCatalogPortion[];
}>;
