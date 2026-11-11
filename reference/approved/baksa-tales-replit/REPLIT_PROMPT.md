Build Baksa Tales, an Indian handmade-gifting marketplace with three parts: the customer website, a maker dashboard and a Baksa admin.

1. Read `README.md`, then `developer-kit/01_MASTER_PROMPT.md` and `developer-kit/03_ARCHITECTURE.md` before writing code.
2. The visual design is final. Match the screens in `designs/` exactly: EB Garamond for headings and reading text, Arvo for buttons, labels and numbers, Noto Serif Devanagari for Hindi; cream background #F6F3DF, crimson #611811 for primary buttons, accent red #C23A36, teal #34514B, marigold #EBA937; arch-shaped photos, rounded cards, small rotated stickers, the scalloped postcard footer. Do not use a generic template look or swap the fonts.
3. Rebuild each screen as reusable components (shared header, footer, maker sidebar, admin sidebar). Copy wording from the designs.
4. Use `developer-kit/supabase/migrations/` as the database (run 001 to 004 in order) and `developer-kit/src/lib/domain.ts` for every money, payout, delivery, approval and gift-finder rule. Do not re-implement those rules inside components. Orders must be created only on the server, re-checking price, stock and delivery.
5. Product photos and logos are in `designs/images/` and `developer-kit/reference/images/`.
6. Follow `developer-kit/02_BUILD_PROMPTS.md` in order. After each step, compare your screen with the matching file in `designs/` and fix differences before moving on.
7. Payments, SMS codes, couriers, Zoho CRM and WhatsApp are not connected yet: build the screens, keep the integration points clearly marked, and never show a fake delivery date or fake payment success.
