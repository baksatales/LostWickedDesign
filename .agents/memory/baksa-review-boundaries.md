---
name: Baksa review boundaries
description: Product scope and approval boundaries established during pre-build discussions.
---
Baksa Tales is an Indian handmade multivendor marketplace centred on maker stories, gifting discovery and commerce, with buyer, maker and admin experiences.

**Why:** The supplied briefs establish this identity. The user requested analysis and screen review first, and subsequently asked to get the first build sorted.

**How to apply:** Full implementation is now authorised. The user has reiterated that the goal is the complete marketplace, not an endless sequence of isolated mockups. Keep partial milestones explicit; sample data must not imply real payments, authentication, AI or order persistence.

Preserve the supplied trunk logo and real product photographs. The proposed direction is warm, editorial and culturally rooted rather than generic black-and-gold luxury.

**Why:** The user asked to develop and review this direction; brand continuity is central to the supplied materials.

**How to apply:** Use the uploaded source materials as references, not proof of verified product claims or production readiness. Do not change the existing site, DNS or live services without explicit authorisation.

The owner's shared Claude artifact is the visual source of truth for the Homepage v5 and dashboard design work: https://claude.ai/artifact/VbAHvA8pdxTeL6jFS2VboY#page-d47805f2a521. Use its matching page frames rather than substituting the ZIP's older storefront designs when they differ.

**Why:** The owner clarified that the pages are all from the same Claude Figma and explicitly said not to alter them to match Replit's look.

**How to apply:** Compare each implementation with its corresponding Claude frame at desktop and phone widths. Preserve exact page-specific layouts, colours, typography, spacing, imagery, wording and navigation. Do not replace an unavailable frame with a newly invented design; report the source gap instead.

Homepage v5 includes five mood compartments alongside the full quiz, and all buyer-facing homepage text, images and product picks must be editable through Site Studio. Use exactly “Thoughtful One”, not “Thoughtful Planner”.

**Why:** The owner explicitly approved the compartment-baksa homepage and superseded the earlier instruction to omit “Start with a feeling” for this homepage element.

**How to apply:** Keep homepage-specific content on `/`, retain the existing header/cart/wishlist/quiz, and preserve other page behavior. Keep the trunk and five objects independently replaceable. The owner rejected the drawn SVG replacement: “why did you change the box bro? please stick to the claude version”. Use the actual artwork from the Claude artifact; do not substitute another drawing. Do not publish or touch the live domain without permission.

The owner supplied a direct visual comparison: `attached_assets/image_1794475997860.png` is the correct Claude V5 appearance; `attached_assets/image_1794475945449.png` shows the rejected substitute.

**Why:** The owner reiterated that Claude V5 has a different image and wants a fully functional website and flows, not a redesigned visual approximation.

**How to apply:** Match the correct screenshot's shallow embroidered trunk, brass fittings, painted objects, compact compartment proportions and horizontal edit-panel composition. The screenshot is visual evidence, not a replacement for independently editable artwork layers and real text.

The owner reiterated: “make sure that the entire website design is as per Claude's design” and “not Replit.” Do not substitute template components, fonts, colours, icons or sections, or “improve” the approved design.

**Why:** The owner repeated this as a firm instruction after the first frontend delivery.

**How to apply:** Retain each matching HTML file's own markup, including page-specific header, footer and sidebar details. Shared behavior is acceptable; replacing screen-specific visuals with a generic shared version is not.

For the approved frontend demonstration, persist sample interactions in the browser only and provide Reset demo data. Do not require live sign-in, payments or database readiness for those demo flows.

**Why:** The user explicitly requested “First build the frontend” and “Persist sample state in the browser only for the demo.”

**How to apply:** Keep the demonstration clearly labelled and separate from real accounts and transactions. This is an explicit demo exception to the rule against authoritative business data in browser storage, not permission to use browser state for live commerce.

For the backend dashboard phase, all money, payout dates, stock, approvals and order-status changes must be decided on the server, never in the browser. Buyers see only their own data, makers only their own shop, and admins everything; makers must never see corporate company names.

**Why:** The owner explicitly required these authority and privacy boundaries for the maker, admin and shopper dashboards.

**How to apply:** Preserve the approved dashboard designs and use the supplied Supabase schema/security/functions and domain rules as the starting point. When live setup is unavailable, use clearly labelled sample data without relaxing server authority. Never apply schema changes to a live or unknown database; require authorisation for the identified development project.

Retain the supplied prototype's opening-and-closing trunk interaction and Today's stories. The user sees both as opportunities to charge brands for featured placements.

**Why:** The user explicitly identified these discovery surfaces as potential monetisation opportunities and requested behavioural/psychological principles to reduce decision fatigue in a luxury environment.

**How to apply:** Include these surfaces in the first-build brief. Keep sponsorship disclosed and separate from recommendation eligibility; favour guided discovery and manageable choices over intrusive ads or manipulative urgency. Pricing and self-service advertising are not yet agreed.

Luxury must remain story-led and fun, not merely restrained typography and conventional product grids or stacked blocks of colour. Use Good Earth only as inspiration; Baksa Tales must not look like an exact copy. Do not reinstate the dense full garden illustration or its “BAKSA TALES · 01” label.

**Why:** The user rejected both the generic colour-block direction and the later dense garden, which they called “too busy”. They explicitly chose “Remove it entirely” rather than keeping small botanical accents, and also asked not to look like an exact copy of Good Earth.

**How to apply:** Keep the original trunk, products and stories as the visual priorities. Avoid adding decorative full-panel artwork without a clear purpose and approval. Preserve functional, responsive shopping alongside the editorial experience. Do not use an unrelated product photograph as a backdrop behind the trunk.

Premium presentation must use screen space purposefully, without oversized headings and large empty gaps pushing useful content out of view.

**Why:** The user asked to improve the display and homepage while viewing corporate gifting, saying “you are wasting so much space”.

**How to apply:** Prefer balanced desktop compositions and shorter vertical transitions so the trunk, stories, products and forms appear sooner. Keep mobile content readable and controls comfortably usable; do not equate luxury with excessive whitespace.

Use the quiz as the full guided-discovery route; the approved Homepage v5 compartment baksa is now an explicit exception permitting mood-based discovery alongside it. Storytelling should feel royal, fun, Indian and ready for a global audience.

**Why:** The user explicitly requested fewer discovery choices and named these qualities for the storytelling design.

**How to apply:** Preserve the full quiz and the approved five-compartment homepage element, without adding other competing mood finders or discovery tools.

The user wants visual and editorial elements editable so they can change the look and feel and keep refreshing the website; the supplied Claude-generated buyer, maker and admin designs are inspiration.

**Why:** The user explicitly authorised the end-to-end build and requested owner-controlled refreshes rather than code-dependent content changes.

**How to apply:** Treat owner editing as a core product experience, not a developer-only configuration file. Preserve the agreed identity and clearly separate editable presentation from protected business rules.

Use a new development Supabase project for the initial connection, not an existing or production database.

**Why:** The user explicitly chose “Create a new development project” during connection setup and later confirmed the separate verified-account admin grant worked.

**How to apply:** Keep remote schema changes and admin grants explicit. Do not treat providing public connection settings as permission to alter another database or assign an arbitrary account administrative access.

When setup appears successful, independently verify readiness against the connected project. Existing tables do not prove that reviewed security rules were applied.

**Why:** Successful-looking table probes during Supabase onboarding did not reliably establish that the app schema existed.

**How to apply:** Establish the actual schema before choosing an initializer or an existing-schema update. Never create only a success marker to bypass missing security changes; preserve saved content and analytics identities.
