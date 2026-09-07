"use client";

import { useEffect } from "react";

/**
 * Last line of defence: catches failures in the root layout itself, where the
 * normal boundary cannot mount. It has to render its own <html>/<body>, and it
 * cannot rely on the design system having loaded, so the styling is inline.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: "#f6f8fb",
          color: "#111827"
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            The application failed to load
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#4b5563", lineHeight: 1.6 }}>
            An unexpected error stopped the page from rendering. Reloading usually clears it.
          </p>
          {error.digest ? (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#6b7280" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.625rem",
              border: "none",
              background: "#4f46e5",
              color: "#ffffff",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
