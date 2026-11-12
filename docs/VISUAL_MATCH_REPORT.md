# Baksa Tales — visual alignment report

## Sources

- Homepage: `reference/homepage-v5/HomeV5.dc.html` and its original WebPs,
  extracted from the owner's V5 export.
- Maker/admin frames: matching supplied HTML in
  `reference/approved/baksa-tales-replit/designs/`.
- Canonical owner reference:
  https://claude.ai/artifact/VbAHvA8pdxTeL6jFS2VboY#page-d47805f2a521
- No matching shopper-account, maker settings/courses, coupon or blog design frame
  was supplied in these exports. Do not describe them as exact Claude matches.

## Route-by-route status

Every listed route was captured at 1440px and 390px. “Source structure retained”
means the page still uses its corresponding approved HTML layout, typography,
palette, images and sidebar, with necessary server-backed content/controls. It
does not imply static demo numbers or row counts are identical.

| Screen | Route | Match status |
|---|---|---|
| Homepage V5 | `/` | Original art and source composition restored; small documented functional differences |
| Maker home | `/maker` | MakerHome source structure retained; sample attention items/totals come from server |
| Maker orders | `/maker/orders` | MakerOrders source retained; real sample status controls/tracking |
| Maker products | `/maker/products` | MakerProducts source retained; server stock and draft rows |
| Add product | `/maker/products/new` | MakerAddProduct source price-step composition retained; seven-step controls |
| Maker earnings | `/maker/earnings` | MakerEarnings source retained; server-calculated sample amounts/dates |
| Growth Studio | `/maker/growth` | MakerGrowth source retained; calculators/private costs preserved |
| Maker opportunities | `/maker/opportunities` | MakerOpportunities source retained; sample responses/proposals |
| Maker courses | `/maker/courses` | Captured; reuses opportunities source. No dedicated approved frame; distinct page is downstream scope |
| Maker settings | `/maker/settings` | Captured; no corresponding supplied frame. Not claimed exact |
| Admin overview | `/admin` | AdminOverview source retained; sample metrics/attention differ as records change |
| Listing reviews | `/admin/reviews` | AdminReviews source retained; server approval/check/note controls preserved |
| Orders/payouts | `/admin/orders` | AdminOrders source retained; sample status/payout controls preserved |
| Corporate enquiries | `/admin/enquiries` | AdminEnquiries source retained; private matching/quote controls preserved |
| Academy | `/admin/academy` | AdminAcademy source retained; sample proposals/sales/import controls may add rows |
| Coupons | `/admin/coupons` | Captured; no corresponding supplied frame, existing functional layout retained |
| Blog | `/admin/blog` | Captured; no corresponding supplied frame, existing functional layout retained |
| Buyer orders | `/account/orders` | Captured; no supplied Claude frame. Existing branded order timeline retained |
| Buyer classes | `/account/classes` | Captured; no supplied frame. Existing branded sample library retained |
| Buyer addresses | `/account/addresses` | Captured; no supplied frame. Existing branded address controls retained |
| Buyer wishlist | `/account/wishlist` | Captured; no supplied frame. Existing branded saved-item list retained |

`/admin/site` and `/maker/sahayak` keep their existing verified-account gates.
Sample identities must not gain access to these real services. The browser suite
verified those denials; a signed-in live editor or AI rewrite was not exercised.
No exact frames for these supporting tools were supplied.

## Fixes in this pass

- Replaced the approximate homepage implementation with the V5 source composition
  and actual separate artwork layers.
- Removed duplicate homepage footer and sample notices, preserving one footer note.
- Reused the same editable homepage in Site Studio and public `/`.
- Prevented local Site Studio drafts from replacing published homepage content.
- Stopped an automatic starter-theme override from recolouring approved dashboard
  ivory cards and semantic accents when no theme override is active.
- Preserved page-specific navigation and the merged role/server authority.
- Updated captures and regressions for the actual active homepage, not an unused
  alternative component.

## Intentional differences / remaining source gaps

- The existing functional homepage header is retained as the owner requested.
- Sample notices, responsive menu/touch behavior, dynamic server sample totals and
  working controls differ from inert HTML reference content.
- Static dashboard figures are not forced over server-owned figures to make
  screenshots match. Additional existing navigation (Settings, Coupons, Blog,
  secure Site Studio) remains available.
- On small phones the existing dashboard menu collapses rather than displaying
  the source's long always-open sidebar. Maker bottom tabs, admin drawer and
  premium dashboard changes belong to the already queued dashboard-completion work.
- Shopper/added-page pixel parity cannot be certified without corresponding frames.
  No substitute Claude frames or invented layouts were created in this pass.

## Evidence and tests

- `generated-artifacts/approved-comparison/`: 40 dashboard/account captures,
  including 24 paired source/app captures for the twelve approved maker/admin pages.
- `generated-artifacts/homepage-v5/`: source/app/full comparisons at both widths.
- Capture checks: zero page overflow, broken images or browser exceptions.
- `generated-artifacts/approved-browser-results.json`: 39/39 scenarios passed.
- `generated-artifacts/homepage-v5/browser-results.json`: original 12/13 run.
- `generated-artifacts/homepage-v5/browser-recheck-results.json`: 2/2 corrected
  capture/isolation checks passed.
- Frontend tests, typecheck and build: see `docs/HOMEPAGE_V5.md`.

All sample mutation testing used the isolated development sample service, not
Supabase or production. This pass made no database changes and did not publish.
