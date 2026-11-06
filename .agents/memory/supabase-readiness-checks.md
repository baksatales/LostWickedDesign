---
name: Supabase readiness probes
description: Avoid false table-existence results from HEAD requests during Supabase setup.
---

Use a zero-row GET, not a HEAD response, to establish that a table is available through the connected Supabase API.

**Why:** During development onboarding, Supabase HEAD probes returned HTTP 204 without an error for tables that a subsequent zero-row GET reported as missing with PGRST205. The misleading HEAD result led to choosing an existing-schema update when the Baksa base schema was absent.

**How to apply:** Query the relevant table with a zero limit so no user records are retrieved. Check both HTTP status and the PostgREST error code. If SQL Editor evidence and API evidence disagree, verify the selected project and API schema cache before changing anything. Keep the fresh-project initializer's refusal to overwrite existing public tables, and never infer full schema/security readiness from a single successful-looking probe.

The presence of Supabase's own Auth schema does not establish that Baksa has been installed. If Auth exists but the Baksa base type and zero-row table probes show the app schema is absent, use the guarded fresh-project initializer rather than the existing-schema update.

**Why:** This distinction resolved the onboarding mismatch; the user confirmed the fresh initializer's expected results, and an independent app check then confirmed database readiness.
