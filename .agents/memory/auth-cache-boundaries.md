---
name: Auth cache boundaries
description: Why account changes must preserve public connection settings while resetting private data.
---

Do not clear the entire query cache when the signed-in account changes. Preserve public connection settings and reset private account results instead.

**Why:** After Supabase was connected, restoring a session cleared the cached runtime settings that created the auth client. Losing those settings destroyed the client and reset the user; fetching them again restored the session and repeated the cycle. The site continuously requested public data and appeared to freeze after sign-in.

**How to apply:** Keep genuinely public runtime, catalogue and published-site data stable across account transitions. Reset private queries and mutation state on sign-out or user changes, and scope workspace queries to the user identity. Protect both requirements together: fixing privacy must not reintroduce the auth-client/cache feedback loop.
