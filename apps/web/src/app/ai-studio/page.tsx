import Link from "next/link";
import { Cpu } from "lucide-react";
import {
  demoBrandVoices,
  demoContentSafetyChecks,
  demoModerationQueueItems,
  demoSafetyPolicies
} from "@ssm/domain";
import { AiGenerator } from "@/components/ai-generator";
import { AiProviderPanel } from "@/components/ai-provider-panel";
import { AiSafetyPanel } from "@/components/ai-safety-panel";
import { AiStudioPanel } from "@/components/ai-studio-panel";
import { AppShell } from "@/components/shell/app-shell";
import { BrandVoicePanel } from "@/components/brand-voice-panel";
import { TrendList } from "@/components/trend-list";
import { getAiRouterStatus } from "@/lib/ai";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function AiStudioPage() {
  const [overview, routerStatus] = await Promise.all([getDashboardOverview(), getAiRouterStatus()]);

  return (
    <AppShell
      activePath="/ai-studio"
      title="AI Studio"
      description="Generate on-brand variants with multi-provider model routing and safety review."
      actions={
        <Link href="/settings" className="btn-secondary">
          <Cpu size={15} aria-hidden="true" />
          Model settings
        </Link>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-5">
          <AiGenerator brandVoices={demoBrandVoices} />
          <AiProviderPanel status={routerStatus} />
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
