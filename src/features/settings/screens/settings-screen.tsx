import { useRouter } from 'expo-router';

import { productCopy } from '@/shared/copy/product-copy';
import { appPaths } from '@/core/navigation/secondary-screens';
import { Card } from '@/shared/ui/card';
import { ListRow } from '@/shared/ui/list-row';
import { Screen } from '@/shared/ui/screen';
import { StatusBadge } from '@/shared/ui/status-badge';
import { ThemedText } from '@/components/themed-text';

export function SettingsScreen() {
  const router = useRouter();
  return (
    <Screen title="Settings" description="Presentation preferences and product information.">
      <StatusBadge label="No settings are saved" />
      <Card>
        <ListRow title="Goals" detail="Fixture targets" onPress={() => router.push(appPaths.goals)} />
        <ListRow title="Food Library" detail="Manual and licensed local foods" onPress={() => router.push(appPaths.foodLibrary)} />
        <ListRow title="Models" detail="Manual mode stays available" onPress={() => router.push(appPaths.models)} />
        <ListRow title="About and Data Sources" detail="Catalog release, provenance, and product limits" onPress={() => router.push(appPaths.aboutDataSources)} />
      </Card>
      <Card>
        <ThemedText type="smallBold">Privacy and network mode</ThemedText>
        <ThemedText themeColor="textSecondary">Placeholder only. This shell makes no network requests.</ThemedText>
        <ThemedText type="smallBold">Data and export</ThemedText>
        <ThemedText themeColor="textSecondary">Placeholder only. No data is stored or exported.</ThemedText>
        <ThemedText type="smallBold">Appearance</ThemedText>
        <ThemedText themeColor="textSecondary">Follows the system light or dark appearance.</ThemedText>
      </Card>
      <ThemedText type="small" themeColor="textSecondary">{productCopy.manualFirst}</ThemedText>
    </Screen>
  );
}
