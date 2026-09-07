/**
 * Browser-side API base URL. Defaults to a same-origin path so the Next.js
 * rewrite proxies to the API service. This keeps the dashboard working behind
 * reverse proxies, preview environments, and containers where `localhost`
 * inside the browser is not the API host.
 */
export const clientApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/**
 * Server-side (RSC / route handler) API base URL. Relative URLs cannot be used
 * from the server runtime, so an absolute internal URL is required.
 */
export const serverApiBaseUrl =
  process.env.API_INTERNAL_URL ?? process.env.API_BASE_URL ?? "http://localhost:4000/api";
