CREATE TYPE "schedule_rule_status" AS ENUM ('active', 'paused', 'archived');
CREATE TYPE "schedule_slot_status" AS ENUM ('recommended', 'reserved', 'used', 'skipped');

CREATE TABLE schedule_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  platforms "platform"[] NOT NULL,
  timezone text NOT NULL,
  windows jsonb NOT NULL,
  min_gap_minutes integer NOT NULL DEFAULT 120,
  max_posts_per_day integer NOT NULL DEFAULT 3,
  status "schedule_rule_status" NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_rules_workspace_name_unique UNIQUE (workspace_id, name)
);
CREATE INDEX schedule_rules_workspace_status_idx
  ON schedule_rules (workspace_id, status);
CREATE TRIGGER schedule_rules_touch_updated_at BEFORE UPDATE ON schedule_rules
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES schedule_rules(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  platform "platform" NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  status "schedule_slot_status" NOT NULL DEFAULT 'recommended',
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reserved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reserved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX schedule_slots_workspace_status_starts_idx
  ON schedule_slots (workspace_id, status, starts_at);
CREATE INDEX schedule_slots_rule_idx
  ON schedule_slots (rule_id);
CREATE INDEX schedule_slots_campaign_idx
  ON schedule_slots (campaign_id);

ALTER TABLE schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_schedule_rules ON schedule_rules
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_schedule_slots ON schedule_slots
  USING (workspace_id = app_current_workspace_id());
