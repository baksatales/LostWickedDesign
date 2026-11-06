# Baksa Tales 2.0 — Lovable build kit

Everything Lovable needs to build the Baksa Tales storefront, maker dashboard and admin, with the business rules already written and tested.

## What's inside

| Path | What it is | Who uses it |
|---|---|---|
| `01_MASTER_PROMPT.md` | The brief: what to build, the stack, the design, and the rules Lovable must follow | Paste first into Lovable |
| `02_BUILD_PROMPTS.md` | Ten prompts, one phase at a time | Paste one by one into Lovable |
| `03_ARCHITECTURE.md` | Which screen talks to which table or function; money, payout and approval rules; integrations; open decisions | Lovable and your developer |
| `reference/prototype.html` | The working prototype: open it in a browser to see every screen | Lovable, your team |
| `reference/images/` | Product photos, Pop Bani box mock-ups, logo files | Copy into the app's `public/images/` |
| `src/lib/domain.ts` | All business rules: money split, GST and TCS, payouts, delivery, listing approval, gift finder, calculators | Frontend (previews) |
| `supabase/functions/_shared/domain.ts` | The same file, for the server | Edge functions |
| `src/styles/` | Colours, fonts and Tailwind theme | Frontend |
| `supabase/migrations/` | Database tables, security rules, server functions and starting data | Run in Supabase, in order |
| `supabase/functions/` | Server code: create-checkout, payment-webhook, recommend (gift finder), import-tagmango | Deploy to Supabase |
| `tests/` | Tests for the business rules and the database | Your developer |

## How to use it with Lovable

1. Create a new Lovable project and connect it to GitHub. Upload this whole folder into the repository (GitHub's “Add file → Upload files” works), so Lovable can read every file.
   *No GitHub? Paste each file's contents into the Lovable chat when a prompt mentions it.*
2. Paste `01_MASTER_PROMPT.md` as your first message.
3. Paste **Prompt 0** from `02_BUILD_PROMPTS.md`. It connects Supabase and runs the database files.
4. Make yourself an admin with the one line of SQL under Prompt 0.
5. Paste Prompts 1 to 9, one at a time. Check each result on your phone before moving on.

## Already tested

- Business rules: 17 unit tests (`npm install && npx vitest run`).
- Database: every migration runs on PostgreSQL 16, and `tests/flows.sql` plays an admin, a new maker and a buyer through approval, checkout, stock, order updates, payout and onboarding.
- Edge functions: type-checked with Deno.

## Before going live

Prices, sizes, cities and dispatch days in the seed data are placeholders. Payments, SMS codes, the PIN code service, couriers, Zoho CRM and WhatsApp still need connecting (see section 7 of `03_ARCHITECTURE.md`). GST, TCS and payout rules need your CA's sign-off. Do not call it production-ready until sign-in, payments, stock, orders, permissions and payouts have been tested end to end with real accounts.
