import assert from 'node:assert/strict';
import { test } from 'node:test';
import { trackEvent, commerceDestination, editorialKey } from '../src/lib/analytics.ts';

test('only opaque keys are forwarded, never editable IDs or fallback text', () => {
  const key = 'e45fb32669c94bd890bf137b4e15aac2';
  assert.deepEqual(editorialKey('story', key), { story_key: key });
  assert.deepEqual(editorialKey('card', key), { card_key: key });
  for (const unsafe of [undefined, null, '', 'private-person', 'private@example.test', '/stories/one', key + 'extra']) {
    assert.deepEqual(editorialKey('story', unsafe), {});
    assert.deepEqual(editorialKey('card', unsafe), {});
  }
});

test('analytics is safe without a browser or tracker', () => {
  delete globalThis.window;
  assert.doesNotThrow(() => trackEvent('trunk_opened', undefined));
  globalThis.window = {};
  assert.doesNotThrow(() => trackEvent('trunk_opened', undefined));
  delete globalThis.window;
});

test('all six events pass only their explicit payload to the tracker', () => {
  const calls = [];
  globalThis.window = { umami: { track: (...args) => { calls.push(args); } } };
  const events = [
    ['trunk_opened', undefined],
    ['sponsored_card_followed', { card_position: 2 }],
    ['story_opened', { story_position: 1, sponsored: false, sample: true }],
    ['story_commerce_link_followed', { story_position: 1, sponsored: false, sample: true, destination: 'product' }],
    ['gift_finder_completed', { recommendation_count: 0, sample: true }],
    ['gift_recommendation_opened', { recommendation_position: 1, sample: true }],
  ];
  for (const [name, data] of events) trackEvent(name, data);
  assert.deepEqual(calls, events);
  delete globalThis.window;
});

test('throwing and rejecting trackers do not escape into shopping', async () => {
  globalThis.window = { umami: { track() { throw new Error('tracker unavailable'); } } };
  assert.doesNotThrow(() => trackEvent('trunk_opened', undefined));
  globalThis.window.umami.track = () => Promise.reject(new Error('network unavailable'));
  assert.equal(trackEvent('trunk_opened', undefined), undefined);
  await new Promise(resolve => setImmediate(resolve));
  delete globalThis.window;
});

test('tracker access failures and slow requests never block the caller', () => {
  globalThis.window = { get umami() { throw new Error('access denied'); } };
  assert.doesNotThrow(() => trackEvent('trunk_opened', undefined));
  globalThis.window = { umami: { track: () => new Promise(() => {}) } };
  assert.equal(trackEvent('trunk_opened', undefined), undefined);
  delete globalThis.window;
});

test('commerce classification strips all link detail from the event dimension', () => {
  for (const path of ['/makers', '/makers/', '/makers/blue-lotus', '/makers/blue-lotus?source=story']) {
    assert.equal(commerceDestination(path), 'maker');
  }
  assert.equal(commerceDestination('/products/a-piece#details'), 'product');
  assert.equal(commerceDestination('/shop?maker=one'), 'shop');
  for (const path of ['https://example.com/products/one', '//example.com/shop', '/stories/one', '/', '/makers-extra', '/products', '/shop/other']) {
    assert.equal(commerceDestination(path), undefined);
  }
});
