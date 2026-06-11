CREATE TYPE "sso_provider_type" AS ENUM ('saml', 'oidc', 'google_workspace', 'azure_ad', 'okta');
CREATE TYPE "sso_connection_status" AS ENUM ('draft', 'active', 'disabled', 'error');
CREATE TYPE "auth_session_status" AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE "trusted_device_status" AS ENUM ('trusted', 'pending', 'revoked');

CREATE TABLE sso_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_type "sso_provider_type" NOT NULL,
  status "sso_connection_status" NOT NULL DEFAULT 'draft',
  domain text NOT NULL,
  entity_id text NOT NULL,
  sso_url text NOT NULL,
  certificate_fingerprint text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sso_connections_workspace_domain_unique UNIQUE (workspace_id, domain)
);
CREATE INDEX sso_connections_workspace_status_idx
  ON sso_connections (workspace_id, status);
CREATE TRIGGER sso_connections_touch_updated_at BEFORE UPDATE ON sso_connections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  fingerprint text NOT NULL,
  status "trusted_device_status" NOT NULL DEFAULT 'pending',
  last_seen_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT trusted_devices_workspace_fingerprint_unique UNIQUE (workspace_id, fingerprint)
);
CREATE INDEX trusted_devices_user_status_idx
  ON trusted_devices (user_id, status);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status "auth_session_status" NOT NULL DEFAULT 'active',
  ip_address text,
  user_agent text,
  device_id uuid REFERENCES trusted_devices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX auth_sessions_user_status_idx
  ON auth_sessions (user_id, status);
CREATE INDEX auth_sessions_workspace_last_seen_idx
  ON auth_sessions (workspace_id, last_seen_at);

ALTER TABLE sso_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sso_connections ON sso_connections
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_trusted_devices ON trusted_devices
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_auth_sessions ON auth_sessions
  USING (workspace_id = app_current_workspace_id());
