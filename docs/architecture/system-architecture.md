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
