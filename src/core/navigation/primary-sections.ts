export type PrimarySectionRoute = 'index' | 'log' | 'history' | 'settings';

export type PrimarySection = Readonly<{
  route: PrimarySectionRoute;
  title: string;
  accessibilityLabel: string;
}>;

export const primarySections: readonly PrimarySection[] = [
  { route: 'index', title: 'Today', accessibilityLabel: 'Open Today' },
  { route: 'log', title: 'Log', accessibilityLabel: 'Open meal logging' },
  { route: 'history', title: 'History', accessibilityLabel: 'Open meal history' },
  { route: 'settings', title: 'Settings', accessibilityLabel: 'Open Settings' },
];
