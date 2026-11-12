# Baksa Tales — current build status

## Current handover — 12 November 2026

### Completed in the visual alignment pass

- `/` now uses the approved V5 export's actual embroidered trunk, five separate
  object layers, editable text and section composition. No temporary-art labels.
- Hero selection, keyboard controls, mobile swipe row, stories, wishlist, existing
  header/bag/Bea, corporate/maker links and honest unavailable-service actions work.
- Site Studio previews the same homepage; public `/` cannot read local playground
  drafts. Only one discreet sample note and one footer appear on the homepage.
- Approved maker/admin source markup remains intact. Corrected an unintended
  starter-theme recolouring of approved dashboard cards.
- Compared source/app at 1440px and 390px. See `docs/VISUAL_MATCH_REPORT.md` for every
  route, deliberate functional differences and missing shopper/supporting frames.

### What works today, and where the data lives

The merged dashboard foundation provides role-scoped **server sample** accounts
and mutations, rather than browser authority for stock, order transitions,
listing approvals, financial calculations or sample payouts. Maker/admin screens,
seven-step product drafts, shopper orders/classes/addresses/wishlist, coupons and
sample Journal workflows were exercised by the retained 39-scenario browser suite.
These are **not live marketplace orders, genuine phone verification, card charges
or bank transfers**. Sample identities cannot enter the real Site Studio or
Sahayak services. Browser bag/wishlist demo state remains separate from real
commerce.

There are also retained Supabase-backed services and verified-account gates.
An earlier owner-confirmed development connection/admin setup is recorded in
`docs/DEVELOPER_HANDOVER.md`; this visual-only pass did not reapply migrations,
grant admin or exercise a real signed-in admin mutation. Do not mistake successful
sample tests for proof that a particular hosted project is launch-ready.

### Still required / already queued

- Premium dashboard-completion work: distinct brand/courses/applications/makers/
  settings/audience/issues surfaces, mobile maker bottom tabs/admin drawer,
  packing slips, onboarding/away mode, tale submissions and buyer occasions.
  These are not marked delivered by this visual pass.
- Confirm the **owner-authorised development** Supabase project and review its
  actual schema/security readiness. Apply any missing reviewed migrations only
  with explicit authorisation. Never migrate an unknown or production project.
- Confirm the first admin is the owner's verified account; no automatic admin
  assignment or new grant was performed here.
- Connect payment gateway and provider-hosted maker payout onboarding before
  charges, refunds or transfers. Do not collect raw bank credentials in the app.
- Live phone codes need SMS/phone-auth setup; event and WhatsApp audience delivery
  need consent-aware persistence/provider wiring. Current homepage forms save
  nothing and say so.
- Couriers, PIN lookup, Zoho CRM, WhatsApp, TagMango live bookings and consented
  analytics remain integration-dependent. Do not fabricate bookings or messages.

### Verification

- Frontend TypeScript and production build passed (existing non-blocking build
  warnings remain).
- Final frontend suite: **73 Vitest + 6 analytics checks passed**, including the
  9/9 homepage-content group and byte-identical original-art checks.
- Retained frontend/dashboard browser suite: **39/39 passed**.
- Homepage browser pass: **12/13 initially**; the sole failure was a reference
  capture waiting for the hidden desktop trunk to be visible on a phone.
  Corrected capture and new public/local-draft isolation tests passed **2/2**.
- Forty dashboard/account captures plus homepage source/app pairs at both widths
  had no overflow, broken images or browser exceptions.

No publishing, live-domain changes, database migrations, admin grants or real
payments occurred in this pass.

---

## Historical implementation notes

The following sections describe earlier milestones, not current acceptance.
Connection statements and older totals below are superseded by the current
handover above; they must not be used as evidence of live readiness.

## Supplied Claude design integration

The newer uploaded Replit package's `designs/` screens now guide the shared
storefront and existing maker/admin presentation: EB Garamond reading text,
Arvo interface text, cream/crimson/teal/marigold colours, arched photography,
rounded surfaces and the scalloped footer. The original Baksa icon asset files
and opening trunk interaction are retained. This is an adaptation of existing
functional surfaces, not a claim that all 25 static screens' features are complete.

Corporate enquiries now collect seven required answers with budget **per gift**,
email or Indian WhatsApp contact, and optional customisation, delivery cities,
reference link and notes. The API validates these fields, saves them to the
existing private enquiry columns and returns them only in the admin feed.
Corporate reference artwork, captions and introductory form copy are editable
through Site Studio's display-label controls. Preparing another brief creates a
new enquiry; it does not silently edit a previously saved record.

The existing domain module matches the supplied developer kit. No replacement
database, demo payment success, automatic remote migration or logo replacement
was introduced. Supabase/Auth and payments remain disconnected. Academy selling,
course proposals, payout processing and other unimplemented kit workflows have
not become live merely because their shared visual styles changed.

## Editorial Studio and operational expansion

The current build adds a document-backed content/theme API and prepared Supabase
storage for owner-managed brand settings, navigation, homepage sections, trunk
cards, story chapters, page introductions/SEO and quiz display labels. Content
save, publish and restore are distinct actions. Versions restore to a draft, not
straight to the public site; revision checks refuse stale overwrites.

New protected operations cover verified-applicant approval, corporate pipeline
stages, maker profiles, draft image ordering and safe order fulfilment transitions.
Order feeds are scoped to the buyer, owning maker or admin and return the latest
100 records. Financial settlement, refunds and delivery confirmation are not
exposed as arbitrary status selectors.

The OpenAI integration is provisioned for authenticated maker/admin writing
assistance. It drafts from user-supplied facts for human review, does not save or
publish, and is billed to Replit credits. The gift quiz remains explainable
rules-based matching; it is not represented as generative AI. AI access cannot be
used until Supabase identity and roles are connected. The per-user quota is
process-local; production needs shared quota enforcement.

`006_editorial_and_operations.sql` adds editorial tables/RPCs and the new
operational transactions. **46 local tests pass**, including six actual isolated
PostgreSQL/WASM checks. These tests do not apply anything to a remote Supabase
project and do not prove hosted Auth/email/PostgREST integration.

Real account persistence remains blocked by the absent owner-authorized
development Supabase connection and migrations. Payment processing, refunds,
payouts, private course access, binary media uploads and courier integrations are
not complete. This is not a launch-ready marketplace.

## Scope and source of truth

The latest supplied package's designs govern appearance, with the user's explicit
exception that the existing Baksa icon remains unchanged. Its developer kit
informs business rules, subject to the existing reviewed security hardening.
The React app lives at `artifacts/baksa-tales`; the canvas previews are preserved.
Supabase remains the sole planned account/database/storage authority. The
preconfigured Replit database is not used as a substitute. No live site, DNS or
production data has been touched.

The current development catalogue contains clearly labelled samples. Public
photographs and logos are supplied assets, not generated substitutes.

## Tracked acceptance

- [x] Create the actual React application, separate from canvas.
- [x] Define typed API contracts and generated client hooks.
- [x] Implement public catalogue and rules-based gift recommendation APIs.
- [x] Audit supplied business logic and run its 17 unit tests.
- [x] Preserve Supabase and prepare account-verified, role-scoped API adapters.
- [x] Prepare additive hardening migration; do not automatically apply to an unknown database.
- [x] Implement catalogue-driven storefront, search/filter/sort, product and maker pages.
- [x] Implement gift finder with server-side matching and strict maximum budget.
- [x] Implement persistent guest wishlist/bag and grouped maker selections.
- [x] Wire sign-in, application/brief forms, private drafts and listing reviews to real APIs, with honest missing-setup states.
- [x] Check storefront desktop and mobile renders; frontend and backend TypeScript checks pass.
- [x] Execute 46 domain/API/editorial/PostgreSQL tests; no anonymous privileged writes or fake save confirmations accepted.
- [ ] Connect an owner-authorized development Supabase project.
- [ ] Apply reviewed migrations to that development project and validate SQL/RLS.
- [ ] Establish the first admin with explicit owner authorization.
- [ ] Verify application → admin approval → maker draft → photos → review → publication against real accounts.
- [ ] Complete maker stock, orders, profile, opportunities and operational management.
- [ ] Complete buyer order/address/class account management and wishlist merge.
- [ ] Implement transactional checkout/reservations and Razorpay test-mode integration.
- [ ] Test concurrent stock, idempotency, signatures, failure reconciliation and refunds.
- [ ] Implement historical financial snapshots and manual settlements.
- [ ] Connect private file storage and server-verified Academy access.
- [x] Provision AI writing provider and implement protected, human-reviewed draft endpoint.
- [ ] Verify AI writing through a real approved maker/admin account.
- [ ] Complete mobile/desktop browser acceptance for all connected critical journeys.

## Feature matrix

| Surface | Current state | Remaining acceptance |
| --- | --- | --- |
| Public catalogue and four maker collections | Implemented; API tests pass; sample content labelled | Confirm real maker facts, stock and prices |
| Homepage trunk and Today's stories | Editable content contract and protected draft/publication backend | Real sponsorship agreements and scheduling remain deferred |
| Search, filters, product and maker routes | Implemented; public search/product journey browser pass and mobile render checked | Broader route acceptance as real catalogue becomes available |
| Four-question gift finder | Implemented; server matching tested, strict budget enforced | Real delivery eligibility; no live AI claim |
| Guest wishlist and bag | Implemented; browser pass confirms persistence after refresh | Signed-in merge and server-side checkout validation remain |
| Corporate and seller forms | Implemented against real API adapters; unavailable setup fails explicitly | Connect Supabase and test persistence; seller needs verified account |
| Email sign-in and role gates | Implemented, not verified with live accounts | Supabase configuration, redirect/email settings and real RBAC tests |
| Maker private product draft and admin five-check review | Protected adapters plus transactional draft image replacement; SQL tests pass | Hosted Supabase setup and binary photo uploads |
| Maker/admin operations | Scoped feed and approval/brief/fulfilment/profile APIs implemented; relevant SQL transactions tested | Hosted-account browser verification, earnings and settlements |
| Buyer orders, addresses and classes | Partial account surface only | Full records/actions and paid access checks |
| Academy | Information page only | Course proposals, purchase, private video and booking integration |
| Multivendor payment/refund operations | Disabled; not implemented in this milestone | Atomic reservations/checkout, real test gateway, webhook/reconciliation tests |
| Live AI assistance | Provider provisioned; private review-only drafting endpoint implemented | Verified Supabase roles, hosted-account acceptance, shared production quotas |
| Courier, PIN verification, CRM, messaging | Not connected | Provider adapters, authorization and delivery tests |

## Security audit

The supplied migrations/edge functions must NOT be deployed unchanged:

1. Application approval and a sign-up trigger linked maker ownership by phone
   suffix, without proving the applicant owns the matching verified account.
   The prepared patch instead records `applicant_user_id` from a verified
   session. Existing legacy applications need a separate explicit identity review.
2. Function EXECUTE permissions default to PUBLIC. Merely granting payment
   confirmation to `service_role` does not remove PUBLIC's privilege.
3. Checkout inserts a parent, order lines and enrolments through independent
   REST writes, without an atomic parent/lines transaction.
4. Duplicate product lines are not reliably consolidated before inventory writes.
5. The webhook has placeholder event mapping and a verifier that always fails.
6. Payment status, COD course access and payout eligibility are not sufficiently
   separated. Settlement calculations use current settings rather than complete
   historical snapshots and have no robust concurrent settlement lock/recovery.
7. Public course row selection risks exposing private video paths.
8. Repeated review approval can increment approval counts repeatedly. Direct
   edits can bypass review for some sensitive fields/images.
9. Seed files contain placeholder facts and unverified medical/social-impact
   claims. They are not copied into buyer-facing claims.

Consequently all payments, financial RPCs and private video access remain
disabled. Missing integration actions must fail with a setup-required error,
never a fake receipt, login, paid order, bank transfer or AI result.

The conservative security patch currently routes every listing through review.
The kit's trusted-maker auto-publish policy is intentionally deferred until
photo/content changes and spot checks are covered by database tests.

## External setup

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Replit Secrets for a NEW development
Supabase project. The anon/publishable key is safe to send to the browser; NEVER
substitute a service-role/secret key. No service-role key is required by this app.
Supabase Auth should enable email authentication with confirmation. Email
delivery, redirect allowlists and Google OAuth require provider configuration.
No simulated SMS/phone OTP is provided.

Do not run the kit's local auth stub on Supabase. The original SQL is preserved
under `reference/baksa-kit/supabase/migrations/` for review. On a clean authorized
development project, apply schema/security/logic then the new
`supabase/migrations/005_reviewed_first_build.sql` and then
`supabase/migrations/006_editorial_and_operations.sql` atomically. Do not apply
`004_seed.sql` without confirming the sample facts and creating a safe import.
The backend requires the security-revision RPC before any database workflow.

An initial admin must be granted only to the owner's verified Supabase account
after explicit confirmation; never assign admin to the first arbitrary signup.
Production uses its own separately configured project and reviewed migration
process. Publishing this app does not migrate an external Supabase database.

## Build and run

- API workflow: `artifacts/api-server: API Server`
- Web workflow: `artifacts/baksa-tales: web`
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server exec vitest run`
- `pnpm --filter @workspace/api-spec run codegen` after API contract changes
- Health: `/api/healthz`; integration capabilities: `/api/runtime`

No live publishing or payments have been performed. AI integration setup was
included in the requested build with a user-facing Replit-credit usage notice.
