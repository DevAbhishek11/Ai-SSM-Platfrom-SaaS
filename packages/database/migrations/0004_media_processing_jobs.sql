CREATE TYPE "media_processing_job_status" AS ENUM (
  'queued',
  'virus_scanning',
  'format_detecting',
  'optimizing',
  'thumbnailing',
  'ai_tagging',
  'storing',
  'cdn_distributing',
  'completed',
  'failed'
);

CREATE TABLE media_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  upload_intent_id uuid NOT NULL UNIQUE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL CHECK (file_size >= 0),
  storage_key text NOT NULL,
  status "media_processing_job_status" NOT NULL DEFAULT 'queued',
  current_step text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  checksum_sha256 text,
  virus_scan jsonb,
  output jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX media_processing_jobs_workspace_status_idx
  ON media_processing_jobs (workspace_id, status);
CREATE INDEX media_processing_jobs_asset_idx ON media_processing_jobs (asset_id);
CREATE TRIGGER media_processing_jobs_touch_updated_at BEFORE UPDATE ON media_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE media_processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_media_processing_jobs ON media_processing_jobs
  USING (workspace_id = app_current_workspace_id());
