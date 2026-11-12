/**
 * Baksa Tales approved demo: browser-only state and business helpers.
 * Every helper here is PURE (takes a state, returns a new state or a value) so tests can
 * call them without a DOM. The UI uses `getState`, `update`, `subscribe` and `resetDemo`.
 * Persistence: localStorage key STORAGE_KEY. SAMPLE data only.
 */
import {
  BUDGETS, DEFAULT_SETTINGS, breakEvenUnits, contributionMargin, formatINR, listingDecision, monthlyCapacity,
  payoutDateFor, payoutSchedule, recommend, revenuePotential, shippingFor, splitSale, stateFromPincode, sumSplits,
  type BudgetBand, type FinderAnswers, type FinderResult, type GiftFeel, type Maker, type NeedBy, type Occasion, type Recipient, type SaleSplit,
} from './domain';
import {
  APPLICATIONS, COSTS, COURSES, EDIT_ORDER, ENQUIRIES, MAKERS, OPPS, ORDERS, PRODUCTS, TODAY, slugify,
  type DemoApplication, type DemoCourse, type DemoEnquiry, type DemoMaker, type DemoOpp, type DemoOrder, type DemoProduct,
} from './catalog';

export { TODAY, formatINR };
export const STORAGE_KEY = 'baksa-approved-demo-v1';

export interface BagLine { kind: 'product' | 'course'; id: string; qty: number }
export interface Address { pin: string; house: string; road: string; name: string; phone: string; isDefault: boolean; gift: boolean }
export interface CheckoutState {
  step: 'signin' | 'address' | 'payment' | 'done';
  phone: string | null; codeSent: boolean; address: Address; payment: 'upi' | 'card' | 'netbanking' | 'cod';
  lastOrder: { ref: string; lines: { name: string; maker: string; img: string; qty: number; linePaise: number }[]; itemsPaise: number; discountPaise: number; couponCode: string | null; shippingPaise: number; totalPaise: number; address: Address; payment: string } | null;
}
export interface ReviewState { checks: boolean[]; note: string }
export interface Proposal { title: string; type: string; length: string; pricePaise: number; about: string; status: 'sent' | 'approved' | 'changes' }
export interface Brief { ref: string; purpose: string; qty: number; budgetPaise: number; neededBy: string; name: string; company: string; contact: string }

export interface DemoState {
  version: 1;
  seq: number;
  bag: BagLine[];
  wishlist: string[];
  makers: DemoMaker[];
  products: DemoProduct[];
  orders: DemoOrder[];
  courses: DemoCourse[];
  enquiries: DemoEnquiry[];
  opps: DemoOpp[];
  applications: DemoApplication[];
  reviews: Record<string, ReviewState>;
  costs: Record<string, number>;
  checkout: CheckoutState;
  finder: { answers: Partial<FinderAnswers>; needBy: NeedBy; done: boolean; query: string };
  proposals: Proposal[];
  registrations: string[];
  newsletter: string[];
  briefs: Brief[];
  updates: { date: string; text: string }[];
  paidPayouts: PaidPayout[];
}
export interface PaidPayout { makerId: string; brand: string; date: string; orderIds: string[]; grossPaise: number; payoutPaise: number; paidOn: string }

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function createSeedState(): DemoState {
  return {
    version: 1, seq: 1048,
    bag: [{ kind: 'product', id: 't-bluelotus', qty: 1 }, { kind: 'product', id: 'sv-divya', qty: 1 }],
    wishlist: ['t-teapot'],
    makers: clone(MAKERS), products: clone(PRODUCTS), orders: clone(ORDERS), courses: clone(COURSES),
    enquiries: clone(ENQUIRIES), opps: clone(OPPS), applications: clone(APPLICATIONS),
    reviews: {
      'mu-radiant': { checks: [true, true, true, false, false], note: '' },
      'sv-nimisha': { checks: [false, false, false, false, false], note: '' },
      't-lady': { checks: [false, false, false, false, false], note: '' },
    },
    costs: clone(COSTS),
    checkout: {
      step: 'signin', phone: null, codeSent: false,
      address: { pin: '110010', house: 'A-12', road: 'Sector 9, Rohini', name: 'Preeti G', phone: '98765 43210', isDefault: true, gift: false },
      payment: 'upi', lastOrder: null,
    },
    finder: { answers: {}, needBy: 'any', done: false, query: '' },
    proposals: [], registrations: [], newsletter: [], briefs: [], updates: [], paidPayouts: [],
  };
}

/* ---------------- lookups ---------------- */
export const productById = (s: DemoState, id: string) => s.products.find(p => p.id === id);
export const productBySlug = (s: DemoState, slug: string) => s.products.find(p => p.slug === slug || p.id === slug);
export const makerById = (s: DemoState, id: string) => s.makers.find(m => m.id === id);
export const makerByBrand = (s: DemoState, brand: string) => s.makers.find(m => m.brand.toLowerCase() === brand.toLowerCase());
export const productByName = (s: DemoState, name: string) => s.products.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
export const makerMap = (s: DemoState) => new Map<string, Maker>(s.makers.map(m => [m.id, m]));
export const liveProducts = (s: DemoState) => s.products.filter(p => p.status === 'live' && makerById(s, p.makerId)?.published);
export const imgUrl = (key: string) => `${import.meta.env.BASE_URL}approved/images/${key}.webp`;
export { slugify };

/* ---------------- bag and wishlist ---------------- */
export function maxQty(s: DemoState, id: string): number {
  const p = productById(s, id);
  if (!p) return 1;
  return p.madeToOrder ? 20 : Math.max(0, p.stock);
}
export function addToBag(s: DemoState, id: string, qty = 1, kind: 'product' | 'course' = 'product'): DemoState {
  const n = clone(s);
  const line = n.bag.find(l => l.id === id && l.kind === kind);
  if (kind === 'course') { if (!line) n.bag.push({ kind, id, qty: 1 }); return n; }
  const cap = maxQty(n, id);
  if (cap <= 0) return n;
  if (line) line.qty = Math.min(cap, line.qty + qty); else n.bag.push({ kind, id, qty: Math.min(cap, Math.max(1, qty)) });
  return n;
}
export function setBagQty(s: DemoState, id: string, qty: number): DemoState {
  const n = clone(s);
  const line = n.bag.find(l => l.id === id);
  if (!line) return n;
  if (qty <= 0) { n.bag = n.bag.filter(l => l !== line); return n; }
  line.qty = line.kind === 'course' ? 1 : Math.min(maxQty(n, id), qty);
  return n;
}
export const removeFromBag = (s: DemoState, id: string) => setBagQty(s, id, 0);
export const bagCount = (s: DemoState) => s.bag.reduce((a, l) => a + l.qty, 0);
export function bagLines(s: DemoState) {
  return s.bag.map(l => {
    if (l.kind === 'course') {
      const c = s.courses.find(x => x.id === l.id);
      return c ? { ...l, name: c.title, maker: c.by, img: 'logo-mark', unitPaise: c.pricePaise, linePaise: c.pricePaise, physical: false } : null;
    }
    const p = productById(s, l.id);
    if (!p) return null;
    return { ...l, name: p.name, maker: makerById(s, p.makerId)?.brand ?? '', img: p.img, unitPaise: p.pricePaise, linePaise: p.pricePaise * l.qty, physical: true };
  }).filter(Boolean) as { kind: 'product' | 'course'; id: string; qty: number; name: string; maker: string; img: string; unitPaise: number; linePaise: number; physical: boolean }[];
}
export function bagTotals(s: DemoState) {
  const lines = bagLines(s);
  const itemsPaise = lines.reduce((a, l) => a + l.linePaise, 0);
  const shippingPaise = lines.length ? shippingFor(itemsPaise, lines.some(l => l.physical)) : 0;
  return { itemsPaise, shippingPaise, totalPaise: itemsPaise + shippingPaise, count: bagCount(s) };
}
export function toggleWishlist(s: DemoState, id: string): DemoState {
  const n = clone(s);
  n.wishlist = n.wishlist.includes(id) ? n.wishlist.filter(x => x !== id) : [...n.wishlist, id];
  return n;
}
export function addAllToWishlist(s: DemoState, ids: string[]): DemoState {
  const n = clone(s);
  for (const id of ids) if (!n.wishlist.includes(id)) n.wishlist.push(id);
  return n;
}

/* ---------------- shop filters ---------------- */
export type PriceBand = 'any' | 'under1500' | '1500to3500' | '3500plus';
export type ShopSort = 'editor' | 'priceAsc' | 'priceDesc' | 'newest';
export interface ShopFilters { feel: GiftFeel | 'all'; price: PriceBand; maker: string | 'all'; fast: boolean; sort: ShopSort; q?: string; wishlistOnly?: boolean }
export const SHOP_FEELS: { label: string; feel: GiftFeel | 'all' }[] = [
  { label: 'Everything', feel: 'all' }, { label: 'To show love', feel: 'heart' }, { label: 'To make a moment', feel: 'showstopper' },
  { label: 'To help them relax', feel: 'soother' }, { label: 'Useful and lovely', feel: 'thoughtful' }, { label: 'Something new', feel: 'explorer' },
];
export function filterShop(s: DemoState, f: ShopFilters): DemoProduct[] {
  const q = (f.q ?? '').trim().toLowerCase();
  let list = liveProducts(s).filter(p => {
    if (f.feel !== 'all' && !p.feels.includes(f.feel)) return false;
    if (f.price === 'under1500' && !(p.pricePaise < 150000)) return false;
    if (f.price === '1500to3500' && !(p.pricePaise >= 150000 && p.pricePaise < 350000)) return false;
    if (f.price === '3500plus' && !(p.pricePaise >= 350000)) return false;
    if (f.maker !== 'all' && makerById(s, p.makerId)?.brand !== f.maker) return false;
    if (f.fast && p.dispatchDays + DEFAULT_SETTINGS.transitBufferDays > 5) return false;
    if (f.wishlistOnly && !s.wishlist.includes(p.id)) return false;
    if (q) {
      const hay = `${p.name} ${p.material} ${p.technique} ${makerById(s, p.makerId)?.brand ?? ''}`.toLowerCase();
      if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    return true;
  });
  const rank = (p: DemoProduct) => { const i = EDIT_ORDER.indexOf(p.id); return i === -1 ? 100 + s.products.indexOf(p) : i; };
  if (f.sort === 'editor') list = list.sort((a, b) => rank(a) - rank(b));
  if (f.sort === 'priceAsc') list = list.sort((a, b) => a.pricePaise - b.pricePaise || rank(a) - rank(b));
  if (f.sort === 'priceDesc') list = list.sort((a, b) => b.pricePaise - a.pricePaise || rank(a) - rank(b));
  if (f.sort === 'newest') list = list.sort((a, b) => (b.published ?? '').localeCompare(a.published ?? '') || s.products.indexOf(b) - s.products.indexOf(a));
  return list;
}

/* ---------------- gift finder ---------------- */
export const FINDER_STEPS: { key: 'recipient' | 'occasion' | 'feel' | 'budget'; q: [string, string]; opts: [string, string][] }[] = [
  { key: 'recipient', q: ['Who is the gift ', 'for?'], opts: [['parent', 'A parent'], ['partner', 'A partner'], ['friend', 'A friend'], ['colleague', 'A colleague or client'], ['self', 'Myself, obviously']] },
  { key: 'occasion', q: ['What’s the ', 'occasion?'], opts: [['diwali', 'Diwali or a festival'], ['wedding', 'A wedding'], ['birthday', 'A birthday'], ['thanks', 'Saying thank you'], ['housewarming', 'A new home'], ['justbecause', 'Just because']] },
  { key: 'feel', q: ['What would you like the gift to ', 'do?'], opts: [['heart', 'Show how much they mean to me'], ['showstopper', 'Make it a moment they’ll remember'], ['soother', 'Help them slow down and relax'], ['thoughtful', 'Be something useful they’ll love'], ['explorer', 'Introduce them to something new']] },
  { key: 'budget', q: ['What would you like to ', 'spend?'], opts: (Object.keys(BUDGETS) as BudgetBand[]).map(k => [k, BUDGETS[k].label]) },
];
export const DEFAULT_RESULTS_ANSWERS: FinderAnswers = { recipient: 'partner', occasion: 'birthday', feel: 'heart', budget: 'b2' };
export function setFinderAnswer(s: DemoState, key: string, value: string): DemoState {
  const n = clone(s);
  (n.finder.answers as Record<string, string>)[key] = value;
  return n;
}
export function finderResult(s: DemoState, answers: Partial<FinderAnswers> = s.finder.answers, needBy: NeedBy = s.finder.needBy, buyerState: string | null = null): FinderResult {
  const a: FinderAnswers = { ...answers, budget: (answers.budget ?? 'b4') as BudgetBand };
  return recommend(liveProducts(s), makerMap(s), a, { needBy, buyerState });
}
export function finderSummary(a: Partial<FinderAnswers>): string {
  const rec: Record<Recipient, string> = { parent: 'a parent', partner: 'a partner', friend: 'a friend', colleague: 'a colleague or client', self: 'yourself' };
  const occ: Record<Occasion, string> = { diwali: 'Diwali or a festival', wedding: 'a wedding', birthday: 'a birthday', thanks: 'saying thank you', housewarming: 'a new home', justbecause: 'just because' };
  const feel: Record<GiftFeel, string> = { heart: 'to show how much they mean to you', showstopper: 'to make a moment they’ll remember', soother: 'to help them slow down and relax', thoughtful: 'to be something useful they’ll love', explorer: 'to introduce them to something new' };
  const parts = [a.recipient ? `For ${rec[a.recipient]}` : 'For anyone', a.occasion ? occ[a.occasion] : null, a.feel ? feel[a.feel] : null].filter(Boolean);
  return parts.join(', ') + '.';
}

/* ---------------- checkout ---------------- */
export const normalisePhone = (v: string) => v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
export const validatePhone = (v: string) => /^[6-9]\d{9}$/.test(normalisePhone(v)) ? null : 'Enter a valid 10-digit Indian mobile number.';
export const SAMPLE_CHECKOUT_CODE = '246810';
export const validateCode = (v: string) => v.trim() === SAMPLE_CHECKOUT_CODE ? null : 'For this simulation, enter the sample code 246810.';
export const formatPhone = (v: string) => { const d = normalisePhone(v); return `+91 ${d.slice(0, 5)} ${d.slice(5)}`; };
export function validateAddress(a: Address): Partial<Record<keyof Address, string>> {
  const e: Partial<Record<keyof Address, string>> = {};
  if (!stateFromPincode(a.pin.trim())) e.pin = 'Enter a valid 6-digit PIN code.';
  if (!a.house.trim()) e.house = 'Add a house, flat or office number.';
  if (!a.road.trim()) e.road = 'Add a road, area or colony.';
  if (!a.name.trim()) e.name = 'Add the name for delivery.';
  if (validatePhone(a.phone)) e.phone = 'Enter a 10-digit mobile number.';
  return e;
}
export function signIn(s: DemoState, phone: string, code: string): { ok: boolean; error?: string; state: DemoState } {
  const pe = validatePhone(phone); if (pe) return { ok: false, error: pe, state: s };
  const ce = validateCode(code); if (ce) return { ok: false, error: ce, state: s };
  const n = clone(s); n.checkout.phone = normalisePhone(phone); n.checkout.step = 'address'; n.checkout.codeSent = false;
  return { ok: true, state: n };
}
export const PAYMENT_LABEL = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', cod: 'Cash on delivery' } as const;
export function placeOrder(s: DemoState): { ok: boolean; error?: string; ref?: string; state: DemoState } {
  if (!s.checkout.phone) return { ok: false, error: 'Sign in first.', state: s };
  if (Object.keys(validateAddress(s.checkout.address)).length) return { ok: false, error: 'Check the address.', state: s };
  const lines = bagLines(s);
  if (!lines.length) return { ok: false, error: 'Your bag is empty.', state: s };
  const t = bagTotals(s);
  const n = clone(s);
  const ref = `BT-${n.seq}`;
  const city = stateFromPincode(n.checkout.address.pin) ?? '';
  lines.forEach((l, i) => {
    if (l.kind === 'course') { n.registrations.push(l.id); return; }
    const p = productById(n, l.id)!;
    if (!p.madeToOrder) p.stock = Math.max(0, p.stock - l.qty);
    n.orders.unshift({ id: lines.length > 1 ? `${ref}-${i + 1}` : ref, productId: p.id, makerId: p.makerId, qty: l.qty, amountPaise: l.linePaise, customer: n.checkout.address.name, city, date: TODAY, status: 'new', deliveredOn: null, settled: false });
  });
  n.seq += 1;
  n.checkout.lastOrder = { ref, lines: lines.map(l => ({ name: l.name, maker: l.maker, img: l.img, qty: l.qty, linePaise: l.linePaise })), itemsPaise: t.itemsPaise, discountPaise: 0, couponCode: null, shippingPaise: t.shippingPaise, totalPaise: t.totalPaise, address: clone(n.checkout.address), payment: PAYMENT_LABEL[n.checkout.payment] };
  n.checkout.step = 'done';
  n.bag = [];
  return { ok: true, ref, state: n };
}

/* ---------------- corporate brief ---------------- */
export interface BriefInput { purpose: string; qty: string; budget: string; neededBy: string; name: string; company: string; contact: string }
export function validateBrief(b: BriefInput, today = TODAY): Partial<Record<keyof BriefInput, string>> {
  const e: Partial<Record<keyof BriefInput, string>> = {};
  const qty = Number(b.qty), budget = Number(b.budget);
  if (!Number.isInteger(qty) || qty < 1) e.qty = 'Enter how many gifts, 1 or more.';
  if (!Number.isFinite(budget) || budget <= 0) e.budget = 'Enter a budget per gift above 0.';
  if (!b.neededBy) e.neededBy = 'Choose a date.'; else if (b.neededBy <= today) e.neededBy = 'Choose a date after today.';
  if (!b.name.trim()) e.name = 'Add your name.';
  if (!b.company.trim()) e.company = 'Add your company.';
  const c = b.contact.trim();
  if (!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) || /^\d{10}$/.test(normalisePhone(c)))) e.contact = 'Enter a work email or a 10-digit WhatsApp number.';
  return e;
}
export function submitBrief(s: DemoState, b: BriefInput): { ok: boolean; errors: Partial<Record<keyof BriefInput, string>>; ref?: string; state: DemoState } {
  const errors = validateBrief(b);
  if (Object.keys(errors).length) return { ok: false, errors, state: s };
  const n = clone(s);
  const ref = `BT-CG-${String(13 + n.briefs.length + 2).padStart(4, '0')}`;
  const brief: Brief = { ref, purpose: b.purpose, qty: Number(b.qty), budgetPaise: Math.round(Number(b.budget) * 100), neededBy: b.neededBy, name: b.name.trim(), company: b.company.trim(), contact: b.contact.trim() };
  n.briefs.push(brief);
  n.enquiries.push({ ref, company: brief.company, contact: brief.name, email: brief.contact, purpose: brief.purpose, qty: brief.qty, budgetPaise: brief.budgetPaise, neededBy: brief.neededBy, custom: [], message: '', stage: 'new', date: TODAY, matched: [], sentTo: [], saidYes: [], quotePaise: null });
  return { ok: true, errors: {}, ref, state: n };
}

/* ---------------- maker orders ---------------- */
export const ORDER_STEP_LABEL: Record<string, string> = { new: 'New', packed: 'Packed', dispatched: 'On the way', delivered: 'Delivered', problem: 'Problem', delayed: 'Delayed', refunded: 'Refunded' };
export function advanceOrder(s: DemoState, id: string, opts: { courier?: string; tracking?: string } = {}, today = TODAY): { ok: boolean; error?: string; state: DemoState } {
  const n = clone(s);
  const o = n.orders.find(x => x.id === id);
  if (!o) return { ok: false, error: 'Order not found.', state: s };
  if (o.status === 'new') o.status = 'packed';
  else if (o.status === 'packed') {
    const tr = (opts.tracking ?? '').trim();
    if (!opts.courier) return { ok: false, error: 'Choose a courier.', state: s };
    if (!/^[A-Za-z0-9-]{6,}$/.test(tr)) return { ok: false, error: 'Add the tracking (AWB) number, at least 6 letters or digits.', state: s };
    o.status = 'dispatched'; o.courier = opts.courier; o.tracking = tr;
  } else if (o.status === 'dispatched') { o.status = 'delivered'; o.deliveredOn = today; }
  else return { ok: false, error: 'Nothing left to do on this order.', state: s };
  return { ok: true, state: n };
}
export function resolveProblem(s: DemoState, id: string): DemoState {
  const n = clone(s); const o = n.orders.find(x => x.id === id);
  if (o && o.status === 'problem') { o.status = 'delivered'; o.deliveredOn = o.deliveredOn ?? o.date; o.issue = undefined; }
  return n;
}
export const makerOrders = (s: DemoState, makerId = 'm1') => s.orders.filter(o => o.makerId === makerId);

/* ---------------- products and stock ---------------- */
export function setStock(s: DemoState, id: string, stock: number): DemoState {
  const n = clone(s); const p = productById(n, id);
  if (p && Number.isFinite(stock)) p.stock = Math.max(0, Math.floor(stock));
  return n;
}
export interface ProductDraft { name: string; kind: string; material: string; technique: string; size: string; price: string; gst: string; stock: string; dispatch: string; madeToOrder: boolean; cost: string; story: string; photo: string | null }
export const emptyDraft = (): ProductDraft => ({ name: '', kind: '', material: '', technique: '', size: '', price: '2400', gst: '18', stock: '6', dispatch: '4', madeToOrder: false, cost: '600', story: '', photo: null });
export function validateDraft(d: ProductDraft): string[] {
  const e: string[] = [];
  if (!d.name.trim()) e.push('Add the product name (step 2).');
  if (!(Number(d.price) > 0)) e.push('Add a selling price above 0 (step 5).');
  if (!d.madeToOrder && !(Number(d.stock) >= 0)) e.push('Add how many are ready (step 5).');
  if (!(Number(d.dispatch) >= 1)) e.push('Add the days you need before dispatch (step 5).');
  if (!d.story.trim()) e.push('Add a few lines about its story (step 6).');
  return e;
}
export function submitProduct(s: DemoState, d: ProductDraft, makerId = 'm1'): { ok: boolean; errors: string[]; status?: 'live' | 'review'; reason?: string | null; state: DemoState } {
  const errors = validateDraft(d);
  if (errors.length) return { ok: false, errors, state: s };
  const n = clone(s);
  const m = makerById(n, makerId)!;
  const pricePaise = Math.round(Number(d.price) * 100);
  const highest = Math.max(0, ...n.products.filter(p => p.makerId === makerId && p.status === 'live').map(p => p.pricePaise));
  const dec = listingDecision(m, pricePaise, highest, false);
  const id = `new-${n.seq}`; n.seq += 1;
  n.products.push({ id, makerId, name: d.name.trim(), slug: slugify(d.name) + '-' + id, img: d.photo ?? m.img, pricePaise, gstPct: Number(d.gst), stock: d.madeToOrder ? 0 : Number(d.stock), madeToOrder: d.madeToOrder,
    dispatchDays: Math.max(1, Number(d.dispatch)), status: dec.status, feels: ['thoughtful'], occasions: ['justbecause'], recipients: ['friend'], material: d.material, technique: d.technique, size: d.size, corp: false,
    story: d.story.trim(), published: dec.status === 'live' ? TODAY : undefined, submitted: TODAY, spot: dec.spotCheck, reason: dec.reason ?? undefined });
  if (d.cost !== '' && Number(d.cost) >= 0) n.costs[id] = Math.round(Number(d.cost) * 100);
  if (dec.status === 'review') n.reviews[id] = { checks: [false, false, false, false, false], note: '' };
  return { ok: true, errors: [], status: dec.status, reason: dec.reason, state: n };
}
export function salePreview(pricePaise: number, gstPct: number, costPaise: number) {
  const split = splitSale(pricePaise, gstPct, true);
  const keep = split.netAfterGstPaise - costPaise;
  const marginPct = split.taxablePaise ? (keep / split.taxablePaise) * 100 : 0;
  return { split, keepPaise: keep, marginPct, health: marginPct < 20 ? 'too_thin' : marginPct < 35 ? 'tight' : 'healthy' as const };
}
export const HEALTH_LABEL = { too_thin: 'Too thin', tight: 'Tight', healthy: 'Healthy' } as const;

/* ---------------- earnings and payouts ---------------- */
export function makerEarnings(s: DemoState, makerId = 'm1', today = TODAY) {
  const m = makerById(s, makerId)!;
  const mine = makerOrders(s, makerId);
  const payable = mine.map(o => ({ id: o.id, makerId, amountPaise: o.amountPaise, gstPct: productById(s, o.productId)?.gstPct ?? 18, status: o.status, deliveredOn: o.deliveredOn, settled: o.settled }));
  const sched = payoutSchedule(payable, m.gstRegistered, today);
  const delivered = mine.filter(o => o.status === 'delivered' && !o.settled);
  const split: SaleSplit = sumSplits(delivered.map(o => splitSale(o.amountPaise, productById(s, o.productId)?.gstPct ?? 18, m.gstRegistered)));
  const pending = mine.filter(o => ['new', 'packed', 'dispatched'].includes(o.status));
  const first = sched.runs[0];
  return {
    deliveredCount: delivered.length, split, runs: sched.runs, nextRunDate: sched.nextRunDate,
    nextPayoutPaise: first ? first.split.payoutPaise : 0, nextPayoutDate: first ? first.date : sched.nextRunDate,
    pendingCount: pending.length, pendingPaise: pending.reduce((a, o) => a + o.amountPaise, 0),
  };
}
export function adminPayoutRuns(s: DemoState, today = TODAY) {
  return s.makers.map(m => {
    const e = makerEarnings(s, m.id, today);
    const run = e.runs[0];
    return run ? { makerId: m.id, brand: m.brand, date: run.date, orderIds: run.orderIds, grossPaise: run.split.grossPaise, payoutPaise: run.split.payoutPaise } : null;
  }).filter(Boolean).sort((a, b) => b!.grossPaise - a!.grossPaise) as { makerId: string; brand: string; date: string; orderIds: string[]; grossPaise: number; payoutPaise: number }[];
}
export function markPayoutPaid(s: DemoState, orderIds: string[]): DemoState {
  const n = clone(s);
  if (!n.paidPayouts) n.paidPayouts = [];
  const run = adminPayoutRuns(s).find(r => r.orderIds.length === orderIds.length && r.orderIds.every(id => orderIds.includes(id)));
  for (const o of n.orders) if (orderIds.includes(o.id)) o.settled = true;
  if (run && !n.paidPayouts.some(p => p.makerId === run.makerId && p.date === run.date)) n.paidPayouts.push({ ...run, paidOn: TODAY });
  return n;
}
/** Paid runs recorded in this demo (persisted), newest last. */
export const paidPayouts = (s: DemoState) => s.paidPayouts ?? [];
export { payoutDateFor };

/* ---------------- growth studio ---------------- */
export interface GrowthInput { pricePaise: number; materialsPaise: number; packagingPaise: number; shippingPaise: number; monthlyFixedPaise: number; demand: number; hoursPerPiece: number; hoursPerWeek: number; people: number; gstPct?: number }
export function growthHealth(i: GrowthInput) {
  const cm = contributionMargin({ pricePaise: i.pricePaise, gstPct: i.gstPct ?? 18, gstRegistered: true, materialsPaise: i.materialsPaise, packagingPaise: i.packagingPaise, shippingPaise: i.shippingPaise });
  if (!cm.ok) return { ok: false as const, error: cm.error };
  const be = breakEvenUnits(i.monthlyFixedPaise, cm.value.leftPerSalePaise);
  const cap = monthlyCapacity(i.hoursPerPiece, i.hoursPerWeek, i.people);
  if (!be.ok) return { ok: false as const, error: be.error };
  if (!cap.ok) return { ok: false as const, error: cap.error };
  const rev = revenuePotential(cap.value, i.demand, cm.value.split.taxablePaise, cm.value.leftPerSalePaise, i.monthlyFixedPaise);
  return { ok: true as const, margin: cm.value, breakEven: be.value, capacity: cap.value, potential: rev };
}

/* ---------------- admin reviews ---------------- */
export const canApprove = (checks: boolean[]) => checks.length === 5 && checks.every(Boolean);
export function setReviewCheck(s: DemoState, id: string, index: number, value: boolean): DemoState {
  const n = clone(s); const r = n.reviews[id] ?? (n.reviews[id] = { checks: [false, false, false, false, false], note: '' });
  r.checks[index] = value; return n;
}
export function approveListing(s: DemoState, id: string): { ok: boolean; error?: string; state: DemoState } {
  const r = s.reviews[id];
  if (!r || !canApprove(r.checks)) return { ok: false, error: 'Tick all five to approve.', state: s };
  const n = clone(s); const p = productById(n, id)!;
  p.status = 'live'; p.published = TODAY; p.spot = false;
  const m = makerById(n, p.makerId)!; m.approvedCount += 1; if (m.approvedCount >= DEFAULT_SETTINGS.reviewFirstN) m.trusted = true;
  delete n.reviews[id];
  return { ok: true, state: n };
}
export function requestChanges(s: DemoState, id: string, note: string): { ok: boolean; error?: string; state: DemoState } {
  if (!note.trim()) return { ok: false, error: 'Write a note to the maker first.', state: s };
  const n = clone(s); const p = productById(n, id)!;
  p.status = 'changes'; p.note = note.trim(); p.spot = false; delete n.reviews[id];
  return { ok: true, state: n };
}
export const reviewQueue = (s: DemoState) => s.products.filter(p => p.status === 'review');
export const spotChecks = (s: DemoState) => s.products.filter(p => p.status === 'live' && p.spot);
export function setApplicationStatus(s: DemoState, id: string, status: DemoApplication['status']): DemoState {
  const n = clone(s); const a = n.applications.find(x => x.id === id); if (a) a.status = status; return n;
}

/* ---------------- enquiries and opportunities ---------------- */
export const STAGE_LABEL: Record<DemoEnquiry['stage'], string> = { new: 'New', contacted: 'Contacted', quote: 'Quote sent', won: 'Won', lost: 'Lost' };
export function setEnquiryStage(s: DemoState, ref: string, stage: DemoEnquiry['stage']): DemoState {
  const n = clone(s); const e = n.enquiries.find(x => x.ref === ref); if (e) e.stage = stage; return n;
}
export function setMatched(s: DemoState, ref: string, makerIds: string[]): DemoState {
  const n = clone(s); const e = n.enquiries.find(x => x.ref === ref); if (e) e.matched = makerIds; return n;
}
export function sendToMatched(s: DemoState, ref: string): { ok: boolean; error?: string; sent: string[]; state: DemoState } {
  const e = s.enquiries.find(x => x.ref === ref);
  if (!e || !e.matched.length) return { ok: false, error: 'Tick at least one maker.', sent: [], state: s };
  const n = clone(s); const en = n.enquiries.find(x => x.ref === ref)!;
  const fresh = en.matched.filter(m => !en.sentTo.includes(m));
  for (const mk of fresh) {
    n.opps.push({ id: `op-${ref}-${mk}`, makerId: mk, from: ref, type: 'Corporate brief', title: `${en.qty} gifts, ${en.purpose.toLowerCase()}`, detail: `About ${formatINR(en.budgetPaise)} per gift, needed by ${en.neededBy}.`, status: 'open' });
  }
  en.sentTo = [...new Set([...en.sentTo, ...en.matched])];
  if (en.stage === 'new') en.stage = 'contacted';
  return { ok: true, sent: en.matched, state: n };
}
export function recordQuote(s: DemoState, ref: string, quotePaise: number): { ok: boolean; error?: string; state: DemoState } {
  if (!Number.isFinite(quotePaise) || quotePaise <= 0) return { ok: false, error: 'Enter the quote total above 0.', state: s };
  const n = clone(s); const e = n.enquiries.find(x => x.ref === ref)!;
  e.quotePaise = Math.round(quotePaise); e.stage = 'quote';
  return { ok: true, state: n };
}
export function respondOpp(s: DemoState, id: string, yes: boolean): DemoState {
  const n = clone(s); const o = n.opps.find(x => x.id === id);
  if (o) {
    o.status = yes ? 'yes' : 'no';
    if (yes && o.from) { const e = n.enquiries.find(x => x.ref === o.from); if (e && !e.saidYes.includes(o.makerId)) e.saidYes.push(o.makerId); }
  }
  return n;
}
export function validateProposal(p: { title: string; length: string; price: string; about: string }): string | null {
  if (!p.title.trim()) return 'Tell us what people will learn.';
  if (!p.length.trim()) return 'Add how long the class is.';
  if (!(Number(p.price) > 0)) return 'Add the price you have in mind.';
  if (!p.about.trim()) return 'Add a few lines about the class.';
  return null;
}

/* ---------------- runtime store ---------------- */
let current: DemoState | null = null;
const listeners = new Set<() => void>();
function load(): DemoState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) { const p = JSON.parse(raw); if (p && p.version === 1) return { ...p, paidPayouts: p.paidPayouts ?? [] }; }
  } catch { /* ignore */ }
  return createSeedState();
}
export function getState(): DemoState { if (!current) current = load(); return current; }
export function setState(next: DemoState) {
  current = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach(l => l());
}
export function update(fn: (s: DemoState) => DemoState) { setState(fn(getState())); }
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function resetDemo() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  setState(createSeedState());
}

/* bag drawer open state (UI only, not persisted) */
let drawerOpen = false;
const drawerListeners = new Set<() => void>();
export const isBagOpen = () => drawerOpen;
export function setBagOpen(v: boolean) { drawerOpen = v; drawerListeners.forEach(l => l()); }
export function subscribeBag(l: () => void) { drawerListeners.add(l); return () => { drawerListeners.delete(l); }; }

export const COURSES_BY_TITLE = (s: DemoState, title: string) => s.courses.find(c => c.title === title.trim());
