CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "role" AS ENUM (
  'super_admin',
  'owner',
  'admin',
  'manager',
  'creator',
  'reviewer',
  'viewer',
  'api_service_account'
);

CREATE TYPE "plan" AS ENUM ('free', 'starter', 'pro', 'business', 'enterprise');
CREATE TYPE "platform" AS ENUM (
  'x',
  'instagram',
  'facebook',
  'linkedin',
  'youtube',
  'tiktok',
  'reddit',
  'pinterest',
  'threads',
  'mastodon',
  'bluesky'
);
CREATE TYPE "post_status" AS ENUM (
  'draft',
  'in_review',
  'revisions_needed',
  'approved',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'archived'
);
CREATE TYPE "account_status" AS ENUM ('connected', 'expired', 'revoked', 'error');
CREATE TYPE "campaign_type" AS ENUM (
  'product_launch',
  'seasonal',
  'evergreen',
  'community',
  'crisis',
  'ab_test',
  'influencer',
  'paid'
);
CREATE TYPE "campaign_status" AS ENUM ('planning', 'active', 'paused', 'completed', 'archived');
CREATE TYPE "member_status" AS ENUM ('active', 'invited', 'suspended');
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE "sentiment" AS ENUM ('negative', 'neutral', 'positive', 'mixed');
CREATE TYPE "webhook_status" AS ENUM ('pending', 'delivered', 'failed');

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app_current_workspace_id()
RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.workspace_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text,
  mfa_secret text,
  name text NOT NULL,
  avatar_url text,
  timezone text NOT NULL DEFAULT 'UTC',
  language text NOT NULL DEFAULT 'en',
  status "user_status" NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
CREATE INDEX users_status_idx ON users (status);
CREATE TRIGGER users_touch_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan "plan" NOT NULL DEFAULT 'free',
  billing_email text NOT NULL,
  stripe_customer_id text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organizations_plan_idx ON organizations (plan);
CREATE TRIGGER organizations_touch_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_organization_slug_unique UNIQUE (organization_id, slug)
);
CREATE INDEX workspaces_organization_idx ON workspaces (organization_id);
CREATE TRIGGER workspaces_touch_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role "role" NOT NULL,
  status "member_status" NOT NULL DEFAULT 'invited',
  invited_at timestamptz,
  joined_at timestamptz,
  CONSTRAINT team_members_user_workspace_unique UNIQUE (user_id, workspace_id)
);
CREATE INDEX team_members_workspace_role_idx ON team_members (workspace_id, role);

CREATE TABLE social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform "platform" NOT NULL,
  platform_user_id text NOT NULL,
  username text NOT NULL,
  display_name text NOT NULL,
  profile_image_url text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status "account_status" NOT NULL DEFAULT 'connected',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_accounts_platform_identity_unique
    UNIQUE (workspace_id, platform, platform_user_id)
);
CREATE INDEX social_accounts_workspace_status_idx ON social_accounts (workspace_id, status);
CREATE TRIGGER social_accounts_touch_updated_at BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type "campaign_type" NOT NULL,
  status "campaign_status" NOT NULL DEFAULT 'planning',
  start_date date NOT NULL,
  end_date date,
  budget numeric(14, 2),
  objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaigns_workspace_status_idx ON campaigns (workspace_id, status);
CREATE INDEX campaigns_workspace_dates_idx ON campaigns (workspace_id, start_date);
CREATE TRIGGER campaigns_touch_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE brand_voices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  tone jsonb NOT NULL DEFAULT '{}'::jsonb,
  style jsonb NOT NULL DEFAULT '{}'::jsonb,
  vocabulary jsonb NOT NULL DEFAULT '{}'::jsonb,
  emoji_usage text NOT NULL DEFAULT 'moderate',
  cta_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_voices_workspace_name_unique UNIQUE (workspace_id, name)
);
CREATE TRIGGER brand_voices_touch_updated_at BEFORE UPDATE ON brand_voices
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL CHECK (file_size >= 0),
  storage_key text NOT NULL UNIQUE,
  cdn_url text,
  thumbnail_url text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  folder_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_assets_workspace_type_idx ON media_assets (workspace_id, file_type);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status "post_status" NOT NULL DEFAULT 'draft',
  content jsonb NOT NULL,
  media_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  scheduled_at timestamptz,
  published_at timestamptz,
  ai_generated boolean NOT NULL DEFAULT false,
  ai_model_used text,
  ai_prompt text,
  brand_voice_id uuid REFERENCES brand_voices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_workspace_status_idx ON posts (workspace_id, status);
CREATE INDEX posts_workspace_scheduled_idx ON posts (workspace_id, scheduled_at);
CREATE INDEX posts_campaign_idx ON posts (campaign_id);
CREATE INDEX posts_content_gin_idx ON posts USING gin (content);
CREATE TRIGGER posts_touch_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE post_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  social_account_id uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform_specific_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  platform_post_id text,
  platform_post_url text,
  status "post_status" NOT NULL DEFAULT 'draft',
  error_message text,
  published_at timestamptz,
  CONSTRAINT post_platforms_post_account_unique UNIQUE (post_id, social_account_id)
);
CREATE INDEX post_platforms_account_status_idx ON post_platforms (social_account_id, status);

CREATE TABLE analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES social_accounts(id) ON DELETE SET NULL,
  post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  snapshot_date date NOT NULL,
  metrics jsonb NOT NULL,
  platform "platform" NOT NULL
);
CREATE INDEX analytics_snapshots_workspace_date_idx
  ON analytics_snapshots (workspace_id, snapshot_date);
CREATE INDEX analytics_snapshots_account_date_idx
  ON analytics_snapshots (social_account_id, snapshot_date);
CREATE INDEX analytics_snapshots_metrics_gin_idx ON analytics_snapshots USING gin (metrics);

CREATE TABLE trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  hashtag text,
  source text NOT NULL,
  volume integer NOT NULL DEFAULT 0 CHECK (volume >= 0),
  opportunity_score integer NOT NULL DEFAULT 0 CHECK (opportunity_score BETWEEN 0 AND 100),
  sentiment "sentiment" NOT NULL DEFAULT 'neutral',
  detected_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX trends_workspace_opportunity_idx ON trends (workspace_id, opportunity_score DESC);
CREATE INDEX trends_expires_at_idx ON trends (expires_at);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_read_idx ON notifications (user_id, read);
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_workspace_created_idx ON audit_logs (workspace_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
COMMENT ON TABLE audit_logs IS 'Retention target: 7 years. Partition by month before production cutover.';

CREATE TABLE ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  model_used text NOT NULL,
  prompt text NOT NULL,
  output jsonb NOT NULL,
  tokens_used integer NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  cost numeric(12, 6) NOT NULL DEFAULT 0,
  quality_score integer CHECK (quality_score BETWEEN 0 AND 100),
  user_feedback text CHECK (user_feedback IS NULL OR user_feedback IN ('thumbs_up', 'thumbs_down', 'edited')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_generations_workspace_created_idx ON ai_generations (workspace_id, created_at DESC);

CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status "webhook_status" NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_retry_at timestamptz,
  response_code integer,
  response_body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webhook_deliveries_workspace_status_idx ON webhook_deliveries (workspace_id, status);
CREATE INDEX webhook_deliveries_retry_idx ON webhook_deliveries (next_retry_at);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_workspaces ON workspaces
  USING (id = app_current_workspace_id());
CREATE POLICY tenant_isolation_team_members ON team_members
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_social_accounts ON social_accounts
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_campaigns ON campaigns
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_brand_voices ON brand_voices
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_media_assets ON media_assets
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_posts ON posts
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_post_platforms ON post_platforms
  USING (
    EXISTS (
      SELECT 1
      FROM posts
      WHERE posts.id = post_platforms.post_id
        AND posts.workspace_id = app_current_workspace_id()
    )
  );
CREATE POLICY tenant_isolation_analytics_snapshots ON analytics_snapshots
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_trends ON trends
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_ai_generations ON ai_generations
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_webhook_deliveries ON webhook_deliveries
  USING (workspace_id = app_current_workspace_id());
