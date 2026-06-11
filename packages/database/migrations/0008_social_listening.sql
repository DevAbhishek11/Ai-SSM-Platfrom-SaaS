CREATE TYPE "listening_monitor_type" AS ENUM ('brand', 'keyword', 'hashtag', 'competitor', 'influencer');
CREATE TYPE "listening_monitor_status" AS ENUM ('active', 'paused', 'archived');
CREATE TYPE "listening_alert_severity" AS ENUM ('info', 'warning', 'critical');

CREATE TABLE listening_monitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type "listening_monitor_type" NOT NULL,
  query text NOT NULL,
  platforms "platform"[] NOT NULL DEFAULT ARRAY[]::"platform"[],
  status "listening_monitor_status" NOT NULL DEFAULT 'active',
  alert_threshold integer NOT NULL DEFAULT 75,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listening_monitors_alert_threshold_check CHECK (alert_threshold >= 0 AND alert_threshold <= 100)
);
CREATE INDEX listening_monitors_workspace_status_idx
  ON listening_monitors (workspace_id, status);
CREATE INDEX listening_monitors_workspace_query_idx
  ON listening_monitors (workspace_id, query);

CREATE TABLE social_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  monitor_id uuid NOT NULL REFERENCES listening_monitors(id) ON DELETE CASCADE,
  platform "platform" NOT NULL,
  author text NOT NULL,
  content text NOT NULL,
  url text,
  sentiment "sentiment" NOT NULL,
  reach integer NOT NULL DEFAULT 0,
  engagement integer NOT NULL DEFAULT 0,
  detected_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT social_mentions_reach_check CHECK (reach >= 0),
  CONSTRAINT social_mentions_engagement_check CHECK (engagement >= 0)
);
CREATE INDEX social_mentions_workspace_detected_idx
  ON social_mentions (workspace_id, detected_at);
CREATE INDEX social_mentions_monitor_detected_idx
  ON social_mentions (monitor_id, detected_at);
CREATE INDEX social_mentions_sentiment_idx
  ON social_mentions (sentiment);

CREATE TABLE listening_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  monitor_id uuid NOT NULL REFERENCES listening_monitors(id) ON DELETE CASCADE,
  mention_id uuid REFERENCES social_mentions(id) ON DELETE SET NULL,
  severity "listening_alert_severity" NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX listening_alerts_workspace_resolved_idx
  ON listening_alerts (workspace_id, resolved);
CREATE INDEX listening_alerts_monitor_created_idx
  ON listening_alerts (monitor_id, created_at);

ALTER TABLE listening_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_listening_monitors ON listening_monitors
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_social_mentions ON social_mentions
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_listening_alerts ON listening_alerts
  USING (workspace_id = app_current_workspace_id());
