type StoryData = { story_key?: string; story_position: number; sponsored: boolean; sample: boolean };
type Events = {
  trunk_opened: undefined;
  sponsored_card_followed: { card_key?: string; card_position: number };
  story_opened: StoryData;
  story_commerce_link_followed: StoryData & { destination: 'maker' | 'product' | 'shop' };
  gift_finder_completed: { recommendation_count: number; sample: boolean };
  gift_recommendation_opened: { recommendation_position: number; sample: boolean };
};

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: Record<string, string | number | boolean>): void | Promise<unknown>;
    };
  }
}

/** Missing legacy keys stay positional; never substitute editable IDs or titles. */
export function editorialKey(kind: 'story' | 'card', key: unknown): { story_key?: string; card_key?: string } {
  return typeof key === 'string' && /^[0-9a-f]{32}$/.test(key) ? { [`${kind}_key`]: key } : {};
}

/** Never await analytics in a shopping flow; absent/failed trackers are harmless. */
export function trackEvent<E extends keyof Events>(name: E, data: Events[E]): void {
  if (typeof window === 'undefined') return;
  try {
    void Promise.resolve(window.umami?.track(name, data)).catch(() => {
      // A rejected tracker request must not become an unhandled rejection.
    });
  } catch {
    // Analytics must never break browsing, navigation, or shopping.
  }
}

/** Classify only known internal commerce paths. Never send the URL itself. */
export function commerceDestination(href: string): 'maker' | 'product' | 'shop' | undefined {
  if (/^\/makers(?:\/[^/?#]+)?\/?(?:[?#]|$)/.test(href)) return 'maker';
  if (/^\/products\/[^/?#]+\/?(?:[?#]|$)/.test(href)) return 'product';
  if (/^\/shop\/?(?:[?#]|$)/.test(href)) return 'shop';
  return undefined;
}
