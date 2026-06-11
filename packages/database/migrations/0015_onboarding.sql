CREATE TYPE "onboarding_step_key" AS ENUM (
  'workspace_profile',
  'connect_social_account',
  'brand_voice',
  'first_post',
  'invite_team',
  'notifications',
  'analytics_review'
);
CREATE TYPE "onboarding_step_status" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

CREATE TABLE onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key "onboarding_step_key" NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status "onboarding_step_status" NOT NULL DEFAULT 'pending',
  target_href text NOT NULL,
  sort_order integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_steps_workspace_key_unique UNIQUE (workspace_id, key)
);
CREATE INDEX onboarding_steps_workspace_status_idx
  ON onboarding_steps (workspace_id, status);
CREATE INDEX onboarding_steps_workspace_sort_idx
  ON onboarding_steps (workspace_id, sort_order);
CREATE TRIGGER onboarding_steps_touch_updated_at BEFORE UPDATE ON onboarding_steps
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_onboarding_steps ON onboarding_steps
  USING (workspace_id = app_current_workspace_id());
