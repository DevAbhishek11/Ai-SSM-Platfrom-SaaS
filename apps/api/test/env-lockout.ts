/**
 * Lockout-tuned environment.
 *
 * `getEnv()` caches on first read, and AppModule reads it while the module graph
 * is being evaluated - so these values must be set by an import that runs before
 * `../src/app.module.js` is pulled in, not by a statement in the spec body.
 */
process.env.NODE_ENV ??= "test";
process.env.AUTH_ALLOW_DEV_HEADERS = "false";
process.env.THROTTLE_DISABLED = "true";
process.env.AUTH_MAX_FAILED_LOGINS = "5";
process.env.AUTH_LOCKOUT_MINUTES = "15";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-value-change-me";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-value-change-me";

export {};
