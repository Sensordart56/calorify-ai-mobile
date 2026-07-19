import { Card } from '@/shared/ui/card';
import { ThemedText } from '@/components/themed-text';
import { View } from 'react-native';

type StatePanelProps = Readonly<{ title: string; body: string }>;
type StateKind = 'empty' | 'loading' | 'error';

function StatePanel({ body, kind, title }: StatePanelProps & Readonly<{ kind: StateKind }>) {
  return <Card><View accessible accessibilityLabel={`${title}. ${body}`} accessibilityLiveRegion={kind === 'empty' ? 'none' : 'polite'} accessibilityRole={kind === 'error' ? 'alert' : undefined} accessibilityState={kind === 'loading' ? { busy: true } : undefined}><ThemedText accessibilityRole="header" type="smallBold">{title}</ThemedText><ThemedText themeColor="textSecondary">{body}</ThemedText></View></Card>;
}

export function EmptyState(props: StatePanelProps) { return <StatePanel {...props} kind="empty" />; }
export function LoadingState(props: StatePanelProps) { return <StatePanel {...props} kind="loading" />; }
export function ErrorState(props: StatePanelProps) { return <StatePanel {...props} kind="error" />; }
