import { demoMediaAssets, demoMediaProcessingJobs } from "@ssm/domain";
import { AppShell } from "@/components/app-shell";
import { MediaLibrary } from "@/components/media-library";
import { MediaProcessingPipeline } from "@/components/media-processing-pipeline";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function MediaPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="Assets">
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <MediaLibrary assets={demoMediaAssets} />
        <MediaProcessingPipeline jobs={demoMediaProcessingJobs} />
      </div>
    </AppShell>
  );
}
