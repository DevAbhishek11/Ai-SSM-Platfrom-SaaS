# System Architecture

## First Deployable Shape

The initial implementation is a modular TypeScript monorepo:

- `apps/web`: Next.js App Router dashboard.
- `apps/api`: NestJS API with module boundaries matching future services.
- `packages/domain`: shared schemas, constants, permissions, and fixtures.
- `packages/database`: Drizzle schema and PostgreSQL migration.
- `infra`: Docker, Kubernetes, Terraform, monitoring, and CI assets.

The API starts as a modular monolith to reduce delivery risk. Modules can be extracted behind the same OpenAPI and event contracts as load and team ownership grow.

## Target Service Topology

```mermaid
flowchart TB
  web[Next.js Web App] --> gateway[API Gateway]
  mobile[Mobile Apps Phase 2] --> gateway
  publicApi[Public API Clients] --> gateway

  gateway --> auth[Auth Service]
  gateway --> workspace[Workspace Service]
  gateway --> content[Content Service]
  gateway --> scheduler[Scheduling Service]
  gateway --> media[Media Service]
  gateway --> analytics[Analytics Service]
  gateway --> reports[Reporting Service]
  gateway --> ai[AI Service]
  gateway --> social[Social Connector Service]
  gateway --> listening[Listening Service]
  gateway --> billing[Billing Service]
  gateway --> notification[Notification Service]

  content --> postgres[(PostgreSQL)]
  workspace --> postgres
  auth --> postgres
  reports --> postgres
  scheduler --> postgres
  analytics --> timescale[(TimescaleDB)]
  scheduler --> redis[(Redis)]
  scheduler --> queue[(BullMQ/RabbitMQ)]
  media --> objectStore[(S3/R2)]
  ai --> vector[(pgvector)]
  social --> queue
  listening --> queue
  listening --> notification
  notification --> queue
  billing --> stripe[Stripe]
  queue --> publisher[Publishing Workers]
  publisher --> platforms[Social Platform APIs]

  apiLogs[Structured Logs] --> loki[Loki/ELK]
  services[Services] --> otel[OpenTelemetry]
  services --> prometheus[Prometheus]
  prometheus --> grafana[Grafana]
```

## Data Flow: AI-Assisted Scheduled Post

```mermaid
sequenceDiagram
  participant User
  participant Web as Next.js Web
  participant API as NestJS API
  participant AI as AI Module
  participant DB as PostgreSQL
  participant Queue as Publish Queue
  participant Worker as Publishing Worker
  participant Platform as Social API

  User->>Web: Submit brief and selected platforms
  Web->>API: POST /api/ai/generate
  API->>AI: Route request with brand context
  AI-->>API: Variants, safety flags, quality score
  API->>DB: Store ai_generation audit record
  API-->>Web: Return variants
  User->>Web: Schedule approved variant
  Web->>API: POST /api/posts
  API->>DB: Create post and platform targets
  API->>Queue: Enqueue publish job
  Worker->>Platform: Publish with retry/idempotency key
  Platform-->>Worker: Platform post id and status
  Worker->>DB: Update post_platforms and audit log
```

## Campaign Operations

Campaigns are treated as the planning aggregate for launch work. Each campaign can own milestones, tasks, budget lines, generated reports, and posts. The Campaigns module computes operational summaries from those resources so the Calendar view can show schedule risk, budget pacing, blocked tasks, and report readiness without waiting for a separate reporting warehouse.

```mermaid
flowchart LR
  campaign[Campaign] --> milestones[Milestones]
  campaign --> tasks[Tasks]
  campaign --> budget[Budget Lines]
  campaign --> posts[Posts]
  campaign --> reports[Generated Reports]
  posts --> analytics[Analytics Snapshots]
  budget --> reports
  analytics --> reports
```

## Content Templates

Content templates make approved campaign structures reusable. Each template stores category, target platforms, body placeholders, default hashtags, governance guidance, usage count, and last-used metadata. The Content module renders variables into platform-specific post variants and creates the resulting draft or scheduled post through the existing Posts service so plan limits and platform character validation still apply.

```mermaid
sequenceDiagram
  participant Manager
  participant Web as Calendar UI
  participant Content as Content Module
  participant Posts as Posts Service
  participant Audit as Audit Service

  Manager->>Web: Use launch template
  Web->>Content: POST /api/content/templates/{id}/use
  Content->>Content: Replace variables and hashtags
  Content->>Posts: Create draft or scheduled post
  Content->>Audit: content.template_used
  Content-->>Web: Template usage and created post
```

## Smart Scheduling

Smart scheduling rules describe platform windows, timezone, minimum gap, and daily post caps. Recommendation requests score future slots using the rule window plus recent platform analytics. Reserving a slot can update a post to `scheduled`, set its scheduled timestamp, and enqueue publishing jobs through the existing idempotent publishing service.

```mermaid
flowchart LR
  rules[Schedule Rules] --> recommend[Recommendation Engine]
  analytics[Analytics History] --> recommend
  campaign[Campaign Context] --> recommend
  recommend --> slots[Recommended Slots]
  slots --> reserve[Reserve Slot]
  reserve --> post[Scheduled Post]
  reserve --> jobs[Publishing Jobs]
```

## Reporting, Exports, And Share Links

The Reports module turns analytics, listening, campaign, and executive data into reusable report templates. A template defines type, output format, filters, and branding; scheduled reports bind templates to recipients and next-run metadata; exports materialize a ready payload and download URL; share links expose an export through a scoped token with expiry and revocation state.

```mermaid
flowchart LR
  template[Report Template] --> schedule[Scheduled Report]
  template --> export[Report Export]
  analytics[Analytics Snapshots] --> export
  campaigns[Campaign Data] --> export
  listening[Listening Alerts] --> export
  export --> link[Share Link]
  link --> stakeholder[Stakeholder]
```

Report creation and share-link creation are gated by `analytics.export`; list/read routes require `analytics.view`. Production workers should replace the local synchronous export builder with background rendering, object storage, token hashing, and delivery retries while preserving the same API contract.

## Publishing Job Lifecycle

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> processing: due worker lease
  processing --> succeeded: platform receipt
  processing --> failed: permanent error
  processing --> retrying: transient error
  retrying --> processing: next_retry_at reached
  failed --> retrying: manual retry
  queued --> canceled: user cancels
  retrying --> canceled: user cancels
  succeeded --> [*]
  canceled --> [*]
```

Every publishing job stores a unique idempotency key derived from post id, social account id, platform, and scheduled time. Workers must use this key for deduplication and platform correlation.

## Social Connector Lifecycle

```mermaid
sequenceDiagram
  participant Admin
  participant Web as Accounts UI
  participant API as Social Module
  participant DB as PostgreSQL
  participant Provider as Social Provider

  Admin->>Web: Choose platform and scopes
  Web->>API: POST /api/social/oauth/authorize
  API->>DB: Store pending OAuth state
  API-->>Web: Authorization URL and state
  Admin->>Provider: Approve OAuth consent
  Provider->>API: OAuth callback with state and code
  API->>DB: Consume state and upsert social account
  API->>DB: Upsert publish rate-limit bucket
  API->>DB: Append connector event
  API-->>Web: Connected account
```

Connector events record OAuth, token refresh, scope validation, and account-health transitions. Publishing workers should consult account status and rate-limit buckets before dispatching provider calls.

## Social Listening And Alerting

```mermaid
sequenceDiagram
  participant Worker as Connector Worker
  participant API as Listening Module
  participant DB as PostgreSQL
  participant Notify as Notification Module
  participant Ops as Social Ops

  Worker->>API: POST /api/listening/mentions
  API->>DB: Store mention with sentiment, reach, and engagement
  API->>API: Compare mention against monitor threshold
  API->>DB: Create listening alert when risk or momentum is detected
  API->>Notify: Route warning or critical mention notification
  Notify-->>Ops: In-app/email/Slack delivery attempt
```

Listening monitors define brand, keyword, hashtag, competitor, or influencer queries per workspace. Mentions are stored with platform, author, sentiment, reach, engagement, and metadata. Warning and critical alerts are auditable, resolvable, and routed through the notification preference engine.

## Audit Event Backbone

Sensitive modules emit audit records through a shared audit service before the storage layer is swapped to Drizzle repositories. Covered actions include authentication success/failure, SSO connection changes, session and device revocation, content template creation/use, schedule rule and slot operations, report template/schedule/export/share-link operations, campaign task/budget/report operations, AI safety policy/check/moderation operations, workflow transitions, social connector lifecycle operations, listening monitor and alert operations, media upload/processing changes, publishing job state changes, and webhook replay. Records include actor, workspace, action, entity, old/new values, IP, user agent, and timestamp where available.

## Team Access And Service Credentials

Admins manage human access through workspace invitations and role updates. Invitation tokens are stored only as hashes, expire by default, and every create/resend/revoke action emits audit records. API keys are scoped service credentials: the raw secret is returned once on creation, only a prefix and hash are stored, and revocation is auditable.

API requests may authenticate with `x-api-key`. A global guard verifies the secret hash, rejects revoked/expired keys, updates last-used metadata, and creates an `api_service_account` principal whose permissions are limited to the key's stored scopes before the RBAC guard runs.

## Enterprise Identity Controls

Identity controls live beside team access because they protect the same workspace boundary. SSO connections store provider type, verified domain, entity id, SSO URL, certificate fingerprint, metadata, status, and last-tested timestamp. Sessions store user, status, device, IP, user agent, expiry, and revocation time. Trusted devices store fingerprint, owner, trust state, and last-seen metadata.

Admins can create, test, activate, and disable SSO connections; revoke individual sessions; trust pending devices; and revoke devices. Revoking a trusted device also revokes active sessions tied to that device. All mutations require `workspace.manage` and emit `identity.*` audit records for incident response.

## Entitlement Enforcement

The billing module exposes a centralized entitlement check used by capacity-consuming workflows. Current enforcement covers member invitations, API key creation, social OAuth starts, AI generation, media upload intents, and post creation. Checks project the requested increment against the workspace plan before the mutation proceeds.

## Notification Routing

Notifications are created once and routed into delivery attempts per enabled channel. Preferences store channel opt-ins, digest mode, muted event types, and quiet-hour windows. The local router deterministically records sent or suppressed attempts for in-app, email, push, Slack, Teams, SMS, and webhook channels so later workers can replace the simulated providers without changing API contracts.

## Brand Voice Engine

Brand voice profiles store tone, style, vocabulary controls, emoji strategy, CTA preferences, examples, and versions per workspace. AI generation can reference a profile to shape deterministic variants and surface banned-term findings as safety flags. The brand voice API also evaluates arbitrary copy so reviewers can check fit before publishing.

## AI Safety And Moderation

AI generation routes every brief through the Safety module before returning variants. Safety policies define blocked terms, required disclosure guidance, industry context, and maximum risk score per workspace. Checks persist flags, recommendations, severity, and risk score. Blocked drafts create moderation queue items so reviewers can approve, reject, or resolve them with audit evidence.

```mermaid
sequenceDiagram
  participant User
  participant AI as AI Module
  participant Safety as Safety Module
  participant Audit as Audit Service
  participant Reviewer

  User->>AI: POST /api/ai/generate
  AI->>Safety: Evaluate brief against active policy
  Safety->>Audit: Record content safety check
  Safety-->>AI: Check, flags, recommendations, queue item
  AI-->>User: Variants with safety metadata
  Reviewer->>Safety: Resolve moderation queue item
  Safety->>Audit: Record moderation decision
```

## Media Processing Pipeline

```mermaid
flowchart LR
  upload[Upload Intent] --> complete[Upload Complete]
  complete --> scan[Virus Scan]
  scan --> detect[Format Detection]
  detect --> optimize[Optimization]
  optimize --> thumb[Thumbnail Generation]
  thumb --> tag[AI Tagging]
  tag --> storage[Storage Commit]
  storage --> cdn[CDN Distribution]
  cdn --> ready[Asset Ready]
  scan --> quarantine[Quarantine]:::danger
  optimize --> failed[Failed Job]:::danger
  cdn --> failed

  classDef danger fill:#fee2e2,stroke:#b42318,color:#7f1d1d
```

## Tenancy Model

- Organization owns billing and one or more workspaces.
- Workspace is the primary tenant boundary for content, templates, schedule rules, schedule slots, accounts, media, analytics, reports, identity controls, trends, listening monitors, social mentions, alerts, notifications, AI generations, webhooks, and audit logs.
- API authorizes every request against role permissions.
- PostgreSQL RLS uses `app.workspace_id` for database-layer isolation in production.

## Service Extraction Order

1. Publishing workers and scheduling queue.
2. Social connector service.
3. Media processing service.
4. Analytics and listening ingestion/query service.
5. AI model router service.
6. Billing and webhook service.
