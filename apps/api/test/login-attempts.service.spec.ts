import "reflect-metadata";

process.env.NODE_ENV ??= "test";
process.env.AUTH_MAX_FAILED_LOGINS = "4";
process.env.AUTH_LOCKOUT_MINUTES = "10";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginAttemptsService } from "../src/modules/auth/login-attempts.service.js";

const EMAIL = "victim@example.test";

describe("LoginAttemptsService", () => {
  let service: LoginAttemptsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    service = new LoginAttemptsService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts unlocked with no recorded attempts", () => {
    expect(service.status(EMAIL)).toEqual({
      locked: false,
      retryAfterSeconds: 0,
      failedAttempts: 0
    });
  });

  it("locks the identity once the failure budget is exhausted", () => {
    for (let attempt = 1; attempt < 4; attempt += 1) {
      expect(service.recordFailure(EMAIL).locked).toBe(false);
    }

    const locked = service.recordFailure(EMAIL);

    expect(locked.locked).toBe(true);
    expect(locked.failedAttempts).toBe(4);
    expect(locked.retryAfterSeconds).toBeGreaterThan(0);
    expect(locked.retryAfterSeconds).toBeLessThanOrEqual(600);
  });

  it("lifts the lock once the cooldown elapses", () => {
    for (let attempt = 0; attempt < 4; attempt += 1) service.recordFailure(EMAIL);
    expect(service.status(EMAIL).locked).toBe(true);

    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(service.status(EMAIL).locked).toBe(true);

    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(service.status(EMAIL)).toEqual({
      locked: false,
      retryAfterSeconds: 0,
      failedAttempts: 0
    });
  });

  it("forgives a stale run of failures outside the observation window", () => {
    service.recordFailure(EMAIL);
    service.recordFailure(EMAIL);

    vi.advanceTimersByTime(31 * 60 * 1000);

    expect(service.status(EMAIL).failedAttempts).toBe(0);
    expect(service.recordFailure(EMAIL).failedAttempts).toBe(1);
  });

  it("clears the counter on a successful sign-in", () => {
    service.recordFailure(EMAIL);
    service.recordFailure(EMAIL);
    service.recordSuccess(EMAIL);

    expect(service.status(EMAIL).failedAttempts).toBe(0);
  });

  it("tracks identities independently and case-insensitively", () => {
    for (let attempt = 0; attempt < 4; attempt += 1) service.recordFailure(EMAIL);

    expect(service.status(EMAIL.toUpperCase()).locked).toBe(true);
    expect(service.status(` ${EMAIL} `).locked).toBe(true);
    expect(service.status("someone.else@example.test").locked).toBe(false);
  });
});
