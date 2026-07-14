import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({ children }: PropsWithChildren) {
  const theme = useTheme();

  return <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
});
