import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import userEvent from '@testing-library/user-event';
import { getByRole } from '@testing-library/dom';
import type { GiftResults, SiteDocument } from '@workspace/api-client-react';
import BaksaApp from '../src/pages/BaksaApp';
import { starterDocument } from '../src/pages/starter-document';

const state = vi.hoisted(() => ({ document: undefined as SiteDocument | undefined }));
vi.mock('@workspace/api-client-react', async importOriginal => {
  const actual = await importOriginal<typeof import('@workspace/api-client-react')>();
  return {
    ...actual,
    useGetSite: () => ({ data: { document: state.document }, isLoading: false }),
    useGetCatalog: () => ({ data: { products: [], makers: [], sample: true } }),
    useGetRuntime: () => ({ data: { auth: false }, isLoading: false }),
    useGetWorkspace: () => ({ data: undefined, isLoading: false }),
  };
});

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let location: ReturnType<typeof memoryLocation>;
let user: ReturnType<typeof userEvent.setup>;
const track = vi.fn();
const fetchMock = vi.fn();
const privateText = 'Private Person private@example.test +919999999999';

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  state.document = starterDocument();
  // Editable text/IDs and URL detail must never leak through measurement.
  for (const story of state.document.stories) {
    story.id = `private-person-${story.id}`;
    story.title = privateText;
    story.maker = privateText;
    story.intro = privateText;
    story.visible = true;
  }
  state.document.trunkCards.forEach((card, i) => {
    card.id = `private-card-${i}`;
    card.title = privateText;
    card.caption = privateText;
    card.sponsored = i === 1;
    card.link.href = `/shop?source=private-person-${i}`;
  });
  window.umami = { track };
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(() => { throw new Error('Unexpected network request'); });
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  user = userEvent.setup({ document });
  location = memoryLocation({ path: '/', record: true });
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  localStorage.clear();
  delete window.umami;
  vi.unstubAllGlobals();
  track.mockReset();
  fetchMock.mockReset();
});

async function render(path?: string) {
  if (path) await act(async () => location.navigate(path));
  await act(async () => root.render(
    <StrictMode><QueryClientProvider client={client}>
      <Router hook={location.hook}><BaksaApp /></Router>
    </QueryClientProvider></StrictMode>,
  ));
}

function element<T extends Element = HTMLElement>(selector: string): T {
  const found = container.querySelector<T>(selector);
  expect(found, selector).not.toBeNull();
  return found!;
}

async function click(target: Element) {
  await act(async () => { await user.click(target); });
}

// Exact call lists lock down event counts AND the entire payload allowlist.
// This also explicitly rejects text/URLs, personal fields and quiz profiles.
function expectEvents(calls: unknown[][]) {
  expect(track.mock.calls).toEqual(calls);
  const captured = JSON.stringify(track.mock.calls);
  for (const forbidden of [
    privateText, 'private-person', 'private-card', 'private@example.test', '+919999999999',
    'recipient', 'occasion', 'feeling', 'budgetPaise', 'email', 'phone', 'contactName',
    'parent', 'diwali', 'heart', '150000', 'product-slug', 'recommendation-reason',
  ]) expect(captured).not.toContain(forbidden);
}

test('opening counts once, closing never counts, and closed cards cannot navigate', async () => {
  await render();
  const card = element<HTMLAnchorElement>('.bk-trunk-card:nth-child(2)');
  expect(card.tabIndex).toBe(-1);
  await click(card.querySelector('strong')!);
  expect(location.history).toEqual(['/']);
  expectEvents([]);
  const toggle = element('.bk-trunk-toggle');
  // Click the nested icon to exercise delegated capture handling.
  await click(toggle.querySelector('svg')!);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(card.tabIndex).toBe(0);
  await render();
  expectEvents([['trunk_opened', undefined]]);
  await click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expectEvents([['trunk_opened', undefined]]);
  await click(toggle);
  expectEvents([['trunk_opened', undefined], ['trunk_opened', undefined]]);
  expect(location.history).toEqual(['/']);
});

test.each([0, 1])('card %i preserves navigation and counts only disclosed sponsorship', async index => {
  state.document!.trunkCards[1].analyticsKey='ba23169cfbc640529e81a2d19ebf850c';
  await render();
  await click(element('.bk-trunk-toggle'));
  const card = container.querySelectorAll<HTMLAnchorElement>('.bk-trunk-card')[index];
  expect(card.textContent?.includes('SPONSORED · LABELLED')).toBe(index === 1);
  const href = state.document!.trunkCards[index].link.href;
  expect(card.getAttribute('href')).toBe(href);
  await click(card.querySelector('strong')!);
  expect(location.history).toEqual(['/', href]);
  expect(container.textContent).toContain('The BT Edit');
  expectEvents(index === 1
    ? [['trunk_opened', undefined], ['sponsored_card_followed', { card_key:'ba23169cfbc640529e81a2d19ebf850c',card_position: 2 }]]
    : [['trunk_opened', undefined]]);
});

test('direct story visits count once across StrictMode effects and document rerenders', async () => {
  const story = state.document!.stories[0];
  story.sponsored = true;
  story.sample = false;
  const path = `/stories/${story.id}`;
  await render(path);
  expect(element('.bk-story-page').textContent).toContain(privateText);
  const calls = [['story_opened', { story_position: 1, sponsored: true, sample: false }]];
  expectEvents(calls);
  await render();
  state.document = structuredClone(state.document!);
  await render();
  expectEvents(calls);
  const second = state.document.stories[1];
  await render(`/stories/${second.id}`);
  expectEvents([...calls, ['story_opened', {
    story_position: 2, sponsored: second.sponsored, sample: second.sample,
  }]]);
});

test.each([
  ['.bk-story-cover a', '/products/product-slug?source=private-person', 'product'],
  ['.bk-story-cover a', '/shop?source=private-person', 'shop'],
  ['.bk-story-cover a', '/makers/private-person', 'maker'],
  ['.bk-story-end a', '/makers', 'maker'],
])('story link %s to %s navigates without exposing link detail', async (selector, href, destination) => {
  const story = state.document!.stories[0];
  story.analyticsKey='e45fb32669c94bd890bf137b4e15aac2';
  story.link.href = href;
  await render(`/stories/${story.id}`);
  const anchor = element<HTMLAnchorElement>(selector);
  expect(anchor.getAttribute('href')).toBe(href);
  await click(anchor.querySelector('svg')!);
  expect(location.history!.at(-1)).toBe(href);
  expect(container.querySelector('.bk-story-page')).toBeNull();
  const flags = { story_key:story.analyticsKey,story_position: 1, sponsored: story.sponsored, sample: story.sample };
  expectEvents([
    ['story_opened', flags],
    ['story_commerce_link_followed', { ...flags, destination }],
  ]);
});

test('missing and hidden stories never emit discovery or commerce events', async () => {
  const story = state.document!.stories[0];
  story.visible = false;
  await render(`/stories/${story.id}`);
  expect(container.textContent).toContain('This chapter is not available.');
  await render('/stories/missing-private-person');
  await click(getByRole(container.querySelector('main')!, 'link', { name: 'Meet the makers' }));
  expect(location.history!.at(-1)).toBe('/makers');
  expectEvents([]);
});

async function answerFinder() {
  await render('/gift-finder');
  for (let step = 0; step < 4; step++) {
    await click(element('.bk-option'));
    await click(element('.bk-finder-controls .bk-btn'));
  }
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/recommendations');
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({
    recipient: 'parent', occasion: 'diwali', feeling: 'heart', budgetPaise: 150000,
  });
  expect(location.history!.at(-1)).toBe('/gift-finder');
}

test('failed finder responses show a retryable error without a completion event', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: privateText }), {
    status: 503, headers: { 'Content-Type': 'application/json' },
  }));
  await answerFinder();
  await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
  expect(container.querySelector('.bk-results')).toBeNull();
  expect(element<HTMLButtonElement>('.bk-finder-controls .bk-btn').disabled).toBe(false);
  await render();
  expectEvents([]);
});

test('zero matches is one completed finder, with no recommendation opens', async () => {
  fetchMock.mockResolvedValue(Response.json({ matches: [], sample: true, message: privateText }));
  await answerFinder();
  await vi.waitFor(() => expect(container.textContent).toContain('No matches for this combination.'));
  await render();
  expectEvents([['gift_finder_completed', { recommendation_count: 0, sample: true }]]);
  await click(getByRole(container, 'button', { name: 'Start again' }));
  expect(container.querySelector('.bk-options')).not.toBeNull();
  expectEvents([['gift_finder_completed', { recommendation_count: 0, sample: true }]]);
});

test('Enter on a focused recommendation counts once and opens the same product route', async () => {
  const result = {
    matches: [0, 1].map(i => ({
      product: { id: `private-person-${i}`, slug: `product-slug-${i}`, name: privateText,
        image: '', pricePaise: 10000 },
      reason: 'recommendation-reason private@example.test',
    })),
    sample: false, message: privateText,
  } as GiftResults;
  fetchMock.mockResolvedValue(Response.json(result));
  await answerFinder();
  await vi.waitFor(() => expect(container.querySelectorAll('.bk-resultcard')).toHaveLength(2));
  await render();
  expectEvents([['gift_finder_completed', { recommendation_count: 2, sample: false }]]);
  const card = container.querySelectorAll<HTMLAnchorElement>('.bk-resultcard')[1];
  expect(card.getAttribute('href')).toBe('/products/product-slug-1');
  // Tab from a neutral focus position: do not simulate keyboard activation by
  // calling click(), which would miss a broken tab order or link semantics.
  (document.activeElement as HTMLElement)?.blur();
  await act(async () => {
    for (let i = 0; i < 40 && document.activeElement !== card; i++) await user.tab();
  });
  expect(document.activeElement).toBe(card);
  await act(async () => { await user.keyboard('{Enter}'); });
  expect(location.history!.at(-1)).toBe('/products/product-slug-1');
  expectEvents([
    ['gift_finder_completed', { recommendation_count: 2, sample: false }],
    ['gift_recommendation_opened', { recommendation_position: 2, sample: false }],
  ]);
});

test('real Site Studio home and story previews never measure or navigate', async () => {
  await render('/studio-preview');
  // Resolve the lazy module inside act, then let its initialization effects
  // flush; polling inside act would hold those updates until polling finishes.
  await act(async () => { await import('../src/pages/SiteStudio'); });
  await click(element('.studio-preview .bk-trunk-toggle'));
  expect(element('.studio-preview .bk-trunk-toggle').getAttribute('aria-expanded')).toBe('true');
  await click(element('.studio-preview .bk-trunk-card:nth-child(2) strong'));
  await click(element('.studio-preview .bk-trunk-toggle'));
  await click(getByRole(container, 'tab', { name: 'Stories', exact: true }));
  expect(container.querySelector('.studio-preview .bk-story-page')).not.toBeNull();
  await click(element('.studio-preview .bk-story-cover a'));
  await click(element('.studio-preview .bk-story-end a'));
  await render();
  expect(location.history).toEqual(['/', '/studio-preview']);
  expectEvents([]);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('chapter controls move focus without motion or extra discovery events', async () => {
  const story = state.document!.stories[0];
  story.chapters = [0, 1, 2].map(index => ({
    ...story.chapters[0], id: `reader-${index}`, title: `Reader chapter ${index + 1}`,
  }));
  state.document!.theme.motion = false;
  await render(`/stories/${story.id}`);
  const chapter = element<HTMLElement>('#story-chapter-reader-1');
  const scroll = vi.fn();
  chapter.scrollIntoView = scroll;
  await click(element('.bk-story-stops button:nth-child(2)'));
  expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  expect(document.activeElement).toBe(chapter);
  expect(element('.bk-story-stops button:nth-child(2)').getAttribute('aria-current')).toBe('step');
  expectEvents([['story_opened', {
    story_position: 1, sponsored: story.sponsored, sample: story.sample,
  }]]);
});
