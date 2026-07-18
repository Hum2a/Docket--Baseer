ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "industry" text NOT NULL DEFAULT 'Unspecified';
