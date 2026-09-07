"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/feedback/error-state";

/**
 * Route-level error boundary.
 *
 * Next.js renders this instead of the crashed segment, so the shell, the theme
 * and the user's navigation survive. The thrown error is never rendered: in
 * production it can contain internals, and `digest` is the traceable handle.
 */
export default function RouteError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with the platform's telemetry sink when one is wired up.
    console.error("Unhandled route error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <ErrorState
      eyebrow="Something broke"
      title="This page could not be displayed"
      description="The error has been logged. You can retry, or head back to the dashboard."
      digest={error.digest}
    >
      <button type="button" onClick={reset} className="btn-primary">
        Try again
      </button>
      <Link href="/" className="btn-secondary">
        Back to dashboard
      </Link>
    </ErrorState>
  );
}
