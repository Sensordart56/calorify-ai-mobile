import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { todayFixture } from '@/features/shell/fixtures/demo-content';
import { appPaths } from '@/core/navigation/secondary-screens';
import { productCopy } from '@/shared/copy/product-copy';
import { ActionButton } from '@/shared/ui/action-button';
import { Card } from '@/shared/ui/card';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Spacing } from '@/constants/theme';

export function TodayScreen() {
  const router = useRouter();

  return (
    <Screen title="Today" description="Your local-first meal workspace.">
      <StatusBadge label="Fixture/demo content" />
      <Card>
        <SectionHeading>Today’s nutrition summary</SectionHeading>
        {todayFixture.summary.map((value) => <ThemedText key={value} themeColor="textSecondary">{value}</ThemedText>)}
        <ThemedText type="small">{productCopy.fixtureNotice}</ThemedText>
      </Card>
      <Card>
        <SectionHeading>Goal progress</SectionHeading>
        <ThemedText>{todayFixture.progress}</ThemedText>
        <ActionButton label="View goals" onPress={() => router.push(appPaths.goals)} variant="secondary" />
      </Card>
      <Card>
        <SectionHeading>Recent meals</SectionHeading>
        <ThemedText themeColor="textSecondary">{todayFixture.recentMeal}</ThemedText>
      </Card>
      <View style={styles.actions}>
        <ActionButton label="Log meal" onPress={() => router.push(appPaths.log)} />
        <ActionButton label="Enter food manually" onPress={() => router.push(appPaths.manualEntry)} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { gap: Spacing.two } });
