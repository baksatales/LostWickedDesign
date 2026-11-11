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

The approved ZIP's `designs/` screens are the final visual source of truth for the storefront, maker workspace and admin area, including their supplied images and wording. Reproduce them, do not redesign them.

**Why:** The user explicitly instructed: “Preserve the layouts, colours, typography, spacing, images, content and navigation. Do not redesign it.” They clarified that the existing storefront is not the reference where it differs from the ZIP.

**How to apply:** Compare implementation against the ZIP's final HTML screens at desktop and 390px. Earlier aesthetic preferences in this document do not override the approved screens. Keep placeholders unchanged and label prototype counts and figures as sample data.

The owner reiterated: “make sure that the entire website design is as per Claude's design” and “not Replit.” Do not substitute template components, fonts, colours, icons or sections, or “improve” the approved design.

**Why:** The owner repeated this as a firm instruction after the first frontend delivery.

**How to apply:** Retain each matching HTML file's own markup, including page-specific header, footer and sidebar details. Shared behavior is acceptable; replacing screen-specific visuals with a generic shared version is not.

For the approved frontend demonstration, persist sample interactions in the browser only and provide Reset demo data. Do not require live sign-in, payments or database readiness for those demo flows.

**Why:** The user explicitly requested “First build the frontend” and “Persist sample state in the browser only for the demo.”

**How to apply:** Keep the demonstration clearly labelled and separate from real accounts and transactions. This is an explicit demo exception to the rule against authoritative business data in browser storage, not permission to use browser state for live commerce.

Retain the supplied prototype's opening-and-closing trunk interaction and Today's stories. The user sees both as opportunities to charge brands for featured placements.

**Why:** The user explicitly identified these discovery surfaces as potential monetisation opportunities and requested behavioural/psychological principles to reduce decision fatigue in a luxury environment.

**How to apply:** Include these surfaces in the first-build brief. Keep sponsorship disclosed and separate from recommendation eligibility; favour guided discovery and manageable choices over intrusive ads or manipulative urgency. Pricing and self-service advertising are not yet agreed.

Luxury must remain story-led and fun, not merely restrained typography and conventional product grids or stacked blocks of colour. Use Good Earth only as inspiration; Baksa Tales must not look like an exact copy. Do not reinstate the dense full garden illustration or its “BAKSA TALES · 01” label.

**Why:** The user rejected both the generic colour-block direction and the later dense garden, which they called “too busy”. They explicitly chose “Remove it entirely” rather than keeping small botanical accents, and also asked not to look like an exact copy of Good Earth.

**How to apply:** Keep the original trunk, products and stories as the visual priorities. Avoid adding decorative full-panel artwork without a clear purpose and approval. Preserve functional, responsive shopping alongside the editorial experience. Do not use an unrelated product photograph as a backdrop behind the trunk.

Premium presentation must use screen space purposefully, without oversized headings and large empty gaps pushing useful content out of view.

**Why:** The user asked to improve the display and homepage while viewing corporate gifting, saying “you are wasting so much space”.

**How to apply:** Prefer balanced desktop compositions and shorter vertical transitions so the trunk, stories, products and forms appear sooner. Keep mobile content readable and controls comfortably usable; do not equate luxury with excessive whitespace.

Use the quiz as the single guided-discovery route; omit the separate “Start with a feeling” section. Storytelling should feel royal, fun, Indian and ready for a global audience.

**Why:** The user explicitly requested fewer discovery choices and named these qualities for the storytelling design.

**How to apply:** Consolidate guided-discovery calls to action around the same quiz. Preserve straightforward shopping and editorial reading without adding competing mood finders or discovery tools.

The user wants visual and editorial elements editable so they can change the look and feel and keep refreshing the website; the supplied Claude-generated buyer, maker and admin designs are inspiration.

**Why:** The user explicitly authorised the end-to-end build and requested owner-controlled refreshes rather than code-dependent content changes.

**How to apply:** Treat owner editing as a core product experience, not a developer-only configuration file. Preserve the agreed identity and clearly separate editable presentation from protected business rules.

Use a new development Supabase project for the initial connection, not an existing or production database.

**Why:** The user explicitly chose “Create a new development project” during connection setup and later confirmed the separate verified-account admin grant worked.

**How to apply:** Keep remote schema changes and admin grants explicit. Do not treat providing public connection settings as permission to alter another database or assign an arbitrary account administrative access.

When setup appears successful, independently verify readiness against the connected project. Existing tables do not prove that reviewed security rules were applied.

**Why:** Successful-looking table probes during Supabase onboarding did not reliably establish that the app schema existed.

**How to apply:** Establish the actual schema before choosing an initializer or an existing-schema update. Never create only a success marker to bypass missing security changes; preserve saved content and analytics identities.
