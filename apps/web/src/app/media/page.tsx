import { demoMediaAssets } from "@ssm/domain";
import { AppShell } from "@/components/app-shell";
import { MediaLibrary } from "@/components/media-library";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function MediaPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="Assets">
      <MediaLibrary assets={demoMediaAssets} />
    </AppShell>
  );
}
