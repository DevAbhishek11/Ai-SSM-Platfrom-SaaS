CREATE TYPE "social_oauth_state_status" AS ENUM ('pending', 'consumed', 'expired', 'failed');
CREATE TYPE "connector_event_severity" AS ENUM ('info', 'warning', 'critical');

CREATE TABLE social_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform "platform" NOT NULL,
  state text NOT NULL UNIQUE,
  authorization_url text NOT NULL,
  redirect_uri text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status "social_oauth_state_status" NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX social_oauth_states_workspace_status_idx
  ON social_oauth_states (workspace_id, status);

CREATE TABLE social_rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  social_account_id uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform "platform" NOT NULL,
  bucket_key text NOT NULL,
  "limit" integer NOT NULL CHECK ("limit" > 0),
  remaining integer NOT NULL CHECK (remaining >= 0),
  window_seconds integer NOT NULL CHECK (window_seconds > 0),
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_rate_limit_buckets_account_bucket_unique UNIQUE (social_account_id, bucket_key)
);
CREATE INDEX social_rate_limit_buckets_workspace_platform_idx
  ON social_rate_limit_buckets (workspace_id, platform);

CREATE TABLE social_connector_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform "platform" NOT NULL,
  type text NOT NULL,
  severity "connector_event_severity" NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX social_connector_events_workspace_created_idx
  ON social_connector_events (workspace_id, created_at DESC);
CREATE INDEX social_connector_events_account_created_idx
  ON social_connector_events (social_account_id, created_at DESC);

ALTER TABLE social_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connector_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_social_oauth_states ON social_oauth_states
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_social_rate_limit_buckets ON social_rate_limit_buckets
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_social_connector_events ON social_connector_events
  USING (workspace_id = app_current_workspace_id());
