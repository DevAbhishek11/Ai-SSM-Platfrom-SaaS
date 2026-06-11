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
    await request(app.getHttpServer())
      .get("/api/campaigns/66666666-6666-4666-8666-666666666666/milestones")
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/campaigns/66666666-6666-4666-8666-666666666666/tasks")
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/campaigns/66666666-6666-4666-8666-666666666666/budget")
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/campaigns/66666666-6666-4666-8666-666666666666/reports")
      .expect(200);
    await request(app.getHttpServer()).get("/api/media/assets").expect(200);
    await request(app.getHttpServer()).get("/api/notifications").expect(200);
    await request(app.getHttpServer()).get("/api/notifications/preferences").expect(200);
    await request(app.getHttpServer()).get("/api/notifications/deliveries").expect(200);
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
    await request(app.getHttpServer()).get("/api/brand-voices").expect(200);
    await request(app.getHttpServer()).get("/api/safety/policies").expect(200);
    await request(app.getHttpServer()).get("/api/safety/checks").expect(200);
    await request(app.getHttpServer()).get("/api/safety/moderation-queue").expect(200);
    await request(app.getHttpServer()).get("/api/listening/summary").expect(200);
    await request(app.getHttpServer()).get("/api/listening/monitors").expect(200);
    await request(app.getHttpServer()).get("/api/listening/mentions").expect(200);
    await request(app.getHttpServer()).get("/api/listening/alerts").expect(200);
    await request(app.getHttpServer()).get("/api/reports/templates").expect(200);
    await request(app.getHttpServer()).get("/api/reports/schedules").expect(200);
    await request(app.getHttpServer()).get("/api/reports/exports").expect(200);
    await request(app.getHttpServer()).get("/api/reports/share-links").expect(200);
    await request(app.getHttpServer()).get("/api/identity/sso-connections").expect(200);
    await request(app.getHttpServer()).get("/api/identity/sessions").expect(200);
    await request(app.getHttpServer()).get("/api/identity/devices").expect(200);
    await request(app.getHttpServer()).get("/api/content/templates").expect(200);
    await request(app.getHttpServer()).get("/api/scheduling/rules").expect(200);
    await request(app.getHttpServer()).get("/api/scheduling/slots").expect(200);
    await request(app.getHttpServer()).get("/api/onboarding/checklist").expect(200);
    await request(app.getHttpServer()).get("/api/localization/capabilities").expect(200);
    await request(app.getHttpServer()).get("/api/localization/preferences").expect(200);
    await request(app.getHttpServer()).get("/api/localization/compliance-profile").expect(200);
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

  it("manages campaign operations and generates reports", async () => {
    const completedMilestone = await request(app.getHttpServer())
      .post("/api/campaigns/milestones/57575757-5757-4575-8575-575757575757/complete")
      .expect(201);

    expect(completedMilestone.body).toMatchObject({
      status: "completed",
      completedAt: expect.any(String)
    });

    const task = await request(app.getHttpServer())
      .post("/api/campaigns/66666666-6666-4666-8666-666666666666/tasks")
      .send({
        title: "Prepare executive campaign readout",
        priority: "high",
        dueDate: "2026-06-19",
        metadata: { source: "test" }
      })
      .expect(201);

    expect(task.body).toMatchObject({
      title: "Prepare executive campaign readout",
      status: "todo",
      priority: "high"
    });

    const doneTask = await request(app.getHttpServer())
      .post(`/api/campaigns/tasks/${task.body.id}/status`)
      .send({ status: "done" })
      .expect(201);

    expect(doneTask.body).toMatchObject({
      status: "done",
      completedAt: expect.any(String)
    });

    const budgetLine = await request(app.getHttpServer())
      .post("/api/campaigns/66666666-6666-4666-8666-666666666666/budget-lines")
      .send({
        category: "Analyst relations",
        allocated: 5000,
        spent: 1200,
        currency: "USD"
      })
      .expect(201);

    expect(budgetLine.body).toMatchObject({
      category: "Analyst relations",
      allocated: 5000,
      spent: 1200
    });

    const report = await request(app.getHttpServer())
      .post("/api/campaigns/66666666-6666-4666-8666-666666666666/reports/generate")
      .send({
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30"
      })
      .expect(201);

    expect(report.body.status).toBe("generated");
    expect(report.body.metrics.posts).toBeGreaterThanOrEqual(1);
    expect(report.body.insights.length).toBeGreaterThanOrEqual(2);
  });

  it("creates report templates, schedules, exports, and share links", async () => {
    const template = await request(app.getHttpServer())
      .post("/api/reports/templates")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        name: "Test executive export",
        type: "executive",
        format: "pdf",
        filters: { includeListening: true },
        branding: { primaryColor: "#0f766e" }
      })
      .expect(201);

    expect(template.body).toMatchObject({
      name: "Test executive export",
      type: "executive",
      format: "pdf"
    });

    const schedule = await request(app.getHttpServer())
      .post("/api/reports/schedules")
      .send({
        templateId: template.body.id,
        frequency: "weekly",
        recipients: ["owner@acmegrowth.test"]
      })
      .expect(201);

    expect(schedule.body).toMatchObject({
      templateId: template.body.id,
      frequency: "weekly",
      active: true
    });
    expect(schedule.body.nextRunAt).toEqual(expect.any(String));

    const reportExport = await request(app.getHttpServer())
      .post("/api/reports/exports")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        templateId: template.body.id,
        type: "executive",
        format: "pdf"
      })
      .expect(201);

    expect(reportExport.body).toMatchObject({
      templateId: template.body.id,
      status: "ready",
      format: "pdf"
    });
    expect(reportExport.body.payload.analytics.impressions).toBeGreaterThan(0);

    const shareLink = await request(app.getHttpServer())
      .post(`/api/reports/exports/${reportExport.body.id}/share-links`)
      .send({})
      .expect(201);

    expect(shareLink.body).toMatchObject({
      exportId: reportExport.body.id,
      status: "active"
    });
    expect(shareLink.body.token).toContain("rpt_");
  });

  it("creates content templates and turns them into draft posts", async () => {
    const template = await request(app.getHttpServer())
      .post("/api/content/templates")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        name: "Test launch proof template",
        category: "product_launch",
        platforms: ["linkedin", "instagram"],
        bodyTemplate: "{{product}} helps {{audience}} with {{proofPoint}}.",
        defaultHashtags: ["LaunchOps"],
        guidance: { reviewRequired: true }
      })
      .expect(201);

    expect(template.body).toMatchObject({
      name: "Test launch proof template",
      status: "active",
      variables: ["product", "audience", "proofPoint"]
    });

    const used = await request(app.getHttpServer())
      .post(`/api/content/templates/${template.body.id}/use`)
      .send({
        campaignId: "66666666-6666-4666-8666-666666666666",
        variables: {
          product: "Acme Planner",
          audience: "launch teams",
          proofPoint: "one approval workflow"
        }
      })
      .expect(201);

    expect(used.body.template.usageCount).toBe(1);
    expect(used.body.post).toMatchObject({
      status: "draft",
      campaignId: "66666666-6666-4666-8666-666666666666"
    });
    expect(used.body.post.content[0].text).toContain("Acme Planner helps launch teams");
  });

  it("recommends smart schedule slots and reserves one for a post", async () => {
    const rule = await request(app.getHttpServer())
      .post("/api/scheduling/rules")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        name: "Test LinkedIn launch window",
        platforms: ["linkedin"],
        timezone: "Asia/Calcutta",
        windows: [{ dayOfWeek: 2, startTime: "10:00", endTime: "12:00" }],
        minGapMinutes: 120,
        maxPostsPerDay: 2
      })
      .expect(201);

    expect(rule.body).toMatchObject({
      name: "Test LinkedIn launch window",
      status: "active"
    });

    const recommendations = await request(app.getHttpServer())
      .post("/api/scheduling/recommendations")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        campaignId: "66666666-6666-4666-8666-666666666666",
        platforms: ["linkedin"],
        count: 1,
        earliestAt: "2026-06-16T04:00:00.000Z"
      })
      .expect(201);

    expect(recommendations.body.generated).toHaveLength(1);
    expect(recommendations.body.generated[0]).toMatchObject({
      platform: "linkedin",
      status: "recommended"
    });

    const post = await request(app.getHttpServer())
      .post("/api/posts")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        campaignId: "66666666-6666-4666-8666-666666666666",
        content: [
          {
            platform: "linkedin",
            text: "Smart scheduled launch proof for operations teams.",
            hashtags: ["LaunchOps"]
          }
        ]
      })
      .expect(201);

    const reserved = await request(app.getHttpServer())
      .post(`/api/scheduling/slots/${recommendations.body.generated[0].id}/reserve`)
      .send({
        postId: post.body.id,
        campaignId: "66666666-6666-4666-8666-666666666666"
      })
      .expect(201);

    expect(reserved.body.slot).toMatchObject({
      status: "reserved",
      reservedAt: expect.any(String)
    });
    expect(reserved.body.enqueueResult.jobs[0]).toMatchObject({
      postId: post.body.id,
      platform: "linkedin",
      scheduledFor: recommendations.body.generated[0].startsAt
    });
  });

  it("tracks onboarding progress and step outcomes", async () => {
    const initial = await request(app.getHttpServer())
      .get("/api/onboarding/checklist")
      .expect(200);

    expect(initial.body.progress).toBeGreaterThan(0);
    expect(initial.body.steps).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "first_post", status: "in_progress" })])
    );

    const firstPostStep = initial.body.steps.find(
      (step: { key: string }) => step.key === "first_post"
    );
    const completed = await request(app.getHttpServer())
      .post(`/api/onboarding/steps/${firstPostStep.id}/complete`)
      .send({ metadata: { postId: "88888888-8888-4888-8888-888888888888" } })
      .expect(201);

    expect(completed.body.steps).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: firstPostStep.id, status: "completed" })])
    );
    expect(completed.body.progress).toBeGreaterThan(initial.body.progress);

    const inviteStep = completed.body.steps.find(
      (step: { key: string }) => step.key === "invite_team"
    );
    const skipped = await request(app.getHttpServer())
      .post(`/api/onboarding/steps/${inviteStep.id}/skip`)
      .send({ reason: "Agency workspace uses external staffing for now." })
      .expect(201);

    expect(skipped.body.steps).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: inviteStep.id, status: "skipped" })])
    );
  });

  it("updates localization preferences and regional compliance profile", async () => {
    const preference = await request(app.getHttpServer())
      .patch("/api/localization/preferences")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        userId: "77777777-7777-4777-8777-777777777777",
        locale: "hi",
        direction: "ltr",
        timezone: "Asia/Calcutta",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
        firstDayOfWeek: 1,
        numberingSystem: "latn",
        contentTranslationEnabled: true
      })
      .expect(200);

    expect(preference.body).toMatchObject({
      locale: "hi",
      timezone: "Asia/Calcutta",
      contentTranslationEnabled: true
    });

    const compliance = await request(app.getHttpServer())
      .patch("/api/localization/compliance-profile")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        dataResidency: "eu",
        primaryRegion: "eu-central-1",
        regulations: ["gdpr", "soc2"],
        consentRequired: true,
        retentionDays: 1095,
        crossBorderTransfer: false
      })
      .expect(200);

    expect(compliance.body).toMatchObject({
      dataResidency: "eu",
      primaryRegion: "eu-central-1",
      regulations: ["gdpr", "soc2"],
      retentionDays: 1095,
      crossBorderTransfer: false
    });
  });

  it("manages enterprise identity controls", async () => {
    const connection = await request(app.getHttpServer())
      .post("/api/identity/sso-connections")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        providerType: "okta",
        domain: "test-sso.acmegrowth.test",
        entityId: "https://test-sso.acmegrowth.test/app/ssm",
        ssoUrl: "https://test-sso.acmegrowth.test/app/ssm/sso/saml",
        certificateFingerprint: "SHA256:TEST-SSO-FINGERPRINT",
        metadata: { jitProvisioning: true }
      })
      .expect(201);

    expect(connection.body).toMatchObject({
      domain: "test-sso.acmegrowth.test",
      status: "draft"
    });

    const tested = await request(app.getHttpServer())
      .post(`/api/identity/sso-connections/${connection.body.id}/test`)
      .expect(201);

    expect(tested.body).toMatchObject({
      status: "active",
      lastTestedAt: expect.any(String)
    });

    const disabled = await request(app.getHttpServer())
      .post(`/api/identity/sso-connections/${connection.body.id}/disable`)
      .expect(201);

    expect(disabled.body.status).toBe("disabled");

    const revokedSession = await request(app.getHttpServer())
      .post("/api/identity/sessions/79797979-7979-4797-8797-797979797979/revoke")
      .expect(201);

    expect(revokedSession.body).toMatchObject({
      status: "revoked",
      revokedAt: expect.any(String)
    });

    const trustedDevice = await request(app.getHttpServer())
      .post("/api/identity/devices/77777776-7776-4776-8776-777777767776/trust")
      .send({ name: "Verified mobile browser" })
      .expect(201);

    expect(trustedDevice.body).toMatchObject({
      name: "Verified mobile browser",
      status: "trusted"
    });

    const revokedDevice = await request(app.getHttpServer())
      .post("/api/identity/devices/77777776-7776-4776-8776-777777767776/revoke")
      .expect(201);

    expect(revokedDevice.body).toMatchObject({
      status: "revoked",
      revokedAt: expect.any(String)
    });
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

  it("updates notification preferences and routes channel deliveries", async () => {
    const preferences = await request(app.getHttpServer())
      .patch("/api/notifications/preferences")
      .send({
        channelSettings: {
          in_app: true,
          email: true,
          slack: true
        },
        digestFrequency: "instant",
        quietHours: {
          enabled: true,
          start: "22:00",
          end: "07:00",
          timezone: "Asia/Calcutta"
        },
        mutedTypes: ["performance_milestone"]
      })
      .expect(200);

    expect(preferences.body.channelSettings.email).toBe(true);
    expect(preferences.body.mutedTypes).toContain("performance_milestone");

    const routed = await request(app.getHttpServer())
      .post("/api/notifications/route")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        userId: "77777777-7777-4777-8777-777777777777",
        type: "account_issue",
        title: "Reconnect account",
        body: "Instagram scopes need review.",
        priority: "high",
        metadata: { forceQuietHours: true }
      })
      .expect(201);

    expect(routed.body.notification.type).toBe("account_issue");
    expect(routed.body.attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: "in_app", status: "sent" }),
        expect.objectContaining({ channel: "email", status: "suppressed" })
      ])
    );
  });

  it("monitors social listening mentions and resolves alerts", async () => {
    const monitor = await request(app.getHttpServer())
      .post("/api/listening/monitors")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        type: "keyword",
        query: "AI approval delays",
        platforms: ["x"],
        alertThreshold: 10
      })
      .expect(201);

    expect(monitor.body).toMatchObject({
      query: "AI approval delays",
      status: "active"
    });

    const ingested = await request(app.getHttpServer())
      .post("/api/listening/mentions")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        monitorId: monitor.body.id,
        platform: "x",
        author: "Ops critic",
        content: "AI approval delays are hurting launch day readiness.",
        sentiment: "negative",
        reach: 50000,
        engagement: 1200,
        metadata: { source: "test" }
      })
      .expect(201);

    expect(ingested.body.mention.monitorId).toBe(monitor.body.id);
    expect(ingested.body.alert).toMatchObject({
      severity: "critical",
      resolved: false
    });

    const alerts = await request(app.getHttpServer())
      .get("/api/listening/alerts?resolved=false")
      .expect(200);

    expect(alerts.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ingested.body.alert.id })])
    );

    const resolved = await request(app.getHttpServer())
      .post(`/api/listening/alerts/${ingested.body.alert.id}/resolve`)
      .expect(201);

    expect(resolved.body.resolved).toBe(true);
    expect(resolved.body.resolvedAt).toEqual(expect.any(String));
  });

  it("evaluates AI safety checks and resolves moderation queue items", async () => {
    const evaluated = await request(app.getHttpServer())
      .post("/api/safety/evaluate")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        text: "This launch guarantees risk-free investment returns for every buyer.",
        source: "manual"
      })
      .expect(201);

    expect(evaluated.body.check).toMatchObject({
      status: "blocked",
      severity: "critical"
    });
    expect(evaluated.body.check.flags).toEqual(
      expect.arrayContaining(["financial_claim", "policy_blocked_term:risk-free investment"])
    );
    expect(evaluated.body.moderationItem.status).toBe("open");

    const resolved = await request(app.getHttpServer())
      .post(`/api/safety/moderation-queue/${evaluated.body.moderationItem.id}/resolve`)
      .send({
        status: "approved",
        resolutionNote: "Approved after compliance rewrite."
      })
      .expect(201);

    expect(resolved.body).toMatchObject({
      status: "approved",
      resolutionNote: "Approved after compliance rewrite."
    });

    const generated = await request(app.getHttpServer())
      .post("/api/ai/generate")
      .set("x-user-role", "creator")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        brief: "Create a post claiming a guaranteed return for every launch buyer.",
        platforms: ["linkedin"]
      })
      .expect(201);

    expect(generated.body.safety.blocked).toBe(true);
    expect(generated.body.safety.checkId).toEqual(expect.any(String));
    expect(generated.body.safety.moderationItemId).toEqual(expect.any(String));
  });

  it("manages brand voices and applies them to AI generation", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/brand-voices")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        name: "Test Brand Voice",
        tone: { primary: "direct", secondary: "helpful" },
        style: { sentenceLength: "short", formality: "professional" },
        vocabulary: {
          preferredTerms: ["content ops", "launch rhythm"],
          bannedTerms: ["magic"],
          industryTerms: ["campaign calendar"]
        },
        emojiUsage: "none",
        ctaPreferences: { examples: ["Plan the next content milestone."] },
        examples: ["Content ops works best when teams share one launch rhythm."]
      })
      .expect(201);

    expect(created.body).toMatchObject({
      name: "Test Brand Voice",
      version: 1
    });

    const evaluation = await request(app.getHttpServer())
      .post(`/api/brand-voices/${created.body.id}/evaluate`)
      .send({ text: "This magic campaign calendar improves content ops." })
      .expect(201);

    expect(evaluation.body.bannedTerms).toContain("magic");
    expect(evaluation.body.preferredTermsUsed).toContain("content ops");

    const updated = await request(app.getHttpServer())
      .put(`/api/brand-voices/${created.body.id}`)
      .send({ name: "Test Brand Voice Updated" })
      .expect(200);

    expect(updated.body.version).toBe(2);

    const generated = await request(app.getHttpServer())
      .post("/api/ai/generate")
      .set("x-user-role", "creator")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        brief: "Create a launch post for a practical social planning workflow.",
        platforms: ["linkedin"],
        brandVoiceId: created.body.id
      })
      .expect(201);

    expect(generated.body.modelUsed).toContain("Test Brand Voice Updated");
    expect(generated.body.variants[0].text).toContain("content ops");
  });
});
