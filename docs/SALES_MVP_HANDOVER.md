# Sales MVP: developer launch handover

## Status: foundation prepared; launch remains blocked

This is not a declaration that real checkout works. The active approved storefront
still uses the sample catalog and sample checkout. Its sample login is not real
authentication. Never turn those fixtures into live products merely by removing
their labels or accepting a browser-provided price.

The immediate release scope is V5 discovery → approved catalog → bag → safe
checkout → durable order → manual order operations. Advanced dashboards,
SMS, WhatsApp, CRM, courier booking, live classes, analytics and automated maker
payouts are outside the first release. Do not change the approved homepage.

## Code prepared in this increment

- `supabase/migrations/008_sales_mvp.sql`: isolated development sales policy,
  explicit listing approvals tied to a snapshot of reviewed facts and price,
  server-priced quotes, atomic inventory reservations, idempotent request keys,
  immutable address/financial snapshots and repeat-safe cancellation/expiry.
- Stock is a finite launch capacity even for made-to-order products. It is not
  unlimited inventory or a dispatch promise.
- Existing paid-order fulfilment is hardened at the SQL boundary: carrier and
  tracking before dispatch, required delay/problem notes, allowed transitions,
  and admin-only manual delivery confirmation. No status initiates a payout.
- `/api/sales/readiness` conservatively reports blockers. It never enables
  checkout based on the existence of keys or a schema marker.
- `/api/sales/quote` accepts only product IDs, quantities and an owned saved
  address; server prices and current approvals win.
- `/api/sales/checkouts` is intentionally disabled and creates nothing until the
  chosen payment integration is implemented and tested.
- `/admin/launch` and `/admin/operations` use real verified Supabase accounts,
  not the sample dashboard login. The latter supports order search, saved gift
  notes/recipient snapshots and server-confirmed manual fulfilment updates.
- Real-account route access does not establish that hosted operations were tested.
  Browser workflow tests use isolated account/API fixtures; SQL tests use PGlite.

## Owner decisions required now

1. Identify and explicitly authorize a **development-only** Supabase project.
   Existing connection settings are not permission to apply migrations to an
   unknown project. Do not change production.
2. Confirm the existing verified operator account; do not grant admin to an
   arbitrary first signup.
3. Approve a small real launch assortment with actual inventory, tax status,
   images, facts, prices and dispatch information. Do not import sample seeds.
4. Confirm shipping fee, ₹2,500 free-delivery threshold, supported destinations,
   gift-note handling, packaging and business policies. The new sales policy
   deliberately leaves the shipping fee unset.
5. Select/authorize the payment provider in the existing purchase integration
   work. No platform replacement or live charges have been authorized here.

## Development setup, only after explicit authorization

1. Review the connected schema against base migrations plus reviewed 005–007.
   Do not rerun a fresh-project initializer on an already initialized database.
2. Review/apply 008 only on the identified development project, then validate its
   grants and transactions there. It starts with reservations disabled.
3. Set the **non-secret** server configuration using the environment tooling:
   `BAKSA_SALES_ENVIRONMENT=development` and
   `BAKSA_AUTHORIZED_DEV_PROJECT_REF=<authorized project reference>`.
   The reference must match the configured Supabase host exactly; changing the
   connection cannot silently authorize a different project.
4. Confirm shipping policy through a reviewed SQL change, approve each real
   listing through `baksa_sales_approve_listing` from the verified admin session,
   and inspect `/admin/launch`. These approvals do not initiate sales.
5. Enable development reservations only when the payment adapter is ready for
   testing. The HTTP checkout endpoint remains disabled regardless of this SQL
   opt-in until the integration is implemented.

No production counterpart, remote migration, admin grant or environment opt-in
was performed by this increment.

## Payment integration contract still to implement

Reuse the prepared reservation transaction instead of the supplied unsafe edge
function or independent REST inserts. The old confirmation function stays
revoked. Never enable `DEMO_PAYMENTS`, arbitrary-digit authentication, or COD as
a shortcut to claim successful payment.

The separate payment work must:

- Create the gateway order only from server-owned amount/currency and a pending,
  unexpired reservation. Store a unique association to the provider order.
- Verify notifications from **raw request bytes** with the selected provider's
  documented signature scheme. A redirect or browser “paid” flag is not proof.
- Process events transactionally with unique provider-event identifiers,
  amount/currency/order binding, expiry and reservation-state checks.
- Use the same inventory coordination lock as reservations and releases.
  An expired/cancelled reservation must never become a paid order without
  reconciliation; late payment may need a real provider refund.
- Treat duplicate, delayed and out-of-order notifications safely, maintain a
  reconciliation queue, and verify partial/full refund accounting.
- Add a periodic expiry job. Currently expired pending reservations are released
  during subsequent reservations or an identical expired retry, not on a clock
  by themselves. Do not enable production selling before scheduled cleanup.
- Keep the provisional pending-checkout payment method consistent with the
  selected provider's actual method when confirmation is implemented.
- Persist applicable financial splits from historical snapshots, not current
  settings. Automated maker transfers remain out of scope.

There is no payment-notification handler to verify yet, so no provider signature,
refund or real charge has been represented as tested.

## Public checkout integration still to finish

The approved UI currently reads a browser-held **sample** catalog. Connect a
separate approved development catalog and real verified identity to the existing
layouts before enabling real checkout. Do not remap sample IDs to live IDs,
copy sample stock into live inventory, or reuse sample session tokens.

Wire the real address selection and quote response into checkout, make shipping
state eligibility authoritative (not the prototype PIN lookup), preserve the
gift note, then use the selected provider's hosted payment UI. The existing
sample checkout must remain clearly isolated and must never imply a delivery.

## Verification commands and limitations

```sh
pnpm run typecheck
LOG_LEVEL=silent pnpm --filter @workspace/api-server exec vitest run
pnpm --filter @workspace/baksa-tales test
pnpm --filter @workspace/baksa-tales run test:browser
pnpm --filter @workspace/baksa-tales run test:sales
```

New local coverage includes authorization and ownership, approved-price drift,
duplicate-line consolidation, stock contention, idempotency, single restocking,
immutable address snapshots, pending/paid separation, fulfilment steps, operator
navigation/search/save/reload, buyer denial and 390px overflow.

PGlite exercises PostgreSQL transactions/RLS locally but is not a multi-session
hosted concurrency test. The browser suite substitutes development account and
API fixtures; it proves client behavior, not hosted Supabase identity. Before
launch, run actual hosted account/RLS/concurrent-checkout tests, provider sandbox
success/failure/replay/refund tests and a complete buyer-to-operator walkthrough.

## Two-week release target

Treat this as a target, not a deadline guaranteed by the current build:

- First: owner decisions, catalog verification and authorized development setup.
- Then: real catalog/account wiring and the selected provider's test-mode flow.
- Finally: fulfilment rehearsal, security/stock/payment failure tests and an
  owner-reviewed release checklist.

If these checks are incomplete, stop the release rather than opening real
checkout with a demo path. Publishing, production configuration and live-charge
authorization are separate owner-approved actions.
