CREATE TYPE "safety_policy_status" AS ENUM ('draft', 'active', 'archived');
CREATE TYPE "content_safety_status" AS ENUM ('passed', 'flagged', 'blocked');
CREATE TYPE "safety_severity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "moderation_status" AS ENUM ('open', 'approved', 'rejected', 'resolved');

CREATE TABLE safety_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  status "safety_policy_status" NOT NULL DEFAULT 'draft',
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX safety_policies_workspace_status_idx
  ON safety_policies (workspace_id, status);
CREATE TRIGGER safety_policies_touch_updated_at BEFORE UPDATE ON safety_policies
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE content_safety_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES safety_policies(id) ON DELETE SET NULL,
  source text NOT NULL,
  source_entity_id uuid,
  text text NOT NULL,
  status "content_safety_status" NOT NULL,
  severity "safety_severity" NOT NULL,
  risk_score numeric(4,3) NOT NULL,
  flags text[] NOT NULL DEFAULT ARRAY[]::text[],
  recommendations text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_safety_checks_risk_score_check CHECK (risk_score >= 0 AND risk_score <= 1),
  CONSTRAINT content_safety_checks_source_check CHECK (source IN ('ai_generation', 'manual', 'post_review'))
);
CREATE INDEX content_safety_checks_workspace_created_idx
  ON content_safety_checks (workspace_id, created_at);
CREATE INDEX content_safety_checks_workspace_status_idx
  ON content_safety_checks (workspace_id, status);

CREATE TABLE moderation_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  safety_check_id uuid NOT NULL REFERENCES content_safety_checks(id) ON DELETE CASCADE,
  source text NOT NULL,
  source_entity_id uuid,
  status "moderation_status" NOT NULL DEFAULT 'open',
  reason text NOT NULL,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT moderation_queue_items_source_check CHECK (source IN ('ai_generation', 'manual', 'post_review'))
);
CREATE INDEX moderation_queue_items_workspace_status_idx
  ON moderation_queue_items (workspace_id, status);
CREATE INDEX moderation_queue_items_safety_check_idx
  ON moderation_queue_items (safety_check_id);
CREATE TRIGGER moderation_queue_items_touch_updated_at BEFORE UPDATE ON moderation_queue_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE safety_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_safety_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_safety_policies ON safety_policies
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_content_safety_checks ON content_safety_checks
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_moderation_queue_items ON moderation_queue_items
  USING (workspace_id = app_current_workspace_id());
