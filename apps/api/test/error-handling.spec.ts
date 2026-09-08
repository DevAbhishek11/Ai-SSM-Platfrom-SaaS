import "reflect-metadata";
import "./env-lockout.js";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const DEMO_EMAIL = "owner@acmegrowth.test";
const DEMO_PASSWORD = "demo-password-change-me";

/**
 * Every response the API can produce for a failure has to be recognisable,
 * machine-readable, and free of internal detail. These specs pin that contract
 * from the outside, through the real global filter and validation pipe.
 */
describe("Error envelope and hardening", () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();

  const login = async () => {
    const response = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(201);
    return response.body as { accessToken: string; refreshToken: string; sessionId: string };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the standard envelope for an unknown route", async () => {
    const response = await request(server()).get("/api/does-not-exist").expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: "not_found",
      path: "/api/does-not-exist"
    });
    expect(typeof response.body.message).toBe("string");
    expect(response.body.requestId).toBeTruthy();
    expect(Date.parse(response.body.timestamp)).not.toBeNaN();
  });

  it("echoes the caller's request id so a failure can be traced end to end", async () => {
    const requestId = "11111111-2222-4333-8444-555555555555";
    const response = await request(server())
      .get("/api/does-not-exist")
      .set("x-request-id", requestId)
      .expect(404);

    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body.requestId).toBe(requestId);
  });

  it("reports validation failures per field", async () => {
    const response = await request(server())
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "short", name: "" })
      .expect(400);

    expect(response.body.code).toBe("validation_failed");
    expect(response.body.fieldErrors).toBeDefined();
    expect(Object.keys(response.body.fieldErrors)).toEqual(
      expect.arrayContaining(["email", "password", "name"])
    );
    expect(response.body.fieldErrors.email.join(" ")).toMatch(/email/i);
  });

  it("rejects unknown properties instead of silently dropping them", async () => {
    const response = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD, role: "owner" })
      .expect(400);

    expect(response.body.code).toBe("validation_failed");
    expect(JSON.stringify(response.body.fieldErrors)).toMatch(/role/);
  });

  it("tags authentication failures with a machine-readable code", async () => {
    const anonymous = await request(server()).get("/api/auth/me").expect(401);
    expect(anonymous.body.code).toBe("unauthorized");

    const tampered = await request(server())
      .get("/api/auth/me")
      .set("authorization", "Bearer not.a.jwt")
      .expect(401);
    expect(tampered.body.code).toBe("invalid_token");

    const bad = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: "wrong-password-entirely" })
      .expect(401);
    expect(bad.body.code).toBe("invalid_credentials");
    expect(bad.body.message).toBe("Invalid email or password");
  });

  it("never leaks a stack trace or internal field on an error response", async () => {
    const response = await request(server()).get("/api/does-not-exist").expect(404);
    const serialized = JSON.stringify(response.body);

    expect(serialized).not.toMatch(/at .+\(/);
    expect(response.body).not.toHaveProperty("stack");
    expect(serialized).not.toMatch(/node_modules/);
  });

  it("invalidates the access token the moment the session is revoked", async () => {
    const session = await login();

    await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    await request(server())
      .post("/api/auth/logout")
      .set("authorization", `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    // The JWT is still cryptographically valid for ~15 minutes; the session
    // check is what stops it from being usable.
    const afterLogout = await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${session.accessToken}`)
      .expect(401);

    expect(afterLogout.body.code).toBe("session_revoked");
  });

  it("kills sibling access tokens when a session is revoked from the session list", async () => {
    const first = await login();
    const second = await login();

    await request(server())
      .post(`/api/auth/sessions/${second.sessionId}/revoke`)
      .set("authorization", `Bearer ${first.accessToken}`)
      .expect(200);

    const revoked = await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${second.accessToken}`)
      .expect(401);
    expect(revoked.body.code).toBe("session_revoked");

    await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${first.accessToken}`)
      .expect(200);
  });

  it("does not reveal whether another user's session id exists", async () => {
    const session = await login();

    const response = await request(server())
      .post("/api/auth/sessions/99999999-9999-4999-8999-999999999999/revoke")
      .set("authorization", `Bearer ${session.accessToken}`)
      .expect(404);

    expect(response.body.code).toBe("not_found");
    expect(response.body.message).toBe("Session not found");
  });

  it("returns a reason code and Retry-After once an account is locked out", async () => {
    const email = `lockout.${Date.now()}@northwind.test`;
    await request(server())
      .post("/api/auth/register")
      .send({ email, password: "Correct-Horse-9-Battery", name: "Lockout Probe" })
      .expect(201);

    let lastStatus = 0;
    let body: Record<string, unknown> = {};
    let headers: Record<string, string> = {};
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await request(server())
        .post("/api/auth/login")
        .send({ email, password: "definitely-not-the-password" });
      lastStatus = response.status;
      body = response.body;
      headers = response.headers;
    }

    expect(lastStatus).toBe(429);
    expect(body.code).toBe("account_locked");
    expect(headers["retry-after"]).toBeDefined();
    expect(Number(headers["retry-after"])).toBeGreaterThan(0);

    // The lock must survive a correct password: that is the whole point.
    const withRealPassword = await request(server())
      .post("/api/auth/login")
      .send({ email, password: "Correct-Horse-9-Battery" })
      .expect(429);
    expect(withRealPassword.body.code).toBe("account_locked");
  });

  it("clears the failure counter after a successful sign-in", async () => {
    const email = `recovers.${Date.now()}@northwind.test`;
    const password = "Correct-Horse-9-Battery";
    await request(server())
      .post("/api/auth/register")
      .send({ email, password, name: "Recovery Probe" })
      .expect(201);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(server()).post("/api/auth/login").send({ email, password: "nope-nope-nope" }).expect(401);
    }

    await request(server()).post("/api/auth/login").send({ email, password }).expect(201);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await request(server())
        .post("/api/auth/login")
        .send({ email, password: "nope-nope-nope" });
      expect(response.status).toBe(401);
    }
  });

  it("reports a refresh failure as a session failure with the standard envelope", async () => {
    // Reuse detection itself is exercised in refresh-reuse.spec.ts, which runs
    // with the concurrency grace window disabled. What matters here is the
    // shape of the answer.
    const rejected = await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: "ssm_rt_this-token-was-never-issued-at-all" })
      .expect(401);

    expect(rejected.body.code).toBe("session_expired");
    expect(rejected.body.message).toBe("Invalid or expired refresh token");
    expect(rejected.body).toMatchObject({
      requestId: expect.any(String),
      timestamp: expect.any(String),
      path: "/api/auth/refresh",
      statusCode: 401
    });
  });
});
