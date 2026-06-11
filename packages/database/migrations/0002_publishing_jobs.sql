CREATE TYPE "webhook_endpoint_status" AS ENUM ('active', 'disabled', 'failing');
CREATE TYPE "publishing_job_status" AS ENUM (
  'queued',
  'processing',
  'retrying',
  'succeeded',
  'failed',
  'canceled'
);

CREATE TABLE webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url text NOT NULL,
  description text,
  events text[] NOT NULL DEFAULT ARRAY[]::text[],
  secret_hash text NOT NULL,
  status "webhook_endpoint_status" NOT NULL DEFAULT 'active',
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_endpoints_workspace_url_unique UNIQUE (workspace_id, url)
);
CREATE INDEX webhook_endpoints_workspace_status_idx
  ON webhook_endpoints (workspace_id, status);
CREATE TRIGGER webhook_endpoints_touch_updated_at BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE publishing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  social_account_id uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform "platform" NOT NULL,
  status "publishing_job_status" NOT NULL DEFAULT 'queued',
  idempotency_key text NOT NULL UNIQUE,
  scheduled_for timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  last_error text,
  next_retry_at timestamptz,
  platform_post_id text,
  platform_post_url text,
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX publishing_jobs_workspace_status_scheduled_idx
  ON publishing_jobs (workspace_id, status, scheduled_for);
CREATE INDEX publishing_jobs_retry_idx ON publishing_jobs (status, next_retry_at);
CREATE INDEX publishing_jobs_post_idx ON publishing_jobs (post_id);
CREATE TRIGGER publishing_jobs_touch_updated_at BEFORE UPDATE ON publishing_jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_webhook_endpoints ON webhook_endpoints
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_publishing_jobs ON publishing_jobs
  USING (workspace_id = app_current_workspace_id());
