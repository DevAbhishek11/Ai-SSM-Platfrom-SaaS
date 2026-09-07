import "reflect-metadata";

process.env.NODE_ENV ??= "test";
process.env.SESSION_IDLE_TIMEOUT_MINUTES = "30";
process.env.SESSION_MAX_PER_USER = "3";
process.env.REFRESH_TOKEN_TTL_DAYS = "7";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRotationFailure, SessionsService } from "../src/modules/auth/sessions.service.js";

const USER = "11111111-1111-4111-8111-111111111111";
const WORKSPACE = "22222222-2222-4222-8222-222222222222";

const issue = (service: SessionsService, userId = USER) =>
  service.issue({ userId, workspaceId: WORKSPACE, role: "owner" });

describe("SessionsService", () => {
  let service: SessionsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    service = new SessionsService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("issues opaque prefixed tokens and never stores them in the clear", () => {
    const { token, session } = issue(service);

    expect(token).toMatch(/^ssm_rt_[A-Za-z0-9_-]{43}$/);
    expect(session.tokenHash).toHaveLength(64);
    expect(session.tokenHash).not.toContain(token);
    expect(JSON.stringify(session)).not.toContain(token.replace("ssm_rt_", ""));
  });

  it("rotates a token and invalidates its predecessor", () => {
    const first = issue(service);
    const rotated = service.rotate(first.token);

    expect(isRotationFailure(rotated)).toBe(false);
    if (isRotationFailure(rotated)) return;

    expect(rotated.token).not.toBe(first.token);
    // Same family: rotation is a continuation of one login, not a new session.
    expect(rotated.session.familyId).toBe(first.session.familyId);
    expect(service.validate(first.session.id)).toBe("revoked");
    expect(service.validate(rotated.session.id)).toBe("active");
  });

  it("kills the whole family when a rotated token is replayed", () => {
    const first = issue(service);
    const second = service.rotate(first.token);
    if (isRotationFailure(second)) throw new Error("expected rotation to succeed");

    const replay = service.rotate(first.token);

    expect(replay).toEqual({ reason: "reuse_detected" });
    expect(service.validate(second.session.id)).toBe("revoked");
    expect(service.findById(second.session.id)?.revokedReason).toBe("refresh_token_reuse_detected");
  });

  it("rejects unknown and malformed tokens without throwing", () => {
    expect(service.rotate("ssm_rt_not-a-real-token")).toEqual({ reason: "unknown" });
    expect(service.rotate("garbage")).toEqual({ reason: "unknown" });
    expect(service.rotate("")).toEqual({ reason: "unknown" });
  });

  it("expires a session that has been idle past the inactivity window", () => {
    const { token, session } = issue(service);
    expect(service.validate(session.id)).toBe("active");

    vi.advanceTimersByTime(29 * 60 * 1000);
    expect(service.validate(session.id)).toBe("active");

    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(service.validate(session.id)).toBe("idle");
    expect(service.rotate(token)).toEqual({ reason: "idle" });
    expect(service.findById(session.id)?.revokedReason).toBe("idle_timeout");
  });

  it("slides the inactivity window forward on each touch", () => {
    const { session } = issue(service);

    for (let minute = 0; minute < 5; minute += 1) {
      vi.advanceTimersByTime(20 * 60 * 1000);
      expect(service.touch(session.id)).toBe(true);
    }

    // 100 minutes of steady activity with a 30-minute idle budget.
    expect(service.validate(session.id)).toBe("active");

    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(service.touch(session.id)).toBe(false);
    expect(service.validate(session.id)).toBe("revoked");
  });

  it("expires a session at its absolute lifetime even while in use", () => {
    const { session } = issue(service);

    // Stay well inside the 30-minute idle budget the whole time, so the only
    // thing that can end this session is the 7-day absolute lifetime.
    const stepMs = 20 * 60 * 1000;
    const steps = Math.ceil((7 * 24 * 60 * 60 * 1000) / stepMs);
    for (let step = 0; step < steps - 1; step += 1) {
      vi.advanceTimersByTime(stepMs);
      expect(service.touch(session.id)).toBe(true);
    }

    vi.advanceTimersByTime(stepMs);
    expect(service.validate(session.id)).toBe("expired");
    expect(service.touch(session.id)).toBe(false);
  });

  it("evicts the least recently used session past the concurrency limit", () => {
    const first = issue(service);
    vi.advanceTimersByTime(1000);
    const second = issue(service);
    vi.advanceTimersByTime(1000);
    const third = issue(service);
    vi.advanceTimersByTime(1000);
    const fourth = issue(service);

    expect(service.validate(first.session.id)).toBe("revoked");
    expect(service.findById(first.session.id)?.revokedReason).toBe("concurrent_session_limit");
    for (const kept of [second, third, fourth]) {
      expect(service.validate(kept.session.id)).toBe("active");
    }
    expect(service.listForUser(USER)).toHaveLength(3);
  });

  it("scopes the concurrency limit per user", () => {
    const other = "33333333-3333-4333-8333-333333333333";
    for (let index = 0; index < 3; index += 1) {
      issue(service);
      vi.advanceTimersByTime(1000);
    }
    const theirs = issue(service, other);

    expect(service.listForUser(USER)).toHaveLength(3);
    expect(service.validate(theirs.session.id)).toBe("active");
  });

  it("reports unknown ids rather than trusting a forged session claim", () => {
    expect(service.validate("44444444-4444-4444-8444-444444444444")).toBe("unknown");
    expect(service.touch("44444444-4444-4444-8444-444444444444")).toBe(false);
  });

  it("revokes every session for a user, optionally sparing the current one", () => {
    const keep = issue(service);
    vi.advanceTimersByTime(1000);
    issue(service);

    const revoked = service.revokeAllForUser(USER, "password_changed", { except: keep.session.id });

    expect(revoked).toBe(1);
    expect(service.validate(keep.session.id)).toBe("active");
  });

  it("revokes by token and ignores a second logout of the same token", () => {
    const { token, session } = issue(service);

    expect(service.revokeByToken(token)?.id).toBe(session.id);
    expect(service.revokeByToken(token)).toBeUndefined();
    expect(service.validate(session.id)).toBe("revoked");
  });

  it("exposes idle expiry alongside absolute expiry when listing sessions", () => {
    const { session } = issue(service);
    const [summary] = service.listForUser(USER, session.id);

    expect(summary.current).toBe(true);
    expect(Date.parse(summary.idleExpiresAt)).toBe(Date.parse(summary.lastUsedAt) + 30 * 60 * 1000);
    expect(Date.parse(summary.expiresAt)).toBeGreaterThan(Date.parse(summary.idleExpiresAt));
  });

  it("omits revoked and idle sessions from the listing", () => {
    const active = issue(service);
    vi.advanceTimersByTime(1000);
    const revoked = issue(service);
    service.revoke(revoked.session.id);

    expect(service.listForUser(USER).map((entry) => entry.id)).toEqual([active.session.id]);

    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(service.listForUser(USER)).toHaveLength(0);
  });
});
