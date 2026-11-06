# Baksa Tales — first implementation

## Scope and source of truth

The supplied `BAKSA_REPLIT_PROMPT` takes priority over the older Lovable kit.
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
- [x] Execute 32 domain/API tests; no anonymous privileged writes or fake save confirmations accepted.
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
- [ ] Connect live AI listing assistance with fact confirmation.
- [ ] Complete mobile/desktop browser acceptance for all connected critical journeys.

## Feature matrix

| Surface | Current state | Remaining acceptance |
| --- | --- | --- |
| Public catalogue and four maker collections | Implemented; API tests pass; sample content labelled | Confirm real maker facts, stock and prices |
| Homepage trunk and Today's stories | Implemented with supplied artwork and manual controls | Real sponsorship agreements and admin scheduling are deferred |
| Search, filters, product and maker routes | Implemented; public search/product journey browser pass and mobile render checked | Broader route acceptance as real catalogue becomes available |
| Four-question gift finder | Implemented; server matching tested, strict budget enforced | Real delivery eligibility; no live AI claim |
| Guest wishlist and bag | Implemented; browser pass confirms persistence after refresh | Signed-in merge and server-side checkout validation remain |
| Corporate and seller forms | Implemented against real API adapters; unavailable setup fails explicitly | Connect Supabase and test persistence; seller needs verified account |
| Email sign-in and role gates | Implemented, not verified with live accounts | Supabase configuration, redirect/email settings and real RBAC tests |
| Maker private product draft and admin five-check review | API/UI adapters implemented, unverified | Supabase setup, actual photo uploads and admin application management |
| Maker/admin operation pages | Partial protected surfaces and real-count adapters | Record management, secure approval, fulfilment, earnings and settlements |
| Buyer orders, addresses and classes | Partial account surface only | Full records/actions and paid access checks |
| Academy | Information page only | Course proposals, purchase, private video and booking integration |
| Multivendor payment/refund operations | Disabled; not implemented in this milestone | Atomic reservations/checkout, real test gateway, webhook/reconciliation tests |
| Live AI assistance | Disabled; manual description remains available | Real provider, authorization, fact confirmation and tests |
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
`supabase/migrations/005_reviewed_first_build.sql` atomically. Do not apply
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

No live publishing, payments or paid third-party setup has been authorized.
