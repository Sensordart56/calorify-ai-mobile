import { View, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { FoundationCard } from '@/shared/ui/foundation-card';
import { Screen } from '@/shared/ui/screen';

export function TodayScreen() {
  return (
    <Screen
      title="Today"
      description="The Android-first, offline nutrition workspace is taking shape.">
      <View style={styles.cards}>
        <FoundationCard
          title="Manual logging is the foundation"
          body="Meal entry will remain useful without a model, account, or network connection."
        />
        <FoundationCard
          title="Phase 0 scope"
          body="This build contains only the navigation and quality-check foundation. Nutrition features begin in later gated phases."
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: Spacing.three,
  },
});
