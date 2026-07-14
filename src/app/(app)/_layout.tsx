import { Stack } from 'expo-router';

import { DatabaseInitializationGate } from '@/features/shell/database/database-initialization-gate';

export default function ProductLayout() {
  return (
    <DatabaseInitializationGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="review" options={{ headerShown: true, title: 'Review meal' }} />
        <Stack.Screen name="manual-entry" options={{ headerShown: true, title: 'Manual entry' }} />
        <Stack.Screen name="goals" options={{ headerShown: true, title: 'Goals' }} />
        <Stack.Screen name="food-library" options={{ headerShown: true, title: 'Food Library' }} />
        <Stack.Screen name="models" options={{ headerShown: true, title: 'Models' }} />
        <Stack.Screen name="about-data-sources" options={{ headerShown: true, title: 'About and Data Sources' }} />
      </Stack>
    </DatabaseInitializationGate>
  );
}
