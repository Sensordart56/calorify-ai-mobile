import { useRouter } from 'expo-router';
import { useState } from 'react';

import { productCopy } from '@/shared/copy/product-copy';
import { appPaths } from '@/core/navigation/secondary-screens';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { FormField } from '@/shared/ui/form-field';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { StatusBadge } from '@/shared/ui/status-badge';
import { ThemedText } from '@/components/themed-text';

export function LogScreen() {
  const router = useRouter();
  const [mealText, setMealText] = useState('');

  return (
    <Screen title="Log" description="Start with a description or enter food manually.">
      <StatusBadge label="Model unavailable" />
      <Card>
        <SectionHeading>Describe a meal</SectionHeading>
        <FormField label="Meal description" onChangeText={setMealText} placeholder="For example: oats and milk" value={mealText} />
        <ThemedText themeColor="textSecondary">A local model is not installed in this Phase 1 shell. Nothing is analyzed or saved.</ThemedText>
      </Card>
      <ActionButton label="Enter food manually" onPress={() => router.push(appPaths.manualEntry)} />
      <ActionButton label="Continue to fixture review" onPress={() => router.push(appPaths.review)} variant="secondary" />
      <ThemedText type="small" themeColor="textSecondary">{productCopy.manualFirst}</ThemedText>
    </Screen>
  );
}
