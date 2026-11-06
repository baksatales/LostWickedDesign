---
name: Editorial measurement privacy
description: Privacy tradeoff for editorial discovery analytics dimensions.
---
Prefer positional dimensions over editable editorial IDs or titles, and never
send quiz answer profiles to analytics.

**Why:** Site owners can edit story IDs and text, so even an apparently technical
identifier can contain a name or other free-form content. Positional dimensions
avoid that risk at the cost of losing stable attribution when content is reordered.

**How to apply:** Preserve this privacy boundary when extending editorial
measurement. If stable content attribution becomes necessary, introduce
non-editable opaque analytics keys rather than forwarding editorial text.
