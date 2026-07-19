CREATE TABLE IF NOT EXISTS "notification_emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_emails_owner_email_uidx"
  ON "notification_emails" ("owner_id", lower("email"));

ALTER TABLE "notification_emails" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "notification_emails";
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "notification_emails";
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "notification_emails";
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "notification_emails";

CREATE POLICY "crud-authenticated-policy-select" ON "notification_emails"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("notification_emails"."owner_id" = (select auth.user_id()));
CREATE POLICY "crud-authenticated-policy-insert" ON "notification_emails"
  AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK ("notification_emails"."owner_id" = (select auth.user_id()));
CREATE POLICY "crud-authenticated-policy-update" ON "notification_emails"
  AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING ("notification_emails"."owner_id" = (select auth.user_id()))
  WITH CHECK ("notification_emails"."owner_id" = (select auth.user_id()));
CREATE POLICY "crud-authenticated-policy-delete" ON "notification_emails"
  AS PERMISSIVE FOR DELETE TO "authenticated"
  USING ("notification_emails"."owner_id" = (select auth.user_id()));

-- Default recipient for Baseer
INSERT INTO "notification_emails" ("owner_id", "email")
SELECT 'seed-user-baseer', 'Djbas8@gmail.com'
WHERE EXISTS (SELECT 1 FROM "user" WHERE "id" = 'seed-user-baseer')
  AND NOT EXISTS (
    SELECT 1 FROM "notification_emails"
    WHERE "owner_id" = 'seed-user-baseer'
      AND lower("email") = lower('Djbas8@gmail.com')
  );
