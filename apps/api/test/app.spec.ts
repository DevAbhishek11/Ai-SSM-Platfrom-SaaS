import "reflect-metadata";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

describe("API application", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("responds to the liveness probe", async () => {
    const response = await request(app.getHttpServer()).get("/api/health").expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      service: "ssm-api"
    });
  });

  it("returns dashboard metrics for the demo workspace", async () => {
    const response = await request(app.getHttpServer()).get("/api/dashboard/overview").expect(200);

    expect(response.body.metrics.scheduledPosts).toBeGreaterThanOrEqual(1);
    expect(response.body.metrics.connectedAccounts).toBe(2);
    expect(response.body.trends).toHaveLength(2);
  });

  it("issues and validates a demo access token", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "owner@acmegrowth.test", password: "demo-password-change-me" })
      .expect(201);

    expect(login.body.accessToken).toEqual(expect.any(String));

    const session = await request(app.getHttpServer())
      .get("/api/auth/session")
      .set("authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(session.body).toMatchObject({
      email: "owner@acmegrowth.test",
      role: "owner"
    });
  });

  it("exposes core SaaS operational modules", async () => {
    await request(app.getHttpServer()).get("/api/campaigns").expect(200);
    await request(app.getHttpServer()).get("/api/media/assets").expect(200);
    await request(app.getHttpServer()).get("/api/notifications").expect(200);
    await request(app.getHttpServer()).get("/api/billing/plans").expect(200);
    await request(app.getHttpServer())
      .get("/api/billing/entitlements/check?capability=apiAccess")
      .expect(200);
    await request(app.getHttpServer()).get("/api/webhooks/deliveries").expect(200);
    await request(app.getHttpServer()).get("/api/publishing/jobs").expect(200);
    await request(app.getHttpServer()).get("/api/social/rate-limits").expect(200);
    await request(app.getHttpServer()).get("/api/social/connector-events").expect(200);
    await request(app.getHttpServer()).get("/api/audit/logs").expect(200);
    await request(app.getHttpServer()).get("/api/audit/summary").expect(200);
    await request(app.getHttpServer()).get("/api/members").expect(200);
    await request(app.getHttpServer()).get("/api/members/invitations").expect(200);
    await request(app.getHttpServer()).get("/api/api-keys").expect(200);
    await request(app.getHttpServer())
      .get("/api/billing/entitlements/check?capability=unknown")
      .expect(400);
  });

  it("processes and retries publishing jobs", async () => {
    const processed = await request(app.getHttpServer())
      .post("/api/publishing/jobs/19191919-1919-4191-8191-191919191919/process")
      .expect(201);

    expect(processed.body.status).toBe("succeeded");
    expect(processed.body.platformPostUrl).toContain("instagram");

    const retry = await request(app.getHttpServer())
      .post("/api/publishing/jobs/21212121-2121-4212-8212-212121212121/retry")
      .expect(201);

    expect(retry.body.status).toBe("retrying");
    expect(retry.body.nextRetryAt).toEqual(expect.any(String));
  });

  it("enforces approval workflow transitions and exposes timeline", async () => {
    const changes = await request(app.getHttpServer())
      .post("/api/workflow/posts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/request-changes")
      .set("x-user-role", "reviewer")
      .send({ comment: "Please revise the hook before approval." })
      .expect(201);

    expect(changes.body.post.status).toBe("revisions_needed");
    expect(changes.body.event.action).toBe("changes_requested");

    const invalidApprove = await request(app.getHttpServer())
      .post("/api/workflow/posts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/approve")
      .set("x-user-role", "reviewer")
      .send({ comment: "Trying to approve too early." })
      .expect(400);

    expect(invalidApprove.body.message).toContain("Cannot transition");

    const timeline = await request(app.getHttpServer())
      .get("/api/workflow/posts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/timeline")
      .expect(200);

    expect(timeline.body.events.length).toBeGreaterThanOrEqual(2);
    expect(timeline.body.comments.length).toBeGreaterThanOrEqual(1);
  });

  it("creates upload intents and advances media processing jobs", async () => {
    const intent = await request(app.getHttpServer())
      .post("/api/media/upload-intents")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        fileName: "launch-card.webp",
        fileType: "image/webp",
        fileSize: 512000
      })
      .expect(201);

    const completed = await request(app.getHttpServer())
      .post("/api/media/uploads/complete")
      .send({
        uploadIntentId: intent.body.id,
        checksumSha256: "sha256-test-upload"
      })
      .expect(201);

    expect(completed.body.status).toBe("queued");

    const processed = await request(app.getHttpServer())
      .post(`/api/media/processing-jobs/${completed.body.id}/process-next`)
      .expect(201);

    expect(processed.body.status).toBe("virus_scanning");
    expect(processed.body.virusScan.status).toBe("clean");
  });

  it("runs the social connector OAuth lifecycle", async () => {
    const authorization = await request(app.getHttpServer())
      .post("/api/social/oauth/authorize")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        platform: "threads",
        scopes: ["publish", "insights"]
      })
      .expect(201);

    expect(authorization.body.state).toEqual(expect.stringContaining("state-threads"));
    expect(authorization.body.authorizationUrl).toContain("social.example.com/threads");

    const connected = await request(app.getHttpServer())
      .post("/api/social/oauth/callback")
      .send({
        state: authorization.body.state,
        code: "demo-oauth-code",
        username: "threads-growth",
        displayName: "Threads Growth"
      })
      .expect(201);

    expect(connected.body.account).toMatchObject({
      platform: "threads",
      username: "threads-growth",
      status: "connected"
    });
    expect(connected.body.oauthState.status).toBe("consumed");

    const validation = await request(app.getHttpServer())
      .post(`/api/social/accounts/${connected.body.account.id}/validate-scopes`)
      .send({ requiredScopes: ["publish"] })
      .expect(201);

    expect(validation.body.valid).toBe(true);

    const refreshed = await request(app.getHttpServer())
      .post("/api/social/accounts/55555555-5555-4555-8555-555555555555/refresh-token")
      .expect(201);

    expect(refreshed.body.status).toBe("connected");

    const audit = await request(app.getHttpServer())
      .get("/api/audit/logs?action=social.oauth_completed")
      .expect(200);

    expect(audit.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "social.oauth_completed",
          entityId: connected.body.account.id
        })
      ])
    );
  });

  it("manages member invitations and scoped API keys", async () => {
    const invite = await request(app.getHttpServer())
      .post("/api/members/invitations")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        email: "strategist@acmegrowth.test",
        role: "manager"
      })
      .expect(201);

    expect(invite.body.invitation).toMatchObject({
      email: "strategist@acmegrowth.test",
      role: "manager",
      status: "pending"
    });
    expect(invite.body.acceptUrl).toContain("token=");

    const revokedInvite = await request(app.getHttpServer())
      .post(`/api/members/invitations/${invite.body.invitation.id}/revoke`)
      .expect(201);

    expect(revokedInvite.body.status).toBe("revoked");

    const createdKey = await request(app.getHttpServer())
      .post("/api/api-keys")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        name: "Analytics export test",
        scopes: ["analytics.view", "analytics.export"]
      })
      .expect(201);

    expect(createdKey.body.secret).toEqual(expect.stringContaining("ssm_live_"));
    expect(createdKey.body.apiKey.secretHash).toBeUndefined();

    await request(app.getHttpServer())
      .get("/api/analytics/summary")
      .set("x-api-key", createdKey.body.secret)
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/posts")
      .set("x-api-key", createdKey.body.secret)
      .expect(403);

    const keys = await request(app.getHttpServer()).get("/api/api-keys").expect(200);
    expect(keys.body[0].secretHash).toBeUndefined();

    const revokedKey = await request(app.getHttpServer())
      .post(`/api/api-keys/${createdKey.body.apiKey.id}/revoke`)
      .expect(201);

    expect(revokedKey.body.status).toBe("revoked");

    await request(app.getHttpServer())
      .get("/api/analytics/summary")
      .set("x-api-key", createdKey.body.secret)
      .expect(401);
  });
});
