CREATE TYPE "notification_channel" AS ENUM ('in_app', 'email', 'push', 'slack', 'teams', 'sms', 'webhook');
CREATE TYPE "notification_delivery_status" AS ENUM ('pending', 'sent', 'failed', 'suppressed');
CREATE TYPE "notification_digest_frequency" AS ENUM ('instant', 'daily', 'weekly', 'muted');

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  digest_frequency "notification_digest_frequency" NOT NULL DEFAULT 'instant',
  quiet_hours jsonb,
  muted_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_user_workspace_unique UNIQUE (user_id, workspace_id)
);
CREATE INDEX notification_preferences_workspace_idx
  ON notification_preferences (workspace_id);

CREATE TABLE notification_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel "notification_channel" NOT NULL,
  status "notification_delivery_status" NOT NULL DEFAULT 'pending',
  provider text NOT NULL,
  destination text NOT NULL,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
CREATE INDEX notification_delivery_attempts_notification_idx
  ON notification_delivery_attempts (notification_id);
CREATE INDEX notification_delivery_attempts_workspace_status_idx
  ON notification_delivery_attempts (workspace_id, status);
CREATE INDEX notification_delivery_attempts_user_channel_idx
  ON notification_delivery_attempts (user_id, channel);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_notification_preferences ON notification_preferences
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_notification_delivery_attempts ON notification_delivery_attempts
  USING (workspace_id = app_current_workspace_id());
