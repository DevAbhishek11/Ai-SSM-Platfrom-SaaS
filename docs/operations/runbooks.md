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

## SSO Or Session Security Incident

Signals:

- Unexpected `/api/identity/sessions` activity from unfamiliar IPs or user agents.
- A trusted device is lost, stolen, or no longer under user control.
- SSO test failures or disabled connections block enterprise login.

Actions:

1. Revoke suspicious sessions with `/api/identity/sessions/{id}/revoke`.
2. Revoke affected devices with `/api/identity/devices/{id}/revoke`; verify active sessions for that device are also revoked.
3. Disable a compromised or misconfigured SSO connection with `/api/identity/sso-connections/{id}/disable`.
4. Export audit logs filtered by `identity.` actions and the affected user/workspace.
5. Re-test SSO metadata and certificate fingerprint before re-enabling enterprise login.
6. Notify workspace owners and require credential/device review for impacted users.

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

## Onboarding Activation Stalled

Signals:

- `/api/onboarding/checklist` progress remains low after workspace creation.
- Users connect accounts but do not create a first post, invite reviewers, or configure notifications.
- Support tickets mention confusion during first-run setup.

Actions:

1. Open Dashboard > Onboarding checklist and identify the next pending or in-progress step.
2. Complete steps only after the underlying workspace action is verified.
3. Skip non-applicable steps with a reason when the workspace uses external processes.
4. Review `onboarding.step_completed` and `onboarding.step_skipped` audit events for setup history.
5. Check connected accounts, brand voice, first post, team invites, and notification preferences for blocked activation.
6. Feed repeated stalled steps back into onboarding copy, defaults, or product instrumentation.

## Localization Or Regional Compliance Misconfiguration

Signals:

- Users see incorrect locale, date/time format, timezone, or text direction.
- Workspace data residency or regulatory profile does not match customer contract.
- Retention, consent, or cross-border-transfer controls are disputed during audit.

Actions:

1. Inspect `/api/localization/preferences` for the affected user and workspace.
2. Update locale, direction, timezone, date format, time format, and translation enablement with `/api/localization/preferences`.
3. Inspect `/api/localization/compliance-profile` for data residency, primary region, regulations, retention days, and transfer policy.
4. Update compliance settings only after confirming the customer contract and legal requirements.
5. Export audit records filtered by `localization.` for evidence.
6. Confirm downstream storage, retention, consent, and export workers honor the updated regional profile before closing the incident.

## Notification Delivery Issue

Signals:

- Delivery attempts show `failed` or unexpected `suppressed` states.
- Users do not receive publishing, account, billing, or security alerts.
- Quiet hours or muted event settings suppress high-priority operational alerts.

Actions:

1. Inspect `/api/notifications/deliveries` for the affected workspace, user, and channel.
2. Check user preferences for disabled channels, muted event types, digest mode, and quiet hours.
3. For urgent incidents, use a `critical` priority route to bypass quiet-hour suppression.
4. Confirm provider configuration for email, Slack, Teams, SMS, push, or webhook destinations.
5. Re-route the notification after preferences or provider configuration are corrected.
6. Preserve failed delivery attempts for incident evidence.

## Campaign Execution Risk

Signals:

- Campaign milestones show `at_risk` or overdue pending work.
- Campaign tasks are `blocked` near a scheduled publishing window.
- Budget utilization exceeds the planned pace or a category is close to its cap.
- Generated campaign reports show weak ROI or low engagement rate.

Actions:

1. Open Calendar > Campaign operations and select the affected campaign.
2. Review milestone due dates, blocked tasks, budget lines, and the latest generated report.
3. Assign owners for blocked tasks and complete milestones only after the underlying work is verified.
4. Update budget lines with current allocated and spent amounts before stakeholder reporting.
5. Generate a fresh campaign report after task, budget, publishing, or analytics changes.
6. Preserve audit records for task status, budget, milestone, and report changes tied to launch decisions.

## Content Template Rollout Issue

Signals:

- New posts created from a template include unresolved placeholders like `[product]`.
- A template uses the wrong platform set, hashtag defaults, or compliance guidance.
- Reviewers see repeated copy defects from the same template.

Actions:

1. Open Calendar > Content templates and identify the affected template, category, platforms, and usage count.
2. Archive or replace the template if it is creating unsafe or off-brand drafts.
3. Confirm required variables, default hashtags, and guidance before using the template again.
4. Review `content.template_created` and `content.template_used` audit events to find impacted posts.
5. Route created drafts back through approval workflow before scheduling.
6. Add a brand voice or safety policy update if the template issue reflects stale governance.

## Smart Scheduling Recommendation Issue

Signals:

- `/api/scheduling/recommendations` returns no slots for active campaigns.
- Recommended slots conflict with recent posts, account rate limits, or campaign blackout windows.
- Reserving a slot fails to schedule a post or enqueue publishing jobs.

Actions:

1. Check `/api/scheduling/rules` for active rules matching the requested platforms and timezone.
2. Confirm each rule has valid windows, minimum gap, and daily post cap.
3. Inspect `/api/scheduling/slots?status=recommended` for duplicate or stale recommendations.
4. Verify the target post contains content for the slot platform before reserving.
5. If enqueue fails, inspect connected social accounts and publishing job idempotency keys.
6. Review `scheduling.rule_created`, `scheduling.slots_recommended`, and `scheduling.slot_reserved` audit events.

## Reporting Export Or Share-Link Issue

Signals:

- `/api/reports/exports` shows exports stuck outside `ready`.
- Stakeholders cannot access a report share link or see expired/revoked link status.
- Scheduled report recipients do not receive expected report deliveries.

Actions:

1. Confirm the report template type, format, filters, and branding in `/api/reports/templates`.
2. Recreate the export with `/api/reports/exports` and verify payload metrics, expiry, and download URL.
3. Create a fresh share link with `/api/reports/exports/{exportId}/share-links` if the existing link is expired or revoked.
4. Check scheduled report recipients and next-run timestamp in `/api/reports/schedules`.
5. Review `reports.*` audit events for template, schedule, export, and share-link changes.
6. For production render failures, inspect object storage, renderer queues, and delivery provider logs before retrying at scale.

## AI Safety Block

Signals:

- AI generation returns `safety.blocked: true`.
- `/api/safety/moderation-queue?status=open` shows blocked AI drafts.
- Safety checks contain financial, medical, payment, PII, or policy blocked-term flags.

Actions:

1. Open AI Studio > AI safety review and inspect the check flags, recommendations, and moderation item.
2. Rewrite the draft to remove prohibited claims, personal data, or payment-like values.
3. Add required workspace disclosure language when the policy calls for it.
4. Re-run `/api/safety/evaluate` or the AI Studio safety check before moving to approval.
5. Resolve the moderation item as approved, rejected, or resolved with a clear note.
6. Preserve safety checks and moderation audit records for regulated campaign review.

## Social Listening Alert Spike

Signals:

- `/api/listening/alerts?resolved=false` shows multiple `warning` or `critical` alerts.
- Negative mentions exceed normal campaign baseline.
- High-reach mentions mention broken account connections, publishing failures, compliance issues, or customer-impacting launches.

Actions:

1. Open Analytics > Social listening command center and identify the affected monitor, platform, author, reach, and sentiment.
2. Confirm the monitor query and threshold are correct; pause noisy monitors only after preserving the alert context.
3. Triage critical alerts first and route owner-approved response copy through the normal approval workflow.
4. Check account health, connector events, publishing jobs, and notification delivery attempts for linked operational failures.
5. Resolve alerts only after response ownership, external follow-up, and internal incident notes are recorded.
6. Export related audit logs and keep mention metadata for post-incident review.

## Brand Voice Violation

Signals:

- AI generation returns `brand_voice_banned_term:*` safety flags.
- Brand voice evaluation score drops below review threshold.
- Reviewers repeatedly request copy changes for tone, vocabulary, or CTA mismatch.

Actions:

1. Evaluate the draft against the active brand voice profile.
2. Remove banned terms and add preferred workspace vocabulary.
3. Confirm the selected profile version matches the target campaign or sub-brand.
4. Update examples, CTA preferences, or banned terms when guidance is stale.
5. Re-run AI generation with the intended `brandVoiceId`.
6. Keep audit records for profile changes tied to regulated campaigns.

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
