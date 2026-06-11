import { Injectable } from "@nestjs/common";
import { demoAnalytics } from "@ssm/domain";

@Injectable()
export class AnalyticsService {
  getSummary(workspaceId: string) {
    const snapshots = demoAnalytics.filter((snapshot) => snapshot.workspaceId === workspaceId);
    const totals = snapshots.reduce(
      (acc, snapshot) => ({
        impressions: acc.impressions + snapshot.metrics.impressions,
        reach: acc.reach + snapshot.metrics.reach,
        engagements: acc.engagements + snapshot.metrics.engagements,
        clicks: acc.clicks + snapshot.metrics.clicks,
        conversions: acc.conversions + snapshot.metrics.conversions
      }),
      { impressions: 0, reach: 0, engagements: 0, clicks: 0, conversions: 0 }
    );

    const engagementRate = totals.reach === 0 ? 0 : Number((totals.engagements / totals.reach).toFixed(4));
    const conversionRate = totals.clicks === 0 ? 0 : Number((totals.conversions / totals.clicks).toFixed(4));

    return {
      totals,
      engagementRate,
      conversionRate,
      snapshots,
      recommendations: [
        "LinkedIn is converting above blended average; prioritize B2B launch assets.",
        "Instagram reach is strong; test short-form launch teasers before peak hours.",
        "Review expired X account token before publishing the next queued post."
      ]
    };
  }
}
