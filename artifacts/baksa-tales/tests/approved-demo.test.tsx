import { describe, expect, it } from 'vitest';
import {
  createSeedState, addToBag, setBagQty, removeFromBag, bagCount, bagTotals,
  toggleWishlist, signIn, placeOrder, validateAddress, canApprove,
  approveListing, setReviewCheck, advanceOrder, filterShop, submitBrief,
  type ShopFilters,
} from '../src/demo/store';
import { PAGE_ROUTES, prepareTemplate } from '../src/demo/templates';

describe('approved screen navigation', () => {
  it('maps every source screen to a distinct route', () => {
    expect(Object.keys(PAGE_ROUTES)).toHaveLength(27);
    expect(new Set(Object.values(PAGE_ROUTES)).size).toBe(27);
    expect(PAGE_ROUTES.Main).toBe('/');
    expect(PAGE_ROUTES.MakerHome).toBe('/maker');
    expect(PAGE_ROUTES.AdminOverview).toBe('/admin');
  });
  it('rewrites source page links and images without dead HTML destinations', () => {
    for (const name of Object.keys(PAGE_ROUTES) as (keyof typeof PAGE_ROUTES)[]) {
      const html = prepareTemplate(name);
      expect(html.length).toBeGreaterThan(100);
      expect(html).not.toMatch(/href="[A-Za-z]+\.html"/);
      expect(html).not.toMatch(/src="images\//);
    }
  });
});

describe('browser demo bag and wishlist', () => {
  it('adds quantities without mutating the previous state', () => {
    const original = createSeedState();
    original.bag = [];
    const added = addToBag(original, 't-bluelotus', 2);
    expect(original.bag).toEqual([]);
    expect(bagCount(added)).toBe(2);
    expect(bagTotals(added).itemsPaise).toBe(added.products.find(p => p.id === 't-bluelotus')!.pricePaise * 2);
  });
  it('merges identical items, clamps to stock, changes quantity and removes', () => {
    let s = createSeedState();
    s.bag = [];
    s = addToBag(s, 't-bluelotus', 1);
    s = addToBag(s, 't-bluelotus', 1);
    expect(s.bag).toHaveLength(1);
    expect(bagCount(s)).toBe(2);
    s = setBagQty(s, 't-bluelotus', 9999);
    expect(bagCount(s)).toBe(s.products.find(p => p.id === 't-bluelotus')!.stock);
    s = setBagQty(s, 't-bluelotus', 1);
    expect(bagCount(s)).toBe(1);
    s = removeFromBag(s, 't-bluelotus');
    expect(bagTotals(s)).toEqual({ itemsPaise: 0, shippingPaise: 0, totalPaise: 0, count: 0 });
  });
  it('does not add sold-out products', () => {
    const s = createSeedState();
    s.bag = [];
    s.products.find(p => p.id === 't-bluelotus')!.stock = 0;
    expect(addToBag(s, 't-bluelotus').bag).toEqual([]);
  });
  it('toggles a wishlist item without duplicates', () => {
    let s = createSeedState();
    s.wishlist = [];
    s = toggleWishlist(s, 't-bluelotus');
    expect(s.wishlist).toEqual(['t-bluelotus']);
    s = toggleWishlist(s, 't-bluelotus');
    expect(s.wishlist).toEqual([]);
  });
});

describe('sample checkout progression', () => {
  it('accepts valid sample phones only with the fixed simulation code', () => {
    const result = signIn(createSeedState(), '9876543210', '246810');
    expect(result.ok).toBe(true);
    expect(result.state.checkout.step).toBe('address');
    expect(signIn(createSeedState(), '1234567890', '246810').ok).toBe(false);
    expect(signIn(createSeedState(), '9876543210', '123456').ok).toBe(false);
  });
  it('rejects malformed phone/code and missing address fields', () => {
    expect(signIn(createSeedState(), '12', '1234').ok).toBe(false);
    expect(signIn(createSeedState(), '9876543210', '123').ok).toBe(false);
    expect(signIn(createSeedState(), '9876543210', 'abcd').ok).toBe(false);
    const address = { ...createSeedState().checkout.address, house: '', name: '', pin: '000000' };
    expect(Object.keys(validateAddress(address))).toEqual(expect.arrayContaining(['pin', 'house', 'name']));
  });
  it('requires sample sign-in and a nonempty bag', () => {
    expect(placeOrder(createSeedState()).ok).toBe(false);
    const s = signIn(createSeedState(), '9876543210', '0000').state;
    s.bag = [];
    expect(placeOrder(s).ok).toBe(false);
  });
  it('retains the order summary, clears the bag and decrements sample stock', () => {
    const s = signIn(createSeedState(), '9876543210', '246810').state;
    s.checkout.step = 'payment';
    const before = bagTotals(s);
    const stock = s.products.find(p => p.id === 't-bluelotus')!.stock;
    const placed = placeOrder(s);
    expect(placed.ok).toBe(true);
    expect(placed.state.checkout.step).toBe('done');
    expect(placed.state.checkout.lastOrder!.totalPaise).toBe(before.totalPaise);
    expect(placed.state.checkout.lastOrder!.lines).toHaveLength(2);
    expect(placed.state.bag).toEqual([]);
    expect(placed.state.products.find(p => p.id === 't-bluelotus')!.stock).toBe(stock - 1);
  });
});

describe('shop and operations demo', () => {
  const all: ShopFilters = { feel: 'all', price: 'any', maker: 'all', fast: false, sort: 'editor' };
  it('combines feeling, price and maker filters and sorts numerically', () => {
    const s = createSeedState();
    const products = filterShop(s, { ...all, sort: 'priceAsc' });
    expect(products.length).toBeGreaterThan(1);
    expect(products.map(p => p.pricePaise)).toEqual(products.map(p => p.pricePaise).sort((a, b) => a - b));
    const filtered = filterShop(s, { ...all, feel: 'heart', maker: 'Tathaastu', price: 'under1500' });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(p => p.feels.includes('heart') && p.makerId === 'm1' && p.pricePaise < 150000)).toBe(true);
  });
  it('enables listing approval only when all five checks pass', () => {
    expect(canApprove([true, true, true, true])).toBe(false);
    expect(canApprove([true, true, true, true, false])).toBe(false);
    let s = createSeedState();
    expect(approveListing(s, 'mu-radiant').ok).toBe(false);
    for (let i = 0; i < 5; i++) s = setReviewCheck(s, 'mu-radiant', i, true);
    const result = approveListing(s, 'mu-radiant');
    expect(result.ok).toBe(true);
    expect(result.state.products.find(p => p.id === 'mu-radiant')!.status).toBe('live');
  });
  it('requires courier and tracking before dispatch, then records delivery', () => {
    let s = createSeedState();
    const order = s.orders.find(o => o.status === 'new')!;
    s = advanceOrder(s, order.id).state;
    expect(s.orders.find(o => o.id === order.id)!.status).toBe('packed');
    expect(advanceOrder(s, order.id).ok).toBe(false);
    s = advanceOrder(s, order.id, { courier: 'Sample courier', tracking: 'DEMO123456' }).state;
    expect(s.orders.find(o => o.id === order.id)!.status).toBe('dispatched');
    s = advanceOrder(s, order.id).state;
    expect(s.orders.find(o => o.id === order.id)!.status).toBe('delivered');
    expect(s.orders.find(o => o.id === order.id)!.deliveredOn).toBeTruthy();
  });
  it('validates a corporate brief and adds a sample enquiry', () => {
    const s = createSeedState();
    const brief = { purpose: 'Client gifting', qty: '20', budget: '1500', neededBy: '2027-01-01', name: 'Demo', company: 'Sample company', contact: 'demo@example.test' };
    expect(submitBrief(s, { ...brief, qty: '0', contact: '' }).ok).toBe(false);
    const result = submitBrief(s, brief);
    expect(result.ok).toBe(true);
    expect(result.state.enquiries).toHaveLength(s.enquiries.length + 1);
    expect(result.state.briefs[0].budgetPaise).toBe(150000);
  });
});
