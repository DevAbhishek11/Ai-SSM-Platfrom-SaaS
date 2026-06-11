import { AppShell } from "@/components/app-shell";
import { CalendarBoard } from "@/components/calendar-board";
import { CampaignPortfolio } from "@/components/campaign-portfolio";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function CalendarPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="Calendar">
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.8fr]">
        <CalendarBoard posts={overview.posts} />
        <CampaignPortfolio campaigns={overview.campaigns} />
      </div>
    </AppShell>
  );
}
