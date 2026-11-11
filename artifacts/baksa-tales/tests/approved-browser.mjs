import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const base = process.env.APP_URL || 'http://localhost:80';
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const results = [];
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && m.text().includes('hydrate failed')) errors.push(m.text()); });
const t = id => page.getByTestId(id);
async function reset(route = '/') {
  await page.goto(base);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(base + route);
}
async function run(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push({ name, passed: false, error: e.message });
    console.log(`FAIL ${name}: ${e.message.slice(0, 1000)}`);
  }
}
try {
  await run('Header navigation and home header counts', async () => {
    await reset();
    await expect(t('button-bag')).toBeVisible();
    await expect(t('text-bag-count')).toHaveText('2');
    const destinations = [
      ['Gift finder', '/finder'], ['The BT Edit', '/shop'], ['Makers', '/makers/tathaastu'],
      ['Corporate gifting', '/corporate'], ['Academy', '/academy'],
    ];
    for (const [label, path] of destinations) {
      await page.goto(base);
      await page.locator('header nav').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(base + path);
    }
  });
  await run('Mobile navigation opens and selects a page at 390px', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await reset();
    await t('button-mobile-menu').click();
    await expect(t('button-mobile-menu')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('header nav').getByRole('link', { name: 'The BT Edit', exact: true }).click();
    await expect(page).toHaveURL(base + '/shop');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await run('Product thumbnails, quantity, bag and wishlist', async () => {
    await reset('/product/blue-lotus-pond');
    const first = await t('img-product-main').getAttribute('src');
    await t('button-photo-2').click();
    await expect(t('img-product-main')).not.toHaveAttribute('src', first);
    await t('button-qty-plus').click();
    await expect(t('text-qty')).toHaveText('2');
    await t('button-save-wishlist').click();
    await expect(t('text-wishlist-count')).toHaveText('2');
    await t('button-add-to-bag').click();
    await expect(t('bag-drawer')).toBeVisible();
    await expect(t('text-bag-qty-t-bluelotus')).toHaveText('3');
    await t('button-bag-minus-t-bluelotus').click();
    await expect(t('text-bag-qty-t-bluelotus')).toHaveText('2');
    await t('button-bag-remove-t-bluelotus').click();
    await expect(t('row-bag-t-bluelotus')).toHaveCount(0);
    await t('button-close-bag').click();
    await page.reload();
    await expect(t('text-bag-count')).toHaveText('1');
    await expect(t('text-wishlist-count')).toHaveText('2');
  });
  await run('Gift finder four questions, back, progress, ranked results', async () => {
    await reset('/finder');
    await expect(t('text-question-count')).toHaveText('Question 1 of 4');
    await t('button-option-friend').click();
    await expect(t('text-question-count')).toHaveText('Question 2 of 4');
    await t('button-finder-back').click();
    await expect(t('text-question-count')).toHaveText('Question 1 of 4');
    await t('button-option-partner').click();
    await t('button-option-birthday').click();
    await t('button-option-heart').click();
    await t('button-option-b2').click();
    await expect(page).toHaveURL(base + '/results');
    await expect(page.locator('[data-testid^="card-result-"]').first()).toBeVisible();
  });
  await run('Finder skip leads to results', async () => {
    await reset('/finder');
    await t('link-skip-finder').click();
    await expect(page).toHaveURL(base + '/results');
  });
  await run('Sample checkout sign-in, address, payment, thank-you and reload', async () => {
    await reset('/checkout');
    await expect(page.locator('aside[aria-label="Order summary"] img')).toHaveCount(2);
    await t('input-phone').fill('1234567890');
    await t('button-send-code').click();
    await t('input-code').fill('0000');
    await t('button-verify-code').click();
    await expect(t('checkout-step-address')).toBeVisible();
    await t('input-address-house').fill('');
    await t('button-deliver-here').click();
    await expect(t('error-address-house')).toBeVisible();
    await t('input-address-house').fill('Sample 12');
    await t('button-deliver-here').click();
    await expect(t('checkout-step-payment')).toBeVisible();
    await t('button-pay').click();
    await expect(t('checkout-step-done')).toBeVisible();
    await expect(t('text-order-ref')).toContainText('BT-');
    await page.reload();
    await expect(t('checkout-step-done')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('baksa-approved-demo-v1')).bag.length)).toBe(0);
  });
  await run('Shop price and maker filters with sort', async () => {
    await reset('/shop');
    await t('select-price').selectOption('under1500');
    await t('select-maker').selectOption('Tathaastu');
    await t('select-sort').selectOption('priceAsc');
    const prices = await page.locator('[data-testid^="text-price-"]').allTextContents();
    const values = prices.map(p => Number(p.replace(/[^\d]/g, '')));
    expect(values.length).toBeGreaterThan(0);
    expect(values.every(p => p < 1500)).toBe(true);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
  await run('Admin approval is disabled until all five checks pass', async () => {
    await reset('/admin/reviews');
    await expect(t('button-approve')).toBeDisabled();
    for (let i = 1; i <= 5; i++) await t(`checkbox-gate-${i}`).check();
    await expect(t('button-approve')).toBeEnabled();
    await t('button-approve').click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('baksa-approved-demo-v1')));
    expect(stored.products.find(p => p.id === 'mu-radiant').status).toBe('live');
  });
  await run('Maker sidebars navigate and stock edits persist', async () => {
    await reset('/maker');
    await page.locator('aside nav a[data-route="/maker/products"]').click();
    await expect(page).toHaveURL(base + '/maker/products');
    await t('input-stock-t-bluelotus').fill('9');
    await t('input-stock-t-bluelotus').blur();
    await page.reload();
    await expect(t('input-stock-t-bluelotus')).toHaveValue('9');
    await page.locator('aside nav a[data-route="/maker/courses"]').click();
    await expect(page).toHaveURL(base + '/maker/courses');
    await expect(page.getByRole('heading', { name: 'My courses', exact: true })).toBeVisible();
  });
  await run('Academy recorded and live tabs filter classes', async () => {
    await reset('/academy');
    await t('tab-recorded').click();
    const recorded = await page.locator('[data-testid^="card-course-"]:visible').allTextContents();
    expect(recorded.length).toBeGreaterThan(0);
    expect(recorded.every(s => s.includes('Recorded'))).toBe(true);
    await t('tab-live').click();
    const live = await page.locator('[data-testid^="card-course-"]:visible').allTextContents();
    expect(live.length).toBeGreaterThan(0);
    expect(live.every(s => s.includes('Live'))).toBe(true);
  });
  await run('Maker order requires tracking, advances and persists delivery', async () => {
    await reset('/maker/orders');
    await t('button-pack-BT-1047').click();
    await t('button-dispatch-BT-1047').click();
    await expect(t('error-dispatch-BT-1047')).toBeVisible();
    await t('select-courier-BT-1047').selectOption({ index: 1 });
    await t('input-tracking-BT-1047').fill('DEMO123456');
    await t('button-dispatch-BT-1047').click();
    await t('button-deliver-BT-1047').click();
    await page.reload();
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('baksa-approved-demo-v1')));
    expect(state.orders.find(o => o.id === 'BT-1047').status).toBe('delivered');
  });
  await run('Corporate brief validation and confirmation', async () => {
    await reset('/corporate');
    await t('input-brief-name').fill('');
    await t('button-send-brief').click();
    await expect(t('error-brief-name')).toBeVisible();
    await t('input-brief-qty').fill('20');
    await t('input-brief-budget').fill('1500');
    await t('input-brief-neededBy').fill('2027-01-01');
    await t('input-brief-name').fill('Sample customer');
    await t('input-brief-company').fill('Sample company');
    await t('input-brief-contact').fill('demo@example.test');
    await t('button-send-brief').click();
    await expect(t('brief-confirmation')).toBeVisible();
  });
  await run('Admin payout remains paid after reload', async () => {
    await reset('/admin/orders');
    await t('button-mark-paid-m1').click();
    await page.reload();
    await expect(t('status-paid-m1')).toHaveText('Paid');
  });
  await run('Admin maker matching and quote save', async () => {
    await reset('/admin/enquiries');
    await t('checkbox-match-m1').check();
    await t('button-send-matched').click();
    await expect(t('text-send-status')).toBeVisible();
    await t('input-quote').fill('84000');
    await t('button-record-quote').click();
    await expect(t('text-quote-status')).toContainText('84,000');
    await page.reload();
    await expect(t('select-stage-BT-CG-0012')).toHaveValue('quote');
  });
  await run('Growth Studio recomputes results when price changes', async () => {
    await reset('/maker/growth');
    const before = await t('text-left-per-sale').textContent();
    await t('input-growth-price').fill('3000');
    await t('input-growth-price').blur();
    await expect(t('text-left-per-sale')).not.toHaveText(before);
  });
  await run('Footer policy placeholders explain unavailable services', async () => {
    await reset('/shop');
    await page.locator('footer').getByRole('link', { name: 'Shipping and returns' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('do not include a confirmed');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  });
  await run('Reset demo restores sample bag and wishlist', async () => {
    await reset('/shop');
    await t('button-bag').click();
    await t('button-bag-remove-t-bluelotus').click();
    await t('button-close-bag').click();
    page.once('dialog', d => d.accept());
    await t('button-reset-demo').click();
    await expect(t('text-bag-count')).toHaveText('2');
    await expect(t('text-wishlist-count')).toHaveText('1');
  });
  await run('No browser exceptions or hydration errors', async () => {
    expect(errors).toEqual([]);
  });
} finally {
  await browser.close();
}
await mkdir('generated-artifacts', { recursive: true });
await writeFile('generated-artifacts/approved-browser-results.json', JSON.stringify(results, null, 2));
console.log(`\n${results.filter(r => r.passed).length}/${results.length} browser checks passed`);
if (results.some(r => !r.passed)) process.exitCode = 1;
