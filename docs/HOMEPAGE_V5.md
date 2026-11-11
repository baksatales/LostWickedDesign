# Homepage v5 — compartment baksa

## Approved reference and scope

The owner's Homepage v5 brief supersedes the ZIP's `Main.html` for `/` only.
The v5 canvas component and the concept illustration
`Baksa_Tales__Five_compartments_of_thoughtful_gifts.png` were not available in
this workspace during implementation. The detailed supplied brief was therefore
the reference; an exact image-to-image match with the unavailable design cannot
be claimed.

The existing homepage header, cart, wishlist, finder, shop, product, maker and
corporate experiences are retained. The shop now reads `?feel=` so links from
the homepage open the corresponding existing feeling filter. The old `Main.html`
is retained unmodified as a historical reference, not the current homepage.

## Working features

- Five independently selectable mood compartments, Heart-Giver selected by
  default, first-click hint, moving edit-panel notch, real catalogue picks and
  links, hover/selection feedback and staggered object entrance.
- Arrow keys, Home/End and normal button activation; `aria-pressed` selection.
  Reduced motion removes pop-in/lift animations.
- A horizontal swipe row below 720px, initially centred on Heart-Giver.
- Five tall tale cards with progress indicators, photo avatars, a chapter viewer,
  watched-state persistence and explicit sample/sponsorship labels.
- Most-gifted cards connected to the existing wishlist and header count.
- Maker, packaging, corporate brief, event, founder-conversation, promise and
  postcard/footer sections. The sample/reset notice sits in the homepage footer
  rather than covering buyer controls.
- All product prices remain clearly labelled samples. Pop Bani's missing
  catalogue listing links to the shop without an invented price.

## Site Studio

- `/admin/site` uses the retained Supabase session and server-verified admin
  permissions; it does not grant roles. Existing draft/save/revision/publish
  safeguards remain in place.
- `/studio-preview` is an explicitly local, browser-only design playground.
  It cannot save or publish marketplace content. Its preview uses the actual
  Homepage v5 component.
- The Homepage v5 tab exposes copy, mood details, product picks, product-image
  overrides, tale hooks/images, event dates/venue, episode copy/link, footer
  columns and separate trunk/object layers. Product prices and stock are not
  editable editorial fields.
- Headline emphasis uses `*words*`; multi-part fields document their separators.
  Selected additional catalogue products expose additional photo controls.
- Public `/` reads published content only, not drafts or the local playground.
  Absent fields use approved defaults; failed editorial loading is disclosed.
- Existing limits remain: at most 200 label entries, 500 characters per value,
  safe internal/HTTPS destinations and safe hosted/supplied image paths.
  Only the six trusted placeholder SVG paths are accepted, not arbitrary SVG
  markup, active schemes, embedded data or credential-bearing image URLs.

## Artwork and integrations still required

- Attach the concept PNG to cut the empty trunk and five objects into separate
  layers. The six current SVG placeholders are independently replaceable; names
  and compartment lines remain real editable text.
- The catalogue, prices, bag and wishlist still use the existing sample frontend
  data. No sample product has been promoted to a live listing.
- WhatsApp signup validates a number, then explicitly says it was not saved.
  Ticket alerts likewise disclose that interest capture is not connected.
  No success, subscription or outbound message is fabricated.
- Founder conversations disclose unavailable content until an HTTPS episode
  destination is entered. Stories do not claim that real videos exist.
- Real admin save/publish needs the existing authorised Supabase setup and an
  existing verified admin session. Signed-in admin save/publish was not exercised
  in this run; the unauthenticated editorial API was checked to return 401.
- WhatsApp/SMS delivery, event-interest storage, live commerce/payment and courier
  services remain integration-dependent. Binary media upload is not connected;
  Site Studio accepts safe existing paths and hosted images.

## Verification

- Frontend typecheck and API-server typecheck passed.
- Frontend regression suite: 78 checks (72 Vitest plus 6 analytics checks).
- Editorial server validation: 8 checks, including homepage assets, links and picks.
- Homepage browser suite: 13 scenarios covering mood switching, first-click hint,
  keyboard use, mood-filter navigation, wishlist persistence, watched tales,
  honest signup/event/episode states, real Studio preview edits, mobile swipe,
  reduced motion, images/overflow and browser exceptions.
- Existing frontend browser suite: 18 scenarios covering navigation, bag,
  checkout, finder, corporate, maker/admin sample flows and reset.
- Production frontend build passed with the workflow's required `PORT` and
  `BASE_PATH` supplied. Vite reports a non-blocking bundle-size warning.
- Captures at 1440px and 390px are retained under the ignored
  `generated-artifacts/homepage-v5/` directory. Layout was reviewed against the
  written v5 brief, not an unavailable canvas/source image.

No database migrations, live domain changes or publishing were performed.
