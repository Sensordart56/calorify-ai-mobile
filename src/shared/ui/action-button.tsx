import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type ActionButtonProps = Readonly<{
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}>;

export function ActionButton({ accessibilityHint, disabled = false, label, onPress, variant = 'primary' }: ActionButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? theme.accent : theme.backgroundElement,
          borderColor: theme.accent,
          opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
        },
      ]}>
      <ThemedText style={{ color: isPrimary ? theme.background : theme.accent }} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
