import type { NextConfig } from "next";

/**
 * Internal API origin used by the same-origin `/api` proxy. Browsers never talk
 * to the API host directly, so the dashboard works behind reverse proxies and
 * preview environments.
 */
const apiProxyTarget = (process.env.API_PROXY_TARGET ?? "http://localhost:4000").replace(/\/+$/, "");

const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "*.e2b.app,localhost,127.0.0.1")
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
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`
      }
    ];
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
