import type { Href } from 'expo-router';

export type SecondaryScreen = Readonly<{
  route: 'review' | 'manual-entry' | 'goals' | 'food-library' | 'models' | 'about-data-sources';
  title: string;
  accessibilityLabel: string;
}>;

export const secondaryScreens: readonly SecondaryScreen[] = [
  { route: 'review', title: 'Review meal', accessibilityLabel: 'Open fixture meal review' },
  { route: 'manual-entry', title: 'Manual entry', accessibilityLabel: 'Open manual food entry' },
  { route: 'goals', title: 'Goals', accessibilityLabel: 'Open nutrition goals' },
  { route: 'food-library', title: 'Food Library', accessibilityLabel: 'Open food library' },
  { route: 'models', title: 'Models', accessibilityLabel: 'Open local models' },
  {
    route: 'about-data-sources',
    title: 'About and Data Sources',
    accessibilityLabel: 'Open About and Data Sources',
  },
];

/**
 * Expo Router's generated route union is refreshed by the development server.
 * These stable Phase 1 route values stay centralized while that generated file
 * is unavailable to static tooling in a clean checkout.
 */
export const appPaths = {
  log: '/log' as Href,
  review: '/review' as Href,
  manualEntry: '/manual-entry' as Href,
  goals: '/goals' as Href,
  foodLibrary: '/food-library' as Href,
  models: '/models' as Href,
  aboutDataSources: '/about-data-sources' as Href,
  mealDetail: (mealId: string) => ({ pathname: '/meal-detail', params: { mealId } }) as Href,
} as const;
