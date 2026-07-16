import { useLocalSearchParams } from 'expo-router';

import { MealDetailScreen } from '@/features/logging/screens/meal-detail-screen';

export default function MealDetailRoute() {
  const { mealId } = useLocalSearchParams<{ mealId?: string }>();
  return <MealDetailScreen mealId={typeof mealId === 'string' ? mealId : ''} />;
}
