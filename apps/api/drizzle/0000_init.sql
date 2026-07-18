CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claim.sub', true),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    ),
    ''
  );
$$;

DO $$ BEGIN
  CREATE ROLE authenticated;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE anonymous;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE "public"."application_status" AS ENUM('wishlist', 'applied', 'interview', 'offer', 'rejected');
CREATE TYPE "public"."document_type" AS ENUM('resume', 'cover_letter');

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_token_expires_at" timestamp with time zone,
  "scope" text,
  "password" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "company" text NOT NULL,
  "role_title" text NOT NULL,
  "location" text,
  "job_url" text,
  "status" "application_status" DEFAULT 'wishlist' NOT NULL,
  "applied_date" timestamp with time zone,
  "salary_range" text,
  "source" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL REFERENCES "applications"("id") ON DELETE cascade,
  "owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL REFERENCES "applications"("id") ON DELETE cascade,
  "owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "due_date" timestamp with time zone NOT NULL,
  "message" text NOT NULL,
  "completed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "application_id" uuid REFERENCES "applications"("id") ON DELETE set null,
  "type" "document_type" NOT NULL,
  "filename" text NOT NULL,
  "r2_key" text NOT NULL,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "applications";
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "applications";
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "applications";
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "applications";

CREATE POLICY "applications_select" ON "applications" FOR SELECT TO authenticated
  USING ((select auth.user_id()) = "owner_id");
CREATE POLICY "applications_insert" ON "applications" FOR INSERT TO authenticated
  WITH CHECK ((select auth.user_id()) = "owner_id");
CREATE POLICY "applications_update" ON "applications" FOR UPDATE TO authenticated
  USING ((select auth.user_id()) = "owner_id")
  WITH CHECK ((select auth.user_id()) = "owner_id");
CREATE POLICY "applications_delete" ON "applications" FOR DELETE TO authenticated
  USING ((select auth.user_id()) = "owner_id");

CREATE POLICY "notes_select" ON "notes" FOR SELECT TO authenticated
  USING ((select auth.user_id()) = "owner_id");
CREATE POLICY "notes_insert" ON "notes" FOR INSERT TO authenticated
  WITH CHECK ((select auth.user_id()) = "owner_id");
CREATE POLICY "notes_update" ON "notes" FOR UPDATE TO authenticated
  USING ((select auth.user_id()) = "owner_id")
  WITH CHECK ((select auth.user_id()) = "owner_id");
CREATE POLICY "notes_delete" ON "notes" FOR DELETE TO authenticated
  USING ((select auth.user_id()) = "owner_id");

CREATE POLICY "reminders_select" ON "reminders" FOR SELECT TO authenticated
  USING ((select auth.user_id()) = "owner_id");
CREATE POLICY "reminders_insert" ON "reminders" FOR INSERT TO authenticated
  WITH CHECK ((select auth.user_id()) = "owner_id");
CREATE POLICY "reminders_update" ON "reminders" FOR UPDATE TO authenticated
  USING ((select auth.user_id()) = "owner_id")
  WITH CHECK ((select auth.user_id()) = "owner_id");
CREATE POLICY "reminders_delete" ON "reminders" FOR DELETE TO authenticated
  USING ((select auth.user_id()) = "owner_id");

CREATE POLICY "documents_select" ON "documents" FOR SELECT TO authenticated
  USING ((select auth.user_id()) = "owner_id");
CREATE POLICY "documents_insert" ON "documents" FOR INSERT TO authenticated
  WITH CHECK ((select auth.user_id()) = "owner_id");
CREATE POLICY "documents_update" ON "documents" FOR UPDATE TO authenticated
  USING ((select auth.user_id()) = "owner_id")
  WITH CHECK ((select auth.user_id()) = "owner_id");
CREATE POLICY "documents_delete" ON "documents" FOR DELETE TO authenticated
  USING ((select auth.user_id()) = "owner_id");

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
