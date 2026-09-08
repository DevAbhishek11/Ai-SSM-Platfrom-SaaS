import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { getEnv } from "../../common/env.js";

export type LockoutState = {
  locked: boolean;
  /** Seconds until the lock lifts; 0 when not locked. */
  retryAfterSeconds: number;
  failedAttempts: number;
};

type AttemptRecord = {
  failedAttempts: number;
  firstFailureAt: number;
  lockedUntil?: number;
};

/**
 * Per-identity sign-in lockout.
 *
 * The global throttler bounds requests per IP; this bounds guesses per *account*,
 * which is what actually stops a distributed credential-stuffing run against one
 * known address. Identities are stored as salted digests so the map never holds
 * plaintext email addresses.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, AttemptRecord>();

  /** Window after which an unfinished run of failures is forgiven. */
  private readonly windowMs = 30 * 60 * 1000;

  status(identity: string): LockoutState {
    const key = this.keyFor(identity);
    const record = this.attempts.get(key);

    if (!record) {
      return { locked: false, retryAfterSeconds: 0, failedAttempts: 0 };
    }

    if (record.lockedUntil && record.lockedUntil > Date.now()) {
      return {
        locked: true,
        retryAfterSeconds: Math.ceil((record.lockedUntil - Date.now()) / 1000),
        failedAttempts: record.failedAttempts
      };
    }

    if (record.lockedUntil && record.lockedUntil <= Date.now()) {
      this.attempts.delete(key);
      return { locked: false, retryAfterSeconds: 0, failedAttempts: 0 };
    }

    if (Date.now() - record.firstFailureAt > this.windowMs) {
      this.attempts.delete(key);
      return { locked: false, retryAfterSeconds: 0, failedAttempts: 0 };
    }

    return { locked: false, retryAfterSeconds: 0, failedAttempts: record.failedAttempts };
  }

  /** Records a failure and returns the resulting state (possibly locked). */
  recordFailure(identity: string): LockoutState {
    const env = getEnv();
    const key = this.keyFor(identity);
    const now = Date.now();
    const existing = this.attempts.get(key);

    const record: AttemptRecord =
      existing && now - existing.firstFailureAt <= this.windowMs
        ? existing
        : { failedAttempts: 0, firstFailureAt: now };

    record.failedAttempts += 1;

    if (record.failedAttempts >= env.AUTH_MAX_FAILED_LOGINS) {
      record.lockedUntil = now + env.AUTH_LOCKOUT_MINUTES * 60 * 1000;
    }

    this.attempts.set(key, record);
    return this.status(identity);
  }

  /** Clears the counter after a successful sign-in. */
  recordSuccess(identity: string): void {
    this.attempts.delete(this.keyFor(identity));
  }

  /** Test hook. */
  reset(): void {
    this.attempts.clear();
  }

  private keyFor(identity: string): string {
    return createHash("sha256")
      .update(`login-attempts:${identity.trim().toLowerCase()}`)
      .digest("hex");
  }
}
