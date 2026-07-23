import { ThemedText } from '@/components/themed-text';
import { Card } from '@/shared/ui/card';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { StatusBadge } from '@/shared/ui/status-badge';
import { useSeedCatalogStatus } from '@/features/shell/database/database-initialization-gate';

export function AboutDataSourcesScreen() {
  const catalog = useSeedCatalogStatus();
  return (
    <Screen title="About and Data Sources" description="Calorify AI is a provisional development identity.">
      <StatusBadge label={catalog.state === 'active' ? `${catalog.foodCount} licensed local foods` : 'Manual logging available'} />
      <Card><SectionHeading>Local-first, manual-first</SectionHeading><ThemedText themeColor="textSecondary">The planned product is designed to remain useful without a model, network, account, or backend.</ThemedText></Card>
      <Card><SectionHeading>Nutrition and model limits</SectionHeading><ThemedText themeColor="textSecondary">Nutrition is authoritative only when it comes from the installed catalog, an explicit manual entry, or a reviewed accepted source. A model must never invent nutrition values.</ThemedText></Card>
      <Card><SectionHeading>Sources and licenses</SectionHeading><ThemedText themeColor="textSecondary">The bundled catalog contains USDA FoodData Central Foundation Foods, April 2026 release. USDA FoodData Central data are public domain under CC0 1.0. Every installed row retains its USDA record ID, dataset version, source URL, retrieval evidence, and content hash. Release: {catalog.state === 'active' ? catalog.releaseId : 'catalog unavailable'}.</ThemedText></Card>
      {catalog.state === 'unavailable' ? <Card><SectionHeading>Catalog unavailable</SectionHeading><ThemedText themeColor="textSecondary">The verified catalog could not be activated. Manual food creation and meal logging remain available offline.</ThemedText></Card> : null}
    </Screen>
  );
}
