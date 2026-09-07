import { describe, expect, it } from "vitest";
import {
  ApiError,
  apiErrorFromResponse,
  apiErrorFromThrown,
  friendlyMessage,
  kindForStatus,
  toApiError
} from "./api-error";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 400,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) }
  });

describe("kindForStatus", () => {
  it("maps HTTP statuses onto handling categories", () => {
    expect(kindForStatus(400)).toBe("validation");
    expect(kindForStatus(422)).toBe("validation");
    expect(kindForStatus(401)).toBe("unauthorized");
    expect(kindForStatus(403)).toBe("forbidden");
    expect(kindForStatus(404)).toBe("not_found");
    expect(kindForStatus(429)).toBe("rate_limited");
    expect(kindForStatus(500)).toBe("server");
    expect(kindForStatus(504)).toBe("server");
    expect(kindForStatus(418)).toBe("unknown");
  });
});

describe("apiErrorFromResponse", () => {
  it("reads the API's error envelope", async () => {
    const error = await apiErrorFromResponse(
      jsonResponse(
        {
          statusCode: 400,
          code: "validation_failed",
          message: "Request validation failed",
          requestId: "req-123",
          fieldErrors: { email: ["must be an email"], password: ["too short", "needs a number"] }
        },
        { status: 400 }
      )
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe("validation");
    expect(error.code).toBe("validation_failed");
    expect(error.requestId).toBe("req-123");
    expect(error.formErrors).toEqual({
      email: "must be an email",
      password: "too short. needs a number"
    });
  });

  it("joins an array message into one sentence", async () => {
    const error = await apiErrorFromResponse(
      jsonResponse({ message: ["name should not be empty", "email must be valid"] })
    );

    expect(error.message).toBe("name should not be empty. email must be valid");
  });

  it("falls back to a friendly message when the body is not JSON", async () => {
    const error = await apiErrorFromResponse(
      new Response("<html>502 Bad Gateway</html>", { status: 502 })
    );

    expect(error.kind).toBe("server");
    expect(error.message).toMatch(/on our side/i);
    expect(error.message).not.toContain("html");
  });

  it("falls back when the body is JSON but carries no message", async () => {
    const error = await apiErrorFromResponse(jsonResponse({}, { status: 403 }));

    expect(error.code).toBe("forbidden");
    expect(error.message).toMatch(/permission/i);
  });

  it("picks up the request id and retry hint from headers", async () => {
    const error = await apiErrorFromResponse(
      jsonResponse({ code: "rate_limited" }, {
        status: 429,
        headers: { "x-request-id": "trace-9", "retry-after": "42" }
      })
    );

    expect(error.requestId).toBe("trace-9");
    expect(error.retryAfterSeconds).toBe(42);
    expect(error.retryable).toBe(true);
  });
});

describe("apiErrorFromThrown", () => {
  it("classifies an aborted request as a timeout", () => {
    const error = apiErrorFromThrown(new DOMException("Timeout", "TimeoutError"));

    expect(error.kind).toBe("timeout");
    expect(error.status).toBe(0);
    expect(error.retryable).toBe(true);
  });

  it("classifies anything else as a network failure", () => {
    const error = apiErrorFromThrown(new TypeError("Failed to fetch"));

    expect(error.kind).toBe("network");
    expect(error.message).toMatch(/cannot reach/i);
    expect(error.retryable).toBe(true);
  });
});

describe("toApiError and friendlyMessage", () => {
  it("passes an ApiError through untouched", () => {
    const original = new ApiError({ message: "nope", kind: "forbidden", status: 403, code: "forbidden" });
    expect(toApiError(original)).toBe(original);
  });

  it("never surfaces a raw 5xx message to the user", async () => {
    const error = await apiErrorFromResponse(
      jsonResponse({ message: "TypeError: cannot read property id of undefined" }, { status: 500 })
    );

    expect(friendlyMessage(error)).toMatch(/on our side/i);
    expect(friendlyMessage(error)).not.toMatch(/TypeError/);
  });

  it("keeps a useful 4xx message", async () => {
    const error = await apiErrorFromResponse(
      jsonResponse({ message: "Invalid email or password" }, { status: 401 })
    );

    expect(friendlyMessage(error)).toBe("Invalid email or password");
  });

  it("handles a value that is not an Error at all", () => {
    expect(friendlyMessage("some string")).toMatch(/cannot reach/i);
  });
});
