---
name: Lazy route recovery
description: Why failed route downloads need a reload option in addition to navigation recovery.
---
Keep a full-page reload option for failed lazy route downloads.

**Why:** React caches a rejected `lazy()` import promise. Resetting an error
boundary alone rethrows the same rejection; it does not retry the download.
Deployments can also invalidate old chunk URLs, so a reload can obtain the
current entry and chunk graph.

**How to apply:** Preserve navigation out of the failed route and offer reload
when changing route-loading error handling. Do not replace reload with a
boundary-only “try again” action unless the lazy loader itself is retryable.
