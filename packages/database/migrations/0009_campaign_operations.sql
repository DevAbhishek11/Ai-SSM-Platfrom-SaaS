CREATE TYPE "campaign_milestone_status" AS ENUM ('pending', 'at_risk', 'completed');
CREATE TYPE "campaign_task_status" AS ENUM ('todo', 'in_progress', 'blocked', 'done');
CREATE TYPE "campaign_task_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "campaign_report_status" AS ENUM ('draft', 'generated', 'shared');

CREATE TABLE campaign_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  due_date date NOT NULL,
  status "campaign_milestone_status" NOT NULL DEFAULT 'pending',
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaign_milestones_campaign_due_idx
  ON campaign_milestones (campaign_id, due_date);
CREATE INDEX campaign_milestones_workspace_status_idx
  ON campaign_milestones (workspace_id, status);
CREATE TRIGGER campaign_milestones_touch_updated_at BEFORE UPDATE ON campaign_milestones
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE campaign_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  status "campaign_task_status" NOT NULL DEFAULT 'todo',
  priority "campaign_task_priority" NOT NULL DEFAULT 'normal',
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  due_date date,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaign_tasks_campaign_status_idx
  ON campaign_tasks (campaign_id, status);
CREATE INDEX campaign_tasks_workspace_priority_idx
  ON campaign_tasks (workspace_id, priority);
CREATE TRIGGER campaign_tasks_touch_updated_at BEFORE UPDATE ON campaign_tasks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE campaign_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  category text NOT NULL,
  allocated numeric(14,2) NOT NULL DEFAULT 0,
  spent numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_budget_lines_amounts_check CHECK (allocated >= 0 AND spent >= 0),
  CONSTRAINT campaign_budget_lines_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT campaign_budget_lines_campaign_category_unique UNIQUE (campaign_id, category)
);
CREATE INDEX campaign_budget_lines_workspace_campaign_idx
  ON campaign_budget_lines (workspace_id, campaign_id);
CREATE TRIGGER campaign_budget_lines_touch_updated_at BEFORE UPDATE ON campaign_budget_lines
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE campaign_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  status "campaign_report_status" NOT NULL DEFAULT 'generated',
  period_start date NOT NULL,
  period_end date NOT NULL,
  metrics jsonb NOT NULL,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  shared_at timestamptz,
  CONSTRAINT campaign_reports_period_check CHECK (period_end >= period_start)
);
CREATE INDEX campaign_reports_campaign_generated_idx
  ON campaign_reports (campaign_id, generated_at);
CREATE INDEX campaign_reports_workspace_status_idx
  ON campaign_reports (workspace_id, status);

ALTER TABLE campaign_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_campaign_milestones ON campaign_milestones
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_campaign_tasks ON campaign_tasks
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_campaign_budget_lines ON campaign_budget_lines
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_campaign_reports ON campaign_reports
  USING (workspace_id = app_current_workspace_id());
