import { Stack } from 'expo-router';

import { DatabaseInitializationGate } from '@/features/shell/database/database-initialization-gate';
import { ManualLoggingProvider, MealDraftProvider } from '@/features/shell/manual-logging/manual-logging-provider';

export default function ProductLayout() {
  return (
    <DatabaseInitializationGate>
      <ManualLoggingProvider>
        <MealDraftProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="review" options={{ headerShown: true, title: 'Review meal' }} />
            <Stack.Screen name="meal-detail" options={{ headerShown: true, title: 'Meal details' }} />
            <Stack.Screen name="manual-entry" options={{ headerShown: true, title: 'Manual entry' }} />
            <Stack.Screen name="goals" options={{ headerShown: true, title: 'Goals' }} />
            <Stack.Screen name="food-library" options={{ headerShown: true, title: 'Food Library' }} />
            <Stack.Screen name="food-detail" options={{ headerShown: true, title: 'Food details' }} />
            <Stack.Screen name="models" options={{ headerShown: true, title: 'Models' }} />
            <Stack.Screen name="about-data-sources" options={{ headerShown: true, title: 'About and Data Sources' }} />
          </Stack>
        </MealDraftProvider>
      </ManualLoggingProvider>
    </DatabaseInitializationGate>
  );
}
