import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const base = process.env.APP_URL || 'http://localhost:80';
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const results = [];
const errors = [];
const sampleTokens = new Map();
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && m.text().includes('hydrate failed')) errors.push(m.text()); });
const t = id => page.getByTestId(id);
async function reset(route = '/') {
  await page.goto(base);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  if (route.startsWith('/maker') || route.startsWith('/admin')) {
    const identity = route.startsWith('/admin') ? 'admin' : 'maker';
    const token = await getSampleToken(identity);
    await page.evaluate(value => {
      localStorage.setItem('baksa-sample-account-session', value);
    }, token);
  }
  await page.goto(base + route);
}
async function getSampleToken(identity) {
  if (sampleTokens.has(identity)) return sampleTokens.get(identity);
  await page.goto(base);
  const token = await page.evaluate(async key => {
      const response = await fetch('/api/sample/session', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identity: key, mobileNumber: '9876543210', simulationCode: '246810' }),
      });
      if (!response.ok) throw new Error(`Could not start sample ${key} session.`);
      const session = await response.json();
      return session.token;
    }, identity);
  sampleTokens.set(identity, token);
  return token;
}
async function resetServerSampleData() {
  await page.goto(base);
  const token = await getSampleToken('admin');
  await page.evaluate(async value => {
    const reset = await fetch('/api/sample/reset', { method: 'POST', headers: { authorization: `Bearer ${value}` } });
    if (!reset.ok) throw new Error('Could not reset server sample data.');
    localStorage.clear();
  }, token);
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
    await expect(t('link-shopper-sign-in')).toBeVisible();
    await expect(page.locator('footer')).toHaveCount(1);
    await expect(page.locator('header nav').getByRole('link', { name: 'Ask Bea', exact: true })).toHaveCount(0);
    await t('link-shopper-sign-in').click();
    await expect(page).toHaveURL(base + '/account');
    await expect(page.locator('footer.bt-showcase-footer')).toHaveCount(1);
    await reset('/');
    await t('button-open-bea').click();
    await expect(t('bea-popover')).toBeVisible();
    await t('button-close-bea').click();
    const destinations = [
      ['Shop gifts', '/shop'], ['Our makers', '/makers/tathaastu'], ['For teams', '/corporate'],
    ];
    for (const [label, path] of destinations) {
      await page.goto(base);
      await page.locator('header nav').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(base + path);
    }
  });
  await run('Corporate packaging gallery and local site editor are available', async () => {
    await reset('/corporate');
    await expect(t('corporate-packaging-gallery')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Keepsake packaging with Pop Bani' })).toBeVisible();
    await expect(page.getByTestId(/^packaging-card-/)).toHaveCount(5);
    const images = await page.locator('[data-testid^="packaging-image-"]').evaluateAll(async nodes => Promise.all(nodes.map(async image => {
      image.loading = 'eager';
      try { await image.decode(); } catch { /* report load state below */ }
      return image.naturalWidth > 0;
    })));
    expect(images).toEqual([true, true, true, true, true]);
    await expect(page.locator('footer.bt-showcase-footer')).toHaveCount(1);
    await reset('/studio-preview');
    await expect(page.getByRole('tablist', { name: 'Site Studio sections' })).toBeVisible();
    await page.getByRole('tab', { name: 'Brand' }).click();
    await page.getByLabel('Brand name').fill('Preview Basket');
    await page.getByRole('tab', { name: 'Look & feel' }).click();
    const primaryColor = page.locator('.studio-colors label').filter({ hasText: 'primary' }).locator('input[type="color"]');
    await primaryColor.fill('#226b63');
    await page.goto(base + '/corporate');
    await expect(page.locator('[data-testid="site-header"]')).toContainText('Preview Basket');
    const appliedPrimary = await page.locator('.bt-site-theme').first().evaluate(element => getComputedStyle(element).getPropertyValue('--site-primary').trim().toLowerCase());
    expect(appliedPrimary).toBe('#226b63');
  });
  await run('Mobile navigation opens and selects a page at 390px', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await reset();
    await t('button-mobile-menu').click();
    await expect(t('button-mobile-menu')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('header nav').getByRole('link', { name: 'Shop gifts', exact: true }).click();
    await expect(page).toHaveURL(base + '/shop');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await run('Homepage mood, search, wishlist and signup controls', async () => {
    await reset('/');
    const homepageImages = await page.locator('.h5').evaluate(async root => {
      const images = Array.from(root.querySelectorAll('img'));
      const results = await Promise.all(images.map(async image => {
        image.loading = 'eager';
        try { await image.decode(); } catch { /* the result below reports a missing image */ }
        return { src: image.getAttribute('src'), loaded: image.naturalWidth > 0 };
      }));
      return {
        results,
        corporateImage: root.querySelector('[data-testid="row-way-3"]') ? 1 : 0,
      };
    });
    expect(homepageImages.results.length).toBeGreaterThan(0);
    expect(homepageImages.results.filter(image => !image.loaded)).toEqual([]);
    expect(homepageImages.corporateImage).toBeGreaterThan(0);

    await t('mood-soother').click();
    await expect(t('panel-mood')).toContainText('Breathe out.');
    await t('link-explore-soother').click();
    await expect(page).toHaveURL(`${base}/shop?feel=soother`);
    await expect(t('text-shop-count')).toContainText('handmade piece');

    await reset('/');
    await t('button-search-open').click();
    await t('input-search').fill('Blue Lotus');
    await t('button-search-submit').click();
    await expect(page).toHaveURL(`${base}/shop?q=Blue%20Lotus`);
    await expect(t('card-product-blue-lotus-pond')).toBeVisible();

    await reset('/');
    await t('button-wishlist-gifted-t-bluelotus').click();
    await expect(t('button-wishlist-gifted-t-bluelotus')).toHaveAttribute('aria-pressed', 'true');
    await t('link-wishlist').click();
    await expect(page).toHaveURL(`${base}/shop?wishlist=1`);
    await expect(t('card-product-blue-lotus-pond')).toBeVisible();

    await reset('/');
    await t('input-signup-whatsapp').fill('9876543210');
    await t('button-signup').click();
    await expect(t('status-signup')).toContainText('not saved');
  });
  await run('Homepage story, maker, corporate and event actions', async () => {
    await reset('/');
    await t('link-open-bea').click();
    await expect(t('bea-popover')).toBeVisible();
    await t('button-close-bea').click();

    await t('link-browse-all').click();
    await expect(page).toHaveURL(base + '/shop');
    await reset('/');
    await t('button-tale-anirveda').click();
    const story = page.getByRole('dialog', { name: 'Anirveda tale' });
    await expect(story).toBeVisible();
    await expect(story).toContainText('no video yet');
    await t('button-story-close').click();
    await t('button-all-tales').click();
    await expect(t('story-viewer')).toBeVisible();
    await t('button-story-close').click();

    await t('button-event-interest').click();
    await expect(t('status-event-interest')).toContainText('nothing was saved');
    await t('link-start-brief').click();
    await expect(page).toHaveURL(base + '/corporate#brief');
    await reset('/');
    await t('link-read-maker-story').click();
    await expect(page).toHaveURL(base + '/makers/tathaastu');
    await reset('/');
    await t('link-shop-maker').click();
    await expect(page).toHaveURL(base + '/makers/tathaastu');
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
  await run('Bea guided conversation, back, progress, ranked results', async () => {
    await reset('/');
    await t('button-open-bea').click();
    await expect(t('bea-popover')).toBeVisible();
    await expect(t('text-question-count')).toHaveText('Question 1 of 4');
    await t('button-option-friend').click();
    await expect(t('text-question-count')).toHaveText('Question 2 of 4');
    await t('button-finder-back').click();
    await expect(t('text-question-count')).toHaveText('Question 1 of 4');
    await t('button-option-partner').click();
    await t('button-option-birthday').click();
    await t('button-option-heart').click();
    await t('button-option-b2').click();
    await expect(t('bea-popover')).toBeVisible();
    await expect(t('text-results-summary')).toContainText('For a partner');
    await expect(page.locator('[data-testid^="card-result-"]').first()).toBeVisible();
  });
  await run('Bea accepts a free-text shopping request and matches the catalogue', async () => {
    await reset('/');
    await t('button-open-bea').click();
    await page.getByText('Or ask Bea in your own words').click();
    await t('input-bea-message').fill('A birthday gift for my mother under ₹1,500 with floral decor');
    await t('button-bea-send').click();
    await expect(t('bea-popover')).toBeVisible();
    await expect(t('text-results-summary')).toContainText('Bea read:');
    await expect(t('text-results-summary')).toContainText('my mother');
    await expect(page.locator('[data-testid^="card-result-"]').first()).toBeVisible();
  });
  await run('Bea can skip to the catalogue results', async () => {
    await reset('/bea');
    await expect(page).toHaveURL(base + '/');
    await expect(t('bea-popover')).toBeVisible();
    await t('button-browse-all-gifts').click();
    await expect(t('bea-popover')).toBeVisible();
    await expect(page.locator('[data-testid^="card-result-"]').first()).toBeVisible();
  });
  await run('Bea opens as a compact mobile popup and accepts a recipient choice', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await reset('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await t('button-open-bea').click();
    await t('button-option-parent').click();
    await expect(t('bea-popover')).toBeVisible();
    await expect(t('text-question-count')).toContainText('Question 2 of 4');
    const box = await t('bea-popover').boundingBox();
    expect(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844).toBeTruthy();
    await t('button-close-bea').click();
    await t('button-open-bea').click();
    await expect(t('text-question-count')).toContainText('Question 1 of 4');
    await t('button-close-bea').click();
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await run('Sample checkout applies a server-validated coupon and persists the receipt', async () => {
    await resetServerSampleData();
    await reset('/checkout');
    await expect(page.locator('aside[aria-label="Order summary"] img')).toHaveCount(2);
    await t('input-phone').fill('9876543210');
    await t('button-send-code').click();
    await t('input-code').fill('246810');
    await t('button-verify-code').click();
    await expect(t('checkout-step-address')).toBeVisible();
    await t('input-address-house').fill('');
    await t('button-deliver-here').click();
    await expect(t('error-address-house')).toBeVisible();
    await t('input-address-house').fill('Sample 12');
    await t('button-deliver-here').click();
    await expect(t('checkout-step-payment')).toBeVisible();
    await t('input-sample-coupon').fill('WELCOME10');
    await t('button-pay').click();
    await expect(t('checkout-step-done')).toBeVisible();
    await expect(t('text-order-ref')).toContainText('BT-');
    await expect(t('text-coupon-discount')).toContainText('₹420');
    await expect(t('text-order-ref')).toContainText('WELCOME10');
    await page.reload();
    await expect(t('checkout-step-done')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('baksa-approved-demo-v1')).bag.length)).toBe(0);
  });
  await run('Shopper sample account orders, classes, addresses and wishlist persist', async () => {
    await resetServerSampleData();
    await reset('/account');
    await t('account-input-phone').fill('9876543210');
    await t('account-input-code').fill('123456');
    await t('account-button-submit').click();
    await expect(t('account-error')).toContainText('246810');
    await t('account-input-code').fill('246810');
    await t('account-button-submit').click();
    await expect(page.getByRole('heading', { name: 'My orders', exact: true })).toBeVisible();
    await expect(t('account-menu-sample-status')).toBeVisible();
    await t('account-menu-trigger').click();
    await expect(t('account-menu-panel')).toBeVisible();
    await expect(page.getByText('SAMPLE-TRACK-1047')).toBeVisible();
    await t('account-menu-classes').click();
    await expect(page.getByRole('heading', { name: 'My classes', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Addresses' }).click();
    await t('account-address-name').fill('Aarav Sample');
    await t('account-address-phone').fill('9876543210');
    await t('account-address-line1').fill('22 Browser Sample Road');
    await t('account-address-city').fill('Pune');
    await t('account-address-state').fill('Maharashtra');
    await t('account-address-pin').fill('411002');
    await t('account-address-save').click();
    await expect(page.getByText('22 Browser Sample Road')).toBeVisible();
    await page.reload();
    await expect(page.getByText('22 Browser Sample Road')).toBeVisible();
    const addedAddress = page.locator('.bt-address-card').filter({ hasText: '22 Browser Sample Road' });
    await addedAddress.getByRole('button', { name: 'Make default' }).click();
    await expect(addedAddress.getByText('Default')).toBeVisible();
    await addedAddress.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('22 Browser Sample Road')).toHaveCount(0);
    await page.getByRole('navigation', { name: 'Shopper account' }).getByRole('link', { name: 'Wishlist' }).click();
    await expect(page.getByRole('heading', { name: 'Blue Lotus Pond' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove' }).first().click();
    await expect(page.getByRole('heading', { name: 'Blue Lotus Pond' })).toHaveCount(0);
  });
  await run('Admin route rejects a shopper sample identity', async () => {
    await page.goto(base);
    await page.evaluate(async () => {
      const response = await fetch('/api/sample/session', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identity: 'shopper', mobileNumber: '9876543210', simulationCode: '246810' }),
      });
      const session = await response.json();
      localStorage.setItem('baksa-sample-account-session', session.token);
    });
    await page.goto(base + '/admin/orders');
    await expect(page.getByText('Sample workspace · admin')).toBeVisible();
    await expect(t('page-AdminOrders')).toHaveCount(0);
  });
  await run('A different sample maker cannot enter Tathaastu’s dashboard', async () => {
    await page.goto(base);
    await page.route('**/api/sample/session', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sample: true, identity: 'maker-other', role: 'maker', userId: 'sample-maker-2', displayName: 'Mushhk Studio' }),
    }));
    try {
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('baksa-sample-account-session', 'a'.repeat(64));
      });
      await page.goto(base + '/maker');
      await expect(page.getByRole('alert')).toContainText('The other maker cannot access it');
      await expect(t('page-MakerHome')).toHaveCount(0);
    } finally {
      await page.unroute('**/api/sample/session');
    }
  });
  await run('Sample maker and admin identities cannot enter live Sahayak or Site Studio', async () => {
    await reset('/maker');
    await t('link-ask-sahayak').click();
    await expect(page).toHaveURL(base + '/maker/sahayak');
    await expect(page.getByRole('button', { name: 'Rewrite with Sahayak' })).toHaveCount(0);
    await expect(page.locator('.studio-shell')).toHaveCount(0);
    await reset('/admin');
    await page.locator('aside nav').getByRole('link', { name: 'Site Studio · secure' }).click();
    await expect(page).toHaveURL(base + '/admin/site');
    await expect(page.locator('.studio-shell')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save draft' })).toHaveCount(0);
  });
  await run('Admin creates and edits coupon rules on the server', async () => {
    await resetServerSampleData();
    await reset('/admin');
    await page.locator('aside nav').getByRole('link', { name: 'Coupons' }).click();
    await expect(t('admin-coupons-page')).toBeVisible();
    await expect(t('coupon-row-WELCOME10')).toBeVisible();
    await t('coupon-code').fill('TEST20');
    await t('coupon-value').fill('20');
    await page.getByRole('button', { name: 'Create coupon' }).click();
    const created = t('coupon-row-TEST20');
    await expect(created).toBeVisible();
    await created.getByRole('button', { name: 'Edit' }).click();
    const active = page.locator('.bt-admin-coupon-active input');
    await active.uncheck();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(t('coupon-row-TEST20').getByText('Paused')).toBeVisible();
  });
  await run('Admin drafts and publishes sample blog posts to the Journal', async () => {
    await resetServerSampleData();
    await reset('/admin');
    await page.locator('aside nav').getByRole('link', { name: 'Blog' }).click();
    await expect(t('admin-blog-page')).toBeVisible();
    await t('blog-title').fill('A quiet afternoon in the workshop');
    await t('blog-excerpt').fill('A sample journal note for the preview website.');
    await t('blog-body').fill('This is sample article text for testing the editorial workflow.\n\nIt is not a claim about a real maker or product.');
    await page.getByRole('button', { name: 'Save post' }).click();
    const post = t('blog-row-a-quiet-afternoon-in-the-workshop');
    await expect(post).toBeVisible();
    await page.goto(base + '/blog');
    await expect(page.getByText('No stories published yet.')).toBeVisible();
    await page.goto(base + '/admin/blog');
    await t('blog-row-a-quiet-afternoon-in-the-workshop').getByRole('button', { name: 'Edit' }).click();
    await t('blog-status').selectOption('published');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(t('blog-row-a-quiet-afternoon-in-the-workshop').getByText('published', { exact: true })).toBeVisible();
    await page.goto(base + '/blog');
    await page.getByRole('link', { name: 'A quiet afternoon in the workshop' }).click();
    await expect(page.getByRole('heading', { name: 'A quiet afternoon in the workshop' })).toBeVisible();
    await expect(page.getByText('It is not a claim about a real maker or product.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'A quiet afternoon in the workshop' })).toBeVisible();
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
  await run('Admin vendor application decisions persist and lock after approval', async () => {
    await resetServerSampleData();
    await reset('/admin/reviews');
    await expect(t('status-application-a1')).toHaveText('New');
    await t('button-application-call-a1').click();
    await expect(t('status-application-a1')).toHaveText('Call booked');
    await page.reload();
    await expect(t('status-application-a1')).toHaveText('Call booked');
    await t('button-application-approve-a1').click();
    await expect(t('status-application-a1')).toHaveText('Approved, invite sent');
    await expect(t('button-application-approve-a1')).toHaveCount(0);
  });
  await run('Admin overview refreshes sales metrics and attention from saved records', async () => {
    await resetServerSampleData();
    await reset('/admin');
    await expect(t('metric-value-sales')).toContainText('₹');
    await expect(t('row-attention-order-BT-1030')).toContainText('Problem on BT-1030');
    const token = await getSampleToken('admin');
    await page.evaluate(async value => {
      const response = await fetch('/api/sample/admin/orders/BT-1047/status', {
        method: 'PATCH', headers: { authorization: `Bearer ${value}`, 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'delayed', note: 'Courier handoff is late.' }),
      });
      if (!response.ok) throw new Error('Could not update sample order.');
    }, token);
    await page.reload();
    await expect(t('row-attention-order-BT-1047')).toContainText('Delayed on BT-1047');
  });
  await run('Maker sidebars navigate and stock edits persist', async () => {
    await resetServerSampleData();
    await reset('/maker');
    await page.locator('aside nav a[data-route="/maker/products"]').click();
    await expect(page).toHaveURL(base + '/maker/products');
    await expect(t('input-stock-t-bluelotus')).toBeEnabled();
    await t('input-stock-t-bluelotus').fill('9');
    await t('input-stock-t-bluelotus').blur();
    await expect(t('maker-stock-save-status')).toContainText('Stock saved');
    const savedStock = await page.evaluate(async () => {
      const token = localStorage.getItem('baksa-sample-account-session');
      const response = await fetch('/api/sample/maker/products', { headers: { authorization: `Bearer ${token}` } });
      const data = await response.json();
      return data.products.find((product) => product.id === 't-bluelotus')?.stock;
    });
    expect(savedStock).toBe(9);
    await page.evaluate(() => localStorage.removeItem('baksa-approved-demo-v1'));
    await page.reload();
    await expect(t('input-stock-t-bluelotus')).toHaveValue('9');
    await page.locator('aside nav a[data-route="/maker/courses"]').click();
    await expect(page).toHaveURL(base + '/maker/courses');
    await expect(page.getByRole('heading', { name: 'My courses', exact: true })).toBeVisible();
  });
  await run('Maker saves, reopens and submits a seven-step draft with fact confirmation', async () => {
    await resetServerSampleData();
    await reset('/maker/products/new?step=5');
    await expect(t('text-draft-saved')).toHaveText('Draft saved securely');
    await t('input-draft-price').fill('3499');
    await expect(t('text-draft-saved')).toHaveText('Saving securely…');
    await expect(t('text-draft-saved')).toHaveText('Draft saved securely');
    const draftId = await page.evaluate(() => new URLSearchParams(location.search).get('draftId'));
    expect(draftId).toBeTruthy();
    await page.goto(base + '/maker/products');
    const resume = t(`button-reopen-draft-${draftId}`);
    await expect(resume).toBeVisible();
    await resume.click();
    await expect(t('input-draft-price')).toHaveValue('3499');
    await t('step-1').click();
    const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aT8AAAAASUVORK5CYII=', 'base64');
    await t('input-draft-photo').setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: tinyPng });
    await expect(t('img-draft-photo')).toBeVisible();
    await t('step-2').click();
    await t('input-draft-name').fill('Seven step sample diya');
    await t('input-draft-kind').fill('Diya');
    await t('step-3').click();
    await t('input-draft-material').fill('Brass');
    await t('input-draft-technique').fill('Hand cast');
    await t('step-4').click();
    await t('input-draft-size').fill('9 cm');
    await t('step-6').click();
    await t('input-draft-story').fill('Made in a small family workshop.');
    await t('step-7').click();
    await t('checkbox-confirm-product-facts').check();
    await t('button-step-next').click();
    await expect(t('text-submit-result')).toContainText('saved for review');
    await reset('/admin/reviews');
    await expect(t(`button-review-item-${draftId}`)).toBeVisible();
    await t(`button-review-item-${draftId}`).click();
    for (let gate = 1; gate <= 5; gate++) await t(`checkbox-gate-${gate}`).check();
    await t('button-approve').click();
    const published = await page.evaluate(async id => {
      const token = localStorage.getItem('baksa-sample-account-session');
      const response = await fetch('/api/sample/admin/product-reviews', { headers: { authorization: `Bearer ${token}` } });
      const data = await response.json();
      return data.reviews.find(review => review.id === id);
    }, draftId);
    expect(published).toMatchObject({ name: 'Seven step sample diya', status: 'live', stock: 6 });
  });
  await run('Maker orders save fulfilment steps, tracking and problem notes on the server', async () => {
    await resetServerSampleData();
    await reset('/maker');
    await page.locator('aside nav a[data-route="/maker/orders"]').click();
    await t('button-pack-BT-1047').click();
    await expect(t('status-order-BT-1047')).toHaveText('Packed');
    await t('input-tracking-BT-1044').fill('SAMPLE-DL-2044');
    await t('button-dispatch-BT-1044').click();
    await expect(t('status-order-BT-1044')).toHaveText('On the way');
    const problemPrompt = page.waitForEvent('dialog').then(dialog => dialog.accept('The sample gift box arrived damaged.'));
    await t('link-problem-BT-1047').click();
    await problemPrompt;
    await expect(t('status-order-BT-1047')).toHaveText('Problem');
    const persisted = await page.evaluate(async () => {
      const token = localStorage.getItem('baksa-sample-account-session');
      const response = await fetch('/api/sample/maker/orders', { headers: { authorization: `Bearer ${token}` } });
      return response.json();
    });
    expect(persisted.orders.find((order) => order.id === 'BT-1047')).toMatchObject({ status: 'problem', issue: 'The sample gift box arrived damaged.' });
    expect(persisted.orders.find((order) => order.id === 'BT-1044')).toMatchObject({ status: 'dispatched', tracking: 'SAMPLE-DL-2044' });
  });
  await run('Admin delay and refund statuses require notes and persist without gateway actions', async () => {
    await resetServerSampleData();
    await reset('/admin/orders');
    const delayPrompt = page.waitForEvent('dialog').then(dialog => dialog.accept('Sample courier update needed.'));
    await t('button-delay-BT-1047').click();
    await delayPrompt;
    await expect(t('status-order-BT-1047')).toContainText('Delayed');
    const refundPrompt = page.waitForEvent('dialog').then(dialog => dialog.accept('Refund status recorded for test only.'));
    await t('button-refund-BT-1047').click();
    await refundPrompt;
    await expect(t('status-order-BT-1047')).toContainText('Refunded');
    await page.reload();
    await expect(t('status-order-BT-1047')).toContainText('Refunded');
    const title = await t('button-refund-BT-1044').getAttribute('title');
    expect(title).toContain('no payment gateway refund');
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
    await resetServerSampleData();
    await reset('/maker/orders');
    await t('button-pack-BT-1047').click();
    await t('button-dispatch-BT-1047').click();
    await expect(t('error-dispatch-BT-1047')).toBeVisible();
    await t('select-courier-BT-1047').selectOption({ index: 1 });
    await t('input-tracking-BT-1047').fill('DEMO123456');
    await t('button-dispatch-BT-1047').click();
    await expect(t('status-order-BT-1047')).toHaveText('On the way');
    await t('button-deliver-BT-1047').click();
    await expect(t('status-order-BT-1047')).toHaveText('Delivered');
    await page.reload();
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('baksa-approved-demo-v1')));
    expect(state.orders.find(o => o.id === 'BT-1047').status).toBe('delivered');
  });
  await run('Maker earnings use server totals, deductions and weekly dates', async () => {
    await resetServerSampleData();
    await reset('/maker/earnings');
    await expect(page.getByText('Calculated on the server from your delivered sample orders.')).toBeVisible();
    const earnings = await page.evaluate(async () => {
      const token = localStorage.getItem('baksa-sample-account-session');
      const response = await fetch('/api/sample/maker/earnings', { headers: { authorization: `Bearer ${token}` } });
      return response.json();
    });
    expect(earnings.deliveredCount).toBeGreaterThan(0);
    expect(earnings.split.deductionsPaise).toBeGreaterThan(0);
    expect(earnings.runs.length).toBeGreaterThan(0);
    await expect(t('text-customers-paid')).toContainText('₹');
    await expect(t('text-payout-total')).toContainText('₹');
  });
  await run('Corporate brief validation and confirmation', async () => {
    await resetServerSampleData();
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
    const confirmation = await t('brief-confirmation').innerText();
    const ref = confirmation.match(/BT-CG-[A-Z0-9]+/)?.[0];
    expect(ref).toBeTruthy();
    await reset('/admin/enquiries');
    const enquiryCard = t(`card-enquiry-${ref}`);
    await expect(enquiryCard).toContainText('Sample company');
    await expect(t(`select-stage-${ref}`)).toHaveValue('new');
    await t(`checkbox-match-m1-${ref}`).check();
    await t(`button-send-matched-${ref}`).click();
    await expect(t(`button-send-matched-${ref}`)).toBeEnabled();
    await t(`input-quote-${ref}`).fill('6000');
    await t(`button-quote-${ref}`).click();
    const adminToken = await getSampleToken('admin');
    await expect.poll(async () => page.evaluate(async ({ token, ref }) => {
      const response = await fetch('/api/sample/admin/enquiries', { headers: { authorization: `Bearer ${token}` } });
      const result = await response.json();
      return result.enquiries.find(enquiry => enquiry.ref === ref)?.quotePaise;
    }, { token: adminToken, ref }), { timeout: 8000 }).toBe(600000);
    await reset('/maker/opportunities');
    const brief = t(`card-opp-brief-${ref}-m1`);
    await expect(brief).toContainText('20 gifts');
    await expect(brief).not.toContainText('Sample company');
    await expect(brief).not.toContainText('Sample customer');
    await expect(brief).not.toContainText('demo@example.test');
    await brief.getByRole('button', { name: 'I can do this' }).click();
    await page.goto(base);
    const persisted = await page.evaluate(async token => {
      const response = await fetch('/api/sample/admin/enquiries', { headers: { authorization: `Bearer ${token}` } });
      return response.json();
    }, adminToken);
    expect(persisted.enquiries.find(enquiry => enquiry.ref === ref)).toMatchObject({ quotePaise: 600000, stage: 'quote', responses: { m1: 'yes' } });
  });
  await run('Admin payout remains paid after reload', async () => {
    await resetServerSampleData();
    await reset('/admin/orders');
    await t('button-mark-paid-m1').click();
    await page.reload();
    await expect(t('status-paid-m1')).toHaveText('Paid');
    const paid = await page.evaluate(async () => {
      const token = localStorage.getItem('baksa-sample-account-session');
      const response = await fetch('/api/sample/admin/payouts', { headers: { authorization: `Bearer ${token}` } });
      return response.json();
    });
    expect(paid.paidRuns.some((run) => run.makerId === 'tathaastu')).toBe(true);
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
  await run('Growth Studio saves private product costs and server-calculates profit', async () => {
    await resetServerSampleData();
    await reset('/maker/growth');
    await expect(t('input-cost-t-lotuspond')).toBeEnabled();
    await t('input-cost-t-lotuspond').fill('750');
    await t('input-cost-t-lotuspond').blur();
    await expect(page.getByText('Private costs and profit estimates are saved and calculated on the server.')).toBeVisible();
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('baksa-sample-account-session');
      const response = await fetch('/api/sample/maker/profits', { headers: { authorization: `Bearer ${token}` } });
      const data = await response.json();
      return data.products.find(product => product.productId === 't-lotuspond');
    });
    expect(result).toMatchObject({ costPaise: 75000 });
    expect(result.leftPerSalePaise).toBe(result.split.netAfterGstPaise - 75000);
  });
  await run('Maker settings persist tax and state without exposing bank fields', async () => {
    await resetServerSampleData();
    await reset('/maker/settings');
    await expect(t('status-maker-trust')).toHaveText('Trusted maker');
    await t('select-maker-gst').selectOption('false');
    await t('input-maker-state').fill('Rajasthan');
    await t('button-save-maker-settings').click();
    await expect(t('text-maker-settings-status')).toContainText('saved to your sample shop');
    await page.reload();
    await expect(t('select-maker-gst')).toHaveValue('false');
    await expect(t('input-maker-state')).toHaveValue('Rajasthan');
    await expect(t('text-payout-onboarding')).toContainText('payout provider must be selected');
    await expect(page.locator('input[autocomplete*="cc-number"], input[name*="ifsc" i]')).toHaveCount(0);
  });
  await run('Maker opportunity replies and masterclass proposals reach admin review', async () => {
    await resetServerSampleData();
    await reset('/maker/opportunities');
    await expect(t('card-opp-op1')).toContainText('120 client gifts');
    await t('button-opp-yes-op1').click();
    await expect(t('status-opp-op1')).toContainText('You said yes');
    await page.reload();
    await expect(t('status-opp-op1')).toContainText('You said yes');
    await t('input-proposal-title').fill('Make a painted diya set');
    await t('select-proposal-type').selectOption({ label: 'Live workshop' });
    await t('input-proposal-length').fill('2 hours');
    await t('input-proposal-price').fill('1800');
    await t('input-proposal-about').fill('Learn safe surface preparation and paint a coordinated set of festive diyas.');
    await t('button-send-proposal').click();
    await expect(t('text-proposal-sent')).toContainText('Make a painted diya set');
    await reset('/admin/academy');
    const card = page.locator('[data-testid^="card-class-proposal-"]').filter({ hasText: 'Make a painted diya set' });
    await expect(card).toHaveCount(1);
    await card.locator('textarea').fill('Add a clear material list and learner outcomes.');
    await card.getByRole('button', { name: 'Ask for changes' }).click();
    await expect(card.locator('[role="status"]')).toContainText('Changes requested');
  });
  await run('Admin Academy shows saved sales and imports validated workshop rows', async () => {
    await resetServerSampleData();
    await reset('/admin/academy');
    await expect(t('text-academy-revenue')).toContainText('₹');
    await expect(t('row-academy-sale-academy-sample-001')).toContainText('Shape a soy wax lotus');
    await t('button-approve-proposal').click();
    await expect(t('text-proposal-status')).toContainText('Approved');
    await page.reload();
    await expect(t('text-proposal-status')).toContainText('Approved');
    await expect(t('button-approve-proposal')).toHaveCount(0);
    await t('input-csv').setInputFiles({
      name: 'workshop-sales.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('id,date,course,learner,amount,status\nbrowser-001,2026-11-11,"Paint, pattern and finish",Sample learner 099,1250.50,paid\n'),
    });
    await expect(t('text-csv-result')).toContainText('Imported 1 validated sale row');
    await expect(t('row-academy-sale-browser-001')).toContainText('Paint, pattern and finish');
    await expect(t('row-academy-sale-browser-001')).toHaveAttribute('data-source', 'tagmango_import');
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
