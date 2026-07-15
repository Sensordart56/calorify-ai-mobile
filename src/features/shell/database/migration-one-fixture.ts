export const migrationOneFixture = {
  migration: { version: 1, name: 'foundation', checksum: '58ee4c406470eeb74cca242140291d20972bb736d7407da2e79d3d22715b6414' },
  ledger: { appliedAt: '2026-07-01T00:00:00.000Z', appVersion: '1.0.0' },
  food: {
    id: 'fixture-food-001', canonicalName: 'Fixture oats', normalizedName: 'fixture oats',
    revision: { id: 'fixture-revision-001', revisionNumber: 1, basisQuantityScaled: 100000000, basisUnit: 'gram', caloriesKcalScaled: 389000000, proteinGScaled: 16900000, carbohydratesGScaled: 66300000, fatGScaled: 6900000 },
    portion: { id: 'fixture-portion-001', label: 'cup', normalizedLabel: 'cup', quantityScaled: 1, equivalentQuantityScaled: 81000000, equivalentUnit: 'gram' },
  },
} as const;
