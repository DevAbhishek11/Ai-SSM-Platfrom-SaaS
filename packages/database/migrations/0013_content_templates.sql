CREATE TYPE "content_template_category" AS ENUM (
  'product_launch',
  'announcement',
  'educational',
  'promotional',
  'crisis_response',
  'ugc',
  'evergreen'
);
CREATE TYPE "content_template_status" AS ENUM ('draft', 'active', 'archived');

CREATE TABLE content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  category "content_template_category" NOT NULL,
  status "content_template_status" NOT NULL DEFAULT 'active',
  platforms "platform"[] NOT NULL,
  body_template text NOT NULL,
  variables text[] NOT NULL DEFAULT ARRAY[]::text[],
  default_hashtags text[] NOT NULL DEFAULT ARRAY[]::text[],
  guidance jsonb NOT NULL DEFAULT '{}'::jsonb,
  usage_count integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_templates_workspace_name_unique UNIQUE (workspace_id, name)
);
CREATE INDEX content_templates_workspace_status_idx
  ON content_templates (workspace_id, status);
CREATE INDEX content_templates_workspace_category_idx
  ON content_templates (workspace_id, category);
CREATE TRIGGER content_templates_touch_updated_at BEFORE UPDATE ON content_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_content_templates ON content_templates
  USING (workspace_id = app_current_workspace_id());
