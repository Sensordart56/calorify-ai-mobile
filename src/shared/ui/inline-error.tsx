import { ThemedText } from '@/components/themed-text';

export function InlineError({ message }: Readonly<{ message: string | null }>) {
  if (message === null) return null;
  return <ThemedText accessibilityLiveRegion="polite" accessibilityRole="alert" themeColor="textSecondary">{message}</ThemedText>;
}
