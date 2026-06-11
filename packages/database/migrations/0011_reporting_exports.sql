CREATE TYPE "report_type" AS ENUM ('campaign', 'analytics', 'listening', 'executive');
CREATE TYPE "report_format" AS ENUM ('pdf', 'csv', 'xlsx', 'json');
CREATE TYPE "report_schedule_frequency" AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE "report_export_status" AS ENUM ('queued', 'processing', 'ready', 'failed', 'expired');
CREATE TYPE "report_share_link_status" AS ENUM ('active', 'revoked', 'expired');

CREATE TABLE report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type "report_type" NOT NULL,
  format "report_format" NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_templates_workspace_type_idx
  ON report_templates (workspace_id, type);
CREATE TRIGGER report_templates_touch_updated_at BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  frequency "report_schedule_frequency" NOT NULL,
  recipients text[] NOT NULL DEFAULT ARRAY[]::text[],
  next_run_at timestamptz NOT NULL,
  last_run_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scheduled_reports_workspace_next_run_idx
  ON scheduled_reports (workspace_id, next_run_at);
CREATE INDEX scheduled_reports_template_idx
  ON scheduled_reports (template_id);
CREATE TRIGGER scheduled_reports_touch_updated_at BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE report_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id uuid REFERENCES report_templates(id) ON DELETE SET NULL,
  type "report_type" NOT NULL,
  format "report_format" NOT NULL,
  status "report_export_status" NOT NULL DEFAULT 'queued',
  download_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz,
  expires_at timestamptz
);
CREATE INDEX report_exports_workspace_status_idx
  ON report_exports (workspace_id, status);
CREATE INDEX report_exports_workspace_created_idx
  ON report_exports (workspace_id, created_at);

CREATE TABLE report_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  export_id uuid NOT NULL REFERENCES report_exports(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status "report_share_link_status" NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX report_share_links_export_idx
  ON report_share_links (export_id);
CREATE INDEX report_share_links_workspace_status_idx
  ON report_share_links (workspace_id, status);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_report_templates ON report_templates
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_scheduled_reports ON scheduled_reports
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_report_exports ON report_exports
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_report_share_links ON report_share_links
  USING (workspace_id = app_current_workspace_id());
