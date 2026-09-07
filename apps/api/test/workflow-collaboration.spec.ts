import "reflect-metadata";
import "./env.js";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demoWorkspace } from "@ssm/domain";
import { AppModule } from "../src/app.module.js";

describe("workflow collaboration and bulk actions", () => {
  let app: INestApplication;

  const server = () => app.getHttpServer();
  const get = (url: string) => request(server()).get(url).set("x-user-role", "owner");
  const post = (url: string) => request(server()).post(url).set("x-user-role", "owner");

  const createDraft = async (text = "Draft awaiting review") => {
    const response = await post("/api/posts")
      .send({ workspaceId: demoWorkspace.id, content: [{ platform: "x", text }] })
      .expect(201);
    return response.body.id as string;
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

  describe("comments", () => {
    it("adds a comment without moving the post", async () => {
      const postId = await createDraft();
      const response = await post(`/api/workflow/posts/${postId}/comments`)
        .send({ body: "Tighten the hook please." })
        .expect(201);

      expect(response.body.resolved).toBe(false);
      expect(response.body.postId).toBe(postId);

      const timeline = await get(`/api/workflow/posts/${postId}/timeline`).expect(200);
      expect(timeline.body.post.status).toBe("draft");
      expect(timeline.body.comments.at(-1).body).toBe("Tighten the hook please.");
    });

    it("records the comment on the timeline as an event", async () => {
      const postId = await createDraft();
      await post(`/api/workflow/posts/${postId}/comments`).send({ body: "Noted." }).expect(201);

      const timeline = await get(`/api/workflow/posts/${postId}/timeline`).expect(200);
      expect(timeline.body.events.some((event: { action: string }) => event.action === "commented")).toBe(
        true
      );
    });

    it("resolves a comment", async () => {
      const postId = await createDraft();
      const comment = await post(`/api/workflow/posts/${postId}/comments`)
        .send({ body: "Fix the link." })
        .expect(201);

      const resolved = await post(`/api/workflow/posts/comments/${comment.body.id}/resolve`).expect(200);
      expect(resolved.body.resolved).toBe(true);
    });

    it("rejects an empty comment body", async () => {
      const postId = await createDraft();
      await post(`/api/workflow/posts/${postId}/comments`).send({ body: "" }).expect(400);
    });

    it("404s a comment on a post that does not exist", async () => {
      await post("/api/workflow/posts/11111111-2222-4333-8444-555555555555/comments")
        .send({ body: "hello" })
        .expect(404);
    });

    it("404s resolving an unknown comment", async () => {
      await post("/api/workflow/posts/comments/11111111-2222-4333-8444-555555555555/resolve").expect(
        404
      );
    });
  });

  describe("bulk actions", () => {
    it("applies one action to many posts", async () => {
      const ids = [await createDraft("Bulk one"), await createDraft("Bulk two")];
      const response = await post("/api/workflow/posts/bulk")
        .send({ postIds: ids, action: "submit" })
        .expect(200);

      expect(response.body).toMatchObject({ action: "submit", requested: 2, succeeded: 2, failed: 0 });
      for (const result of response.body.results) {
        expect(result.status).toBe("in_review");
      }
    });

    it("reports per-item outcomes instead of failing the whole batch", async () => {
      const good = await createDraft("Bulk good");
      const alreadyMoved = await createDraft("Bulk moved");
      await post("/api/workflow/posts/bulk").send({ postIds: [alreadyMoved], action: "submit" }).expect(200);
      await post("/api/workflow/posts/bulk").send({ postIds: [alreadyMoved], action: "approve" }).expect(200);

      // `approve` is not reachable from `draft`, so the first id fails while the
      // second - already in review - succeeds.
      const response = await post("/api/workflow/posts/bulk")
        .send({ postIds: [good, alreadyMoved], action: "submit" })
        .expect(200);

      expect(response.body.succeeded).toBe(1);
      expect(response.body.failed).toBe(1);

      const failure = response.body.results.find((result: { ok: boolean }) => !result.ok);
      expect(failure.postId).toBe(alreadyMoved);
      expect(failure.error).toContain("Cannot transition");
    });

    it("de-duplicates repeated ids so an action is applied once", async () => {
      const id = await createDraft("Bulk duplicate");
      const response = await post("/api/workflow/posts/bulk")
        .send({ postIds: [id, id, id], action: "submit" })
        .expect(200);

      expect(response.body.requested).toBe(1);
      expect(response.body.succeeded).toBe(1);
    });

    it("reports a missing post as a failed item, not a 404 for the batch", async () => {
      const id = await createDraft("Bulk mixed");
      const response = await post("/api/workflow/posts/bulk")
        .send({ postIds: [id, "11111111-2222-4333-8444-555555555555"], action: "submit" })
        .expect(200);

      expect(response.body.succeeded).toBe(1);
      expect(response.body.results[1].error).toContain("not found");
    });

    it("caps the batch size", async () => {
      const ids = Array.from({ length: 51 }, () => "11111111-2222-4333-8444-555555555555");
      await post("/api/workflow/posts/bulk").send({ postIds: ids, action: "submit" }).expect(400);
    });

    it("rejects an unknown action and an empty selection", async () => {
      await post("/api/workflow/posts/bulk")
        .send({ postIds: ["11111111-2222-4333-8444-555555555555"], action: "detonate" })
        .expect(400);
      await post("/api/workflow/posts/bulk").send({ postIds: [], action: "submit" }).expect(400);
    });

    it("archives in bulk", async () => {
      const ids = [await createDraft("Archive one"), await createDraft("Archive two")];
      const response = await post("/api/workflow/posts/bulk")
        .send({ postIds: ids, action: "archive" })
        .expect(200);

      expect(response.body.succeeded).toBe(2);
      for (const result of response.body.results) {
        expect(result.status).toBe("archived");
      }
    });

    it("blocks scheduling a post that would fail at the network", async () => {
      // Saved as a draft without media, which Instagram cannot publish. The
      // draft is legal; committing it to a publish slot is not.
      const created = await post("/api/posts")
        .send({
          workspaceId: demoWorkspace.id,
          content: [{ platform: "instagram", text: "Needs an image" }]
        })
        .expect(201);

      await post(`/api/workflow/posts/${created.body.id}/submit`).send({ comment: "ready" }).expect(201);
      await post(`/api/workflow/posts/${created.body.id}/approve`).send({ comment: "ok" }).expect(201);

      const response = await post(`/api/workflow/posts/${created.body.id}/schedule`)
        .send({ scheduledAt: new Date(Date.now() + 86_400_000).toISOString() })
        .expect(400);

      expect(response.body.message).toContain("requires at least one image");
    });

    it("denies bulk review actions to a creator", async () => {
      const id = await createDraft("Permission check");
      await request(server())
        .post("/api/workflow/posts/bulk")
        .set("x-user-role", "creator")
        .send({ postIds: [id], action: "approve" })
        .expect(403);
    });
  });
});
