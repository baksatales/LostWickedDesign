# Baksa Tales 2.0, for Replit

Everything needed to build the Baksa Tales marketplace: the final visual designs and the developer kit with the business rules, database and server code.

## What's inside

| Folder | What it is |
|---|---|
| `designs/` | The final look. 25 static HTML screens: customer website (9), maker dashboard (7), Baksa admin (5) and shared pieces (header, footer, two sidebars). Open `designs/index.html` to browse them all. **This is the visual source of truth.** |
| `developer-kit/` | The rules and back end: `01_MASTER_PROMPT.md` (what to build), `02_BUILD_PROMPTS.md` (step by step), `03_ARCHITECTURE.md` (frontend vs backend map), `src/lib/domain.ts` (money, GST, TCS, payouts, delivery, approvals, gift finder; tested), `supabase/` (database tables, security rules, server functions, starting data; tested on PostgreSQL 16), `reference/prototype.html` (the clickable logic prototype) and all product photos and logos. |
| `index.html` | Opens the design gallery. |

## How to use it in Replit

1. Go to replit.com/import, choose **ZIP**, and upload this zip.
2. When it opens, paste the contents of `REPLIT_PROMPT.md` into Replit Agent.
3. Build in the order of `developer-kit/02_BUILD_PROMPTS.md`, one step at a time, checking each against the matching screen in `designs/`.

## Two sources, two jobs

- **Look and copy** come from `designs/` (fonts, colours, spacing, wording, stickers, the postcard footer).
- **Behaviour and rules** come from `developer-kit/` (what happens on every click, who can see what, how money and payouts are worked out).

Where they disagree, use the design for appearance and the kit for logic.

## Before going live

Prices, sizes, cities, dispatch days and dashboard figures are samples. Payments, SMS sign-in codes, a PIN code service, couriers, Zoho CRM and WhatsApp still need connecting. GST, TCS and payout rules need a CA's sign-off.
