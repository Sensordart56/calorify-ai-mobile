import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function Screen({ children, description, title }: ScreenProps) {
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={styles.safeArea}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
            <View style={styles.heading}>
              <ThemedText accessibilityRole="header" type="subtitle">
                {title}
              </ThemedText>
              {description ? (
                <ThemedText themeColor="textSecondary">{description}</ThemedText>
              ) : null}
            </View>
            {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  heading: {
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
});
