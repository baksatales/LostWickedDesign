---
name: Approved template hydration
description: Constraints for changing editable site settings without breaking hydrated approved pages.
---

Keep initial template hydration tied to route changes, then apply editor settings in place. Replacing hydrated template markup during a settings refresh can detach controls and confuse React portal cleanup.

**Why:** Approved storefront pages are static templates with event handlers attached after loading; they also host React portals for shared interactive pieces.

**How to apply:** When connecting Site Studio, update copy, theme, metadata, and links without rehydrating the whole route. Treat the server's unedited revision-zero document as a seed, not as a custom live configuration.
