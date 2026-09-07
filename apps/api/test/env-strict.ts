/**
 * Strict auth environment: header-based identities are disabled so these specs
 * exercise exactly what a deployed API does.
 */
process.env.NODE_ENV ??= "test";
process.env.AUTH_ALLOW_DEV_HEADERS = "false";
process.env.THROTTLE_DISABLED = "true";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-value-change-me";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-value-change-me";

export {};
