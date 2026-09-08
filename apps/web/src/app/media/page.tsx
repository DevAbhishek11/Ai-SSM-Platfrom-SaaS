import Link from "next/link";
import { Upload } from "lucide-react";
import { demoMediaAssets, demoMediaProcessingJobs } from "@ssm/domain";
import { AppShell } from "@/components/shell/app-shell";
import { MediaLibrary } from "@/components/media-library";
import { MediaProcessingPipeline } from "@/components/media-processing-pipeline";

export default async function MediaPage() {
  return (
    <AppShell
      activePath="/media"
      title="Media library"
      description="Assets, derivatives, and the processing pipeline."
      actions={
        <Link href="/media" className="btn-primary">
          <Upload size={15} aria-hidden="true" />
          Upload asset
        </Link>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <MediaLibrary assets={demoMediaAssets} />
        <MediaProcessingPipeline jobs={demoMediaProcessingJobs} />
      </div>
    </AppShell>
  );
}
