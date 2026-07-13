import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/shared/ui/screen';

export default function NotFoundScreen() {
  return (
    <Screen
      title="Page not found"
      description="This route is not part of the current Calorify foundation.">
      <Link href="/" asChild>
        <Pressable accessibilityRole="button" style={styles.link}>
          <ThemedText type="linkPrimary">Return to Today</ThemedText>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
  },
});
