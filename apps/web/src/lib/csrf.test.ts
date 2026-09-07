import { describe, expect, it } from "vitest";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  generateCsrfToken,
  isSafeMethod,
  isSameOrigin,
  readCsrfCookie,
  timingSafeEquals
} from "./csrf";

describe("CSRF primitives", () => {
  it("exposes the cookie and header names both sides agree on", () => {
    expect(CSRF_COOKIE).toBe("ssm_csrf");
    expect(CSRF_HEADER).toBe("x-csrf-token");
  });

  it("generates unpredictable 256-bit hex tokens", () => {
    const tokens = new Set(Array.from({ length: 64 }, () => generateCsrfToken()));

    expect(tokens.size).toBe(64);
    for (const token of tokens) {
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("treats only read methods as safe", () => {
    for (const method of ["GET", "get", "HEAD", "OPTIONS"]) {
      expect(isSafeMethod(method)).toBe(true);
    }
    for (const method of ["POST", "patch", "PUT", "DELETE"]) {
      expect(isSafeMethod(method)).toBe(false);
    }
  });

  describe("timingSafeEquals", () => {
    it("matches identical tokens", () => {
      const token = generateCsrfToken();
      expect(timingSafeEquals(token, token)).toBe(true);
    });

    it("rejects mismatches, empty values and undefined", () => {
      const token = generateCsrfToken();
      expect(timingSafeEquals(token, generateCsrfToken())).toBe(false);
      expect(timingSafeEquals(token, `${token}0`)).toBe(false);
      expect(timingSafeEquals(token, token.slice(0, -1))).toBe(false);
      expect(timingSafeEquals("", "")).toBe(false);
      expect(timingSafeEquals(token, undefined)).toBe(false);
      expect(timingSafeEquals(undefined, undefined)).toBe(false);
    });
  });

  describe("readCsrfCookie", () => {
    it("finds the token among other cookies", () => {
      expect(readCsrfCookie("ssm_at=abc; ssm_csrf=token-value; theme=dark")).toBe("token-value");
      expect(readCsrfCookie("ssm_csrf=first")).toBe("first");
    });

    it("returns undefined when absent or unreadable", () => {
      expect(readCsrfCookie("ssm_at=abc")).toBeUndefined();
      expect(readCsrfCookie("")).toBeUndefined();
      // Guards against a cookie whose name merely ends with the token name.
      expect(readCsrfCookie("other_ssm_csrf=nope")).toBeUndefined();
    });

    it("decodes percent-encoded values", () => {
      expect(readCsrfCookie("ssm_csrf=a%2Bb")).toBe("a+b");
    });
  });

  describe("isSameOrigin", () => {
    it("accepts an origin whose host matches the request host", () => {
      expect(isSameOrigin("https://app.example.com", "app.example.com")).toBe(true);
      expect(isSameOrigin("https://app.example.com:443", "app.example.com")).toBe(true);
      expect(isSameOrigin("http://localhost:3000", "localhost:3000")).toBe(true);
    });

    it("rejects a foreign origin", () => {
      expect(isSameOrigin("https://evil.example.com", "app.example.com")).toBe(false);
      expect(isSameOrigin("https://app.example.com.evil.test", "app.example.com")).toBe(false);
      expect(isSameOrigin("null", "app.example.com")).toBe(false);
      expect(isSameOrigin("not a url", "app.example.com")).toBe(false);
    });

    it("cannot pass when the host header is missing", () => {
      expect(isSameOrigin("https://app.example.com", null)).toBe(false);
    });

    it("defers to the token check when no Origin header was sent", () => {
      expect(isSameOrigin(null, "app.example.com")).toBe(true);
    });
  });
});
