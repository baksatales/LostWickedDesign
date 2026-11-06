/**
 * Baksa Tales: shared business rules.
 *
 * ONE source of truth for money, payouts, delivery, listing approval and gift-finder logic.
 * The same file is copied to supabase/functions/_shared/domain.ts so the frontend
 * (for previews) and the backend (for the real numbers) always agree.
 * The backend result always wins: never trust prices or totals sent by a browser.
 *
 * All money is in PAISE (integers). ₹1 = 100 paise. Format only for display.
 * The tax figures here are product logic, not tax advice: confirm rates with a CA.
 */

/* ---------------- types ---------------- */
export type GiftFeel = 'heart' | 'showstopper' | 'soother' | 'thoughtful' | 'explorer';
export type Recipient = 'parent' | 'partner' | 'friend' | 'colleague' | 'self';
export type Occasion = 'diwali' | 'wedding' | 'birthday' | 'thanks' | 'housewarming' | 'justbecause';
export type BudgetBand = 'b1' | 'b2' | 'b3' | 'b4';
export type NeedBy = 'any' | 'd10' | 'd5';
export type ProductStatus = 'draft' | 'review' | 'changes' | 'live';
export type OrderStatus = 'new' | 'packed' | 'dispatched' | 'delivered' | 'delayed' | 'problem' | 'refunded';

export interface Settings {
  commissionPct: number;        // Baksa commission, on the price BEFORE GST
  commissionGstPct: number;     // GST Baksa charges on its commission
  tcsPct: number;               // TCS on the taxable value (GST-registered makers only)
  paymentFeePct: number;        // gateway fee, on the amount the customer paid
  payoutWeekday: number;        // 0 = Sunday ... 3 = Wednesday
  returnWindowDays: number;     // an order is paid out only after this many days from delivery
  transitBufferDays: number;    // days allowed for courier transit in the gift finder (a filter, not a promise)
  reviewFirstN: number;         // a new maker's first N listings are reviewed by Baksa
  freeShippingOverPaise: number;
  shippingFeePaise: number;
}

export const DEFAULT_SETTINGS: Settings = {
  commissionPct: 12, commissionGstPct: 18, tcsPct: 0.5, paymentFeePct: 2,
  payoutWeekday: 3, returnWindowDays: 7, transitBufferDays: 3, reviewFirstN: 3,
  freeShippingOverPaise: 250000, shippingFeePaise: 12000,
};

export interface Maker { id: string; brand: string; gstRegistered: boolean; state: string | null; trusted: boolean; approvedCount: number; published: boolean }
export interface Product {
  id: string; makerId: string; name: string; pricePaise: number; gstPct: number;
  stock: number; madeToOrder: boolean; dispatchDays: number; status: ProductStatus;
  feels: GiftFeel[]; occasions: Occasion[]; recipients: Recipient[];
}
export interface PayableOrder { id: string; makerId: string; amountPaise: number; gstPct: number; status: OrderStatus; deliveredOn: string | null; settled: boolean }

/* ---------------- customer-facing labels (internal mood names never shown to buyers) ---------------- */
export const FEEL_LABEL: Record<GiftFeel, string> = {
  heart: 'Show how much they mean to me',
  showstopper: 'Make it a moment they’ll remember',
  soother: 'Help them slow down and relax',
  thoughtful: 'Be something useful they’ll love',
  explorer: 'Introduce them to something new',
};
export const FEEL_REASON: Record<GiftFeel, string> = {
  heart: 'Personal and warm, a gift that says you care',
  showstopper: 'Makes a striking first impression',
  soother: 'Calming, for slower moments',
  thoughtful: 'Useful and considered',
  explorer: 'A craft they may not have seen before',
};
export const RECIPIENT_LABEL: Record<Recipient, string> = { parent: 'A parent', partner: 'A partner', friend: 'A friend', colleague: 'A colleague or client', self: 'Myself' };
export const OCCASION_LABEL: Record<Occasion, string> = { diwali: 'Diwali or a festival', wedding: 'A wedding', birthday: 'A birthday', thanks: 'Saying thank you', housewarming: 'A new home', justbecause: 'Just because' };
export const BUDGETS: Record<BudgetBand, { label: string; minPaise: number; maxPaise: number }> = {
  b1: { label: 'Under ₹1,500', minPaise: 0, maxPaise: 150000 },
  b2: { label: '₹1,500 to ₹3,500', minPaise: 150000, maxPaise: 350000 },
  b3: { label: '₹3,500 to ₹8,000', minPaise: 350000, maxPaise: 800000 },
  b4: { label: '₹8,000 and above', minPaise: 800000, maxPaise: Number.MAX_SAFE_INTEGER },
};
export const NEED_DAYS: Record<NeedBy, number> = { any: Infinity, d10: 10, d5: 5 };

/* ---------------- formatting ---------------- */
export function formatINR(paise: number): string {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN');
}

/* ---------------- money ---------------- */
export interface SaleSplit {
  grossPaise: number;        // what the customer paid (includes GST)
  gstPaise: number;          // GST inside the price: the maker pays this to the government
  taxablePaise: number;      // price before GST: the maker's real revenue
  commissionPaise: number;
  commissionGstPaise: number;
  tcsPaise: number;
  paymentFeePaise: number;
  deductionsPaise: number;   // everything Baksa keeps or remits
  payoutPaise: number;       // what reaches the maker's bank
  netAfterGstPaise: number;  // payout minus the GST the maker must remit
}

const rnd = (n: number) => Math.round(n);

export function splitSale(grossPaise: number, gstPct: number, gstRegistered: boolean, s: Settings = DEFAULT_SETTINGS): SaleSplit {
  if (!Number.isFinite(grossPaise) || grossPaise < 0) throw new Error('grossPaise must be a number of 0 or more');
  const g = gstRegistered ? gstPct : 0;
  const taxablePaise = rnd((grossPaise * 100) / (100 + g));
  const gstPaise = grossPaise - taxablePaise;
  const commissionPaise = rnd((taxablePaise * s.commissionPct) / 100);
  const commissionGstPaise = rnd((commissionPaise * s.commissionGstPct) / 100);
  const tcsPaise = gstRegistered ? rnd((taxablePaise * s.tcsPct) / 100) : 0;
  const paymentFeePaise = rnd((grossPaise * s.paymentFeePct) / 100);
  const deductionsPaise = commissionPaise + commissionGstPaise + tcsPaise + paymentFeePaise;
  const payoutPaise = grossPaise - deductionsPaise;
  return { grossPaise, gstPaise, taxablePaise, commissionPaise, commissionGstPaise, tcsPaise, paymentFeePaise, deductionsPaise, payoutPaise, netAfterGstPaise: payoutPaise - gstPaise };
}

export function sumSplits(splits: SaleSplit[]): SaleSplit {
  const z: SaleSplit = { grossPaise: 0, gstPaise: 0, taxablePaise: 0, commissionPaise: 0, commissionGstPaise: 0, tcsPaise: 0, paymentFeePaise: 0, deductionsPaise: 0, payoutPaise: 0, netAfterGstPaise: 0 };
  for (const x of splits) for (const k of Object.keys(z) as (keyof SaleSplit)[]) z[k] += x[k];
  return z;
}

export function shippingFor(itemsPaise: number, hasPhysical: boolean, s: Settings = DEFAULT_SETTINGS): number {
  if (!hasPhysical) return 0;
  return itemsPaise >= s.freeShippingOverPaise ? 0 : s.shippingFeePaise;
}

/* ---------------- Growth Studio calculators ---------------- */
export type CalcResult<T> = { ok: true; value: T } | { ok: false; error: string };
const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export interface MarginInput { pricePaise: number; gstPct: number; gstRegistered: boolean; materialsPaise: number; packagingPaise: number; shippingPaise: number }
export interface MarginValue { split: SaleSplit; costsPaise: number; leftPerSalePaise: number; marginPct: number; health: 'too_thin' | 'tight' | 'healthy' }

/** What's left from one sale after GST, Baksa deductions and the maker's own per-piece costs. */
export function contributionMargin(i: MarginInput, s: Settings = DEFAULT_SETTINGS): CalcResult<MarginValue> {
  if (!valid(i.pricePaise) || i.pricePaise <= 0) return { ok: false, error: 'Enter a selling price above 0.' };
  if (![i.gstPct, i.materialsPaise, i.packagingPaise, i.shippingPaise].every(valid)) return { ok: false, error: 'Costs must be numbers of 0 or more.' };
  const split = splitSale(i.pricePaise, i.gstPct, i.gstRegistered, s);
  const costsPaise = i.materialsPaise + i.packagingPaise + i.shippingPaise;
  const leftPerSalePaise = split.netAfterGstPaise - costsPaise;
  const marginPct = split.taxablePaise ? (leftPerSalePaise / split.taxablePaise) * 100 : 0;
  const health = marginPct < 20 ? 'too_thin' : marginPct < 35 ? 'tight' : 'healthy';
  return { ok: true, value: { split, costsPaise, leftPerSalePaise, marginPct, health } };
}

/** null means break-even is impossible at this price (each sale loses money). */
export function breakEvenUnits(monthlyFixedPaise: number, leftPerSalePaise: number): CalcResult<number | null> {
  if (!valid(monthlyFixedPaise)) return { ok: false, error: 'Monthly costs must be 0 or more.' };
  if (leftPerSalePaise <= 0) return { ok: true, value: null };
  return { ok: true, value: Math.ceil(monthlyFixedPaise / leftPerSalePaise) };
}

export function monthlyCapacity(hoursPerPiece: number, hoursPerPersonPerWeek: number, people: number): CalcResult<number> {
  if (![hoursPerPiece, hoursPerPersonPerWeek, people].every(valid) || hoursPerPiece <= 0) return { ok: false, error: 'Enter hours above 0 and numbers of 0 or more.' };
  return { ok: true, value: Math.floor((hoursPerPersonPerWeek * people * 4.33) / hoursPerPiece) };
}

/** Capacity is what you can MAKE; demand is what you expect to SELL. Realistic sales are the smaller of the two. */
export function revenuePotential(capacity: number, expectedDemand: number, taxablePerPiecePaise: number, leftPerSalePaise: number, monthlyFixedPaise: number) {
  const units = Math.min(capacity, expectedDemand);
  return { units, revenueBeforeGstPaise: units * taxablePerPiecePaise, profitPaise: units * leftPerSalePaise - monthlyFixedPaise };
}

/* ---------------- dates and payouts ---------------- */
export function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
export function weekday(isoDate: string): number { return new Date(isoDate + 'T00:00:00Z').getUTCDay(); }
export function nextWeekday(afterIso: string, wd: number): string { let d = addDays(afterIso, 1); while (weekday(d) !== wd) d = addDays(d, 1); return d; }

/** The payout day an order will be paid on: the first payout weekday after its return window closes (and after today). */
export function payoutDateFor(deliveredOn: string, todayIso: string, s: Settings = DEFAULT_SETTINGS): string {
  let d = addDays(deliveredOn, s.returnWindowDays);
  if (d <= todayIso) d = addDays(todayIso, 1);
  while (weekday(d) !== s.payoutWeekday) d = addDays(d, 1);
  return d;
}

export interface PayoutRun { date: string; orderIds: string[]; split: SaleSplit }
export function payoutSchedule(orders: PayableOrder[], makerRegistered: boolean, todayIso: string, s: Settings = DEFAULT_SETTINGS): { nextRunDate: string; runs: PayoutRun[] } {
  const groups = new Map<string, PayableOrder[]>();
  for (const o of orders) {
    if (o.status !== 'delivered' || o.settled || !o.deliveredOn) continue;
    const d = payoutDateFor(o.deliveredOn, todayIso, s);
    groups.set(d, [...(groups.get(d) ?? []), o]);
  }
  const runs = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, os]) => ({
    date, orderIds: os.map(o => o.id), split: sumSplits(os.map(o => splitSale(o.amountPaise, o.gstPct, makerRegistered, s))),
  }));
  return { nextRunDate: nextWeekday(todayIso, s.payoutWeekday), runs };
}

/* ---------------- delivery rules ---------------- */
/** A maker who isn't GST-registered may only sell within their own state (rule to confirm with a CA). */
export function canDeliver(maker: Pick<Maker, 'gstRegistered' | 'state'>, buyerState: string | null | undefined): boolean {
  if (!buyerState) return true;   // not known yet: checked again at checkout
  if (maker.gstRegistered) return true;
  if (!maker.state) return true;  // admin hasn't set the maker's state: don't block, flag it in admin
  return maker.state === buyerState;
}

/**
 * Rough PIN code to state lookup for the PROTOTYPE ONLY.
 * Production: replace with a proper PIN code service (which also returns the city).
 */
export function stateFromPincode(pin: string): string | null {
  if (!/^[1-9][0-9]{5}$/.test(pin)) return null;
  const p3 = +pin.slice(0, 3), p2 = +pin.slice(0, 2);
  const by3: [number, number, string][] = [[110,110,'Delhi'],[160,160,'Chandigarh'],[194,194,'Ladakh'],[246,249,'Uttarakhand'],[262,263,'Uttarakhand'],[403,403,'Goa'],[605,605,'Puducherry'],[737,737,'Sikkim'],[744,744,'Andaman and Nicobar Islands'],[790,792,'Arunachal Pradesh'],[793,794,'Meghalaya'],[795,795,'Manipur'],[796,796,'Mizoram'],[797,798,'Nagaland'],[799,799,'Tripura'],[813,835,'Jharkhand']];
  for (const [a, b, st] of by3) if (p3 >= a && p3 <= b) return st;
  const by2: [number, number, string][] = [[12,13,'Haryana'],[14,16,'Punjab'],[17,17,'Himachal Pradesh'],[18,19,'Jammu and Kashmir'],[20,28,'Uttar Pradesh'],[30,34,'Rajasthan'],[36,39,'Gujarat'],[40,44,'Maharashtra'],[45,48,'Madhya Pradesh'],[49,49,'Chhattisgarh'],[50,50,'Telangana'],[51,53,'Andhra Pradesh'],[56,59,'Karnataka'],[60,64,'Tamil Nadu'],[67,69,'Kerala'],[70,74,'West Bengal'],[75,77,'Odisha'],[78,78,'Assam'],[80,85,'Bihar']];
  for (const [a, b, st] of by2) if (p2 >= a && p2 <= b) return st;
  return null;
}

/* ---------------- listing approval ---------------- */
/** What happens when a maker submits a product. Run on the SERVER (the database function submit_product mirrors it). */
export function listingDecision(maker: Pick<Maker, 'trusted' | 'approvedCount'>, pricePaise: number, highestLivePricePaise: number, wasChangesRequested: boolean, s: Settings = DEFAULT_SETTINGS): { status: 'live' | 'review'; reason: string | null; spotCheck: boolean } {
  if (wasChangesRequested) return { status: 'review', reason: 'Sent again after changes were requested', spotCheck: false };
  if (!maker.trusted) return { status: 'review', reason: `New maker: listing ${maker.approvedCount + 1} of the first ${s.reviewFirstN} reviewed`, spotCheck: false };
  if (highestLivePricePaise > 0 && pricePaise > highestLivePricePaise * 2) return { status: 'review', reason: 'Price is more than double this maker’s highest live price', spotCheck: false };
  return { status: 'live', reason: null, spotCheck: true };
}

/* ---------------- gift finder ---------------- */
export interface FinderAnswers { recipient?: Recipient; occasion?: Occasion; feel?: GiftFeel; budget: BudgetBand }
export interface FinderFilters { needBy: NeedBy; buyerState?: string | null }
export interface Reason { kind: 'match' | 'partial' | 'info'; text: string }
export interface Recommendation { productId: string; score: number; reasons: Reason[] }
export interface FinderResult { picks: Recommendation[]; nearMisses: Recommendation[]; hidden: { notInTime: number; notDeliverable: number; outOfStock: number; overBudget: number } }

/**
 * Rules-based, explainable ranking (documented in 03_ARCHITECTURE.md).
 * 1. Exclude: not live, maker hidden, out of stock (unless made to order), price above 110% of the budget's top,
 *    dispatch days + transit buffer longer than the needed-by window, maker can't deliver to the buyer's state.
 * 2. Relevance gate: must match the occasion OR the feeling. Never recommend on price or recipient alone.
 * 3. Score: occasion +3, feeling +3, recipient +2, within budget +2, under budget +1.
 * 4. Picks need a score of 5 or more (6 shown at most). If there are no picks, up to 3 lower scorers are shown as "closest options".
 * 5. Ties: higher score, then within budget, then faster dispatch, then price closest to the middle of the budget.
 */
export function recommend(products: Product[], makers: Map<string, Maker>, a: FinderAnswers, f: FinderFilters, s: Settings = DEFAULT_SETTINGS): FinderResult {
  const b = BUDGETS[a.budget];
  const win = NEED_DAYS[f.needBy];
  const mid = b.maxPaise === Number.MAX_SAFE_INTEGER ? b.minPaise * 1.25 : (b.minPaise + b.maxPaise) / 2;
  const hidden = { notInTime: 0, notDeliverable: 0, outOfStock: 0, overBudget: 0 };
  const pool: (Recommendation & { inBudget: boolean; dispatch: number; price: number })[] = [];
  for (const p of products) {
    const m = makers.get(p.makerId);
    if (!m || !m.published || p.status !== 'live') continue;
    if (p.stock <= 0 && !p.madeToOrder) { hidden.outOfStock++; continue; }
    if (p.pricePaise > b.maxPaise * 1.1) { hidden.overBudget++; continue; }
    if (Number.isFinite(win) && p.dispatchDays + s.transitBufferDays > win) { hidden.notInTime++; continue; }
    if (!canDeliver(m, f.buyerState)) { hidden.notDeliverable++; continue; }
    const occ = !!a.occasion && p.occasions.includes(a.occasion);
    const feel = !!a.feel && p.feels.includes(a.feel);
    const rec = !!a.recipient && p.recipients.includes(a.recipient);
    if (!occ && !feel) continue;
    let score = 0; const reasons: Reason[] = [];
    if (occ) { score += 3; reasons.push({ kind: 'match', text: `Suits ${OCCASION_LABEL[a.occasion!].toLowerCase()}` }); }
    if (feel) { score += 3; reasons.push({ kind: 'match', text: FEEL_REASON[a.feel!] }); }
    if (rec) { score += 2; reasons.push({ kind: 'match', text: `A good fit for ${RECIPIENT_LABEL[a.recipient!].toLowerCase().replace('myself', 'yourself')}` }); }
    const inBudget = p.pricePaise >= b.minPaise && p.pricePaise < b.maxPaise;
    if (inBudget) { score += 2; reasons.push({ kind: 'match', text: `${formatINR(p.pricePaise)}, within your budget` }); }
    else if (p.pricePaise < b.minPaise) { score += 1; reasons.push({ kind: 'partial', text: `${formatINR(p.pricePaise)}, under your budget` }); }
    else reasons.push({ kind: 'partial', text: `${formatINR(p.pricePaise)}, a little over your budget` });
    reasons.push({ kind: 'info', text: `${p.madeToOrder ? 'Made to order. Usually dispatched' : 'Usually dispatched'} within ${p.dispatchDays} days${!p.madeToOrder && p.stock <= 3 ? `. Only ${p.stock} left` : ''}` });
    pool.push({ productId: p.id, score, reasons, inBudget, dispatch: p.dispatchDays, price: p.pricePaise });
  }
  pool.sort((x, y) => y.score - x.score || Number(y.inBudget) - Number(x.inBudget) || x.dispatch - y.dispatch || Math.abs(x.price - mid) - Math.abs(y.price - mid));
  const strip = ({ productId, score, reasons }: Recommendation): Recommendation => ({ productId, score, reasons });
  const picks = pool.filter(x => x.score >= 5).slice(0, 6).map(strip);
  const nearMisses = picks.length ? [] : pool.filter(x => x.score < 5).slice(0, 3).map(strip);
  return { picks, nearMisses, hidden };
}
