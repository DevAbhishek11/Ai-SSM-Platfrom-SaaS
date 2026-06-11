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
  gateway --> ai[AI Service]
  gateway --> social[Social Connector Service]
  gateway --> billing[Billing Service]
  gateway --> notification[Notification Service]

  content --> postgres[(PostgreSQL)]
  workspace --> postgres
  auth --> postgres
  analytics --> timescale[(TimescaleDB)]
  scheduler --> redis[(Redis)]
  scheduler --> queue[(BullMQ/RabbitMQ)]
  media --> objectStore[(S3/R2)]
  ai --> vector[(pgvector)]
  social --> queue
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

## Audit Event Backbone

Sensitive modules emit audit records through a shared audit service before the storage layer is swapped to Drizzle repositories. Covered actions include authentication success/failure, workflow transitions, social connector lifecycle operations, media upload/processing changes, publishing job state changes, and webhook replay. Records include actor, workspace, action, entity, old/new values, IP, user agent, and timestamp where available.

## Team Access And Service Credentials

Admins manage human access through workspace invitations and role updates. Invitation tokens are stored only as hashes, expire by default, and every create/resend/revoke action emits audit records. API keys are scoped service credentials: the raw secret is returned once on creation, only a prefix and hash are stored, and revocation is auditable.

API requests may authenticate with `x-api-key`. A global guard verifies the secret hash, rejects revoked/expired keys, updates last-used metadata, and creates an `api_service_account` principal whose permissions are limited to the key's stored scopes before the RBAC guard runs.

## Entitlement Enforcement

The billing module exposes a centralized entitlement check used by capacity-consuming workflows. Current enforcement covers member invitations, API key creation, social OAuth starts, AI generation, media upload intents, and post creation. Checks project the requested increment against the workspace plan before the mutation proceeds.

## Notification Routing

Notifications are created once and routed into delivery attempts per enabled channel. Preferences store channel opt-ins, digest mode, muted event types, and quiet-hour windows. The local router deterministically records sent or suppressed attempts for in-app, email, push, Slack, Teams, SMS, and webhook channels so later workers can replace the simulated providers without changing API contracts.

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
- Workspace is the primary tenant boundary for content, accounts, media, analytics, trends, notifications, AI generations, webhooks, and audit logs.
- API authorizes every request against role permissions.
- PostgreSQL RLS uses `app.workspace_id` for database-layer isolation in production.

## Service Extraction Order

1. Publishing workers and scheduling queue.
2. Social connector service.
3. Media processing service.
4. Analytics ingestion/query service.
5. AI model router service.
6. Billing and webhook service.
