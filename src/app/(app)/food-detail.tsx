import { useLocalSearchParams } from 'expo-router';

import { FoodDetailScreen } from '@/features/foods/screens/food-detail-screen';

export default function FoodDetailRoute() {
  const { foodId } = useLocalSearchParams<{ foodId?: string }>();
  return <FoodDetailScreen foodId={typeof foodId === 'string' ? foodId : ''} />;
}
