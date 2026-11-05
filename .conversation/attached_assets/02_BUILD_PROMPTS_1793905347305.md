# Baksa Tales 2.0 — build prompts for Lovable

Paste one prompt at a time. After each one, click through the result on your phone and your laptop before moving on. If something is off, ask for a fix in plain words before starting the next prompt.

Every prompt assumes Lovable has already read `01_MASTER_PROMPT.md`.

---

## Prompt 0 — Set up the foundations

> Connect this project to Supabase. In the Supabase SQL editor, run `supabase/migrations/001_schema.sql`, `002_security.sql`, `003_logic.sql` and `004_seed.sql`, in that order, without changing them. Generate TypeScript types from the database.
>
> Add `src/lib/domain.ts` exactly as provided; it holds all business rules. Add `src/styles/tokens.css` to the global CSS and merge `src/styles/tailwind.theme.ts` into the Tailwind theme. Add the Google Fonts link from the top of `tokens.css` to `index.html`.
>
> Copy `reference/images/products/*` to `public/images/products/` and `reference/images/brand/*` to `public/images/brand/`.
>
> Deploy the edge functions in `supabase/functions/` (`create-checkout`, `payment-webhook`, `recommend`, `import-tagmango`). Set the secret `DEMO_PAYMENTS=true` for now.
>
> Turn on phone sign-in and Google sign-in in Supabase Auth. Don't build any screens yet. Tell me when the database, functions and types are ready.

Then, in the Supabase SQL editor, make yourself an admin (replace the email):
```sql
insert into user_roles (user_id, role) select id, 'admin' from auth.users where email = 'you@example.com';
```

---

## Prompt 1 — Design system and the three app shells

> Build the shared design system from the tokens: buttons (primary crimson, ghost, teal, small), inputs with labels and hints, selects, checkboxes, status pills (live, review, changes, new, packed, dispatched, delivered, delayed, problem, refunded), cards, panels, tiles, tables that scroll sideways on small screens, toasts, and empty states. Follow `reference/prototype.html` for look and spacing.
>
> Build three layouts:
> 1. **Shop**: header with the trunk mark and “Baksa Tales”, links (Makers, Gift finder, The BT Edit, Corporate gifting, Makers’ Academy), an account button (“Sign in”, or the first name with a menu: My orders, My classes, Wishlist, Addresses, Sign out), a wishlist icon and a bag icon with counts. On mobile the links fold into a menu. Footer with the full logo on a cream tile, दिल से दुनिया तक, and links including “Sell with Baksa”.
> 2. **Maker** (`/maker/*`): left sidebar (Home, Orders, Products, Earnings, Opportunities, Growth Studio, My courses, My brand) with counts for things that need attention; it becomes a horizontal scrolling tab bar on mobile. A floating “Ask Sahayak” button.
> 3. **Admin** (`/admin/*`): left sidebar (Overview, Vendor applications, Listing reviews, Products and stock, Orders, Commission and payouts, Corporate enquiries, Academy, Makers and stories).
>
> Protect `/maker/*` for the `maker` role and `/admin/*` for the `admin` role using `user_roles`. A signed-in buyer who opens `/maker` sees a friendly “This area is for Baksa makers” page with a link to “Sell with Baksa”.

---

## Prompt 2 — Storefront

> Build the storefront from the live data (`makers` where published, `products` where status = live, `product_images`). Match the prototype's homepage, in this order:
> 1. Hero: headline “Every creation has a story. Find the one that speaks to yours.”, the full logo as an opening trunk (lid lifts once on load, three cards rise out: a maker story, one of their pieces, and “Not sure what to give? 4 quick questions”), two buttons “Find a gift” and “Browse the Edit”. Respect reduced motion.
> 2. Today’s stories: circular maker avatars like Instagram stories. Tapping one opens a full-screen story of three slides (who they are, how it’s made, a piece with “Add to bag”), auto-advancing every 6 seconds, tap left/right or arrow keys to move.
> 3. The BT Edit: one large featured product plus four, from `products.in_bt_edit`.
> 4. Gift finder band: “Who are you shopping for?” with the five recipient choices; tapping one starts the gift finder at question 2.
> 5. The Makers’ Table (Kala Samāgam ticket card, DSDT), Corporate gifting band, Makers’ Academy (two classes), “Join the Baksa circle” WhatsApp sign-up.
>
> Also build: Makers list; maker page (photo, tagline, bio, “How it’s made” with a drop cap, techniques, photos, their products, their classes); the BT Edit with search and filters (what the gift should do, craft and maker, price, corporate-ready); product page (photo, price “including GST”, story, material, technique, size, availability, “Usually dispatched within N days”, quantity, Add to bag, Save to wishlist, a “Check delivery” PIN code box using `stateFromPincode` and `canDeliver`, the maker's story, more from the maker). The wishlist works without signing in (stored on the device) and moves to the `wishlists` table after sign-in.
>
> Never show `gift_feel` names to buyers; use `FEEL_LABEL`.

---

## Prompt 3 — Gift finder

> Build the gift finder at `/gift-finder`. Four questions, one per screen: who it’s for, the occasion, what you’d like the gift to do (`FEEL_LABEL`), and budget (`BUDGETS`). Show “Question N of 4”, a progress bar, Back, and “Skip and see all gifts” on every screen. No sign-in needed.
>
> On the results page call the `recommend` edge function with the answers and `{ needBy, buyerState }`. Show each pick with its photo, name, maker, its reasons (dots: filled = match, hollow = partial, gold square = dispatch info), “Add to bag” and “See details”. Above the list show one line summarising the answers with “Change answers”, plus two small selects: Budget and Needed (No rush / Within 10 days / Within 5 days). Changing either refreshes the list.
>
> Show what was left out and why, using `hidden` (e.g. “Not shown: 3 that can’t be dispatched in time”). If there are no picks, show `nearMisses` as “closest options”; if there are none either, offer “Widen the budget”, “Show any delivery time”, “See all gifts” and “Ask our gifting team”. Offer “Save these to my wishlist” and “Copy the list to share”.
>
> Track `quiz_start`, `quiz_complete`, `quiz_skip`, `rec_click`, `rec_add` and `quiz_purchase` in `analytics_events` only after the visitor has accepted a simple analytics consent banner.

---

## Prompt 4 — Bag, sign-in, checkout and buyer account

> Make the buyer journey as simple as Nykaa's, with fewer fields.
>
> **Bag** (side drawer): items with photo, maker, quantity stepper (can't exceed stock unless made to order), Remove. Items that can't be bought are outlined in red with the reason; “Proceed” is disabled and one link moves them to the wishlist. Recorded classes can sit in the bag (quantity 1).
>
> **Sign in / sign up**: one box. Mobile number with +91, “Send code”, then a 4-digit code (Supabase phone OTP), or “Continue with Google”. No passwords. Opening it from the header shows a small dialog; at checkout it appears inline as step 1.
>
> **Checkout** at `/checkout`, with a stepper: Sign in → Address → Payment (Address is skipped when the bag only holds classes). A summary sits on the right (bottom on mobile): bag items, “Deliver to” with Change, items, delivery, total, “Prices include GST”.
> - Address: if the buyer has a default address, use it and skip ahead (Change is in the summary). Otherwise a five-field form: PIN code (fill the state from it), house/flat/office, road/area/colony, name, phone (pre-filled), and “Use as my default address”.
> - Payment: a list on the left (UPI, Card, Net banking, Cash on delivery; hide Cash on delivery when the bag has a class) and the chosen method's panel on the right with one “Pay ₹X” button.
> - On Pay, call the `create-checkout` edge function with the bag lines, address id and payment method. If it returns 409, show the problems next to the items and let the buyer remove them. If it returns `next: 'pay'`, open the payment gateway. If payment fails, say “The payment didn’t go through. Nothing was charged.” and keep the bag.
>
> **Order placed** page: thank-you, “Track my order”, “Start watching” for classes, and cards for the makers behind the order.
>
> **Account pages**: My orders (each line with photo, status in plain words, a Placed → Packed → On the way → Delivered timeline, courier and tracking number, delay notes, “Need help with this order?”), My classes (recorded classes the buyer owns, with “Start watching”), Addresses (make default, remove), Wishlist.

---

## Prompt 5 — Makers’ Academy

> Build `/academy` from `courses` where published. Filter tabs: All classes, Recorded classes, Live workshops.
> - Recorded class card: “Buy class” adds it to the bag and it goes through the normal checkout. After purchase it appears in My classes and the button becomes “Watch now”. Videos are served from private storage only to buyers with a paid enrolment.
> - Live workshop card: “Book a seat” opens the course's `tagmango_url` in a new tab and records `live_booking_click`. Show places left from `seats`. If there's no booking link yet, show “Tell me when booking opens”.
> - Never mention TagMango on buyer screens.
> - A “Want to teach?” panel links makers to My courses.

---

## Prompt 6 — Corporate gifting and “Sell with Baksa”

> **Corporate gifting** (`/corporate`): four collections (employee, client appreciation, hospitality, wedding) from `products.corporate_ok`, the five Pop Bani keepsake box mock-ups (`/images/brand/popbani-*.webp`, labelled as design mock-ups), and a short brief with seven required fields: what the gifts are for, how many, budget per gift, needed by (date, not in the past), name, company, work email or WhatsApp. Everything else (customisation, delivery cities, reference link, file attachments to private storage, message) sits under “Add more detail (optional)”. Insert into `corporate_enquiries`. The confirmation shows the reference and four next steps; for 200 or more gifts add a note that the work may be split across makers.
>
> **Sell with Baksa** (`/sell`): brand, name, WhatsApp, what you make, city, state, Instagram or website, “Are you GST-registered?” (Yes / Not yet, with GSTIN if yes; explain that “Not yet” means selling within their own state), optional photos. Insert into `vendor_applications`. The confirmation explains the three next steps.

---

## Prompt 7 — Maker dashboard

> Build the maker dashboard for the maker linked to the signed-in user (`makers.owner_user_id`).
>
> **Home** (in this order): greeting “Namaste, {brand}”; quick actions (Add a product, Update stock, See my payout, Propose a masterclass); “Needs your attention” (new/packed/delayed/problem orders, products with changes requested, low stock) with one button each; tiles for Products (live / waiting / need changes), Next payout (amount and date from `upcoming_payouts`), New opportunities; Growth Studio shortcuts; recent notifications.
>
> **Orders**: filter tabs; each order card has its timeline and only the next action: “Mark as packed” → courier + tracking number + “Mark as dispatched” → “Mark as delivered”; “Report a problem” needs a note. Every action calls `maker_update_order`.
>
> **Products**: list with status pills, the note from Baksa when changes are requested (“Fix and send again”), and an inline stock number that saves on change. **Add a product** is a seven-step guided form (Photos, What is it?, How it’s made, Size, Price/stock/dispatch, Its story, Check and send) that saves a draft as you go and offers to resume it next time. The price step shows a live split using `splitSale` (customer pays, GST inside, Baksa deductions, you receive, and what you keep after your cost). The story step has the listing helper (drafts from the maker's notes, title ideas, tags), lists the facts to check, and needs “I’ve read this and every fact in it is true” before sending. Submitting calls `submit_product`; show whether it went live or to review, and why.
>
> **Earnings**: tiles (customers paid, sales before GST, Baksa deductions, next payout with its date); “When you’ll be paid” listing each upcoming payout date with its orders (from `upcoming_payouts` or `payoutSchedule`); a line-by-line breakdown (commission on the price before GST, GST on commission, TCS, payment fee); a note that GST collected is paid by the maker in their GST return; orders in the next payout; payout history from `settlements`.
>
> **Opportunities**: briefs from `opportunities` with “I can do this” / “Not this time” (`respond_opportunity`).
>
> **Growth Studio**: Business health calculators (`contributionMargin`, `breakEvenUnits`, `monthlyCapacity`, `revenuePotential`) that update as you type and show “Enter a number of 0 or more” for bad input; Product profits table (price, before GST, you receive after GST, private cost from `product_costs`, you keep, health pill); Sahayak (labelled as a helper with suggested questions); Academy link.
>
> **My courses**: how it works in four steps, a proposal form (title, recorded or live, length, who it's for, price, TagMango page for live, description) that inserts into `course_proposals`, proposal statuses, and a table of listed classes with seats sold and the maker's share for recorded classes.
>
> **My brand**: edit brand story fields with a live preview; photos to storage.

---

## Prompt 8 — Baksa admin

> Build the admin using the database functions; never update statuses or money with plain table updates.
> - **Overview**: sales, Baksa commission, live makers, corporate pipeline value, Academy revenue this month, a sales-by-maker bar chart, “Needs attention” (reviews, applications, delayed or problem orders, new briefs, class proposals, makers who said yes), and the gift-finder funnel from `analytics_events`.
> - **Vendor applications**: Book a call, Decline, Approve and invite (`approve_application`: creates the shop, and links it to the applicant’s login by mobile number, now or when they first sign in).
> - **Listing reviews**: two tabs. “Waiting for review” shows the product, why it's here (`review_reason`), whether the maker confirmed the facts, and the five BT Verified checks (Gate 1: handmade by this maker; material and technique match the craft. Gate 2: photos clear; price fair; story accurate and in the maker's voice). “Approve and publish” is enabled only when all five are ticked. “Request changes” needs a note. “Spot checks” lists live products from trusted makers with “Looks good” / “Take down”. All via `review_product`.
> - **Products and stock**: all products, low stock (3 or fewer) highlighted, “Ask to restock” sends a notification.
> - **Orders**: all orders with a status select through `admin_update_order`; Delayed and Refunded ask for a note.
> - **Commission and payouts**: rates form for the `settings` row (commission, GST on commission, TCS, payment fee, return window, payout day); this run's payouts per maker (customers paid, before GST, commission + GST, TCS, fees, payout due) with “Mark as paid” calling `settle_maker`; payout history.
> - **Corporate enquiries**: each brief with stage select, tick makers to match and “Send to matched makers” (`send_enquiry_to_makers`; makers never see the company name), each maker's yes/no, and a quote total that moves the stage to “Quote sent”. Show the Zoho CRM field mapping as a note (sync comes later).
> - **Academy**: tiles (course revenue, seats sold, Baksa's share, live booking clicks), time-period tabs, revenue by month, class proposals (Approve and list via `approve_proposal`, or ask for changes), “Import live workshop sales” (CSV upload to `import-tagmango`, showing imported and skipped rows), and a by-course table.
> - **Makers and stories**: per maker, publish toggle, “Trusted: publishes directly” or “Reviewed (n of 3)”, GST status, and state, with a note that unregistered makers only sell within their state.

---

## Prompt 9 — Check every journey

> Test these journeys on a 390px-wide phone and on desktop, fix anything that breaks, and list what you changed:
> 1. A first-time shopper finds a gift with the finder and buys it with cash on delivery, without any help.
> 2. A shopper skips the finder and buys from the Edit.
> 3. A shopper on a ₹1,500 budget needs it within 5 days.
> 4. A shopper's bag has an item that just sold out.
> 5. A shopper in Maharashtra tries to buy from a maker who isn't GST-registered and is set to Delhi.
> 6. A failed payment, then a successful retry.
> 7. A corporate buyer sends a brief for 500 customised gifts.
> 8. A new maker applies, is approved, adds a first product, and it goes to review; the admin approves it.
> 9. A maker works out whether a ₹2,400 price is healthy.
> 10. A maker proposes a first masterclass; the admin lists it.
> 11. A learner buys a recorded class and starts watching.
> 12. The admin marks an order delayed, then refunds another.
> 13. The admin pays out a maker on payout day.
>
> Also check: every list has an empty state, every form shows clear errors, leaving the add-a-product form keeps the draft, and nothing shows a delivery date the system can't guarantee.
