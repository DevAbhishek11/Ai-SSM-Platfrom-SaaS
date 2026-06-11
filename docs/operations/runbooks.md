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
- Connector events show repeated `token_expired`, `oauth_expired`, or `scopes_missing`.

Actions:

1. Confirm provider credential validity.
2. Check redirect URI and scope changes.
3. Trigger re-auth notifications.
4. Pause scheduled posts for affected accounts.
5. Use `/api/social/accounts/{accountId}/refresh-token` after provider recovery.
6. Validate required publishing scopes before resuming affected queues.

## Social Rate Limit Exhaustion

Signals:

- Rate-limit bucket remaining count reaches zero.
- Publishing jobs retry with provider throttle errors.
- Connector events show platform-specific throttling warnings.

Actions:

1. Identify the workspace, platform, account, and bucket key.
2. Pause only the affected platform/account worker lane.
3. Confirm `resetAt` before requeueing failed or delayed jobs.
4. Keep idempotency keys unchanged when retrying jobs.
5. Notify workspace admins when campaign windows may miss SLA.

## Audit Log Gap Or Suspicious Event

Signals:

- Expected privileged actions do not appear in `/api/audit/logs`.
- Audit summary risk signals increase.
- Login failures, missing scopes, replay actions, or publish failures spike for one workspace.

Actions:

1. Filter audit logs by workspace, action prefix, entity type, and user.
2. Compare audit timestamps with API logs and request ids.
3. Disable affected API keys or user sessions if account compromise is suspected.
4. Export `/api/audit/export` for incident evidence.
5. Preserve related connector, publishing, webhook, and workflow records.
6. File follow-up work for any module that performed a privileged action without an audit record.

## API Key Compromise

Signals:

- Unexpected API key activity or webhook/publishing actions.
- Audit logs show unusual `api_keys`, `publishing`, or `webhooks` events.
- External monitoring flags leaked `ssm_live_` credentials.

Actions:

1. Revoke the affected key with `/api/api-keys/{id}/revoke`.
2. Export audit logs filtered by the key creation time and workspace.
3. Rotate any downstream worker or integration secrets using the compromised key.
4. Create a new scoped key with the minimum required permissions.
5. Review publishing jobs, webhooks, and API-side effects in the incident window.

## Stale Or Incorrect Invitation

Signals:

- A pending invitation is sent to the wrong email.
- An invited user no longer needs access.
- Invitation expiry has passed before onboarding completes.

Actions:

1. Revoke incorrect or no-longer-needed invitations.
2. Resend only after confirming the recipient, role, and workspace.
3. Use the least-privileged role for the initial invite.
4. Confirm audit records for create, resend, and revoke actions.

## Plan Limit Block

Signals:

- A mutation returns `Plan limit exceeded`.
- `/api/billing/entitlements/check` reports `allowed: false`.
- Admins cannot invite members, create API keys, connect accounts, upload media, generate AI content, or create posts.

Actions:

1. Identify the blocked capability and projected usage.
2. Review current usage in Settings > Billing and limits.
3. Remove unused API keys, pending invitations, social accounts, media, or scheduled content where appropriate.
4. Upgrade the workspace plan or request an enterprise override.
5. Retry the blocked operation after usage or plan changes are reflected.

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
