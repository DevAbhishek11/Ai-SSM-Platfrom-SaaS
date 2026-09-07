/**
 * Test environment defaults.
 *
 * Imported first by every spec so `getEnv()` sees these values before Nest
 * instantiates providers. `AUTH_ALLOW_DEV_HEADERS` lets the fixture-driven
 * suites keep using `x-user-role` instead of minting a session per request;
 * `auth.spec.ts` turns it off to prove the production behaviour.
 */
process.env.NODE_ENV ??= "test";
process.env.AUTH_ALLOW_DEV_HEADERS = "true";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-value-change-me";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-value-change-me";

export {};
