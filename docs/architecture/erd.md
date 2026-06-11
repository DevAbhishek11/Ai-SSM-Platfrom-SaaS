# Entity Relationship Diagram

```mermaid
erDiagram
  USERS ||--o{ TEAM_MEMBERS : joins
  ORGANIZATIONS ||--o{ WORKSPACES : owns
  WORKSPACES ||--o{ TEAM_MEMBERS : contains
  WORKSPACES ||--o{ SOCIAL_ACCOUNTS : connects
  WORKSPACES ||--o{ CAMPAIGNS : plans
  WORKSPACES ||--o{ POSTS : owns
  WORKSPACES ||--o{ MEDIA_ASSETS : stores
  WORKSPACES ||--o{ BRAND_VOICES : defines
  WORKSPACES ||--o{ ANALYTICS_SNAPSHOTS : measures
  WORKSPACES ||--o{ TRENDS : monitors
  WORKSPACES ||--o{ AUDIT_LOGS : records
  WORKSPACES ||--o{ AI_GENERATIONS : audits
  WORKSPACES ||--o{ WEBHOOK_DELIVERIES : emits
  CAMPAIGNS ||--o{ POSTS : groups
  USERS ||--o{ POSTS : authors
  POSTS ||--o{ POST_PLATFORMS : targets
  SOCIAL_ACCOUNTS ||--o{ POST_PLATFORMS : publishes
  SOCIAL_ACCOUNTS ||--o{ ANALYTICS_SNAPSHOTS : reports
  POSTS ||--o{ ANALYTICS_SNAPSHOTS : attributes
  POSTS ||--o{ POST_COMMENTS : discusses
  POSTS ||--o{ WORKFLOW_EVENTS : records
  USERS ||--o{ NOTIFICATIONS : receives

  USERS {
    uuid id PK
    text email UK
    text password_hash
    text mfa_secret
    text name
    text timezone
    text language
    user_status status
    timestamptz created_at
  }

  ORGANIZATIONS {
    uuid id PK
    text slug UK
    plan plan
    text billing_email
    text stripe_customer_id
    jsonb settings
  }

  WORKSPACES {
    uuid id PK
    uuid organization_id FK
    text slug
    jsonb branding
    jsonb settings
  }

  POSTS {
    uuid id PK
    uuid workspace_id FK
    uuid campaign_id FK
    uuid author_id FK
    post_status status
    jsonb content
    uuid[] media_ids
    timestamptz scheduled_at
    boolean ai_generated
  }

  POST_PLATFORMS {
    uuid id PK
    uuid post_id FK
    uuid social_account_id FK
    jsonb platform_specific_content
    text platform_post_id
    post_status status
  }
```

## Index Strategy

- Unique lower-case email index on `users`.
- Unique organization slug and workspace slug per organization.
- Composite workspace/status and workspace/scheduled indexes on posts.
- Composite account/status index on platform targets.
- GIN indexes for post content and analytics metrics.
- Audit and AI generation indexes by workspace and created timestamp.

## Retention Strategy

- Audit logs: 7 years, monthly partitions before production cutover.
- AI generation logs: 90 days unless compliance plan requires longer.
- Analytics snapshots: 2 years hot query storage, then warehouse/archive.
- Media assets: until workspace deletion or explicit user deletion.
