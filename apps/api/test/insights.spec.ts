import "reflect-metadata";
import "./env.js";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

describe("analytics insights", () => {
  let app: INestApplication;

  const server = () => app.getHttpServer();
  const get = (url: string, role = "owner") =>
    request(server()).get(url).set("x-user-role", role);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("window handling", () => {
    it("defaults to a 28 day window ending today", async () => {
      const response = await get("/api/analytics/insights").expect(200);

      expect(response.body.range.days).toBe(28);
      expect(response.body.range.to).toBe(new Date().toISOString().slice(0, 10));
    });

    it("honours an explicit range", async () => {
      const response = await get(
        "/api/analytics/insights?from=2026-05-01&to=2026-05-07"
      ).expect(200);

      expect(response.body.range).toMatchObject({ from: "2026-05-01", to: "2026-05-07", days: 7 });
      expect(response.body.series).toHaveLength(7);
    });

    it("compares against the equally long window immediately before", async () => {
      const response = await get(
        "/api/analytics/insights?from=2026-05-08&to=2026-05-14"
      ).expect(200);

      expect(response.body.comparison.previousRange).toEqual({
        from: "2026-05-01",
        to: "2026-05-07"
      });
    });

    it("rejects an inverted range", async () => {
      const response = await get(
        "/api/analytics/insights?from=2026-05-10&to=2026-05-01"
      ).expect(400);

      expect(response.body.code).toBe("invalid_range");
    });

    it("caps the window so one request cannot become unbounded work", async () => {
      const response = await get(
        "/api/analytics/insights?from=2020-01-01&to=2026-01-01"
      ).expect(400);

      expect(response.body.code).toBe("range_too_large");
    });

    it("rejects a malformed date before it reaches the maths", async () => {
      await get("/api/analytics/insights?from=last-tuesday").expect(400);
    });
  });

  describe("payload", () => {
    it("returns one series point per day with no gaps", async () => {
      const response = await get(
        "/api/analytics/insights?from=2026-05-01&to=2026-05-05"
      ).expect(200);

      expect(response.body.series.map((point: { date: string }) => point.date)).toEqual([
        "2026-05-01",
        "2026-05-02",
        "2026-05-03",
        "2026-05-04",
        "2026-05-05"
      ]);
    });

    it("carries a smoothed trend alongside the raw numbers", async () => {
      const response = await get(
        "/api/analytics/insights?from=2026-05-01&to=2026-05-10"
      ).expect(200);

      for (const point of response.body.series) {
        expect(typeof point.trend).toBe("number");
        expect(typeof point.impressions).toBe("number");
      }
    });

    it("reports a delta for every metric", async () => {
      const response = await get("/api/analytics/insights").expect(200);
      const metrics = response.body.comparison.deltas.map((delta: { metric: string }) => delta.metric);

      expect(metrics).toEqual(["impressions", "reach", "engagements", "clicks", "conversions"]);
    });

    it("breaks the window down by network with shares that add up", async () => {
      const response = await get("/api/analytics/insights").expect(200);
      const total = response.body.byPlatform.reduce(
        (sum: number, row: { shareOfImpressions: number }) => sum + row.shareOfImpressions,
        0
      );

      expect(response.body.byPlatform.length).toBeGreaterThan(0);
      expect(total).toBeCloseTo(1, 2);
    });

    it("ranks the platform breakdown by reach descending", async () => {
      const response = await get("/api/analytics/insights").expect(200);
      const impressions = response.body.byPlatform.map(
        (row: { metrics: { impressions: number } }) => row.metrics.impressions
      );

      expect([...impressions].sort((a: number, b: number) => b - a)).toEqual(impressions);
    });

    it("only puts published posts on the leaderboard", async () => {
      const response = await get("/api/analytics/insights").expect(200);

      for (const post of response.body.posts) {
        expect(post.status).toBe("published");
      }
    });

    it("puts the recent back-catalogue on the leaderboard", async () => {
      const response = await get("/api/analytics/insights").expect(200);

      expect(response.body.posts.length).toBeGreaterThan(0);
      expect(response.body.topPosts.length).toBeGreaterThan(0);
    });

    it("gives every row its derived rates, not just the leaderboard", async () => {
      // The table sorts and exports by engagement rate; a row without `rates`
      // takes the whole page down at render time.
      const response = await get("/api/analytics/insights").expect(200);

      expect(response.body.posts.length).toBeGreaterThan(0);
      for (const post of response.body.posts) {
        expect(typeof post.rates?.engagementRate).toBe("number");
        expect(typeof post.value).toBe("number");
      }
    });

    it("keeps the leaderboard inside the reported window", async () => {
      // An all-time leaderboard under a "last 7 days" heading is a reporting
      // bug people act on.
      const response = await get(
        "/api/analytics/insights?from=2026-01-01&to=2026-01-07"
      ).expect(200);

      expect(response.body.posts).toEqual([]);
    });

    it("recommends posting slots from real published history", async () => {
      const response = await get("/api/analytics/insights").expect(200);

      expect(response.body.bestTimes.length).toBeGreaterThan(0);
    });

    it("orders the top leaderboard above the bottom one", async () => {
      const response = await get("/api/analytics/insights?limit=3").expect(200);
      const top = response.body.topPosts[0]?.value ?? 0;
      const bottom = response.body.bottomPosts[0]?.value ?? 0;

      expect(top).toBeGreaterThanOrEqual(bottom);
      expect(response.body.topPosts.length).toBeLessThanOrEqual(3);
    });
  });

  describe("determinism", () => {
    it("returns identical figures for the same window on a repeat call", async () => {
      // Reporting numbers that move between refreshes destroy trust in the
      // page faster than numbers that are merely wrong.
      const url = "/api/analytics/insights?from=2026-05-01&to=2026-05-07";
      const first = await get(url).expect(200);
      const second = await get(url).expect(200);

      expect(second.body.series).toEqual(first.body.series);
      expect(second.body.comparison.current).toEqual(first.body.comparison.current);
    });

    it("gives overlapping windows the same value for a shared day", async () => {
      const a = await get("/api/analytics/insights?from=2026-05-01&to=2026-05-07").expect(200);
      const b = await get("/api/analytics/insights?from=2026-05-05&to=2026-05-12").expect(200);

      const dayFromA = a.body.series.find((point: { date: string }) => point.date === "2026-05-06");
      const dayFromB = b.body.series.find((point: { date: string }) => point.date === "2026-05-06");

      expect(dayFromB).toEqual(dayFromA);
    });
  });

  describe("time zones", () => {
    it("accepts an IANA zone and echoes it back", async () => {
      const response = await get("/api/analytics/insights?timeZone=Asia/Kolkata").expect(200);

      expect(response.body.range.timeZone).toBe("Asia/Kolkata");
    });

    it("rejects an unknown zone as a bad request, not a crash", async () => {
      const response = await get("/api/analytics/insights?timeZone=Mars/Olympus").expect(400);

      expect(response.body.code).toBe("invalid_time_zone");
    });

    it("buckets best posting times into local hours", async () => {
      const response = await get("/api/analytics/insights?timeZone=Asia/Kolkata").expect(200);

      for (const bucket of response.body.bestTimes) {
        expect(bucket.hour).toBeGreaterThanOrEqual(0);
        expect(bucket.hour).toBeLessThanOrEqual(23);
        expect(bucket.weekday).toBeGreaterThanOrEqual(0);
        expect(bucket.weekday).toBeLessThanOrEqual(6);
      }
    });
  });

  describe("filters and validation", () => {
    it("narrows the whole report to one network", async () => {
      const all = await get("/api/analytics/insights").expect(200);
      const platform = all.body.byPlatform[0].platform;
      const response = await get(`/api/analytics/insights?platform=${platform}`).expect(200);

      expect(response.body.byPlatform).toHaveLength(1);
      expect(response.body.byPlatform[0].platform).toBe(platform);
    });

    it("rejects a network the workspace does not use", async () => {
      const response = await get("/api/analytics/insights?platform=mastodon").expect(400);

      expect(["unknown_platform", "validation_failed"]).toContain(response.body.code);
    });

    it("rejects a metric that is not a metric", async () => {
      await get("/api/analytics/insights?metric=vibes").expect(400);
    });

    it("rejects an out-of-bounds limit", async () => {
      await get("/api/analytics/insights?limit=500").expect(400);
    });

    it("can rank by a derived rate rather than a raw count", async () => {
      const response = await get("/api/analytics/insights?metric=engagementRate").expect(200);

      for (const post of response.body.topPosts) {
        expect(post.value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("authorisation", () => {
    it("lets a read-only viewer open the report", async () => {
      // Reporting is deliberately visible to every role; a viewer who cannot
      // see the numbers cannot do the job the role exists for.
      await get("/api/analytics/insights", "viewer").expect(200);
    });

    it("denies an unauthenticated caller", async () => {
      await request(server()).get("/api/analytics/insights").expect(401);
    });

    it("denies an unrecognised role", async () => {
      await get("/api/analytics/insights", "intern").expect(401);
    });
  });
});
