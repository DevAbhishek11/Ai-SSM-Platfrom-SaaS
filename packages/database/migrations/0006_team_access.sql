CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');
CREATE TYPE "api_key_status" AS ENUM ('active', 'revoked', 'expired');

CREATE TABLE workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role "role" NOT NULL,
  status "invitation_status" NOT NULL DEFAULT 'pending',
  token_hash text NOT NULL,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX workspace_invitations_email_status_idx
  ON workspace_invitations (workspace_id, email, status);
CREATE UNIQUE INDEX workspace_invitations_token_hash_unique
  ON workspace_invitations (token_hash);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  secret_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status "api_key_status" NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX api_keys_workspace_status_idx
  ON api_keys (workspace_id, status);
CREATE UNIQUE INDEX api_keys_key_prefix_unique
  ON api_keys (key_prefix);

ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_workspace_invitations ON workspace_invitations
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_api_keys ON api_keys
  USING (workspace_id = app_current_workspace_id());
