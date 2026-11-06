# Baksa Tales 2.0 — how the pieces fit

**The rule:** the frontend shows and collects; the backend decides and records.

## 1. Frontend vs backend, feature by feature

| Feature | Frontend (what people see and do) | Backend (what decides and records) |
|---|---|---|
| Browse makers and products | Homepage, maker pages, BT Edit, filters, product page | `makers` (published), `products` (live), `product_images`; RLS hides everything else |
| Check delivery on a product | PIN code box, plain-language answer | `canDeliver` rule; maker `gst_registered` + `state` set by admin only |
| Gift finder | 4 questions, results, reasons, filters, share/save | `recommend` edge function using `recommend()` in `domain.ts`; reads live stock and dispatch days |
| Wishlist | Heart button; works on the device before sign-in | `wishlists` (after sign-in) |
| Sign in / sign up | Mobile number + code, or Google | Supabase Auth (phone OTP, Google); `handle_new_user` creates profile + buyer role |
| Bag | Drawer, quantity limits, problem items | Nothing saved; re-checked by `create-checkout` |
| Checkout | Stepper, address form, payment choice | `create-checkout` re-reads prices/stock/delivery, writes `checkouts` + `orders` + pending `course_enrolments`; `confirm_checkout` takes stock atomically; `payment-webhook` confirms online payments |
| Order tracking | My orders timeline, tracking, delay notes | `orders`, `order_events`; status changed only by `maker_update_order` / `admin_update_order` |
| Recorded classes | Buy class, My classes, Watch now | `courses` (recorded), `course_enrolments` (source `baksa`); video in private storage, served only to paid enrolments |
| Live workshops | Book a seat (opens booking link) | `courses.tagmango_url`; sales imported by `import-tagmango` (source `tagmango`) |
| Corporate brief | 7-field form + optional details | `corporate_enquiries`; `send_enquiry_to_makers` creates `opportunities`; quote total on the enquiry |
| Sell with Baksa | Application form | `vendor_applications`; `approve_application` creates the shop and links the login |
| Maker: add a product | 7-step guided form, live price split, listing helper, fact check | `products` (draft) → `submit_product` decides live or review; `guard_maker_columns` blocks direct status changes |
| Maker: orders | Next action only | `maker_update_order` enforces the allowed order of steps and tracking |
| Maker: stock | Inline number | `products.stock` (maker may edit) |
| Maker: earnings and payout dates | Tiles, schedule, breakdown | `split_sale`, `payout_date_for`, `upcoming_payouts`; `settlements` |
| Maker: Growth Studio | Calculators, product profits | Pure functions in `domain.ts`; private costs in `product_costs` (maker-only RLS) |
| Maker: opportunities | Yes / Not this time | `opportunities`, `respond_opportunity` |
| Maker: courses | Proposal form, statuses, class sales | `course_proposals`; `approve_proposal` creates the listing |
| Admin: listing reviews | Two gates, five checks, spot checks | `review_product` (all five checks required; auto-trust after `review_first_n` approvals) |
| Admin: payouts | Run list, Mark as paid | `settle_maker` pays only orders past the return window |
| Admin: settings | Rates, payout day, return window | `settings` (single row; admin-only update) |
| Analytics | Consent banner, funnel chart | `analytics_events` (written only after consent) |

## 2. Routes

**Shop:** `/` · `/makers` · `/makers/:id` · `/edit` · `/products/:slug` · `/gift-finder` · `/checkout` · `/order-placed` · `/orders` · `/classes` · `/addresses` · `/wishlist` · `/academy` · `/corporate` · `/sell` · `/my-giving-mood` (optional, “just for fun” quiz)

**Maker:** `/maker` · `/maker/orders` · `/maker/products` · `/maker/products/new` · `/maker/earnings` · `/maker/opportunities` · `/maker/growth` · `/maker/growth/health` · `/maker/growth/profits` · `/maker/courses` · `/maker/brand`

**Admin:** `/admin` · `/admin/applications` · `/admin/reviews` · `/admin/products` · `/admin/orders` · `/admin/payouts` · `/admin/enquiries` · `/admin/academy` · `/admin/makers`

## 3. Money (all integers in paise)

For a sale of `gross` (what the customer paid, GST included) with GST rate `g`:

1. Price before GST = gross × 100 / (100 + g). For makers not registered for GST, g = 0.
2. GST inside the price = gross − price before GST. **The maker pays this to the government.**
3. Baksa commission = 12% of the price before GST.
4. GST on the commission = 18% of the commission.
5. TCS = 0.5% of the price before GST (registered makers only).
6. Payment fee = 2% of gross (placeholder: use your gateway's real rate).
7. Payout = gross − (3 + 4 + 5 + 6).

Every rate is in the `settings` table. `splitSale()` in `domain.ts` and `split_sale()` in SQL give identical results (both are tested). **Confirm every rate and rule with your CA before launch.**

## 4. Payouts

Every **Wednesday** (`payout_weekday`), Baksa pays each maker for orders that were delivered at least **7 days** earlier (`return_window_days`), once the return window has closed. `payout_date_for()` gives each order's date; the maker dashboard shows the next date and amount. Refunded orders never enter a payout; an order refunded after payout must be recovered from the next one.

## 5. Listing approval

A new maker's first **3** listings (`review_first_n`) are reviewed. Approval needs all five BT Verified checks and the maker's fact confirmation. After the third approval the maker becomes **trusted** and publishes directly; those listings appear in “Spot checks”. These still come back to review: a resubmission after changes, a price more than double the maker's highest live price, and (for untrusted makers) editing the story or name of a live product.

## 6. Gift finder

The full, commented rules are in `recommend()` in `domain.ts`. In short: exclude what can't work (stock, budget, timing, delivery), require a match on the occasion or the feeling, score transparently, explain every pick, and offer a useful fallback. Mood names are internal; buyers see plain phrases.

## 7. Integrations and what's still open

| Integration | Phase 1 | Notes |
|---|---|---|
| Payment gateway | To choose. Until then: cash on delivery, or `DEMO_PAYMENTS=true` | Complete `createGatewayOrder` and `verifySignature`; refund on sell-out after payment |
| SMS for sign-in codes | Configure a provider in Supabase Auth | Needed for phone OTP |
| Google sign-in | Supabase Auth | |
| PIN code service | Prototype lookup only | Replace `stateFromPincode`; also gives city |
| Couriers | Makers enter courier + tracking number | API booking later |
| TagMango | Live workshop booking links + monthly CSV import | Never named to buyers |
| Zoho CRM | Not connected | `corporate_enquiries.zoho_lead_id` ready for a sync edge function |
| WhatsApp / email updates | Not connected | `notifications` table already records every message to send |
| Analytics | `analytics_events` after consent | Get advice on India's data protection requirements |

## 8. Decisions still to make

- Real prices, sizes, cities and dispatch days for each maker (seed data uses placeholders).
- GST rate per product category, and whether TCS applies to unregistered makers (CA).
- Payment gateway and its fee.
- The creator share for maker-led recorded classes (`academy_creator_share_pct`).
- Return policy wording, which sets `return_window_days`.
- Which products are in the BT Edit (`in_bt_edit`).
