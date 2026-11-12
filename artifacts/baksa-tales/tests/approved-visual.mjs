/**
 * Reproducible side-by-side screenshots of approved source and running frontend.
 * Run from workspace root: node artifacts/baksa-tales/tests/approved-visual.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const screens = [
  ['Shop', '/shop'], ['Product', '/product/blue-lotus-pond'],
  ['Finder', '/finder'], ['Results', '/results'], ['Checkout', '/checkout'],
  ['Maker', '/makers/tathaastu'], ['Corporate', '/corporate'], ['Academy', '/academy'],
  ['MakerHome', '/maker'], ['MakerOrders', '/maker/orders'], ['MakerProducts', '/maker/products'],
  ['MakerAddProduct', '/maker/products/new'], ['MakerEarnings', '/maker/earnings'],
  ['MakerGrowth', '/maker/growth'], ['MakerOpportunities', '/maker/opportunities'],
  ['AdminOverview', '/admin'], ['AdminReviews', '/admin/reviews'],
  ['AdminOrders', '/admin/orders'], ['AdminEnquiries', '/admin/enquiries'],
  ['AdminAcademy', '/admin/academy'],
  ['Header', '/design/header'], ['Footer', '/design/footer'],
  ['MakerNav', '/design/maker-nav'], ['AdminNav', '/design/admin-nav'],
];
const output = resolve('generated-artifacts/approved-comparison');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
const sourceDir = resolve('reference/approved/baksa-tales-replit/designs');
const base = process.env.APP_URL || 'http://localhost:80';
const results = [];
const sampleTokens = new Map();
async function sampleToken(identity) {
  if (sampleTokens.has(identity)) return sampleTokens.get(identity);
  const response = await fetch(`${base}/api/sample/session`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity, mobileNumber: '9876543210', simulationCode: '246810' }),
  });
  if (!response.ok) throw new Error(`Could not obtain the ${identity} sample session for visual comparison.`);
  const token = (await response.json()).token;
  sampleTokens.set(identity, token);
  return token;
}
async function waitForImages(page) {
  await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise(resolve => {
        const finish = () => { clearTimeout(timeout); resolve(); };
        const timeout = setTimeout(finish, 4000);
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
      });
    }));
  });
}
try {
  for (const [name, route] of screens) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const source = await context.newPage();
      const app = await context.newPage();
      const errors = [];
      app.on('pageerror', e => errors.push(e.message));
      app.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
      await source.goto(pathToFileURL(`${sourceDir}/${name}.html`).href);
      if (route.startsWith('/maker') || route.startsWith('/admin')) {
        const token = await sampleToken(route.startsWith('/admin') ? 'admin' : 'maker');
        await app.goto(base);
        await app.evaluate(value => localStorage.setItem('baksa-sample-account-session', value), token);
      }
      await app.goto(base + route);
      await Promise.all([source.evaluate(() => document.fonts.ready), app.evaluate(() => document.fonts.ready)]);
      await Promise.all([waitForImages(source), waitForImages(app)]);
      const sourceImage = await source.screenshot({ type: 'jpeg', quality: 80, fullPage: true });
      const appImage = await app.screenshot({ type: 'jpeg', quality: 80, fullPage: true });
      await writeFile(`${output}/${name}-${width}-source.jpg`, sourceImage);
      await writeFile(`${output}/${name}-${width}-app.jpg`, appImage);
      const measurement = await app.evaluate(() => ({
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        images: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')),
        title: document.title,
        background: getComputedStyle(document.body).backgroundColor,
      }));
      const pair = await context.newPage();
      await pair.setViewportSize({ width: width * 2, height: 900 });
      await pair.setContent(`<html><body style="margin:0;display:flex;align-items:flex-start;background:#eee">${[sourceImage, appImage].map(image => `<div style="width:${width}px;flex:none"><img style="display:block;width:100%;height:auto" src="data:image/jpeg;base64,${image.toString('base64')}"></div>`).join('')}</body></html>`);
      await pair.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
      await pair.screenshot({ path: `${output}/${name}-${width}-side-by-side.jpg`, type: 'jpeg', quality: 80 });
      results.push({ name, route, viewport: width, ...measurement, errors });
      console.log(`${name} ${width}: overflow ${measurement.scrollWidth - width}px, broken images ${measurement.images.length}, errors ${errors.length}`);
      await context.close();
    }
  }
  const adminToken = await sampleToken('admin');
  const resetResponse = await fetch(`${base}/api/sample/reset`, {
    method: 'POST', headers: { authorization: `Bearer ${adminToken}` },
  });
  if (!resetResponse.ok) throw new Error('Could not reset isolated sample account data before visual capture.');
  const shopperToken = await sampleToken('shopper');
  const accountScreens = [
    ['ShopperOrders', '/account/orders'],
    ['ShopperClasses', '/account/classes'],
    ['ShopperAddresses', '/account/addresses'],
    ['ShopperWishlist', '/account/wishlist'],
  ];
  for (const [name, route] of accountScreens) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const app = await context.newPage();
      const errors = [];
      app.on('pageerror', e => errors.push(e.message));
      app.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
      await app.goto(base);
      await app.evaluate(token => localStorage.setItem('baksa-sample-account-session', token), shopperToken);
      await app.goto(base + route);
      await app.waitForSelector('.bt-account-content');
      await app.evaluate(() => document.fonts.ready);
       await waitForImages(app);
      const measurement = await app.evaluate(() => ({
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        images: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')),
        title: document.title, background: getComputedStyle(document.body).backgroundColor,
      }));
      await app.screenshot({ path: `${output}/${name}-${width}-app.jpg`, type: 'jpeg', quality: 84, fullPage: true });
      results.push({ name, route, viewport: width, ...measurement, errors, sampleAccount: true });
      console.log(`${name} ${width}: overflow ${measurement.scrollWidth - width}px, broken images ${measurement.images.length}, errors ${errors.length}`);
      await context.close();
    }
  }
  const customScreens = [
    ['HomepageV5', '/', null, 'homepage-v5'],
    ['AdminCoupons', '/admin/coupons', adminToken, 'admin-coupons-page'],
    ['AdminBlog', '/admin/blog', adminToken, 'admin-blog-page'],
    ['Journal', '/blog', null, 'blog-page'],
  ];
  for (const [name, route, token, selector] of customScreens) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const app = await context.newPage();
      const errors = [];
      app.on('pageerror', e => errors.push(e.message));
      app.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
      await app.goto(base);
      if (token) await app.evaluate(value => localStorage.setItem('baksa-sample-account-session', value), token);
      await app.goto(base + route);
      await app.waitForSelector(`[data-testid="${selector}"]`);
      await app.evaluate(() => document.fonts.ready);
      await waitForImages(app);
      const measurement = await app.evaluate(() => ({
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        images: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')),
        title: document.title, background: getComputedStyle(document.body).backgroundColor,
      }));
      await app.screenshot({ path: `${output}/${name}-${width}-app.jpg`, type: 'jpeg', quality: 84, fullPage: true });
      results.push({ name, route, viewport: width, ...measurement, errors, customModule: true });
      console.log(`${name} ${width}: overflow ${measurement.scrollWidth - width}px, broken images ${measurement.images.length}, errors ${errors.length}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
await writeFile(`${output}/index.html`, `<!doctype html><meta charset="utf-8"><title>Approved design comparison</title><style>body{font:16px Georgia;background:#f6f3df;color:#2b1712;margin:24px}img{max-width:100%;border:1px solid #dccab0}section{margin:40px 0}a{color:#611811}</style><h1>Approved source (left) and frontend (right)</h1><p>Maker/admin approved source comparisons use desktop 1440px and phone 390px. The Homepage V5 preview is captured at both sizes against the supplied design; shopper account pages and added routes are captured without an approved source pair.</p>${results.map(r => `<section><h2>${r.name} — ${r.viewport}px</h2><p>${r.route} · Horizontal overflow: ${r.scrollWidth-r.width}px · Broken images: ${r.images.length} · Browser errors: ${r.errors.length}</p>${r.sampleAccount || r.customModule ? `<a href="${r.name}-${r.viewport}-app.jpg">${r.customModule ? `${r.name} screenshot` : 'Shopper account screenshot'}</a><p><img loading="lazy" src="${r.name}-${r.viewport}-app.jpg"></p>` : `<a href="${r.name}-${r.viewport}-source.jpg">Full source</a> · <a href="${r.name}-${r.viewport}-app.jpg">Full frontend</a><p><img loading="lazy" src="${r.name}-${r.viewport}-side-by-side.jpg"></p>`}</section>`).join('')}`);
