import "reflect-metadata";
import "./env.js";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const DEMO_EMAIL = "owner@acmegrowth.test";

describe("Authentication rate limiting", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("throttles credential stuffing against the login endpoint", async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: DEMO_EMAIL, password: "definitely-wrong-1" });

    const statuses: number[] = [];
    for (let index = 0; index < 12; index += 1) {
      const response = await attempt();
      statuses.push(response.status);
    }

    expect(statuses.filter((status) => status === 401).length).toBeGreaterThan(0);
    expect(statuses).toContain(429);
  });
});
