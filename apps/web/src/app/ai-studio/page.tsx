import {
  demoBrandVoices,
  demoContentSafetyChecks,
  demoModerationQueueItems,
  demoSafetyPolicies
} from "@ssm/domain";
import { AiGenerator } from "@/components/ai-generator";
import { AiSafetyPanel } from "@/components/ai-safety-panel";
import { AiStudioPanel } from "@/components/ai-studio-panel";
import { AppShell } from "@/components/app-shell";
import { BrandVoicePanel } from "@/components/brand-voice-panel";
import { TrendList } from "@/components/trend-list";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function AiStudioPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="AI Studio">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-5">
          <AiGenerator brandVoices={demoBrandVoices} />
          <AiSafetyPanel
            policies={demoSafetyPolicies}
            checks={demoContentSafetyChecks}
            moderationQueue={demoModerationQueueItems}
          />
          <BrandVoicePanel brandVoices={demoBrandVoices} />
        </div>
        <div className="grid gap-5">
          <AiStudioPanel trends={overview.trends} />
          <TrendList trends={overview.trends} />
        </div>
      </div>
    </AppShell>
  );
}
