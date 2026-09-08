import "server-only";
import { authorizedFetch } from "./session";
import { insightsQueryString, type Insights, type InsightsQuery } from "./insights";

/**
 * Server-side load for the first paint.
 *
 * Kept apart from `insights.ts` because that module is imported by a client
 * component: pulling `session.ts` (and therefore `next/headers`) into the
 * browser bundle fails the build. Types and pure helpers are shared; anything
 * that touches the request lives here.
 *
 * Returns `null` rather than throwing when the API is unreachable, so the page
 * still renders its shell and the explorer can offer a retry instead of an
 * error boundary swallowing the whole route.
 */
export async function getInsights(query: InsightsQuery = {}): Promise<Insights | null> {
  try {
    const response = await authorizedFetch(`/analytics/insights${insightsQueryString(query)}`, {
      headers: { accept: "application/json" }
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Insights;
  } catch {
    return null;
  }
}
