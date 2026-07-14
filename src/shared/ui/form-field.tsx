import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormFieldProps = Readonly<{
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
  placeholder?: string;
}>;

export function FormField({ keyboardType = 'default', label, onChangeText, placeholder, value }: FormFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  input: { borderRadius: Spacing.two, borderWidth: 1, fontSize: 16, minHeight: 48, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
});
