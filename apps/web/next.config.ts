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

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` for styles is required by Next's inlined critical CSS, and
 * the theme bootstrap in the root layout is an inline script - hence
 * `'unsafe-inline'` on script-src for the non-nonce path. Everything else is
 * locked to same-origin: no third-party script host, no framing, no plugins,
 * and form posts can only go back to us.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests"
].join("; ");

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
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin"
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off"
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload"
                }
              ]
            : [])
        ]
      },
      {
        // Authenticated JSON must never be cached by a shared proxy.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "Pragma", value: "no-cache" }
        ]
      }
    ];
  }
};

export default nextConfig;
