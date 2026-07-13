import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { FoundationCard } from '@/shared/ui/foundation-card';
import { Screen } from '@/shared/ui/screen';

export function SettingsScreen() {
  return (
    <Screen
      title="Settings"
      description="Only foundation decisions are shown in this phase.">
      <View style={styles.cards}>
        <FoundationCard
          title="Product identity pending"
          body="Calorify AI and the calorify URL scheme are approved for development. The permanent store name, Android application ID, brand assets, and release owner still require approval."
        />
        <FoundationCard
          title="Local AI remains optional"
          body="No model runtime or model file is installed. Manual logging will stay available on every supported device."
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
