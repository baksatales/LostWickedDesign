import { beforeEach, describe, expect, it, vi } from 'vitest';

async function mountAdminOrders() {
  const { prepareTemplate } = await import('../src/demo/templates');
  const { hydrateAdminOrders } = await import('../src/demo/pages/admin');
  document.body.innerHTML = '';
  const root = document.createElement('div');
  document.body.appendChild(root);
  root.innerHTML = prepareTemplate('AdminOrders');
  const ctx = { root, navigate: () => {}, params: {}, path: '/admin/orders', search: new URLSearchParams(), cleanups: [] as (() => void)[] };
  hydrateAdminOrders(ctx);
  return { root, ctx };
}

describe('admin payout "Mark as paid"', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it('pure helper records a durable paid run and settles its orders', async () => {
    const { createSeedState, adminPayoutRuns, markPayoutPaid, paidPayouts } = await import('../src/demo/store');
    const s = createSeedState();
    const run = adminPayoutRuns(s)[0];
    expect(run).toBeTruthy();
    const n = markPayoutPaid(s, run.orderIds);
    expect(paidPayouts(n)).toHaveLength(1);
    expect(paidPayouts(n)[0]).toMatchObject({ makerId: run.makerId, payoutPaise: run.payoutPaise, orderIds: run.orderIds });
    expect(n.orders.filter(o => run.orderIds.includes(o.id)).every(o => o.settled)).toBe(true);
    expect(adminPayoutRuns(n).some(r => r.makerId === run.makerId && r.date === run.date)).toBe(false);
    // idempotent
    expect(paidPayouts(markPayoutPaid(n, run.orderIds))).toHaveLength(1);
  });

  it('paid row stays visible as Paid after a reload', async () => {
    const sampleSessionKey = 'baksa-sample-account-session';
    localStorage.setItem(sampleSessionKey, 'admin-test-session');
    const run = {
      makerId: 'tathaastu', makerBrand: 'Tathaastu', date: '2026-11-09T00:00:00.000Z',
      orderIds: ['BT-test-001'], split: { grossPaise: 100000, payoutPaise: 88000 },
    };
    let payouts = { sample: true, runs: [run], paidRuns: [] as Array<{
      makerId: string; makerBrand: string; date: string; orderIds: string[]; grossPaise: number; payoutPaise: number; paidOn: string;
    }> };
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/sample/admin/orders')) return new Response(JSON.stringify({ sample: true, orders: [] }), { status: 200 });
      if (url.endsWith('/sample/admin/payouts') && !init?.method) return new Response(JSON.stringify(payouts), { status: 200 });
      if (url.includes('/sample/admin/payouts/') && init?.method === 'POST') {
        payouts = { sample: true, runs: [], paidRuns: [{ makerId: run.makerId, makerBrand: run.makerBrand, date: run.date, orderIds: run.orderIds, grossPaise: run.split.grossPaise, payoutPaise: run.split.payoutPaise, paidOn: '2026-11-12T00:00:00.000Z' }] };
        return new Response(JSON.stringify({ paidRun: payouts.paidRuns[0] }), { status: 201 });
      }
      throw new Error(`Unexpected sample request: ${url}`);
    }));
    let { root, ctx } = await mountAdminOrders();
    await vi.waitFor(() => expect(root.querySelector('[data-testid^="button-mark-paid-"]')).toBeTruthy());
    const btn = root.querySelector<HTMLButtonElement>('[data-testid^="button-mark-paid-"]')!;
    const makerId = btn.getAttribute('data-testid')!.replace('button-mark-paid-', '');
    btn.click();
    await vi.waitFor(() => expect(root.querySelector(`[data-testid="status-paid-${makerId}"]`)?.textContent).toBe('Paid'));
    let paid = root.querySelector<HTMLButtonElement>(`[data-testid="status-paid-${makerId}"]`);
    expect(paid?.disabled).toBe(true);
    expect(paid?.textContent).toBe('Paid');
    ctx.cleanups.forEach(f => f());

    // simulate a page reload: fresh modules, state comes back from localStorage
    vi.resetModules();
    ({ root, ctx } = await mountAdminOrders());
    await vi.waitFor(() => expect(root.querySelector(`[data-testid="status-paid-${makerId}"]`)).toBeTruthy());
    paid = root.querySelector<HTMLButtonElement>(`[data-testid="status-paid-${makerId}"]`);
    expect(paid?.textContent).toBe('Paid');
    expect(paid?.disabled).toBe(true);
    expect(root.querySelector(`[data-testid="row-payout-${makerId}-paid"]`)?.getAttribute('data-paid')).toBe('true');
    expect(root.querySelector(`[data-testid="button-mark-paid-${makerId}"]`)).toBeNull();
    ctx.cleanups.forEach(f => f());
  });

  it('reviews hydrate without errors and Approve enables only after all five checks', async () => {
    const { prepareTemplate } = await import('../src/demo/templates');
    const { hydrateAdminReviews } = await import('../src/demo/pages/admin');
    const root = document.createElement('div'); document.body.replaceChildren(root);
    root.innerHTML = prepareTemplate('AdminReviews');
    const ctx = { root, navigate: () => {}, params: {}, path: '/admin/reviews', search: new URLSearchParams(), cleanups: [] as (() => void)[] };
    expect(() => hydrateAdminReviews(ctx)).not.toThrow();
    const q = (id: string) => root.querySelector<HTMLInputElement & HTMLButtonElement>(`[data-testid="${id}"]`)!;
    expect(q('text-review-name').textContent).toBe('Radiant Awakening Room Mist');
    expect(q('button-approve').disabled).toBe(true);
    for (let i = 1; i <= 5; i++) if (!q(`checkbox-gate-${i}`).checked) q(`checkbox-gate-${i}`).click();
    expect(q('button-approve').disabled).toBe(false);
    q('button-approve').click();
    expect(q('text-approve-hint').textContent).toBe('Radiant Awakening Room Mist is live.');
    expect(q('text-review-name').textContent).toBe('Svara Nimisha');
    ctx.cleanups.forEach(f => f());
  });
});
