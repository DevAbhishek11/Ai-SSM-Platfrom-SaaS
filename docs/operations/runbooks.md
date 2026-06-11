# Runbooks

## Publishing Failure Spike

Signals:

- Publishing success rate below 99.5%.
- Queue retries increasing.
- Platform connector 4xx/5xx rates elevated.

Actions:

1. Identify affected platform and tenant scope.
2. Check platform API status and connector logs.
3. Pause platform-specific publishing workers if failures are non-retryable.
4. Notify impacted workspaces through in-app and email alerts.
5. Requeue transient failures after recovery.
6. Record incident timeline and action items.

## Publishing Job Stuck In Processing

Signals:

- A job remains `processing` beyond the platform timeout window.
- Queue depth is stable but completed count stops increasing.

Actions:

1. Confirm worker heartbeat and Redis connectivity.
2. Check the job idempotency key and platform connector logs.
3. If the platform request outcome is unknown, query the platform by idempotency key or external correlation id.
4. Mark the job `succeeded` only with a confirmed platform post id.
5. Otherwise move it to `retrying` with exponential backoff.
6. Add an audit log entry with operator, reason, and observed platform response.

## Database Latency

Signals:

- API p95 above 200 ms.
- PostgreSQL CPU or connections saturated.
- Slow query log grows.

Actions:

1. Check active queries and locks.
2. Scale read replicas for analytics-heavy workloads.
3. Reduce dashboard query fanout through cached summaries.
4. Apply missing indexes after review.
5. Increase pooler capacity only after query health is understood.

## AI Provider Outage

Signals:

- AI generation latency or error rate elevated.
- Provider status incident.

Actions:

1. Route requests to fallback provider or local deterministic templates.
2. Disable high-cost retries.
3. Mark generated content with provider metadata.
4. Inform users when quality may be reduced.

## OAuth Token Expiration Wave

Signals:

- Multiple accounts move to expired/revoked.
- Refresh failures increase.

Actions:

1. Confirm provider credential validity.
2. Check redirect URI and scope changes.
3. Trigger re-auth notifications.
4. Pause scheduled posts for affected accounts.

## Media Processing Failure

Signals:

- Media processing jobs move to `failed`.
- Antivirus scanner, optimizer, thumbnailer, or CDN distribution errors increase.

Actions:

1. Identify the failed step and affected workspace.
2. If virus scan reports infected content, quarantine the object and notify admins.
3. If optimization or thumbnailing fails, retry with original asset preserved.
4. If CDN distribution fails, keep the asset private and retry invalidation/distribution.
5. Mark job output only after storage and CDN URLs are confirmed.
6. Record audit context and expose user-facing recovery guidance.
