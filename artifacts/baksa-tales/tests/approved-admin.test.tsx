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
    let { root, ctx } = await mountAdminOrders();
    const btn = root.querySelector<HTMLButtonElement>('[data-testid^="button-mark-paid-"]')!;
    expect(btn).toBeTruthy();
    const makerId = btn.getAttribute('data-testid')!.replace('button-mark-paid-', '');
    btn.click();
    let paid = root.querySelector<HTMLButtonElement>(`[data-testid="status-paid-${makerId}"]`);
    expect(paid?.disabled).toBe(true);
    expect(paid?.textContent).toBe('Paid');
    ctx.cleanups.forEach(f => f());

    // simulate a page reload: fresh modules, state comes back from localStorage
    vi.resetModules();
    ({ root, ctx } = await mountAdminOrders());
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
