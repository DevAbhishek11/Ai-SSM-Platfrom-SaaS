import "reflect-metadata";
import "./env-strict-rotation.js";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const DEMO_EMAIL = "owner@acmegrowth.test";
const DEMO_PASSWORD = "demo-password-change-me";

/**
 * Reuse detection with the concurrency grace window disabled.
 *
 * The grace window exists so racing tabs are not mistaken for an attacker, but
 * it must not be the only thing standing between a stolen refresh token and a
 * live session. With it off, the original guarantee has to hold exactly.
 */
describe("refresh token reuse detection (no grace window)", () => {
  let app: INestApplication;

  const server = () => app.getHttpServer();

  const login = async () => {
    const response = await request(server())
      .post("/api/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(201);
    return response.body as { accessToken: string; refreshToken: string };
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

  it("rejects a consumed token", async () => {
    const session = await login();

    await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it("revokes the whole family when a consumed token is replayed", async () => {
    // The stolen-token scenario: the attacker replays a token the real user has
    // already spent, so both of them lose the session and the user has to sign
    // in again. That is the intended outcome.
    const session = await login();

    const rotated = await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(401);

    await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
  });

  it("does not leak which failure mode occurred", async () => {
    const session = await login();
    await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    const replayed = await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    const unknown = await request(server())
      .post("/api/auth/refresh")
      .send({ refreshToken: "ssm_rt_totally-made-up-token-value-here" })
      .expect(401);

    expect(replayed.body.message).toBe(unknown.body.message);
    expect(replayed.body.code).toBe(unknown.body.code);
  });
});
