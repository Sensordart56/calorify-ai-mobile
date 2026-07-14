import { ThemedText } from '@/components/themed-text';
import { Card } from '@/shared/ui/card';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { StatusBadge } from '@/shared/ui/status-badge';

export function AboutDataSourcesScreen() {
  return (
    <Screen title="About and Data Sources" description="Calorify AI is a provisional development identity.">
      <StatusBadge label="Phase 1 information" />
      <Card><SectionHeading>Local-first, manual-first</SectionHeading><ThemedText themeColor="textSecondary">The planned product is designed to remain useful without a model, network, account, or backend.</ThemedText></Card>
      <Card><SectionHeading>Nutrition and model limits</SectionHeading><ThemedText themeColor="textSecondary">This shell has no authoritative nutrition data. Future models may identify food names, quantities, and units, but must not invent nutrition values.</ThemedText></Card>
      <Card><SectionHeading>Sources and licenses</SectionHeading><ThemedText themeColor="textSecondary">No approved food dataset is included. Future sources and licenses will be listed here with row-level provenance.</ThemedText></Card>
      <Card><SectionHeading>Links</SectionHeading><ThemedText themeColor="textSecondary">Support, privacy, and data-source links are presentation placeholders until approved.</ThemedText></Card>
    </Screen>
  );
}
