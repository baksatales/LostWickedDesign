import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Browser fixtures only: no hosted login, database write, payment or auth bypass
// exists in application code. Server/RLS checks run in the separate API/SQL suites.
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const base = process.env.APP_URL || 'http://localhost:80';
const results = [];
const errors = [];
const uid = '20000000-0000-4000-8000-000000000001';
const row = {
  id: uid, ref: 'TEST-ORDER-1', status: 'new', paymentStatus: 'paid', totalPaise: 10000,
  createdAt: '2026-11-12T00:00:00Z', trackingNumber: '', carrier: '', productName: 'Fixture piece',
  quantity: 1, giftNote: 'A private fixture note', deliveryName: 'Test recipient', deliveryAddress: 'Fixture address', deliveryPhone: '',
};
const runtime = auth => ({ database: auth, auth, payments: false, ai: false, supabaseUrl: auth ? 'https://sales-fixture.supabase.co' : '', supabaseAnonKey: auth ? 'sb_publishable_fixture' : '', message: 'Isolated browser fixture' });
async function fixtures(context, signedIn = false, role = 'admin') {
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let json;
    if (path === '/api/runtime') json = runtime(signedIn);
    else if (path === '/api/site') json = { configured: false, revision: 0, document: null };
    else if (path === '/api/catalog') json = { sample: true, products: [], makers: [] };
    else if (path === '/api/workspace') json = { userId: uid, email: 'fixture@example.invalid', roles: [role], products: [], ordersCount: 1, applicationsCount: 0, briefsCount: 0 };
    else if (path === '/api/sales/readiness') json = { checkoutEnabled: false, developmentAuthorized: false, schemaReady: false, approvedProducts: 0, provider: 'not_connected', blockers: ['Authorize the development project.', 'Connect a payment provider.'] };
    else if (path === '/api/sales/operator/orders') json = { environment: 'development', orders: [row] };
    else if (path === `/api/sales/operator/orders/${uid}` && route.request().method() === 'PATCH') {
      const data = route.request().postDataJSON();
      Object.assign(row, { status: data.status, carrier: data.carrier, trackingNumber: data.trackingNumber });
      json = { id: uid, message: 'Fulfilment saved in the isolated browser fixture. No courier booking.' };
    } else return route.fulfill({ status: 503, json: { error: 'No service connected in this browser fixture.' } });
    return route.fulfill({ json });
  });
  await context.route('https://sales-fixture.supabase.co/**', route => route.fulfill({ status: 200, json: { id: uid, email: 'fixture@example.invalid', email_confirmed_at: '2026-11-12T00:00:00Z' } }));
  if (signedIn) await context.addInitScript(({ uid }) => {
    localStorage.setItem('sb-sales-fixture-auth-token', JSON.stringify({
      access_token: 'fixture.payload.signature', refresh_token: 'fixture-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer',
      user: { id: uid, email: 'fixture@example.invalid', email_confirmed_at: '2026-11-12T00:00:00Z', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-11-12T00:00:00Z' },
    }));
  }, { uid });
}
async function check(name, fn) {
  try { await fn(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}
try {
  const guest = await browser.newContext();
  await fixtures(guest);
  const p = await guest.newPage(); p.on('pageerror', e => errors.push(e.message));
  await check('Real launch and operations routes never accept the sample dashboard login', async () => {
    for (const path of ['/admin/launch', '/admin/operations']) {
      await p.goto(base + path);
      await expect(p.getByRole('heading', { name: 'Access is not connected.' })).toBeVisible();
      await expect(p.getByRole('button', { name: 'Continue to sample workspace' })).toHaveCount(0);
    }
  });
  const signed = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await fixtures(signed, true);
  const page = await signed.newPage(); page.on('pageerror', e => errors.push(e.message));
  await check('Operator can navigate between launch checks and real-account order operations', async () => {
    await page.goto(base + '/admin/launch');
    await expect(page.getByTestId('sales-launch-checks')).toBeVisible();
    await expect(page.getByText('Real checkout is disabled.', { exact: false })).toBeVisible();
    await page.getByRole('link', { name: 'Development orders', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/operations$/);
    await expect(page.getByTestId('sales-order')).toBeVisible();
    await expect(page.getByText('A private fixture note', { exact: false })).toBeVisible();
  });
  await check('Search and server-confirmed packing/dispatch update the visible order', async () => {
    const search = page.getByRole('searchbox', { name: 'Find an order' });
    await search.fill('not-present'); await expect(page.getByRole('heading', { name: 'No matching order.' })).toBeVisible();
    await search.fill('TEST-ORDER-1');
    await page.getByRole('button', { name: 'Save fulfilment update' }).click();
    await expect(page.getByText('TEST-ORDER-1 · packed')).toBeVisible();
    await page.getByLabel('Next step', { exact: true }).selectOption('dispatched');
    await page.getByLabel('Courier', { exact: true }).fill('Manual courier');
    await page.getByLabel('Tracking number', { exact: true }).fill('TEST-TRACK');
    await page.getByRole('button', { name: 'Save fulfilment update' }).click();
    await expect(page.getByText('TEST-ORDER-1 · dispatched')).toBeVisible();
    await page.reload(); await expect(page.getByText('TEST-ORDER-1 · dispatched')).toBeVisible();
    await expect(page.getByText('not a courier scan or a payout', { exact: false })).toBeVisible();
  });
  await check('Development operations work at 390px without horizontal page overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + '/admin/operations'); await expect(page.getByTestId('sales-order')).toBeVisible();
    const overflowing = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 10).map(el => `${el.tagName}.${el.className}`));
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) console.log('Overflowing:', overflowing);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
  const buyer = await browser.newContext();
  await fixtures(buyer, true, 'buyer');
  const b = await buyer.newPage();
  await check('Buyer workspace role cannot render the operator controls', async () => {
    await b.goto(base + '/admin/operations');
    await expect(b.getByRole('heading', { name: 'This workspace is not available to this account.' })).toBeVisible();
    await expect(b.getByTestId('sales-order')).toHaveCount(0);
  });
  await check('The V5 homepage remains the public homepage', async () => {
    await p.goto(base + '/'); await expect(p.getByTestId('page-home-v5')).toBeVisible();
    await expect(p.getByTestId('mood-heart')).toHaveAttribute('aria-pressed', 'true');
    await expect(p.getByTestId('sales-launch-checks')).toHaveCount(0);
  });
} finally {
  await browser.close();
  await mkdir('generated-artifacts/sales-mvp', { recursive: true });
  await writeFile('generated-artifacts/sales-mvp/browser-results.json', JSON.stringify({ results, errors }, null, 2));
}
if (results.some(r => !r.passed) || errors.length) process.exitCode = 1;
