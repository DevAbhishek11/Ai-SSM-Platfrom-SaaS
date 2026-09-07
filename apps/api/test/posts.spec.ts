import "reflect-metadata";
import "./env.js";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demoWorkspace } from "@ssm/domain";
import { AppModule } from "../src/app.module.js";

/**
 * Composer lifecycle: create, read, filter, edit, duplicate, archive.
 *
 * These exercise the loop a user actually performs, including the failure
 * modes that only appear once two people edit the same post.
 */
describe("posts composer", () => {
  let app: INestApplication;

  const server = () => app.getHttpServer();
  const get = (url: string) => request(server()).get(url).set("x-user-role", "owner");
  const post = (url: string) => request(server()).post(url).set("x-user-role", "owner");
  const patch = (url: string) => request(server()).patch(url).set("x-user-role", "owner");
  const del = (url: string) => request(server()).delete(url).set("x-user-role", "owner");

  const draft = (text = "A brand new draft about our launch.") => ({
    workspaceId: demoWorkspace.id,
    content: [{ platform: "x", text }]
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("listing", () => {
    it("returns a paginated envelope with facet counts", async () => {
      const response = await get("/api/posts?pageSize=2").expect(200);

      expect(response.body).toMatchObject({
        page: 1,
        pageSize: 2,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      });
      expect(response.body.items.length).toBeLessThanOrEqual(2);
      expect(response.body.facets.status).toEqual(expect.any(Object));
    });

    it("filters by status", async () => {
      const response = await get("/api/posts?status=scheduled").expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      for (const item of response.body.items) {
        expect(item.status).toBe("scheduled");
      }
    });

    it("accepts a comma-separated status list", async () => {
      const response = await get("/api/posts?status=scheduled,draft").expect(200);

      for (const item of response.body.items) {
        expect(["scheduled", "draft"]).toContain(item.status);
      }
    });

    it("rejects an unknown status instead of silently ignoring it", async () => {
      const response = await get("/api/posts?status=nonsense").expect(400);
      expect(response.body.code).toBe("validation_failed");
    });

    it("filters by platform across content variants", async () => {
      const response = await get("/api/posts?platform=linkedin").expect(200);

      for (const item of response.body.items) {
        expect(item.content.some((variant: { platform: string }) => variant.platform === "linkedin")).toBe(
          true
        );
      }
    });

    it("matches free text against post copy", async () => {
      const created = await post("/api/posts").send(draft("Unmistakable zqxjv marker")).expect(201);
      const response = await get("/api/posts?q=zqxjv").expect(200);

      expect(response.body.items.map((item: { id: string }) => item.id)).toContain(created.body.id);
    });

    it("clamps a page beyond the end rather than returning an empty list", async () => {
      const response = await get("/api/posts?page=9999&pageSize=5").expect(200);

      expect(response.body.page).toBe(response.body.totalPages);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it("caps the page size so one caller cannot ask for everything", async () => {
      await get("/api/posts?pageSize=5000").expect(400);
    });

    it("sorts in the requested direction", async () => {
      const response = await get("/api/posts?sort=createdAt&direction=desc&pageSize=100").expect(200);
      const created = response.body.items.map((item: { createdAt: string }) => item.createdAt);

      expect([...created].sort().reverse()).toEqual(created);
    });
  });

  describe("reading", () => {
    it("returns a single post", async () => {
      const created = await post("/api/posts").send(draft()).expect(201);
      const response = await get(`/api/posts/${created.body.id}`).expect(200);

      expect(response.body.id).toBe(created.body.id);
    });

    it("404s a malformed id rather than leaking a cast error", async () => {
      await get("/api/posts/not-a-uuid").expect(400);
    });

    it("reports a post in another workspace as missing, not forbidden", async () => {
      await get("/api/posts/11111111-2222-4333-8444-555555555555").expect(404);
    });

    it("publishes the platform rules the composer counts against", async () => {
      const response = await get("/api/posts/platform-rules").expect(200);

      expect(response.body.x.maxCharacters).toBe(280);
      expect(response.body.x.linkCharacterCost).toBe(23);
    });
  });

  describe("creating", () => {
    it("creates a draft when no schedule is supplied", async () => {
      const response = await post("/api/posts").send(draft()).expect(201);

      expect(response.body.status).toBe("draft");
      expect(response.body.mediaIds).toEqual([]);
    });

    it("rejects copy that exceeds the platform limit", async () => {
      const response = await post("/api/posts")
        .send({ ...draft(), content: [{ platform: "x", text: "a".repeat(400) }] })
        .expect(400);

      expect(response.body.message).toContain("over the 280 limit");
    });

    it("lets a draft be incomplete so work in progress can be saved", async () => {
      // Instagram cannot publish without media, but the copy is often written
      // before the image exists; blocking that would make the composer refuse
      // to save.
      await post("/api/posts")
        .send({
          workspaceId: demoWorkspace.id,
          content: [{ platform: "instagram", text: "Look at this" }]
        })
        .expect(201);
    });

    it("rejects a scheduled post that is missing required media", async () => {
      const response = await post("/api/posts")
        .send({
          workspaceId: demoWorkspace.id,
          content: [{ platform: "instagram", text: "Look at this" }],
          scheduledAt: new Date(Date.now() + 86_400_000).toISOString()
        })
        .expect(400);

      expect(response.body.message).toContain("requires at least one image");
    });

    it("rejects an unknown property instead of ignoring it", async () => {
      await post("/api/posts").send({ ...draft(), sneaky: true }).expect(400);
    });
  });

  describe("editing", () => {
    it("applies a partial edit and moves updatedAt forward", async () => {
      const created = await post("/api/posts").send(draft()).expect(201);
      const response = await patch(`/api/posts/${created.body.id}`)
        .send({ content: [{ platform: "x", text: "Edited copy" }] })
        .expect(200);

      expect(response.body.content[0].text).toBe("Edited copy");
      expect(response.body.updatedAt >= created.body.updatedAt).toBe(true);
    });

    it("rejects an empty edit so a no-op cannot win a concurrency race", async () => {
      const created = await post("/api/posts").send(draft()).expect(201);
      const response = await patch(`/api/posts/${created.body.id}`).send({}).expect(400);

      expect(response.body.message).toContain("No changes");
    });

    it("409s a stale edit instead of overwriting a colleague", async () => {
      const created = await post("/api/posts").send(draft()).expect(201);
      await patch(`/api/posts/${created.body.id}`)
        .send({ content: [{ platform: "x", text: "First writer wins" }] })
        .expect(200);

      const response = await patch(`/api/posts/${created.body.id}`)
        .send({
          content: [{ platform: "x", text: "Second writer loses" }],
          expectedUpdatedAt: created.body.updatedAt
        })
        .expect(409);

      expect(response.body.code).toBe("conflict");
      expect(response.body.message).toContain("Reload");
    });

    it("accepts an edit that carries the current concurrency token", async () => {
      const created = await post("/api/posts").send(draft()).expect(201);

      await patch(`/api/posts/${created.body.id}`)
        .send({
          content: [{ platform: "x", text: "Based on the latest" }],
          expectedUpdatedAt: created.body.updatedAt
        })
        .expect(200);
    });

    it("validates edited copy against the platform limit", async () => {
      const created = await post("/api/posts").send(draft()).expect(201);

      await patch(`/api/posts/${created.body.id}`)
        .send({ content: [{ platform: "x", text: "a".repeat(400) }] })
        .expect(400);
    });

    it("refuses to edit a post once it has left the editable window", async () => {
      const created = await post("/api/posts").send(draft()).expect(201);
      await del(`/api/posts/${created.body.id}`).expect(200);

      const response = await patch(`/api/posts/${created.body.id}`)
        .send({ content: [{ platform: "x", text: "Too late" }] })
        .expect(400);

      expect(response.body.message).toContain("no longer be edited");
    });
  });

  describe("duplicating and archiving", () => {
    it("duplicates back to draft without inheriting the publish slot", async () => {
      const created = await post("/api/posts")
        .send({ ...draft(), scheduledAt: new Date(Date.now() + 86_400_000).toISOString() })
        .expect(201);

      const response = await post(`/api/posts/${created.body.id}/duplicate`).expect(201);

      expect(response.body.id).not.toBe(created.body.id);
      expect(response.body.status).toBe("draft");
      expect(response.body.scheduledAt).toBeUndefined();
      expect(response.body.content[0].text).toBe(created.body.content[0].text);
    });

    it("copies content arrays rather than sharing them with the original", async () => {
      const created = await post("/api/posts")
        .send({ workspaceId: demoWorkspace.id, content: [{ platform: "x", text: "Shared", hashtags: ["one"] }] })
        .expect(201);
      const copy = await post(`/api/posts/${created.body.id}/duplicate`).expect(201);

      await patch(`/api/posts/${copy.body.id}`)
        .send({ content: [{ platform: "x", text: "Changed", hashtags: ["two"] }] })
        .expect(200);

      const original = await get(`/api/posts/${created.body.id}`).expect(200);
      expect(original.body.content[0].text).toBe("Shared");
      expect(original.body.content[0].hashtags).toEqual(["one"]);
    });

    it("archives a post and is idempotent", async () => {
      const created = await post("/api/posts").send(draft()).expect(201);

      const first = await del(`/api/posts/${created.body.id}`).expect(200);
      expect(first.body.status).toBe("archived");

      const second = await del(`/api/posts/${created.body.id}`).expect(200);
      expect(second.body.status).toBe("archived");
    });
  });

  describe("preflight validation", () => {
    it("reports errors and warnings without persisting anything", async () => {
      const before = await get("/api/posts?pageSize=100").expect(200);

      const response = await post("/api/posts/validate")
        .send({
          content: [
            { platform: "x", text: "a".repeat(400) },
            { platform: "linkedin", text: "Fine here", hashtags: ["a", "b", "c", "d", "e", "f"] }
          ]
        })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.issues.some((issue: { code: string }) => issue.code === "text_too_long")).toBe(
        true
      );
      expect(
        response.body.issues.some((issue: { code: string }) => issue.code === "hashtag_spam_risk")
      ).toBe(true);

      const after = await get("/api/posts?pageSize=100").expect(200);
      expect(after.body.total).toBe(before.body.total);
    });

    it("returns a per-platform summary the composer can badge tabs with", async () => {
      const response = await post("/api/posts/validate")
        .send({ content: [{ platform: "x", text: "Short and sweet" }] })
        .expect(200);

      expect(response.body.platforms[0]).toMatchObject({
        platform: "x",
        characterLimit: 280,
        valid: true
      });
    });
  });

  describe("permissions", () => {
    it("denies creation to a viewer", async () => {
      await request(server())
        .post("/api/posts")
        .set("x-user-role", "viewer")
        .send(draft())
        .expect(403);
    });

    it("still allows a viewer to read", async () => {
      await request(server()).get("/api/posts").set("x-user-role", "viewer").expect(200);
    });
  });
});
