# Editorial discovery measurement

Replit-hosted analytics access was checked and authorized before instrumentation.
This change does not enable analytics, install a tracker, connect another
provider, or publish the app.

## Activation

After these changes are merged, the owner can go to Publishing settings, enable
analytics, and publish or republish the app. The analytics changes take effect on
the next publish. Publishing is an owner action, not part of this task.
Replit injects its tracker into supported published websites; development previews
normally have no tracker. Do not add a script, website ID, or analytics secrets.

## Events

| Description | Event name | Properties |
| --- | --- | --- |
| Closed trunk opened by the shopper; closing is not counted | `trunk_opened` | None |
| Open trunk's visibly disclosed sponsored card followed | `sponsored_card_followed` | `card_position` |
| Available visible story rendered, including direct visits | `story_opened` | `story_position`, `sponsored`, `sample` |
| Story's commerce CTA or “Meet the makers” footer followed | `story_commerce_link_followed` | `story_position`, `sponsored`, `sample`, `destination` |
| Gift finder successfully returned recommendations, including zero matches | `gift_finder_completed` | `recommendation_count`, `sample` |
| Gift recommendation product link followed | `gift_recommendation_opened` | `recommendation_position`, `sample` |

Positions are one-based: story position is its position in the editorial document,
card position is its trunk slot, recommendation position is its result rank.
They are deliberately not content identifiers and can change when content is
reordered. `destination` is only `maker`, `product`, or `shop`; `maker` includes
the makers listing. External and unrelated links are not commerce conversions.
Flags distinguish disclosed sponsorship and sample catalogue content.

## Counting and privacy boundaries

- No names, emails, addresses, account/session IDs, editable titles or IDs, URLs,
  free-form text, recommendation reasons, quiz answers, budgets, or answer profiles
  are included in custom event payloads.
- A shared typed wrapper catches synchronous tracker exceptions and asynchronous
  rejections. Missing trackers are no-ops. Shopping never awaits analytics.
  Events are not queued or retried, so tracker loading delays or blocked requests
  can undercount; reliable shopping takes priority.
- Site Studio and local design playground storefront/story previews are excluded.
  Hidden/missing stories and failed gift-finder requests do not count as success.
- Homepage and story content wait for the site API response before rendering.
  Temporary starter content cannot generate discovery events during loading;
  the API-provided default remains available for an unconfigured site.
- Story render counts are guarded against rerenders and React effect replay.
  Returning to a story counts as another opening. Repeat trunk openings and
  repeat link activations count again; totals are interactions, not unique people.
- Capture handlers record link activations before the router handles navigation.
  Keyboard activation is included. An activation is not proof that a destination
  loaded, that the story was read, or that a purchase occurred.
- Automatic pageviews are owned by Replit's injected tracker, not this wrapper.
  Do not put personal data or quiz profiles in route URLs.
- No engagement figures are provided or inferred. Events alone do not establish
  causality or purchase attribution.

## Questions to ask after collection starts

- How often are trunk openings followed by sponsored-card activations?
- Which story positions lead to maker, product, or shop link activations?
- How many successful gift-finder runs return no matches, and which result ranks
  receive the most recommendation activations?

## Local checks

Run `node --experimental-strip-types --test artifacts/baksa-tales/tests/analytics.test.mjs`
for the wrapper failure cases and commerce classification.
Run `pnpm --filter @workspace/baksa-tales run typecheck` for payload and UI types.
Run `pnpm --filter @workspace/baksa-tales exec vitest run` for the UI checks
covering direct story visits through loading, hidden/reordered published content,
failed site loading, API-provided defaults, and trunk opening versus closing.
These checks do not claim delivery to the published analytics service.
