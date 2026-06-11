# Entity Relationship Diagram

```mermaid
erDiagram
  USERS ||--o{ TEAM_MEMBERS : joins
  USERS ||--o{ NOTIFICATION_PREFERENCES : configures
  USERS ||--o{ NOTIFICATION_DELIVERY_ATTEMPTS : receives
  ORGANIZATIONS ||--o{ WORKSPACES : owns
  WORKSPACES ||--o{ TEAM_MEMBERS : contains
  WORKSPACES ||--o{ WORKSPACE_INVITATIONS : invites
  WORKSPACES ||--o{ API_KEYS : authenticates
  WORKSPACES ||--o{ SOCIAL_ACCOUNTS : connects
  WORKSPACES ||--o{ SOCIAL_OAUTH_STATES : authorizes
  WORKSPACES ||--o{ SOCIAL_CONNECTOR_EVENTS : audits
  SOCIAL_ACCOUNTS ||--o{ SOCIAL_RATE_LIMIT_BUCKETS : throttles
  SOCIAL_ACCOUNTS ||--o{ SOCIAL_CONNECTOR_EVENTS : emits
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
  NOTIFICATIONS ||--o{ NOTIFICATION_DELIVERY_ATTEMPTS : routes

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

  SOCIAL_OAUTH_STATES {
    uuid id PK
    uuid workspace_id FK
    platform platform
    text state UK
    text authorization_url
    text redirect_uri
    text[] scopes
    social_oauth_state_status status
    timestamptz expires_at
    uuid created_by FK
    timestamptz consumed_at
  }

  SOCIAL_RATE_LIMIT_BUCKETS {
    uuid id PK
    uuid workspace_id FK
    uuid social_account_id FK
    platform platform
    text bucket_key
    integer limit
    integer remaining
    integer window_seconds
    timestamptz reset_at
  }

  SOCIAL_CONNECTOR_EVENTS {
    uuid id PK
    uuid workspace_id FK
    uuid social_account_id FK
    platform platform
    text type
    connector_event_severity severity
    text message
    jsonb metadata
  }

  AUDIT_LOGS {
    uuid id PK
    uuid workspace_id FK
    uuid user_id FK
    text action
    text entity_type
    uuid entity_id
    jsonb old_values
    jsonb new_values
    text ip_address
    text user_agent
    timestamptz created_at
  }

  WORKSPACE_INVITATIONS {
    uuid id PK
    uuid workspace_id FK
    text email
    role role
    invitation_status status
    text token_hash
    uuid invited_by FK
    timestamptz invited_at
    timestamptz expires_at
    timestamptz accepted_at
    timestamptz revoked_at
  }

  API_KEYS {
    uuid id PK
    uuid workspace_id FK
    text name
    text key_prefix
    text secret_hash
    text[] scopes
    api_key_status status
    uuid created_by FK
    timestamptz created_at
    timestamptz last_used_at
    timestamptz expires_at
    timestamptz revoked_at
  }

  NOTIFICATION_PREFERENCES {
    uuid id PK
    uuid user_id FK
    uuid workspace_id FK
    jsonb channel_settings
    notification_digest_frequency digest_frequency
    jsonb quiet_hours
    text[] muted_types
    timestamptz created_at
    timestamptz updated_at
  }

  NOTIFICATION_DELIVERY_ATTEMPTS {
    uuid id PK
    uuid notification_id FK
    uuid workspace_id FK
    uuid user_id FK
    notification_channel channel
    notification_delivery_status status
    text provider
    text destination
    text error_message
    jsonb metadata
    timestamptz attempted_at
    timestamptz delivered_at
  }
```

## Index Strategy

- Unique lower-case email index on `users`.
- Unique organization slug and workspace slug per organization.
- Composite workspace/status and workspace/scheduled indexes on posts.
- Composite account/status index on platform targets.
- GIN indexes for post content and analytics metrics.
- Audit and AI generation indexes by workspace and created timestamp.
- Social connector indexes by workspace, account, OAuth state, rate-limit reset, and event timestamp.
- Invitation indexes by workspace/email/status and token hash; API key indexes by workspace/status and prefix.
- Notification preference unique index by user/workspace; delivery indexes by notification, workspace/status, and user/channel.

## Retention Strategy

- Audit logs: 7 years, monthly partitions before production cutover.
- AI generation logs: 90 days unless compliance plan requires longer.
- Analytics snapshots: 2 years hot query storage, then warehouse/archive.
- Media assets: until workspace deletion or explicit user deletion.
