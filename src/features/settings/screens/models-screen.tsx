import { ThemedText } from '@/components/themed-text';
import { productCopy } from '@/shared/copy/product-copy';
import { Card } from '@/shared/ui/card';
import { Screen } from '@/shared/ui/screen';
import { SectionHeading } from '@/shared/ui/section-heading';
import { StatusBadge } from '@/shared/ui/status-badge';

export function ModelsScreen() {
  return (
    <Screen title="Models" description="Optional local assistance will be introduced later.">
      <StatusBadge label="No model installed" />
      <Card><SectionHeading>Manual mode is ready</SectionHeading><ThemedText themeColor="textSecondary">{productCopy.manualFirst}</ThemedText></Card>
      <Card><SectionHeading>Future download disclosure</SectionHeading><ThemedText themeColor="textSecondary">A future model screen will explain download size, free-space needs, device compatibility, and verification before any install can begin.</ThemedText></Card>
    </Screen>
  );
}
