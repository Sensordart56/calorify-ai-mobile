export type PrimarySectionRoute = 'index' | 'settings';

export type PrimarySection = Readonly<{
  route: PrimarySectionRoute;
  title: string;
  accessibilityLabel: string;
}>;

export const primarySections: readonly PrimarySection[] = [
  {
    route: 'index',
    title: 'Today',
    accessibilityLabel: 'Open Today',
  },
  {
    route: 'settings',
    title: 'Settings',
    accessibilityLabel: 'Open Settings',
  },
];
