import { ThemedText } from '@/components/themed-text';

export function SectionHeading({ children }: { children: string }) {
  return <ThemedText accessibilityRole="header" type="smallBold">{children}</ThemedText>;
}
