---
name: Editorial measurement privacy
description: Privacy tradeoff for editorial discovery analytics dimensions.
---
Use opaque persistence-owned keys for stable editorial attribution, alongside
positions for placement comparisons. Never send editable IDs, titles or quiz
answer profiles to analytics.

**Why:** Site owners can edit story IDs and text, so even an apparently technical
identifier can contain a name or other free-form content. Random keys preserve
privacy while allowing stable attribution after reordering. Existing positional
events cannot be attributed retroactively.

**How to apply:** Preserve this privacy boundary when extending editorial
measurement. Missing legacy keys must remain positional, never fall back to
editorial text or a hash of that text. Pre-key ID renames cannot reliably be
linked across old revisions; don't claim complete historical continuity.
