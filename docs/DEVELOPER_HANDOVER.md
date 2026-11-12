# Baksa Tales — developer handover

Updated 12 November 2026. Start with the current-preview addendum below. The dated
sections that follow are retained implementation notes; where they conflict with
the addendum, the addendum describes the current approved demo.

## Current preview state — 12 November 2026

### What is available to review

- The active approved storefront is `artifacts/baksa-tales/src/demo/ApprovedApp.tsx`;
  it layers interactions onto the approved HTML templates without editing those
  reference files.
- **Bea** opens as a responsive popup over the current page. The header link,
  homepage recipient shortcuts and direct `/bea` or `/finder` routes open it.
  Guided questions, free-text requests and sample recommendations remain inside
  the popup. Free text uses rules-based matching against the sample catalogue,
  not a generative AI service.
- The isolated sample admin routes are `/admin/coupons` and `/admin/blog`;
  published sample stories appear at `/blog`. Coupon discounts are calculated
  by the sample API during sample checkout. Blog drafts and publishing use the
  sample API.
- To view a protected sample admin route, open `/admin`, enter any valid
  10-digit Indian mobile number, choose **Baksa team · sample**, and enter the
  fixed code `246810`. This is a simulation: no SMS is sent and it grants no
  access to live records.

### Data and unfinished work

- Coupon, blog and shopper-account changes use isolated, server-backed sample
  data. The data is not a production CMS/database and can reset when the API
  process restarts or when sample data is reset. The rest of the approved
  storefront and most maker/admin dashboard interactions still use demonstration
  state.
- `/admin/site` and `/maker/sahayak` now open the existing real-account workspaces
  inside the active app. Both still require verified Supabase roles; sample
  sessions cannot enter them. Site Studio can edit the separate SiteDocument
  storefront, but it does not yet edit the active approved HTML pages.
- The secure maker workspace now includes Sahayak rewriting and opt-in browser
  dictation in the product description and writing bench. Suggestions stay
  unsaved until the maker applies them. AI calls still require a verified live
  maker/admin account and configured AI service; sample sessions cannot use it.
- The site-wide editor for active approved pages, admin categories and analytics,
  maker SEO/AEO fields, relevant Academy recommendations, and full live/sample
  maker/admin business workflows remain unfinished.
- Maker payout setup remains unconfigured. The owner chose provider-hosted
  onboarding, but no specific provider is selected; the app does not collect raw
  bank details or initiate transfers.
- The full secure maker/admin workflows and live Supabase/RLS acceptance are
  incomplete. No remote migration, seed, account grant, production publish,
  payment, refund, bank transfer, SMS or courier action was performed for this
  preview update.

### Latest verification

- Frontend and API TypeScript checks passed.
- Browser suite: **25/25 checks passed**, including Bea opening without changing
  the current page, sample/live identity separation for secure tools, and mobile
  layout.
- Visual suite: **64 desktop/mobile captures**, with no measured overflow,
  broken images or browser errors.
- API/account suites: **31/31 checks passed**. These checks do not prove live
  Supabase, SMS, payment or AI integration behavior.

Repeat the relevant checks from the repository root:

```sh
pnpm --filter @workspace/baksa-tales run typecheck
pnpm --filter @workspace/baksa-tales run test:browser
pnpm --filter @workspace/baksa-tales run test:visual
pnpm --filter @workspace/api-server exec vitest run tests/api.test.ts tests/sample-accounts.test.ts
```

### Main files for this update

- `artifacts/baksa-tales/src/demo/BeaPopover.tsx` — Bea popup, guided questions,
  free-text matching and in-popup recommendations.
- `artifacts/baksa-tales/src/demo/chrome.ts` and
  `artifacts/baksa-tales/src/demo/pages/storefront.ts` — storefront links and
  homepage shortcuts that open Bea.
- `artifacts/baksa-tales/src/demo/SampleAdminCoupons.tsx` and
  `artifacts/baksa-tales/src/demo/SampleBlog.tsx` — sample admin screens.
- `artifacts/baksa-tales/src/pages/MakerArea.tsx` and
  `artifacts/baksa-tales/src/components/SpeechDictationButton.tsx` — verified
  maker writing tools; not available to browser-only sample identities.
- `artifacts/api-server/src/lib/sample-accounts.ts` and
  `artifacts/api-server/src/lib/sample-content.ts` — isolated sample business
  records and validation.
- `artifacts/baksa-tales/tests/approved-browser.mjs` and
  `artifacts/baksa-tales/tests/approved-visual.mjs` — browser and visual checks.

## Historical implementation handover — 6 November 2026

## What this package is

The current React website and Express API, with brand assets, shared packages,
reviewed Supabase SQL, tests, setup utilities and the latest supplied Claude
design screens. Continue from this application rather than rebuilding the static
HTML designs. Keep the monorepo directory structure intact.

This is **not a launch-ready multivendor marketplace**. No database dump, customer
records, passwords, API keys, login sessions, Git history or private agent/chat
files are included. Environment examples contain blank values only.

## Earlier baseline snapshot — 6 November 2026

- The development Supabase connection and reviewed schema were verified through
  the running API. The owner confirmed that verified-account admin access works.
- Public storefront, stories/trunk interaction, product/maker routes, gift quiz,
  corporate enquiry form, account pages and protected workspaces exist.
- Site Studio supports separate draft/save/publish/restore actions and content/
  theme editing. Local design previews are not production publication.
- The session/cache feedback loop after sign-in was fixed. Public connection
  settings survive account changes; private caches reset and workspace queries
  are scoped to the user identity.
- The gift finder is **rules-based matching**, not generative AI.
- A separate authenticated AI-writing endpoint produces unsaved drafts from
  supplied facts for human review. Hosted AI use has not been accepted end-to-end.
- Payments remain disabled. Do not enable money-moving prototype RPCs or claim a
  paid order, refund, payout or Academy entitlement based on UI state.

## Directory map

| Location | Purpose |
| --- | --- |
| `artifacts/baksa-tales/` | Main React/Vite website, public assets and UI tests |
| `artifacts/api-server/` | Express API, permission checks and backend tests |
| `artifacts/mockup-sandbox/` | Supporting design/component previews, not the main app |
| `lib/api-spec/` | OpenAPI contract and code generation |
| `lib/api-client-react/`, `lib/api-zod/` | Shared generated client/validation |
| `lib/integrations-openai-ai-server/` | Existing AI adapter |
| `lib/db/` | Workspace database scaffold; not a replacement for Supabase |
| `reference/baksa-kit/` | Original base SQL/business rules; required by setup generators |
| `supabase/migrations/` | Reviewed hardening, editorial/operations and analytics SQL |
| `supabase/manual/` | Explicit first-owner admin grant; not a public endpoint |
| `scripts/src/` | Setup generators and source-handover packager |
| `docs/` | Setup, verification, privacy and architectural notes |
| `design-reference/claude-kit/` | Supplied HTML design screens/images, reference only |

The archive adds a placeholder-only `.env.example`, a credential-free `.npmrc`
and `HANDOVER_MANIFEST.json` with per-file SHA-256 hashes. They do not export
workspace secrets. Replit/service metadata is retained for context; do not assume
it automatically provisions a different hosting environment.

To rebuild this handover after editing its source, use
`python3 scripts/src/build-developer-handover.py`. It can reuse the included
design references and does not need the owner's original uploads or chat files.

## Brand and interaction requirements

- Preserve the original Baksa icon, trunk artwork and opening/closing interaction.
- Use the supplied product photography. Confirm image rights before production.
- Keep a warm, editorial Indian-premium identity that can work globally.
  Good Earth was inspiration, not a design to copy exactly.
- Do not restore the removed dense illustrated garden or add decorative clutter.
- Avoid oversized blank spaces; keep desktop and phone layouts purposeful.
- The quiz is the sole guided discovery route. Do not restore “start with a feeling.”
- Owner-managed presentation is important, but editable content must not bypass
  product review, verified identity, financial rules or role permissions.
- Trunk placements and Today's Story have sponsorship potential. Real agreements,
  scheduling, disclosure and commercial operations remain to be implemented.

## Toolchain and dependencies

The observed working environment used Node **24.22.1**, pnpm **10.26.1** and Linux
x64. Python 3 is needed only for the ZIP packager, not to serve the website.

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
```

**Platform warning:** `pnpm-workspace.yaml` intentionally excludes native package
variants for platforms other than Linux x64. Use Linux x64 for the closest match.
Before supporting macOS/Windows/ARM, review those overrides and regenerate/test
the lockfile deliberately. Do not disable the dependency minimum-release-age
protection to work around installation issues.

An independent clean-machine install was not performed for this handover.

## Environment and local serving

Obtain development-only values through a secure channel from the project owner.
The archive's `.env.example` lists names, not credentials. Configure them in the
hosting environment or a local ignored `.env`; the current processes do not
automatically load a root `.env` file.

- `SUPABASE_URL`: HTTPS base project URL, without `/rest/v1`.
- `SUPABASE_ANON_KEY`: publishable or legacy anon client key. Never substitute a
  secret/service-role key; this setting is also used by the browser.
- `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`: optional AI
  adapter configuration. Review provider authentication/billing if changing hosts.
- `LOG_LEVEL`, `NODE_ENV`: runtime settings.
- `DATABASE_URL`: optional unused workspace scaffold, **not** the Supabase
  connection method. Do not create/migrate a substitute database.

From the extracted root, with required environment variables already loaded:

```sh
# Terminal 1
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/baksa-tales run dev
```

**These two servers also need a same-origin gateway outside the existing
workspace.** Route `/api/*` to port 8080 and all other paths plus Vite WebSockets
to port 5173. Do not hardcode a localhost backend into browser code or change API
contracts to compensate. An example for separately installed Caddy is included:

```sh
caddy run --config docs/local-development.Caddyfile --adapter caddyfile
```

Then use `http://localhost:3000`. This proxy example is a developer starting point,
not a tested production deployment. On the existing workspace, retain the managed
artifact workflows and gateway instead of starting duplicate services.

For a local production frontend build:

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/baksa-tales run build
pnpm --filter @workspace/api-server run build
```

Production hosting must serve the frontend build, route `/api/*` to Express,
support SPA route fallback and configure appropriate TLS/cache/auth settings.
The mockup sandbox does not need public production exposure.

## Supabase: existing project versus new project

Read `docs/SUPABASE_SETUP.md`.

**The current development database is already initialized.** Do not rerun setup,
restore an older security baseline, reseed it, or grant additional roles as part
of installing dependencies. No remote database changes are authorized by simply
receiving this source archive.

For an explicitly approved **new, empty development project only**:

```sh
node scripts/src/prepare-supabase-setup.mjs
```

Review the generated SQL and run the whole transaction in that new project's SQL
Editor. It combines original schema/security/logic with reviewed migrations and
refuses to overwrite existing public tables. Do not apply `004_seed.sql`: its
commercial facts are unverified.

The existing-schema update generator is a guarded recovery tool, not a general
migration runner. It restores known baseline functions/policies and must never be
used blindly over a newer installation. Stop on unexpected/custom schema rules.

Owner admin access requires the exact, email-verified account and explicit
approval. The manual first-owner SQL refuses an unverified/ambiguous account or
a different existing admin. Never automate admin assignment to the first signup.

Use zero-row GET probes for API table existence; HEAD responses were misleading
during onboarding. A single readiness marker is not a complete schema audit.

Configure Supabase Auth Site URL/allowed redirects for the intended development
or production origin, keep email confirmation on, and test hosted email delivery.
The existing owner's access is not a substitute for maker/buyer RBAC acceptance.

## Verification and limits

Repeatable commands:

```sh
pnpm --filter @workspace/baksa-tales run test
pnpm --filter @workspace/api-server exec vitest run
```

The latest frontend run passed 26 React checks and six analytics checks, including
restored-session navigation, account switching and private-cache reset. TypeScript
passed; the sign-in page rendered without browser errors after a workflow restart.

Setup/update/first-owner scripts have isolated PostgreSQL/WASM tests. These do not
run against hosted Supabase. Historical backend/domain test results are recorded
in `docs/VERIFICATION.md`; that full backend suite was not rerun solely to ZIP
these unchanged application sources.

The owner reported successful account verification/admin access. Hosted payments,
payouts, production AI, courier delivery, media permissions and every maker/admin
journey have **not** been accepted as production-ready. The archive integrity and
credential-pattern checks are not a complete security audit.

## Priorities before launch

1. Populate and review real maker/product facts, photos, prices, stock and policies.
2. Verify buyer/maker/admin journeys against hosted Supabase, including denied
   cross-account access and content editing/publication on desktop and phones.
3. Implement atomic inventory reservations, real payment test-mode checkout,
   signed/idempotent webhooks, failed-payment reconciliation and refunds.
4. Complete per-maker order splitting, historical financial snapshots, settlements,
   taxes/payout approval and reconciliation with appropriate accounting review.
5. Implement persistent binary uploads, private media access and relevant delivery/
   courier/PIN validation. Academy purchase/entitlement/proposals remain partial.
6. Verify AI writing with real authorized accounts and production-safe shared quotas.
7. Add password recovery and reviewed staff access management before public launch.
8. Review SEO, accessibility, responsive behavior, loading/error states, data
   protection, image rights, operational email and production monitoring.

Continue OpenAPI-first for API changes; regenerate clients rather than hand-editing
them. Do not treat the supplied prototype edge functions, seed data or all static
design screens as completed or safe production functionality.
