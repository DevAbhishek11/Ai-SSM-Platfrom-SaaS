import {
  demoCampaignBudgetLines,
  demoCampaignMilestones,
  demoCampaignReports,
  demoCampaignTasks,
  demoContentTemplates,
  demoScheduleRules,
  demoScheduleSlots
} from "@ssm/domain";
import { AppShell } from "@/components/app-shell";
import { CampaignOperationsPanel } from "@/components/campaign-operations-panel";
import { CalendarBoard } from "@/components/calendar-board";
import { CampaignPortfolio } from "@/components/campaign-portfolio";
import { ContentTemplatePanel } from "@/components/content-template-panel";
import { SmartSchedulingPanel } from "@/components/smart-scheduling-panel";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function CalendarPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="Calendar">
      <div className="grid gap-5">
        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.8fr]">
          <CalendarBoard posts={overview.posts} />
          <CampaignPortfolio campaigns={overview.campaigns} />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <ContentTemplatePanel
            workspaceId={overview.workspace.id}
            templates={demoContentTemplates}
            campaigns={overview.campaigns}
          />
          <SmartSchedulingPanel
            workspaceId={overview.workspace.id}
            rules={demoScheduleRules}
            slots={demoScheduleSlots}
            posts={overview.posts}
            campaigns={overview.campaigns}
          />
        </div>
        <CampaignOperationsPanel
          campaigns={overview.campaigns}
          milestones={demoCampaignMilestones}
          tasks={demoCampaignTasks}
          budgetLines={demoCampaignBudgetLines}
          reports={demoCampaignReports}
        />
      </div>
    </AppShell>
  );
}
