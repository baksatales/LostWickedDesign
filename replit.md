# Baksa Tales

An Indian handmade marketplace focused on maker stories, meaningful gifting,
and warm editorial luxury.

## Approved frontend demonstration

- `/` now follows the owner’s “Homepage v5 (compartment baksa)” brief, superseding
  the ZIP’s `Main.html` only. Its five Gifting Moods™ sit alongside the full quiz;
  this explicitly replaces the earlier rule against homepage mood discovery.
  Keep “Thoughtful One” as the registered mood name. All other approved pages
  remain unchanged apart from small navigation fixes.
- The exact V5 source is now attached in
  `attached_assets/0_Homepage_v5_(compartment_baksa)-html_1794473724431.zip`.
  Use its HTML values and original trunk/object assets, not the temporary SVGs.
  Check source versus app at 1440px and 390px, retaining real editable text.
  The homepage must remain faithful to that export, with only one discreet sample
  note in the footer area: no temporary-art labels or extra demo badges/banners.
- The owner has explicitly authorised a calmer, more complete dashboard design,
  rather than an unchanged copy of the older dashboard screens: #FBF4EA pages,
  ivory cards, #E8D9BE borders, #4A1020 EB Garamond headings, Arvo labels/numbers,
  one meaningful accent per card and one thin coral block-print band at the top.
  Maker phones use Today/Orders/Products/Earnings/More bottom tabs; admin phones
  use a slide-out menu. This dashboard exception does not permit redesigning `/`.
- The active frontend reproduces `reference/approved/baksa-tales-replit/designs/`,
  extracted from the user's approved ZIP. Do not redesign it or use the older
  storefront as the visual reference.
- The active approved frontend uses the supplied designs with sample behavior.
  Most storefront and maker/admin demo actions use browser sample state; shopper
  accounts, sample checkout, coupons and blog publishing use isolated API-backed
  sample data. Sample identities do not authenticate against Supabase. Never
  mistake these flows for live records or transactions.
- The older React storefront and its Site Studio are retained but are not the
  active approved frontend. Their settings do not currently edit the approved
  storefront.
- Report: `/approved-report.html`. Source templates and demo interaction code:
  `artifacts/baksa-tales/src/demo/`. The previous app remains in its original files.
- `pnpm --filter @workspace/baksa-tales test` — all frontend regression tests.
- `pnpm --filter @workspace/baksa-tales test:browser` — Chromium interaction tests.
- `pnpm --filter @workspace/baksa-tales test:visual` — approved source/app captures
  at 1440px and 390px; generated evidence is excluded from Git and publishing.

## Run & Operate

- Managed workflow `artifacts/api-server: API Server` — shared API
- Managed workflow `artifacts/baksa-tales: web` — storefront at `/`
- Managed workflow `artifacts/mockup-sandbox: Component Preview Server` — retained design references
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/api-server exec vitest run` — domain and API tests
- Required for real accounts/data: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Product database/auth: Supabase, as explicitly required by the supplied brief
- The template's Replit database is not used as a substitute
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/baksa-tales/` — actual web application
- `artifacts/api-server/src/routes/` — catalogue and role-scoped workflow APIs
- `lib/api-spec/openapi.yaml` — API source of truth; regenerate after changes
- `reference/baksa-kit/` — retained supplied code, SQL and tests; not production-ready
- `supabase/migrations/005_reviewed_first_build.sql` — prepared hardening patch, not yet applied
- `docs/BUILD_STATUS.md` — feature acceptance checklist, audit, setup and limitations
- `docs/VERIFICATION.md` — tests actually run and unverified boundaries

## Architecture decisions

- Preserve Supabase, original trunk artwork and supplied product photography.
- Never use browser storage as authoritative account, stock, order, role or payout data.
- Security patch verification gates all real database workflows; absent setup is not simulated success.
- Payments remain disabled until a real provider and financial safety tests are in place.
- OpenAI writing is provisioned through Replit AI Integrations (credit-billed).
  It is verified-maker/admin-only, review-only, and never publishes or changes prices.
- Site Studio owns editorial content and validated appearance tokens, not
  executable HTML/CSS, roles, finance rules or order permissions.
- Editorial save, publish and restore are separate, revision-checked PostgreSQL
  transactions. Public RPCs never expose unpublished drafts.
- Current samples have unverified prices/materials/lead times; never silently promote them to live listings.

## Product

See the maintained acceptance matrix in `docs/BUILD_STATUS.md`. This first
implementation is not a launch-ready complete marketplace.

## User preferences

- Luxury/premium aesthetics throughout buyer, maker and admin experiences.
- Opening/closing trunk and Today's stories are potential paid brand-feature surfaces.
- Keep sponsorship disclosed, simplify discovery and avoid fabricated urgency.
- The quiz is the sole guided-discovery route; omit “Start with a feeling.”
- Storytelling should feel royal, fun, Indian and welcoming globally.

## Gotchas

- Do not run the supplied SQL migrations or auth test stub blindly against Supabase.
- Do not expose a service-role/secret key through the anon-key config.
- Never alter baksatales.com, DNS, production data or publish without authorization.
- Apply the reviewed editorial/operations migration after the security patch
  on an owner-authorized development Supabase project, not an unknown live database.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
