# Baksa Tales 2.0 — master brief for Lovable

Paste this whole file as your first message to Lovable (or into the project's Knowledge / custom instructions if your plan has it). Then work through `02_BUILD_PROMPTS.md` one prompt at a time.

---

You are building **Baksa Tales**, an Indian storytelling, discovery and commerce platform for handmade makers. Tagline: **Dil Se Duniya Tak** (दिल से दुनिया तक).

**Storytelling is the identity. Discovery is the experience. Commerce is the outcome.**

A working visual prototype is in `reference/prototype.html`. Open it, click through every screen, and treat it as the source of truth for layout, copy, flows and behaviour. Rebuild it as a real app; don't copy its single-file structure.

## Stack

- Lovable's default React + TypeScript + Tailwind + shadcn/ui frontend.
- Supabase (or Lovable Cloud) for auth, database, storage and edge functions.
- The database is already designed: run `supabase/migrations/001_schema.sql` to `004_seed.sql` in order. **Use these tables and functions. Don't invent parallel tables.**
- Business rules live in `src/lib/domain.ts` (copied to `supabase/functions/_shared/domain.ts`). **Never re-implement money, payout, delivery, approval or gift-finder logic inside components.** Import from `domain.ts` for previews, and rely on the database functions and edge functions for anything that is saved.

## Three experiences, one design system

1. **Shop** (public): homepage, makers, maker pages, the BT Edit, product pages, gift finder, bag, checkout, account (orders, classes, addresses, wishlist), Makers’ Academy, corporate gifting, “Sell with Baksa”.
2. **Maker dashboard** (`/maker/*`, role `maker`): home, orders, products (with guided add-a-product), earnings and payout dates, opportunities, Growth Studio (calculators, product profits, Sahayak helper, Academy), my courses, my brand.
3. **Baksa admin** (`/admin/*`, role `admin`): overview with gift-finder funnel, vendor applications, listing reviews and spot checks, products and stock, orders (incl. delayed and refunded), commission and payouts, corporate enquiries (match makers, quote), Academy (proposals, live-workshop import), makers (trust, GST status, state), settings.

Roles come from the `user_roles` table. Every new sign-up is a `buyer`. Admins grant `maker` and `admin`.

## Frontend vs backend: the rule

- **Frontend shows and collects.** It renders what the database returns, collects input, validates it for friendliness, and previews numbers with `domain.ts`.
- **Backend decides and records.** Prices, stock, totals, delivery eligibility, listing approval, order status changes, payouts and permissions are decided by the database functions in `003_logic.sql`, row-level security in `002_security.sql`, and the edge functions in `supabase/functions/`.
- Never trust prices, totals or statuses sent from the browser. Orders are created only by the `create-checkout` edge function.

The full map of which screen talks to which table or function is in `03_ARCHITECTURE.md`.

## Design

- Tokens: `src/styles/tokens.css` and `src/styles/tailwind.theme.ts`. Crimson `#611811` for primary actions, Deep Maroon `#68142F` for event bands, Teal `#34514B` for highlights and success, gold accents, logo-cream `#F6F3DF` background. Support dark mode with the tokens provided.
- Type: **EB Garamond** for headings and reading text, **Arvo** for buttons, labels, numbers and navigation, **Noto Serif Devanagari** for Hindi.
- Logo files are in `reference/images/brand/`. Use the full logo in the homepage hero, footer and order confirmation. At small sizes (header, dashboard sidebars) use the trunk mark with “Baksa Tales” set in type beside it.
- Photos are in `reference/images/products/` and `reference/images/brand/`. Copy them to `public/images/…` so the seed data's paths work.
- Feel: editorial, warm, culturally rooted, uncluttered. Generous whitespace. Not a generic e-commerce template.
- Mobile-first. Every tap target at least 44px. Readable text (18px body). Visible focus states. Proper labels on every input.

## Principles (non-negotiable)

1. **Minimal steps, minimal choices.** Show only what the user needs for the task in front of them. Use progressive disclosure for anything optional.
2. **No account to browse.** Sign-in is only needed at checkout, to see orders or classes, or to sell. Sign-in is mobile number + 4-digit code (or Google). The account is created on verification; no passwords.
3. **No fake promises.** Never show a delivery date the system can’t guarantee. Say “Usually dispatched within N days” (from the product's `dispatch_days`) and “The courier confirms the date at checkout.”
4. **No fake personalisation and no decorative AI.** The listing helper drafts from the maker's own notes, is labelled as a helper, and the maker must confirm every fact before sending.
5. **Internal mood names never reach buyers.** `gift_feel` values (`heart`, `showstopper`, `soother`, `thoughtful`, `explorer`) are merchandising signals. Buyers see plain phrases from `FEEL_LABEL` in `domain.ts`.
6. **TagMango is never named to buyers.** Recorded classes are bought in the normal Baksa checkout. Live workshops show “Book a seat”, which opens the course's `tagmango_url`.
7. **Prices include GST** everywhere a buyer sees them. Business quotes show GST separately.
8. **Plain language** for makers, many of whom are not technical: “Mark as packed”, “Your next payout”, not “fulfilment state” or “settlement”.
9. **Indian formatting:** ₹ with Indian digit grouping (`formatINR` in `domain.ts`), dates like “Wednesday 11 Nov 2026”.
10. **Clear empty states and errors** on every list and form: say what happened and what to do next.

## What is not built yet (show honestly, don't fake)

- Payment gateway: choose one, then complete `createGatewayOrder` in `create-checkout` and `verifySignature` in `payment-webhook`. Until then, run with the `DEMO_PAYMENTS=true` secret or cash on delivery only.
- SMS for the login code: configure an SMS provider in Supabase Auth (phone sign-in).
- PIN code lookup: `stateFromPincode` is a rough prototype lookup. Replace with a proper PIN code service.
- Couriers: tracking numbers are entered by makers in Phase 1.
- Zoho CRM sync, WhatsApp notifications: Phase 2 (fields already exist).
- Analytics: write `analytics_events` only after the visitor agrees to analytics.
