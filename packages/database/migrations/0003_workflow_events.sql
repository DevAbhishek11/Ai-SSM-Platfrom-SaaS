CREATE TYPE "workflow_event_action" AS ENUM (
  'created',
  'submitted_for_review',
  'approved',
  'changes_requested',
  'scheduled',
  'publishing_started',
  'published',
  'failed',
  'canceled',
  'archived',
  'commented'
);

CREATE TABLE post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  body text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_created_idx ON post_comments (post_id, created_at);
CREATE INDEX post_comments_workspace_resolved_idx ON post_comments (workspace_id, resolved);
CREATE TRIGGER post_comments_touch_updated_at BEFORE UPDATE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action "workflow_event_action" NOT NULL,
  from_status "post_status",
  to_status "post_status",
  comment text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workflow_events_post_created_idx ON workflow_events (post_id, created_at);
CREATE INDEX workflow_events_workspace_action_idx ON workflow_events (workspace_id, action);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_post_comments ON post_comments
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_workflow_events ON workflow_events
  USING (workspace_id = app_current_workspace_id());
