import type { NextConfig } from "next";

/**
 * Browsers never talk to the API host directly: every `/api/*` call is handled
 * by the authenticated route handler at `src/app/api/[...path]/route.ts`, which
 * attaches the session bearer token and transparently refreshes it. That keeps
 * the dashboard working behind reverse proxies and preview environments without
 * exposing tokens to client JavaScript.
 */
const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "*.e2b.app,localhost,127.0.0.1")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Server Actions are POSTed to the same origin, and Next.js rejects requests whose
 * `Origin` does not match the forwarded host. Preview/proxy hosts therefore have to be
 * allowlisted explicitly, which is also the CSRF boundary for cookie-based mutations.
 */
const allowedServerActionOrigins = (
  process.env.NEXT_ALLOWED_SERVER_ACTION_ORIGINS ?? allowedDevOrigins.join(",")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@ssm/domain"],
  typedRoutes: true,
  experimental: {
    serverActions: {
      allowedOrigins: allowedServerActionOrigins
    }
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
