# Row Level Security

Every application table includes `owner_id` referencing `user.id` and has RLS enabled with policies that restrict CRUD to rows where `owner_id = auth.user_id()`.

## Tables

- `applications`
- `notes`
- `reminders`
- `documents`

Better Auth tables (`user`, `session`, `account`, `verification`) are managed by the auth library; app data always carries `owner_id`.

## Policy helper

Policies use Drizzle's Neon helpers (`enableRLS`, `crudPolicy`) with the `authenticated` role. Anonymous role has no access to app tables.

## Session → Postgres claim

The Worker maps the Better Auth session `user.id` into the Neon JWT / `SET` claim used by `auth.user_id()` before running queries. Isolation is proven by `npm run test:rls`.

## Cascades

- Deleting an application cascades to `notes` and `reminders`.
- `documents.application_id` is nullable and set null on application delete (general templates remain).
