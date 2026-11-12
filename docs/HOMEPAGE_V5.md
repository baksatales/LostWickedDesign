# Homepage V5 — approved-source alignment

## Reference and scope

The approved reference for `/` is the owner's export:
`attached_assets/0_Homepage_v5_(compartment_baksa)-html_1794473724431.zip`.
The extracted reference is `reference/homepage-v5/HomeV5.dc.html`.
It supersedes the older `Main.html` for the homepage only.

The six actual artwork layers from that export are now the defaults: the shallow
embroidered trunk, compass, cloth-wrapped gift, painted dome, tea/books and journal.
They are separate WebPs under `public/images/baksa/homev5-*.webp`. Names, captions
and mood-panel text remain real, editable text. A regression test checks these
six files byte-for-byte against the export, preventing substituted drawings.
Legacy SVGs remain available for earlier saved editor documents, but are not the
approved defaults. There are no temporary-art labels on the rebuilt homepage.

## What is aligned and working

All required sections use the export's composition and style values:

| Section | Current match and behavior |
|---|---|
| Announcement and block-print bands | Export text, amber strip, coral/gold patterns |
| Hero and compartment baksa | Real art, source proportions, editable text, Heart-Giver default |
| Mood edit | Copy beside three catalogue cards, source spacing, moving notch |
| Today's tales | Source reels, photos, progress segments and watched rings; chapter viewer retained |
| Most gifted | Four catalogue picks, source photos and functional guest wishlist hearts |
| Maker story | Circular photo, dotted ring, source wording and real maker links |
| Baksa way | Arched Pop Bani image, three rows and working corporate-brief link |
| Kala Samāgam and DSDT | Teal band, source ticket and Devanagari treatments; honest unconfigured actions |
| Promises | Source four-item composition and wording |
| Footer | Scalloped top, stamped postcard, source link groups and bottom print band |

Compartment selection works by pointer, keyboard arrows, Home/End and normal
button activation. `aria-pressed` follows the selection; the hint disappears on
first interaction. Below 720px the desktop trunk becomes the source's horizontal
card row. Reduced motion disables entrance animations, lift and image scaling.
Only one small sample disclosure is rendered, in the footer. There is only one
homepage footer; the older shared footer is not appended to `/`.

The current functional header was deliberately retained, including mobile menu,
search, shopper sign-in/menu, wishlist, bag and Bea. It is not replaced with the
export's static header. Other storefront routes and dashboard access gates remain.

## Site Studio

The protected `/admin/site` and local `/studio-preview` render the same HomeV5
component. `h5.*` fields expose homepage copy, trunk/object layers, product images,
per-mood picks, reels/hooks, event dates, episode link and footer content.
Safe URLs, text limits, editorial revisions and protected financial data are
unchanged. Prices and stock cannot be invented through editorial fields.

The public homepage uses **published** content only. A local playground draft must
not change `/`; a browser regression explicitly verifies this boundary. Draft
save/publish to an actual admin account was not exercised during this visual pass.

## Comparison results and known differences

Source/app captures exist at **1440px and 390px**:
`generated-artifacts/homepage-v5/{source,home,compare}-{width}.jpg`.
Both rendered widths equal their viewports, with no broken homepage images.

The visual review found no remaining material composition or artwork difference.
This is not a claim of pixel-identical output:

- The retained functional header differs from the static source header.
- Real catalogue names/prices and accessible working controls replace inert mockup
  behavior. Pop Bani's unavailable price remains `[₹ price]`, not an invented price.
- A single footer sample disclosure replaces the source's repeated copyright.
- The public page is slightly taller: 28px at desktop and 60px at phone in the
  reviewed captures, largely from retained functional/disclosure treatment.
- WhatsApp and ticket-interest actions validate/disclose that they save nothing.
  DSDT opens an unavailable-content explanation until an approved link is supplied.
  Tales have sample chapters, not claimed live video playback.

## Verification

- Frontend TypeScript: passed after refreshing merged shared-client declarations.
- Frontend production build: passed; existing sourcemap/chunk warnings remain.
- Final frontend unit/analytics suite: **73 Vitest + 6 analytics checks passed**,
  including all 9 homepage-content checks and the original-art guard.
- Retained frontend/dashboard browser suite: **39/39 passed**.
- Homepage browser pass: **12/13 passed initially**; the only failure was the capture
  harness waiting for a desktop-only reference element to be visible at 390px.
  It now waits for attachment. The corrected capture plus new local-draft isolation
  regression passed **2/2 targeted checks**. The full suite was not rerun needlessly.
- Dashboard comparisons and source gaps are listed in `docs/VISUAL_MATCH_REPORT.md`.

No production publishing, live-domain changes, database migrations, admin grants,
payment requests or outbound messages were performed.
