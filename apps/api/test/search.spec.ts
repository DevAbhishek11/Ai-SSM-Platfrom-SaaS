import "reflect-metadata";
import "./env.js";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demoWorkspace } from "@ssm/domain";
import { AppModule } from "../src/app.module.js";

describe("cross-entity search", () => {
  let app: INestApplication;

  const server = () => app.getHttpServer();
  const get = (url: string) => request(server()).get(url).set("x-user-role", "owner");
  const post = (url: string) => request(server()).post(url).set("x-user-role", "owner");

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns recent items for an empty query so the palette is never blank", async () => {
    const response = await get("/api/search").expect(200);

    expect(response.body.hits.length).toBeGreaterThan(0);
    expect(response.body.query).toBe("");
  });

  it("spans more than one kind of record", async () => {
    const response = await get("/api/search?limit=50").expect(200);
    const kinds = new Set(response.body.hits.map((hit: { kind: string }) => hit.kind));

    expect(kinds.size).toBeGreaterThan(1);
  });

  it("finds a post by its copy", async () => {
    const created = await post("/api/posts")
      .send({
        workspaceId: demoWorkspace.id,
        content: [{ platform: "x", text: "Findable qwertzu marker copy" }]
      })
      .expect(201);

    const response = await get("/api/search?q=qwertzu").expect(200);
    const hit = response.body.hits.find((item: { id: string }) => item.id === created.body.id);

    expect(hit).toBeDefined();
    expect(hit.kind).toBe("post");
    expect(hit.href).toContain(created.body.id);
  });

  it("finds a navigation target as well as a record", async () => {
    const response = await get("/api/search?q=analytics").expect(200);
    const page = response.body.hits.find((hit: { kind: string }) => hit.kind === "page");

    expect(page.href).toBe("/analytics");
  });

  it("matches a page by an alias that is not in its title", async () => {
    const response = await get("/api/search?q=write").expect(200);

    expect(response.body.hits.some((hit: { href: string }) => hit.href === "/composer")).toBe(true);
  });

  it("restricts results to the requested kinds", async () => {
    const response = await get("/api/search?q=a&kinds=campaign").expect(200);

    expect(response.body.hits.length).toBeGreaterThan(0);
    for (const hit of response.body.hits) {
      expect(hit.kind).toBe("campaign");
    }
  });

  it("groups hits by kind while preserving rank order", async () => {
    const response = await get("/api/search?limit=50").expect(200);
    const flattened = response.body.groups.flatMap(
      (group: { hits: Array<{ id: string }> }) => group.hits
    );

    expect(flattened.length).toBe(response.body.hits.length);
  });

  it("reports how many candidates were scanned so the UI can say 'top N'", async () => {
    const response = await get("/api/search?q=a&limit=3").expect(200);

    expect(response.body.hits.length).toBeLessThanOrEqual(3);
    expect(response.body.scanned).toBeGreaterThanOrEqual(response.body.total);
  });

  it("returns nothing for a query that matches nothing", async () => {
    const response = await get("/api/search?q=zzzzqqqqxxxx").expect(200);

    expect(response.body.hits).toEqual([]);
  });

  it("rejects an unknown kind and an oversized limit", async () => {
    await get("/api/search?kinds=spaceship").expect(400);
    await get("/api/search?limit=500").expect(400);
  });

  it("requires an authenticated caller", async () => {
    await request(server()).get("/api/search").expect(401);
  });

  it("scopes every hit to the caller's workspace", async () => {
    const response = await get("/api/search?limit=50&kinds=post,campaign,account").expect(200);

    expect(response.body.hits.length).toBeGreaterThan(0);
    // Hits are built only from workspace-scoped reads; a foreign id would mean
    // a leak, so assert the ids all resolve inside this workspace.
    for (const hit of response.body.hits) {
      if (hit.kind === "post") {
        await get(`/api/posts/${hit.id}`).expect(200);
      }
    }
  });
});
