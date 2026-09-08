-- Phase 21: multi-provider AI model routing (Ollama, Anthropic Claude, OpenAI, local fallback)

CREATE TYPE "ai_provider" AS ENUM ('ollama', 'anthropic', 'openai', 'local');
CREATE TYPE "ai_routing_attempt_status" AS ENUM ('succeeded', 'failed', 'skipped');
CREATE TYPE "ai_generation_feedback" AS ENUM ('thumbs_up', 'thumbs_down', 'edited');

ALTER TABLE ai_generations
  ADD COLUMN provider "ai_provider" NOT NULL DEFAULT 'local',
  ADD COLUMN provider_model text NOT NULL DEFAULT 'local-deterministic-v1',
  ADD COLUMN platforms "platform"[] NOT NULL DEFAULT ARRAY[]::"platform"[],
  ADD COLUMN latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  ADD COLUMN fallback_used boolean NOT NULL DEFAULT false,
  ADD COLUMN blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN routing jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Existing rows keep their historical model string; new writes populate the columns above.
ALTER TABLE ai_generations
  DROP CONSTRAINT IF EXISTS ai_generations_user_feedback_check;

ALTER TABLE ai_generations
  ALTER COLUMN user_feedback TYPE "ai_generation_feedback"
  USING (
    CASE
      WHEN user_feedback IN ('thumbs_up', 'thumbs_down', 'edited') THEN user_feedback::"ai_generation_feedback"
      ELSE NULL
    END
  );

CREATE INDEX ai_generations_workspace_provider_idx
  ON ai_generations (workspace_id, provider, created_at DESC);

CREATE TABLE ai_provider_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider "ai_provider" NOT NULL,
  model text NOT NULL,
  status "ai_routing_attempt_status" NOT NULL,
  latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  error text,
  attempt_order integer NOT NULL DEFAULT 0 CHECK (attempt_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_provider_attempts_generation_idx
  ON ai_provider_attempts (generation_id, attempt_order);
CREATE INDEX ai_provider_attempts_workspace_created_idx
  ON ai_provider_attempts (workspace_id, created_at DESC);

ALTER TABLE ai_provider_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_ai_provider_attempts ON ai_provider_attempts
  USING (workspace_id = app_current_workspace_id());
