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
    await request(app.getHttpServer()).get("/api/webhooks/deliveries").expect(200);
  });
});
