import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ListRowProps = Readonly<{
  title: string;
  detail?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}>;

export function ListRow({ accessibilityLabel, detail, onPress, title }: ListRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <View style={styles.copy}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {detail ? <ThemedText themeColor="textSecondary" type="small">{detail}</ThemedText> : null}
      </View>
      <ThemedText accessibilityElementsHidden themeColor="textSecondary">›</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: Spacing.two, minHeight: 56, paddingVertical: Spacing.two },
  copy: { flex: 1, gap: Spacing.half },
});
