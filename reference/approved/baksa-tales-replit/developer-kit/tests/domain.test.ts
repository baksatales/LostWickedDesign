import { describe, it, expect } from 'vitest';
import {
  splitSale, sumSplits, shippingFor, contributionMargin, breakEvenUnits, monthlyCapacity,
  payoutDateFor, payoutSchedule, canDeliver, stateFromPincode, listingDecision, recommend,
  DEFAULT_SETTINGS as S, type Product, type Maker,
} from '../src/lib/domain';

describe('splitSale', () => {
  it('works out a ₹2,400 sale at 18% GST for a registered maker', () => {
    const x = splitSale(240000, 18, true);
    expect(x.taxablePaise).toBe(203390);
    expect(x.gstPaise).toBe(36610);
    expect(x.commissionPaise).toBe(24407);
    expect(x.commissionGstPaise).toBe(4393);
    expect(x.tcsPaise).toBe(1017);
    expect(x.paymentFeePaise).toBe(4800);
    expect(x.payoutPaise).toBe(240000 - 24407 - 4393 - 1017 - 4800);
    expect(x.netAfterGstPaise).toBe(x.payoutPaise - x.gstPaise);
  });
  it('adds no GST and no TCS for an unregistered maker', () => {
    const x = splitSale(100000, 18, false);
    expect(x.gstPaise).toBe(0);
    expect(x.tcsPaise).toBe(0);
    expect(x.taxablePaise).toBe(100000);
  });
  it('always balances: payout + deductions = gross', () => {
    for (const g of [0, 5, 18]) for (const p of [0, 1, 99, 55555, 1234567]) {
      const x = splitSale(p, g, true);
      expect(x.payoutPaise + x.deductionsPaise).toBe(x.grossPaise);
      expect(x.taxablePaise + x.gstPaise).toBe(x.grossPaise);
    }
  });
  it('rejects negative or invalid amounts', () => {
    expect(() => splitSale(-1, 18, true)).toThrow();
    expect(() => splitSale(Number.NaN, 18, true)).toThrow();
  });
  it('sums splits', () => {
    const t = sumSplits([splitSale(100000, 18, true), splitSale(50000, 5, true)]);
    expect(t.grossPaise).toBe(150000);
  });
});

describe('shipping', () => {
  it('is free over the threshold and zero for classes only', () => {
    expect(shippingFor(250000, true)).toBe(0);
    expect(shippingFor(249999, true)).toBe(S.shippingFeePaise);
    expect(shippingFor(100000, false)).toBe(0);
  });
});

describe('calculators', () => {
  it('flags invalid input instead of returning nonsense', () => {
    expect(contributionMargin({ pricePaise: 0, gstPct: 18, gstRegistered: true, materialsPaise: 0, packagingPaise: 0, shippingPaise: 0 }).ok).toBe(false);
    expect(contributionMargin({ pricePaise: 1000, gstPct: 18, gstRegistered: true, materialsPaise: -5, packagingPaise: 0, shippingPaise: 0 }).ok).toBe(false);
  });
  it('rates margin health', () => {
    const r = contributionMargin({ pricePaise: 240000, gstPct: 18, gstRegistered: true, materialsPaise: 52000, packagingPaise: 12000, shippingPaise: 12000 });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value.health).toBe('healthy'); expect(r.value.leftPerSalePaise).toBeGreaterThan(0); }
  });
  it('break-even is impossible when each sale loses money', () => {
    const r = breakEvenUnits(3000000, -100);
    expect(r.ok && r.value).toBe(null);
  });
  it('capacity needs hours above zero', () => {
    expect(monthlyCapacity(0, 40, 2).ok).toBe(false);
    const c = monthlyCapacity(5, 40, 2);
    expect(c.ok && c.value).toBe(69);
  });
});

describe('payouts', () => {
  const today = '2026-11-04'; // a Wednesday
  it('pays on the first Wednesday after the return window, and never today or earlier', () => {
    expect(payoutDateFor('2026-10-28', today)).toBe('2026-11-11');
    expect(payoutDateFor('2026-11-04', today)).toBe('2026-11-11');
    expect(payoutDateFor('2026-11-06', today)).toBe('2026-11-18');
  });
  it('groups unsettled delivered orders into runs', () => {
    const s = payoutSchedule([
      { id: 'a', makerId: 'm', amountPaise: 100000, gstPct: 18, status: 'delivered', deliveredOn: '2026-10-28', settled: false },
      { id: 'b', makerId: 'm', amountPaise: 100000, gstPct: 18, status: 'delivered', deliveredOn: '2026-11-06', settled: false },
      { id: 'c', makerId: 'm', amountPaise: 100000, gstPct: 18, status: 'delivered', deliveredOn: '2026-10-20', settled: true },
      { id: 'd', makerId: 'm', amountPaise: 100000, gstPct: 18, status: 'dispatched', deliveredOn: null, settled: false },
    ], true, today);
    expect(s.nextRunDate).toBe('2026-11-11');
    expect(s.runs.map(r => [r.date, r.orderIds])).toEqual([['2026-11-11', ['a']], ['2026-11-18', ['b']]]);
  });
});

describe('delivery', () => {
  it('limits unregistered makers to their own state', () => {
    expect(canDeliver({ gstRegistered: false, state: 'Delhi' }, 'Maharashtra')).toBe(false);
    expect(canDeliver({ gstRegistered: false, state: 'Delhi' }, 'Delhi')).toBe(true);
    expect(canDeliver({ gstRegistered: true, state: 'Delhi' }, 'Maharashtra')).toBe(true);
    expect(canDeliver({ gstRegistered: false, state: 'Delhi' }, null)).toBe(true);
  });
  it('reads a state from a PIN code (prototype lookup)', () => {
    expect(stateFromPincode('110010')).toBe('Delhi');
    expect(stateFromPincode('400001')).toBe('Maharashtra');
    expect(stateFromPincode('12345')).toBe(null);
  });
});

describe('listing approval', () => {
  it('reviews new makers, unusual prices and resubmissions; trusted makers publish', () => {
    expect(listingDecision({ trusted: false, approvedCount: 1 }, 100000, 200000, false).status).toBe('review');
    expect(listingDecision({ trusted: true, approvedCount: 5 }, 500000, 200000, false).status).toBe('review');
    expect(listingDecision({ trusted: true, approvedCount: 5 }, 100000, 200000, true).status).toBe('review');
    const ok = listingDecision({ trusted: true, approvedCount: 5 }, 150000, 200000, false);
    expect(ok).toEqual({ status: 'live', reason: null, spotCheck: true });
  });
});

describe('gift finder', () => {
  const makers = new Map<string, Maker>([
    ['m1', { id: 'm1', brand: 'A', gstRegistered: false, state: 'Delhi', trusted: true, approvedCount: 3, published: true }],
    ['m2', { id: 'm2', brand: 'B', gstRegistered: true, state: null, trusted: true, approvedCount: 3, published: true }],
  ]);
  const base: Omit<Product, 'id' | 'makerId'> = { name: 'x', pricePaise: 200000, gstPct: 18, stock: 5, madeToOrder: false, dispatchDays: 2, status: 'live', feels: ['heart'], occasions: ['birthday'], recipients: ['partner'] };
  const products: Product[] = [
    { ...base, id: 'p1', makerId: 'm1' },
    { ...base, id: 'p2', makerId: 'm2', dispatchDays: 6 },
    { ...base, id: 'p3', makerId: 'm2', stock: 0 },
    { ...base, id: 'p4', makerId: 'm2', pricePaise: 900000 },
    { ...base, id: 'p5', makerId: 'm2', feels: ['explorer'], occasions: ['wedding'] },
  ];
  it('explains each pick and hides what can’t work', () => {
    const r = recommend(products, makers, { recipient: 'partner', occasion: 'birthday', feel: 'heart', budget: 'b2' }, { needBy: 'd5', buyerState: 'Maharashtra' });
    expect(r.picks.map(p => p.productId)).toEqual([]);
    expect(r.hidden).toEqual({ notInTime: 1, notDeliverable: 1, outOfStock: 1, overBudget: 1 });
    const r2 = recommend(products, makers, { recipient: 'partner', occasion: 'birthday', feel: 'heart', budget: 'b2' }, { needBy: 'any', buyerState: 'Delhi' });
    expect(r2.picks.map(p => p.productId)).toEqual(['p1', 'p2']);
    expect(r2.picks[0].reasons.some(x => x.kind === 'info')).toBe(true);
  });
  it('never recommends on budget alone', () => {
    const r = recommend(products, makers, { budget: 'b2' }, { needBy: 'any' });
    expect(r.picks).toEqual([]);
    expect(r.nearMisses).toEqual([]);
  });
});
