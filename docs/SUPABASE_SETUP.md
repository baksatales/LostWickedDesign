# Connect the development Supabase project

## Connection settings

Store `SUPABASE_URL` and `SUPABASE_ANON_KEY` securely in Replit Secrets.
Use the project's HTTPS base URL and publishable or legacy anon key. Never use a
database password, `sb_secret_` key or service-role JWT for these settings.
No administrator database credential is needed by the app.

## Generate the database setup file

From the workspace root:

```sh
node scripts/src/prepare-supabase-setup.mjs
```

This creates `generated-artifacts/supabase/baksa-development-setup.sql`. Generated
output is excluded from Git and publishing; the generator and source migrations
remain in the project.

## Run once, manually, on the new development project

1. Confirm the selected Supabase project is the new development project, not an
   existing or production database.
2. Open the generated file in Replit's Files panel and copy the entire contents.
3. Open that project's **SQL Editor**, create a new query, paste, and run once.
4. The final result should show `security_revision = 1`, `editorial_ready = true`
   and `settings_ready = true`.

The script refuses to run if the public schema already contains tables or the
Baksa role enum. It combines schema, security, business functions and reviewed
migrations into one transaction, so intermediate weaker permissions never commit.
It does not include the sample seed, a local Auth stub, an admin grant, or payment
activation. It initializes the required singleton settings with development
defaults; financial/tax rates still need approval before launch.

**The catalogue starts empty.** Add and review real maker products to populate it.
Do not rerun this initialization script after a successful setup. Use reviewed
additive migrations for later changes.

## Existing tables, but security function is missing

Do not rerun the empty-project setup, delete tables, or create the readiness
function on its own. A marker without the security changes would be misleading.

Generate the reviewed existing-schema update instead:

```sh
node scripts/src/prepare-supabase-repair.mjs
```

The output is `generated-artifacts/supabase/baksa-development-update.sql`.
Run its entire contents manually in the same development project's SQL Editor.
It restores recognized Baksa access policies, triggers and functions and applies
the reviewed hardening together in one transaction. Unexpected custom policies
or an incompatible base schema abort the update instead of silently changing it.
It never drops tables or catalogue/order rows, replaces financial settings,
assigns admin rights, or activates payments.

Existing editorial revisions and analytics identities remain unchanged when the
analytics registry already exists. If absent, the reviewed one-time identity
backfill adds technical keys without changing editorial text or publishing.
The local repair tests cover preserved data/settings, an already-configured
editorial registry, repeat execution, custom-policy refusal and rollback on
incompatible schemas. They are not proof of a successful remote update.

After success, verify the same three final readiness results listed above, then
check the app's runtime status. Stop and review any SQL error rather than
weakening guards to force the update through.

## Authentication and owner access

After the schema is ready, enable verified email sign-in in Supabase Auth and
check the site's authentication flow. Admin access is a separate step requiring
the owner's explicit approval and verified Supabase identity. Never give admin
rights to the first arbitrary signup.

API-key connectivity, successful schema setup and an approved admin account are
three different checks. Payment processing and external integrations remain off.
