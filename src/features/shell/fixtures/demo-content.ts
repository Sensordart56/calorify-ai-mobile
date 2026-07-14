export type ReviewItemFixture = Readonly<{
  id: string;
  name: string;
  quantity: string;
  status: 'Resolved' | 'Ambiguous' | 'Unresolved';
  detail: string;
}>;

export const todayFixture = {
  summary: ['Calories: 1,280 preview', 'Protein: 74 g preview', 'Carbohydrates: 138 g preview', 'Fat: 42 g preview'],
  progress: '1,280 of 2,000 fixture calories',
  recentMeal: 'Lunch preview — rice bowl',
} as const;

export const reviewItems: readonly ReviewItemFixture[] = [
  { id: 'oats', name: 'Oats', quantity: '60 g', status: 'Resolved', detail: 'Fixture match shown for review.' },
  { id: 'milk', name: 'Milk', quantity: '1 cup', status: 'Ambiguous', detail: 'Fixture choice needs user confirmation.' },
  { id: 'berries', name: 'Berries', quantity: '1 handful', status: 'Unresolved', detail: 'Fixture item has no selected food.' },
];

export const foodLibraryFixtures = [
  { name: 'Oats', detail: 'Fixture food • source placeholder' },
  { name: 'Cooked rice', detail: 'Fixture food • source placeholder' },
  { name: 'Plain yoghurt', detail: 'Fixture food • source placeholder' },
] as const;
