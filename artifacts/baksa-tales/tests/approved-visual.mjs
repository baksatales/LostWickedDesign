/**
 * Reproducible side-by-side screenshots of approved source and running frontend.
 * Run from workspace root: node artifacts/baksa-tales/tests/approved-visual.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const screens = [
  ['Main', '/'], ['Shop', '/shop'], ['Product', '/product/blue-lotus-pond'],
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
      await app.goto(base + route);
      await Promise.all([source.evaluate(() => document.fonts.ready), app.evaluate(() => document.fonts.ready)]);
      await app.waitForTimeout(150);
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
} finally {
  await browser.close();
}
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
await writeFile(`${output}/index.html`, `<!doctype html><meta charset="utf-8"><title>Approved design comparison</title><style>body{font:16px Georgia;background:#f6f3df;color:#2b1712;margin:24px}img{max-width:100%;border:1px solid #dccab0}section{margin:40px 0}a{color:#611811}</style><h1>Approved source (left) and frontend (right)</h1><p>Desktop 1440px and phone 390px. Full-page source and app images are linked for each view. Side-by-side previews show the first 900px.</p>${results.map(r => `<section><h2>${r.name} — ${r.viewport}px</h2><p>${r.route} · Horizontal overflow: ${r.scrollWidth-r.width}px · Broken images: ${r.images.length} · Browser errors: ${r.errors.length}</p><a href="${r.name}-${r.viewport}-source.jpg">Full source</a> · <a href="${r.name}-${r.viewport}-app.jpg">Full frontend</a><p><img loading="lazy" src="${r.name}-${r.viewport}-side-by-side.jpg"></p></section>`).join('')}`);
