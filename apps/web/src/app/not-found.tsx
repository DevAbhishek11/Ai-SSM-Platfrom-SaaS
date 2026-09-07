import Link from "next/link";
import { ErrorState } from "@/components/feedback/error-state";

export default function NotFound() {
  return (
    <ErrorState
      eyebrow="404"
      title="We could not find that page"
      description="The link may be out of date, or the workspace resource has been removed."
    >
      <Link href="/" className="btn-primary">
        Back to dashboard
      </Link>
      <Link href="/settings" className="btn-secondary">
        Go to settings
      </Link>
    </ErrorState>
  );
}
