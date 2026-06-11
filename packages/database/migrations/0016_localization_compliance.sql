CREATE TYPE "supported_locale" AS ENUM ('en', 'es', 'fr', 'de', 'hi', 'ja', 'ar');
CREATE TYPE "locale_direction" AS ENUM ('ltr', 'rtl');
CREATE TYPE "date_format" AS ENUM ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD');
CREATE TYPE "time_format" AS ENUM ('12h', '24h');
CREATE TYPE "data_residency_region" AS ENUM ('global', 'us', 'eu', 'in', 'jp');
CREATE TYPE "compliance_regulation" AS ENUM ('gdpr', 'ccpa', 'dpdp', 'lgpd', 'soc2');

CREATE TABLE localization_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  locale "supported_locale" NOT NULL DEFAULT 'en',
  direction "locale_direction" NOT NULL DEFAULT 'ltr',
  timezone text NOT NULL DEFAULT 'UTC',
  date_format "date_format" NOT NULL DEFAULT 'MM/DD/YYYY',
  time_format "time_format" NOT NULL DEFAULT '12h',
  first_day_of_week integer NOT NULL DEFAULT 0 CHECK (first_day_of_week >= 0 AND first_day_of_week <= 6),
  numbering_system text NOT NULL DEFAULT 'latn',
  content_translation_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT localization_preferences_workspace_user_unique UNIQUE (workspace_id, user_id)
);
CREATE INDEX localization_preferences_workspace_locale_idx
  ON localization_preferences (workspace_id, locale);
CREATE TRIGGER localization_preferences_touch_updated_at BEFORE UPDATE ON localization_preferences
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE regional_compliance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  data_residency "data_residency_region" NOT NULL DEFAULT 'global',
  primary_region text NOT NULL,
  regulations "compliance_regulation"[] NOT NULL DEFAULT ARRAY[]::"compliance_regulation"[],
  consent_required boolean NOT NULL DEFAULT false,
  retention_days integer NOT NULL DEFAULT 365 CHECK (retention_days > 0),
  cross_border_transfer boolean NOT NULL DEFAULT true,
  updated_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regional_compliance_profiles_workspace_unique UNIQUE (workspace_id)
);
CREATE INDEX regional_compliance_profiles_residency_idx
  ON regional_compliance_profiles (data_residency);
CREATE TRIGGER regional_compliance_profiles_touch_updated_at BEFORE UPDATE ON regional_compliance_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE localization_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_compliance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_localization_preferences ON localization_preferences
  USING (workspace_id = app_current_workspace_id());
CREATE POLICY tenant_isolation_regional_compliance_profiles ON regional_compliance_profiles
  USING (workspace_id = app_current_workspace_id());
