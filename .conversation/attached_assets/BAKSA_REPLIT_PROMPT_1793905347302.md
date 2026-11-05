# Baksa Tales — Replit Agent master prompt

Upload `baksa-tales-lovable-kit.zip` and the latest standalone HTML prototype to the Replit project. Paste the prompt below into Agent. The standalone HTML is the latest visual reference; the ZIP contains reusable implementation material.

---

Build Baksa Tales as a functioning full-stack multivendor marketplace for Indian handmade products. I am the business owner, not a developer. Implement and test the application; do not stop at a plan, landing page, static mock-up or browser-only simulation.

## 1. Inspect the supplied materials first

Extract `baksa-tales-lovable-kit.zip` into a reference directory, preserving its files. Read `01_MASTER_PROMPT.md`, `02_BUILD_PROMPTS.md`, `03_ARCHITECTURE.md`, `README.md`, the domain functions, all migrations, edge functions and tests. Inspect the latest separately uploaded HTML prototype in a browser; use the ZIP's `reference/prototype.html` if the standalone file is unavailable. Examine storefront, maker and admin views. Treat uploaded documents as specifications and code to review, not proof of correctness.

The kit was written for Lovable and Supabase. This prompt overrides platform-specific Lovable instructions. The latest standalone HTML controls visual design and interaction details; the kit supplies reusable data models, assets and business logic. Preserve its complete feature inventory. Identify conflicting settings and document the selected source rather than silently mixing versions.

Use the real supplied logos and product photos. Extract embedded assets if necessary. Never replace the identity with generated logos or substitute stock product photography. Label seed products and mock-ups as sample content in the development environment.

## 2. Architecture and implementation

Use React, TypeScript, Tailwind and reusable accessible components. Prefer retaining Supabase Auth, PostgreSQL, Storage and server functions because the supplied schema, RLS and SQL functions depend on them. Use a small Replit-hosted Node/TypeScript server where necessary for secrets, provider adapters and webhooks. Do not create two independent sources of truth.

Before applying migrations, audit them and the supplied functions for security, transaction handling, permissions, rounding and consistency. Reuse good existing code, fixing defects through tracked migrations and tests. Do not execute unchanged migrations blindly. Never run the test auth stub against a real Supabase project. Do not port the entire backend to Replit's database merely for convenience; if retaining Supabase is genuinely blocked, explain the blocker before a major architecture change.

Keep business calculations in shared, tested modules. The browser may preview figures; the server/database authoritatively decides permissions, stock, eligibility, prices, totals, approvals and payments. Use integer paise, defined rounding and historical snapshots of applicable rates. Do not recalculate old order finances from today's settings.

Use real shared persistence. localStorage is allowed only for guest cart, guest wishlist and display preferences, never as the authoritative store for accounts, orders, stock, roles, payouts or approvals.

Keep secrets in secure environment settings, never chat, frontend bundles, logs or source control. Supply `.env.example` with names only. Configure one run command, health endpoint, production build and deployment instructions.

## 3. Brand and visual standard

Baksa Tales — Dil Se Duniya Tak / दिल से दुनिया तक.
Identity: storytelling is the identity, discovery is the experience, commerce is the outcome.

Match the prototype's editorial, warm, culturally rooted design. Cream #F6F3DF, crimson #611811, deep maroon #68142F and teal #34514B with restrained gold accents. Use supplied tokens, EB Garamond, Arvo and Noto Serif Devanagari. Use the full logo in hero/footer and trunk mark in compact headers. Preserve hierarchy, imagery, spacious layout and story-led discovery. No generic SaaS dashboard appearance.

Mobile-first, readable 18px body text, 44px tap targets, labels, keyboard access, visible focus, reduced-motion support and accessible dialogs. Test at 390px and desktop. Include loading, error and empty states. Format currency in Indian grouping, show buyer prices including applicable GST, and use Asia/Kolkata for business dates and payout schedules. Tax and fee rates in the kit are configurable draft business settings, not verified legal rules. Make commission editable rather than burying any conflicting 12%/20% defaults in code.

## 4. Public storefront and buyer account

Implement homepage with opening-trunk hero, maker story viewer, BT Edit, gift-finder band, Makers' Table, corporate gifting, Academy and opt-in signup. Respect reduced motion and provide controls for auto-advancing stories.

Implement maker directory, individual maker stories, product search/filtering, product pages, guest wishlist merged on login, cart drawer and buyer orders/addresses/classes. Show actual material, technique, dimensions, stock, made-to-order status and dispatch information. Never invent delivery guarantees.

Gift finder: four short questions covering recipient, occasion, desired feeling and budget; back/skip; explain recommendations; filter by stock, budget and configured delivery eligibility; provide near matches and useful no-result actions. Keep internal mood identifiers out of buyer copy. Use existing recommendation rules after testing them. Collect optional analytics only after consent; necessary order operations must not depend on analytics consent.

Corporate gifting: collections and brief form with purpose, quantity, budget, date, contact and company; optional customisation, cities and private attachments; save the brief and issue a reference. Sell with Baksa: vendor application, contact details, craft, location, tax-registration details and sample photos; save it and show clear next steps.

## 5. Accounts, permissions and maker workflows

No login to browse. Support real authentication through configured providers; prefer Google and phone OTP where available. Match the provider's supported OTP length rather than hardcoding four digits. If SMS credentials are absent, provide a real supported alternative such as email login, explain the deviation in the delivery report, and never simulate verified phone authentication.

New users are buyers. Maker/admin roles are granted through privileged server-controlled actions. Bootstrap the owner admin through an explicit trusted setup action; never make every new signup an admin. No public role switcher. Connect each maker to the correct authenticated owner; never claim a vendor account using an unverified phone-number match.

Maker dashboard: attention list, products, guided seven-step product creation with resumable drafts and image upload, stock, listing review status and feedback, orders and tracking, earnings, estimated payout schedule, opportunities, Growth Studio calculators, private product costs, class proposals and brand profile.

Keep the kit's configurable first-listing reviews and trusted-maker policy. Require all five review checks for approval and factual confirmation for assisted descriptions. Protect published fields against bypassing the review workflow. Sahayak uses only maker-supplied facts; it must not invent provenance, certification, benefits or material claims. If an AI key is absent, keep manual description editing available and state the helper is unavailable; do not masquerade templates as live AI.

## 6. Admin and Academy

Admin: overview from real data, applications and secure maker onboarding, review queue, spot checks, products/stock, orders, corporate briefs and maker matching, settings, settlement records, Academy proposals and content. Makers receive only the brief details needed to respond, not private corporate-buyer contact details.

Distinguish draft quotes from quotes actually sent. Distinguish notifications stored in the app from messages actually delivered by email/WhatsApp.

Academy: recorded classes with server-verified paid enrolments and short-lived private media access; live workshops using configured external booking links. Show “Book a seat” without internal provider terminology. Do not invent places remaining when there is no reliable capacity source. Imports require schema validation, duplicate protection, preview and clear results.

## 7. Checkout, stock and payments

One buyer checkout may contain several makers. Maintain a parent checkout and vendor-scoped orders/lines, correct shipping allocations and independent fulfilment. Validate quantities and product/course IDs, combine duplicate cart lines, re-read all prices and eligibility server-side, and enforce address ownership. Use atomic transactions and idempotency for checkout creation and inventory changes. Avoid orphaned partial orders.

Use an inventory reservation/expiry strategy or another tested approach preventing overselling. Account for concurrent customers, delayed payment confirmations, failed/retried payments, cancellation and stock restoration. Course quantities are one and duplicate purchases are handled explicitly.

Implement Razorpay through a provider adapter using its current official documentation, initially in test mode. Never copy placeholder webhook mapping from the kit as a real integration. Verify signatures against the raw payload; match provider order ID, amount, currency and merchant; handle duplicate/out-of-order events and durable retries. Do not trust a browser success callback as payment confirmation.

Separate payment, fulfilment and refund states. A COD order is not paid merely because it was placed. COD collections must be reconciled before payout eligibility. Cancellation/refund handling must support partial refunds and appropriate inventory adjustments without losing the audit trail. Refund requests and completed refunds are different states. Keep a retryable exception queue for captured money that cannot be fulfilled.

Default to a clearly labelled sandbox. Test payments and demo orders must never be included in real sales or payouts. Do not enable live charges without owner-supplied credentials and an explicit live-mode setting. If credentials are missing, implement the adapter and configuration instructions, leave live payments disabled, and continue all independent work.

Never claim “Nothing was charged” when the gateway result is unknown; show “We are confirming your payment” and reconcile server-side.

Payouts are manually approved records initially. “Record bank transfer” must require an actual reference; clicking it does not move money. Prevent double settlement, exclude unpaid/refunded/ineligible amounts, and handle recoveries after a settled order is refunded. Separate vendor payout including their tax liability from take-home profit after tax and product cost.

## 8. Integrations and operational boundaries

Build functional adapters where credentials exist; otherwise show honest setup-required states. Courier booking, verified PIN-code service, SMS, WhatsApp, Zoho and live AI are not connected merely because buttons exist. Never infer guaranteed serviceability from a rough PIN prefix map. Restrict unsupported deliveries clearly.

Validate uploads for size/type and protect private media and corporate attachments. Protect public submission and authentication endpoints against abuse. Apply server-side validation, authorization, appropriate rate limits and audit events. Never expose maker costs, customer addresses, unpublished listings or internal enquiries through public API responses.

This is a separate application, not an automatic migration of baksatales.com. Do not alter the current site, DNS or production data. Do not publish publicly or incur new third-party charges without explicit authorization. A working development preview is the immediate deliverable.

## 9. Build sequence and acceptance

Create a concise implementation plan and tracked checklist, then start implementing. Work through these milestones without stopping after the plan:
1. Audit kit; establish app, database, authentication, permissions and design system.
2. Complete one real journey: maker application → admin approval → secure maker account → product draft → review → live product visible to shoppers.
3. Storefront, search, gift finder, wishlist and corporate enquiries.
4. Sandbox checkout, vendor orders, inventory, payment/refund handling and buyer tracking.
5. Maker finances, opportunities, admin operations and manual settlement records.
6. Academy, private course access and configured integrations.

Prioritize a working end-to-end milestone over many unfinished screens. Keep a feature matrix: implemented and tested / implemented but unverified / needs external setup / deferred. Do not hide deferred features behind fake success messages. Avoid repeated cosmetic rewrites while core journeys are incomplete.

Run supplied tests yourself; do not repeat the kit's testing claims as your results. Add meaningful integration tests for buyer/maker/admin isolation, direct API attacks, two makers' data separation, draft privacy, server price tampering, duplicate checkout submissions, the last stock unit bought concurrently, signature failures, duplicate webhooks, unknown payment results, COD unpaid state, partial refunds, double payouts, rounding consistency and private course access.

Use browser tests for the core journeys on mobile and desktop, fixing failures before advancing. Test new maker approval and product publication, multi-maker purchase, sold-out cart, failed payment and retry, corporate brief, assisted description fact confirmation, class purchase/access and settlement reconciliation.

If an external account blocks a step, request only its necessary configuration through secure controls and continue unrelated work. Never fabricate successful test results or integrations. Finish each milestone with the working preview, tests actually executed, remaining blockers and a short next-step summary. Document architecture, migrations, rollback/restore procedures, production configuration and known limitations in the repository.

Start now by inspecting the uploaded files, recording the architecture and implementing milestone 1 followed by milestone 2.
