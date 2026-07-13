import { Tabs } from 'expo-router';

import { primarySections } from '@/core/navigation/primary-sections';
import { useTheme } from '@/hooks/use-theme';

export default function PrimaryTabsLayout() {
  const theme = useTheme();
  const [today, settings] = primarySections;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarIconStyle: {
          display: 'none',
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      }}>
      <Tabs.Screen
        name={today.route}
        options={{
          title: today.title,
          tabBarAccessibilityLabel: today.accessibilityLabel,
        }}
      />
      <Tabs.Screen
        name={settings.route}
        options={{
          title: settings.title,
          tabBarAccessibilityLabel: settings.accessibilityLabel,
        }}
      />
    </Tabs>
  );
}
