/**
 * Strict rotation: the grace window that lets concurrent refreshes converge is
 * switched off, so these specs prove reuse detection still fires.
 */
process.env.NODE_ENV ??= "test";
process.env.AUTH_ALLOW_DEV_HEADERS = "false";
process.env.THROTTLE_DISABLED = "true";
process.env.REFRESH_ROTATION_GRACE_SECONDS = "0";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-value-change-me";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-value-change-me";

export {};
