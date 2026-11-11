import { describe, expect, it } from 'vitest';
import {
  splitSale, payoutDateFor, payoutSchedule, recommend, contributionMargin,
  breakEvenUnits, monthlyCapacity, revenuePotential, shippingFor,
  type Maker, type Product, type PayableOrder,
} from '../src/demo/domain';

const maker: Maker = { id: 'm', brand: 'Sample maker', published: true, gstRegistered: true, state: 'Delhi', trusted: true, approvedCount: 3 };
const product = (id: string, patch: Partial<Product> = {}): Product => ({
  id, makerId: 'm', name: 'Sample product', pricePaise: 200000, gstPct: 12, stock: 5,
  madeToOrder: false, dispatchDays: 2, status: 'live',
  feels: ['heart'], occasions: ['birthday'], recipients: ['friend'], ...patch,
});
const makers = new Map([['m', maker]]);
const answers = { recipient: 'friend', occasion: 'birthday', feel: 'heart', budget: 'b2' } as const;

describe('approved money rules, integer paise', () => {
  it('splits a registered maker sale using the supplied rates', () => {
    expect(splitSale(112000, 12, true)).toEqual({
      grossPaise: 112000, taxablePaise: 100000, gstPaise: 12000,
      commissionPaise: 12000, commissionGstPaise: 2160, tcsPaise: 500,
      paymentFeePaise: 2240, deductionsPaise: 16900, payoutPaise: 95100,
      netAfterGstPaise: 83100,
    });
  });
  it('does not charge product GST or TCS for unregistered makers', () => {
    const split = splitSale(100000, 18, false);
    expect(split.gstPaise).toBe(0);
    expect(split.tcsPaise).toBe(0);
    expect(split.payoutPaise).toBe(83840);
  });
  it('preserves gross = deductions + payout through rounding', () => {
    for (const amount of [0, 1, 12345, 180000, 350001]) {
      const split = splitSale(amount, 18, true);
      expect(split.payoutPaise + split.deductionsPaise).toBe(amount);
      expect(split.taxablePaise + split.gstPaise).toBe(amount);
      expect(Object.values(split).every(Number.isInteger)).toBe(true);
    }
  });
  it('rejects negative and nonfinite sale amounts', () => {
    for (const value of [-1, NaN, Infinity]) expect(() => splitSale(value, 12, true)).toThrow();
  });
  it('uses the source shipping threshold', () => {
    expect(shippingFor(249999, true)).toBe(12000);
    expect(shippingFor(250000, true)).toBe(0);
    expect(shippingFor(100, false)).toBe(0);
  });
});

describe('approved payout calendar', () => {
  it('closes seven days after delivery and uses Wednesday', () => {
    expect(payoutDateFor('2026-11-02', '2026-11-04')).toBe('2026-11-11');
  });
  it('allows Wednesday return-window maturity as defined by source', () => {
    expect(payoutDateFor('2026-11-04', '2026-11-05')).toBe('2026-11-11');
  });
  it('never schedules today or a past date', () => {
    expect(payoutDateFor('2026-10-01', '2026-11-11')).toBe('2026-11-18');
  });
  it('handles month and year boundaries', () => {
    expect(payoutDateFor('2026-12-28', '2026-12-29')).toBe('2027-01-06');
  });
  it('groups eligible delivered orders, excluding settled and undelivered', () => {
    const base: PayableOrder = { id: 'a', makerId: 'm', amountPaise: 112000, gstPct: 12, status: 'delivered', deliveredOn: '2026-11-02', settled: false };
    const schedule = payoutSchedule([base, { ...base, id: 'b' }, { ...base, id: 'c', settled: true }, { ...base, id: 'd', status: 'packed' }], true, '2026-11-04');
    expect(schedule.runs).toHaveLength(1);
    expect(schedule.runs[0].orderIds).toEqual(['a', 'b']);
    expect(schedule.runs[0].split.payoutPaise).toBe(190200);
  });
});

describe('explainable gift finder ranking', () => {
  it('scores occasion + feeling + recipient + budget, highest first', () => {
    const result = recommend([product('partial', { feels: [] }), product('best')], makers, answers, { needBy: 'any' });
    expect(result.picks.map(p => [p.productId, p.score])).toEqual([['best', 10], ['partial', 7]]);
    expect(result.picks[0].reasons.some(r => r.text.includes('budget'))).toBe(true);
  });
  it('never recommends on price or recipient alone', () => {
    expect(recommend([product('irrelevant', { feels: [], occasions: [] })], makers, answers, { needBy: 'any' }).picks).toEqual([]);
  });
  it('excludes stock, timing, budget, hidden makers and unpublished listings', () => {
    const result = recommend([
      product('stock', { stock: 0 }), product('late', { dispatchDays: 8 }),
      product('expensive', { pricePaise: 400000 }), product('draft', { status: 'draft' }),
      product('hidden', { makerId: 'hidden' }), product('eligible'),
    ], new Map([...makers, ['hidden', { ...maker, id: 'hidden', published: false }]]), answers, { needBy: 'd5' });
    expect(result.picks.map(p => p.productId)).toEqual(['eligible']);
    expect(result.hidden).toEqual({ outOfStock: 1, notInTime: 1, overBudget: 1, notDeliverable: 0 });
  });
  it('allows made-to-order stock and restricts unregistered interstate sales', () => {
    expect(recommend([product('custom', { stock: 0, madeToOrder: true })], makers, answers, { needBy: 'any' }).picks).toHaveLength(1);
    const result = recommend([product('local')], new Map([['m', { ...maker, gstRegistered: false }]]), answers, { needBy: 'any', buyerState: 'Goa' });
    expect(result.picks).toEqual([]);
    expect(result.hidden.notDeliverable).toBe(1);
  });
  it('breaks ties by faster dispatch before price distance', () => {
    const result = recommend([product('slow', { dispatchDays: 4 }), product('fast', { dispatchDays: 1 })], makers, answers, { needBy: 'any' });
    expect(result.picks.map(p => p.productId)).toEqual(['fast', 'slow']);
  });
  it('limits picks to six and gives near misses only when no picks', () => {
    expect(recommend(Array.from({ length: 10 }, (_, i) => product(String(i))), makers, answers, { needBy: 'any' }).picks).toHaveLength(6);
    const result = recommend([product('near', { occasions: [], recipients: [], pricePaise: 100000 })], makers, answers, { needBy: 'any' });
    expect(result.picks).toHaveLength(0);
    expect(result.nearMisses[0].score).toBe(4);
  });
});

describe('Growth Studio uses source maths', () => {
  it('computes contribution after GST, deductions, materials, packaging and shipping', () => {
    const result = contributionMargin({ pricePaise: 112000, gstPct: 12, gstRegistered: true, materialsPaise: 20000, packagingPaise: 5000, shippingPaise: 10000 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.leftPerSalePaise).toBe(48100);
  });
  it('handles impossible break-even and invalid capacity', () => {
    expect(breakEvenUnits(100000, -1)).toEqual({ ok: true, value: null });
    expect(breakEvenUnits(100000, 30000)).toEqual({ ok: true, value: 4 });
    expect(monthlyCapacity(0, 40, 1).ok).toBe(false);
    expect(monthlyCapacity(2, 40, 1)).toEqual({ ok: true, value: 86 });
  });
  it('caps sales at capacity or demand, whichever is lower', () => {
    expect(revenuePotential(40, 100, 10000, 5000, 10000)).toEqual({ units: 40, revenueBeforeGstPaise: 400000, profitPaise: 190000 });
  });
});
