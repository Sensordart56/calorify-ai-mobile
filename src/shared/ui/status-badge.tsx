import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function StatusBadge({ label }: { label: string }) {
  const theme = useTheme();
  return <View accessibilityRole="text" accessibilityLabel={`Status: ${label}`} style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}><ThemedText type="smallBold">Status: {label}</ThemedText></View>;
}

const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', borderRadius: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one } });
