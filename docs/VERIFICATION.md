# Verification record

## Repeatable discovery interaction checks

Run `pnpm --filter @workspace/baksa-tales test` for the analytics wrapper
and React component suites. The local run passed all 26 checks: five wrapper
checks and 21 component checks, including 13 discovery interaction cases.
The storefront TypeScript check also passed.

The discovery suite renders `BaksaApp` in StrictMode with a real in-memory
router, mocked API responses, and a mocked `window.umami.track`. It covers
trunk open/close and closed-card blocking, disclosed versus unsponsored cards,
direct story visits and rerenders, both story commerce links, unavailable
stories, finder failure and zero results, keyboard recommendation activation,
and the real Site Studio homepage/story previews. Exact captured calls assert
event counts and payload allowlists; synthetic private editorial text and
quiz answers must not appear in events. Link destinations and router history
are checked alongside events.

These tests do not install a tracker, call a published analytics service, or
verify hosted analytics delivery. Finder requests are mocked at the fetch
boundary; the generated mutation hook and UI run normally.

## Current editorial/backend verification

- 46 tests pass: 17 supplied domain, 17 API boundary, six editorial validation,
  and six isolated PostgreSQL integration tests.
- PostgreSQL tests apply supplied schema/security/logic plus reviewed migrations
  to a disposable in-memory WASM PostgreSQL instance. A test-only auth schema
  models verified IDs; it is never used by the running application.
- Verified: draft privacy, atomic publication, stale-edit rejection, historical
  restoration into draft only, denied buyer/maker editorial RPCs, owned draft-only
  image changes, application approval linking only the verified applicant,
  double-approval rejection, order-feed isolation, unpaid/invalid/cross-maker
  fulfilment rejection and atomic fulfilment audit events.
- API checks verify anonymous requests cannot access editorial drafts, change
  content, call AI, approve applicants, update profiles or fulfil orders.
- Content validation verifies safe URLs/assets, unique IDs, valid story
  references, bounded documents, font tokens and readable theme contrast.
- Backend and shared-library TypeScript checks pass.
- Frontend TypeScript and production build pass. Build reports a pre-existing
  tooltip sourcemap warning and a 696 KB entry-chunk warning; neither stops it.
- One browser pass verified local design edits updating the real component
  preview, draft retention after reload, public-page isolation, trunk open/close,
  the three-chapter Tathaastu story and its maker link, and protected admin
  access. Public homepage/story and the embedded mobile preview had no measured
  horizontal overflow at 390px.
- The pass found an outer editor grid overflow on mobile. Its automatic minimum
  grid width was removed; a subsequent 390px screenshot confirms the editor
  controls now fit the screen. The complete browser pass was not repeated.
- Story editing also previews its complete draft chapters. Local preview does
  not enable real CMS publication, private records or AI spending.
- These are not hosted Supabase Auth/PostgREST tests. No remote migration or real
  payment/payout/refund was performed. AI provider is configured, but account-
  gated writing has not been exercised with a live Supabase account.

## Illustrated homepage visual verification

- The homepage now uses original generated garden artwork, with an editable
  hero image and the supplied original trunk artwork kept separate.
- Frontend TypeScript and production build pass. The shared entry is about
  639 KB before compression; existing non-blocking bundle/sourcemap notices remain.
- Desktop full-page and 390px mobile screenshots show the new composition
  without browser runtime errors. Mobile copy follows the painting in normal
  document flow, avoiding overlaps with the trunk caption and actions.
- Visual checks caught inherited light-on-light story copy and banner buttons;
  targeted home-only contrast overrides correct those treatments. Sample badges
  are positioned below the arched image corners so their disclosure is not clipped.
- Existing trunk actions, section visibility/order, editor inputs, links and
  measurement guards were preserved in code. This visual update did not rerun
  authenticated or payment journeys.

## Earlier storefront verification

Tests run locally by Agent for this build:

- Supplied business-rule suite: **17 passed**. These cover the provided calculations
  and recommendation rules; they do not prove database or payment safety.
- API boundary suite: **15 passed**. It deliberately
  removes Supabase configuration and verifies sample catalogue, exact-budget
  matching, honest setup errors, malformed inputs and denied anonymous privileges.
- Backend TypeScript check: passed after the API implementation.
- Frontend TypeScript check: passed after resolving integration types/dependencies.
- Running app screenshots: desktop homepage (1440px) and mobile shop (390px)
  render with the supplied brand assets, catalogue and no browser runtime errors.
- One Playwright shopper journey: **passed**. Checked trunk open/close, story
  next/Escape, shop search, matching product details, wishlist/bag persistence
  after reload, explicit unavailable checkout preserving bag, and mobile gift
  finder results (four explained choices within budget, no horizontal overflow).
  Minor visual note: card edges remain visible when the trunk is closed.

The additive Supabase migration has **not** been applied or tested against a real
Supabase instance. Real buyer/maker/admin isolation, database persistence,
concurrent financial flows, uploads and full maker publication remain unverified.
There are no real payment or authenticated live-AI test results.
