import { Card } from '@/shared/ui/card';
import { ThemedText } from '@/components/themed-text';
import { View } from 'react-native';

type StatePanelProps = Readonly<{ title: string; body: string }>;

function StatePanel({ body, title }: StatePanelProps) {
  return <Card><View accessible accessibilityLabel={`${title}. ${body}`}><ThemedText accessibilityRole="header" type="smallBold">{title}</ThemedText><ThemedText themeColor="textSecondary">{body}</ThemedText></View></Card>;
}

export function EmptyState(props: StatePanelProps) { return <StatePanel {...props} />; }
export function LoadingState(props: StatePanelProps) { return <StatePanel {...props} />; }
export function ErrorState(props: StatePanelProps) { return <StatePanel {...props} />; }
