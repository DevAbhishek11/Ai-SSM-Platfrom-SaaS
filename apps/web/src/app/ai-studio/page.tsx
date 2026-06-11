import { AiGenerator } from "@/components/ai-generator";
import { AiStudioPanel } from "@/components/ai-studio-panel";
import { AppShell } from "@/components/app-shell";
import { TrendList } from "@/components/trend-list";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function AiStudioPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="AI Studio">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <AiGenerator />
        <div className="grid gap-5">
          <AiStudioPanel trends={overview.trends} />
          <TrendList trends={overview.trends} />
        </div>
      </div>
    </AppShell>
  );
}
