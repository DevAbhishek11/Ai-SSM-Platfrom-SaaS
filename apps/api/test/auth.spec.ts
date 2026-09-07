import "reflect-metadata";
import "./env-strict.js";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const DEMO_EMAIL = "owner@acmegrowth.test";
const DEMO_PASSWORD = "demo-password-change-me";

const uniqueEmail = (label: string) => `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@northwind.test`;

describe("Authentication and session lifecycle", () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      // Rate limiting has its own spec (auth-rate-limit.spec.ts); THROTTLE_DISABLED
      // keeps the lifecycle tests from tripping the login/register budgets.
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("keeps liveness and readiness probes public", async () => {
    await request(server()).get("/api/health").expect(200);
    await request(server()).get("/api/ready").expect(200);
  });

  it("denies anonymous access to business endpoints", async () => {
    await request(server()).get("/api/dashboard/overview").expect(401);
    await request(server()).get("/api/auth/me").expect(401);
  });

  it("ignores x-user-role headers when dev headers are disabled", async () => {
    // This header used to be sufficient to act as the workspace owner.
    await request(server())
      .get("/api/dashboard/overview")
      .set("x-user-role", "owner")
      .expect(401);

    await request(server())
      .post("/api/posts")
      .set("x-user-role", "owner")
      .send({
        workspaceId: "11111111-1111-4111-8111-111111111111",
        content: [{ platform: "linkedin", text: "Should never be created.", hashtags: [] }]
      })
      .expect(401);
  });

  it("signs in the seeded demo owner and authorizes protected routes", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(201);

    expect(login.body).toMatchObject({
      tokenType: "Bearer",
      role: "owner",
      workspace: { workspaceId: "11111111-1111-4111-8111-111111111111" }
    });
    expect(login.body.accessToken).toEqual(expect.any(String));
    expect(login.body.refreshToken).toMatch(/^ssm_rt_/);
    expect(login.body.user).not.toHaveProperty("passwordHash");
    expect(login.body.permissions).toContain("workspace.manage");

    const overview = await request(server())
      .get("/api/dashboard/overview")
      .set("authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(overview.body.metrics.connectedAccounts).toBe(2);
  });

  it("rejects bad credentials without disclosing whether the account exists", async () => {
    const unknown = await request(server())
      .post("/api/auth/login")
      .send({ email: "nobody@northwind.test", password: "some-password-1" })
      .expect(401);

    const wrongPassword = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: "not-the-password-1" })
      .expect(401);

    expect(unknown.body.message).toBe("Invalid email or password");
    expect(wrongPassword.body.message).toBe(unknown.body.message);
  });

  it("registers an account with its own workspace and rejects duplicates", async () => {
    const email = uniqueEmail("ada");
    const registered = await request(server())
      .post("/api/auth/register")
      .send({
        email,
        password: "correct-horse-42",
        name: "Ada Lovelace",
        workspaceName: "Northwind Social"
      })
      .expect(201);

    expect(registered.body).toMatchObject({
      role: "owner",
      workspace: { workspaceName: "Northwind Social", role: "owner" }
    });
    expect(registered.body.user.email).toBe(email);
    expect(registered.body.workspace.workspaceSlug).toMatch(/^northwind-social-[0-9a-f]{4}$/);

    const me = await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${registered.body.accessToken}`)
      .expect(200);

    expect(me.body.user.email).toBe(email);
    expect(me.body.workspace.workspaceId).toBe(registered.body.workspace.workspaceId);
    expect(me.body.permissions).toContain("ai.generate");

    const duplicate = await request(server())
      .post("/api/auth/register")
      .send({ email, password: "another-strong-1", name: "Imposter" })
      .expect(400);

    expect(duplicate.body.message).toContain("already exists");
  });

  it("enforces the password policy at registration", async () => {
    const short = await request(server())
      .post("/api/auth/register")
      .send({ email: uniqueEmail("weak"), password: "short1", name: "Weak Password" })
      .expect(400);
    expect(JSON.stringify(short.body.message)).toMatch(/10 characters/);

    const lettersOnly = await request(server())
      .post("/api/auth/register")
      .send({ email: uniqueEmail("letters"), password: "onlylettershere", name: "Letters Only" })
      .expect(400);
    expect(JSON.stringify(lettersOnly.body.message)).toMatch(/number or symbol/);

    const email = uniqueEmail("selfref");
    const containsEmail = await request(server())
      .post("/api/auth/register")
      .send({ email, password: `${email.split("@")[0]}-1`, name: "Self Reference" })
      .expect(400);
    expect(JSON.stringify(containsEmail.body.message)).toMatch(/email address/);
  });

  it("rotates refresh tokens", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(201);

    const rotated = await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);

    expect(rotated.body.refreshToken).not.toBe(login.body.refreshToken);
    expect(rotated.body.accessToken).toEqual(expect.any(String));
  });

  it("keeps the session alive when two tabs refresh at the same moment", async () => {
    // The browser does this constantly: the access cookie lapses, then a
    // prefetch, a navigation and a couple of panel fetches all present the same
    // refresh token within milliseconds. Signing the user out for that is a bug.
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(201);

    const [tabA, tabB, tabC] = await Promise.all([
      request(server()).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken }),
      request(server()).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken }),
      request(server()).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken })
    ]);

    expect([tabA.status, tabB.status, tabC.status]).toEqual([200, 200, 200]);
    // All three converge on one replacement, so whichever response lands last
    // leaves the browser holding a token that works.
    expect(tabB.body.refreshToken).toBe(tabA.body.refreshToken);
    expect(tabC.body.refreshToken).toBe(tabA.body.refreshToken);

    // And the survivor is genuinely usable, rather than a token from a family
    // that has already been revoked.
    await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${tabA.body.accessToken}`)
      .expect(200);

    await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: tabA.body.refreshToken })
      .expect(200);
  });

  it("revokes the session on logout so its access token stops working", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(201);

    await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);

    await request(server())
      .post("/api/auth/logout")
      .set("authorization", `Bearer ${login.body.accessToken}`)
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);

    // Access tokens are short-lived but must not outlive an explicit logout.
    await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${login.body.accessToken}`)
      .expect(401);

    await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
  });

  it("lists and revokes sessions for the current account", async () => {
    const first = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(201);
    const second = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .set("user-agent", "vitest-second-device")
      .expect(201);

    const sessions = await request(server())
      .get("/api/auth/sessions")
      .set("authorization", `Bearer ${second.body.accessToken}`)
      .expect(200);

    expect(sessions.body.length).toBeGreaterThanOrEqual(2);
    expect(sessions.body.some((session: { current: boolean }) => session.current)).toBe(true);

    await request(server())
      .post(`/api/auth/sessions/${first.body.sessionId}/revoke`)
      .set("authorization", `Bearer ${second.body.accessToken}`)
      .expect(200);

    await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${first.body.accessToken}`)
      .expect(401);
  });

  it("changes a password, invalidates old sessions, and accepts the new credentials", async () => {
    const email = uniqueEmail("rotator");
    const registered = await request(server())
      .post("/api/auth/register")
      .send({ email, password: "initial-secret-9", name: "Rita Rotator" })
      .expect(201);

    await request(server())
      .patch("/api/auth/password")
      .set("authorization", `Bearer ${registered.body.accessToken}`)
      .send({ currentPassword: "wrong-current-1", newPassword: "second-secret-9" })
      .expect(401);

    const changed = await request(server())
      .patch("/api/auth/password")
      .set("authorization", `Bearer ${registered.body.accessToken}`)
      .send({ currentPassword: "initial-secret-9", newPassword: "second-secret-9" })
      .expect(200);

    expect(changed.body.revokedSessions).toBeGreaterThanOrEqual(1);

    await request(server())
      .get("/api/auth/me")
      .set("authorization", `Bearer ${registered.body.accessToken}`)
      .expect(401);

    await request(server())
      .post("/api/auth/login")
      .send({ email, password: "initial-secret-9" })
      .expect(401);

    await request(server())
      .post("/api/auth/login")
      .send({ email, password: "second-secret-9" })
      .expect(201);
  });

  it("updates the account profile", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(201);

    const updated = await request(server())
      .patch("/api/auth/profile")
      .set("authorization", `Bearer ${login.body.accessToken}`)
      .send({ name: "Mira S.", timezone: "Europe/Berlin" })
      .expect(200);

    expect(updated.body).toMatchObject({ name: "Mira S.", timezone: "Europe/Berlin" });
  });

  it("rejects tampered and malformed bearer tokens", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(201);

    const [header, payload] = String(login.body.accessToken).split(".");
    const tampered = `${header}.${payload}.aW52YWxpZC1zaWduYXR1cmU`;

    await request(server()).get("/api/auth/me").set("authorization", `Bearer ${tampered}`).expect(401);
    await request(server()).get("/api/auth/me").set("authorization", "Bearer not-a-jwt").expect(401);
    await request(server()).get("/api/auth/me").set("authorization", "Basic dXNlcjpwYXNz").expect(401);
  });
});
