import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const base = process.env.APP_URL || 'http://localhost:80';
const results = [];
const errors = [];
page.setDefaultTimeout(10_000);
page.on('pageerror', error => errors.push(error.message));
const t = id => page.getByTestId(id);
async function run(name, fn) {
  if (process.env.HOMEPAGE_CHECK && !new RegExp(process.env.HOMEPAGE_CHECK).test(name)) return;
  try { await fn(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.log(`FAIL ${name}: ${error.message.slice(0, 800)}`); }
}
async function home() { await page.goto(base + '/'); await expect(t('page-home-v5')).toBeVisible(); }
try {
  await run('Heart-Giver default, all five compartments switch their actual edit', async () => {
    await home();
    await expect(t('panel-mood')).toHaveAttribute('data-mood', 'heart');
    for (const mood of ['explorer', 'showstopper', 'soother', 'thoughtful', 'heart']) {
      await t(`mood-${mood}`).click();
      await expect(t(`mood-${mood}`)).toHaveAttribute('aria-pressed', 'true');
      await expect(t('panel-mood')).toHaveAttribute('data-mood', mood);
      await expect(t(`link-explore-${mood}`)).toHaveAttribute('href', `/shop?feel=${mood}`);
    }
  });
  await run('First-click hint disappears, including when clicking the selected compartment', async () => {
    await home();
    await expect(t('hint-first-click')).toBeVisible();
    await t('mood-heart').click();
    await expect(t('hint-first-click')).toHaveCount(0);
  });
  await run('Keyboard arrows, Home, End and Space operate the moods', async () => {
    await home();
    await t('mood-heart').focus();
    await page.keyboard.press('ArrowRight');
    await expect(t('mood-showstopper')).toBeFocused();
    await expect(t('panel-mood')).toHaveAttribute('data-mood', 'showstopper');
    await page.keyboard.press('Home');
    await expect(t('mood-explorer')).toBeFocused();
    await page.keyboard.press('End');
    await expect(t('mood-thoughtful')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(t('panel-mood')).toHaveAttribute('data-mood', 'thoughtful');
  });
  await run('Homepage mood links open the existing shop with the correct filter', async () => {
    await home();
    await t('link-explore-heart').click();
    await expect(page).toHaveURL(/\/shop\?feel=heart$/);
    await expect(t('button-feel-heart')).toBeVisible();
    const shown = await page.locator('[data-testid^="card-product-"]').count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(25);
  });
  await run('Wishlist hearts update the saved catalogue and survive a reload', async () => {
    await home();
    const heart = t('button-wishlist-gifted-t-bluelotus');
    const oldPressed = await heart.getAttribute('aria-pressed');
    await heart.click();
    const newPressed = await heart.getAttribute('aria-pressed');
    expect(newPressed).not.toBe(oldPressed);
    await page.reload();
    await expect(t('button-wishlist-gifted-t-bluelotus')).toHaveAttribute('aria-pressed', newPressed);
  });
  await run('Tales viewer opens, navigates, closes and remembers Seen', async () => {
    await home();
    await t('button-tale-tathaastu').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(t('text-story-title')).toBeVisible();
    await t('button-story-next').click();
    await t('button-story-close').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(t('button-tale-tathaastu')).toContainText('Seen');
  });
  await run('WhatsApp form validates and does not fake a successful save', async () => {
    await home();
    await t('input-signup-whatsapp').fill('123');
    await t('button-signup').click();
    await expect(t('error-signup')).toBeVisible();
    await t('input-signup-whatsapp').fill('9876543210');
    await t('button-signup').click();
    await expect(t('status-signup')).toContainText(/not saved|aren’t switched on/);
  });
  await run('Event alerts and an unconfigured episode disclose unavailable services', async () => {
    await t('button-event-interest').click();
    await expect(t('status-event-interest')).toContainText(/nothing was saved|aren’t switched on/);
    await t('button-dsdt').click();
    await expect(t('dialog-dsdt')).toBeVisible();
    await t('button-dsdt-close').click();
  });
  await run('Site Studio edits actual homepage copy and image layers in a local preview', async () => {
    await page.goto(base + '/studio-preview');
    await expect(t('homepage-v5-editor')).toBeVisible();
    await page.getByText('Hero', { exact: true }).click();
    await t('edit-h5.copy.hero.title').fill('A homepage *edited in Site Studio.*');
    await expect(page.locator('.studio-preview h1')).toContainText('edited in Site Studio');
    await expect(page.getByText('Design playground only.', { exact: true })).toBeVisible();
    await expect(t('edit-h5.image.trunk')).toBeVisible();
    await t('edit-h5.image.trunk').fill('/images/baksa/homev5-heart.svg');
    await expect(page.locator('.studio-preview .trunk5 .bg')).toHaveAttribute('src', '/images/baksa/homev5-heart.svg');
    await page.getByText('Mood: Heart-Giver', { exact: true }).click();
    await t('edit-h5.picks.mood.heart').fill('t-bluelotus,t-message,t-marigold');
    await expect(page.locator('.studio-preview [data-testid="panel-heart-t-bluelotus"]')).toBeVisible();
  });
  await run('Studio local drafts never replace the public homepage', async () => {
    await page.goto(base + '/studio-preview');
    await expect(t('homepage-v5-editor')).toBeVisible();
    await page.getByText('Hero', { exact: true }).click();
    await t('edit-h5.copy.hero.title').fill('PRIVATE LOCAL DRAFT');
    await t('edit-h5.image.trunk').fill('/images/baksa/homev5-heart.svg');
    await expect(page.locator('.studio-preview h1')).toHaveText('PRIVATE LOCAL DRAFT');
    await home();
    await expect(page.locator('h1')).toHaveText('Every gift has something to say.');
    await expect(page.locator('.trunk5 .bg')).toHaveAttribute('src', '/images/baksa/homev5-trunk.webp');
  });
  await run('390px uses a horizontally swipeable row without page overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await home();
    await expect(t('trunk-desktop')).toBeHidden();
    await expect(t('swipe-moods')).toBeVisible();
    const row = await t('swipe-moods').evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth }));
    expect(row.content).toBeGreaterThan(row.width);
    await t('swipe-mood-thoughtful').scrollIntoViewIfNeeded();
    await t('swipe-mood-thoughtful').click();
    await expect(t('panel-mood')).toHaveAttribute('data-mood', 'thoughtful');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await t('button-mobile-menu').click();
    await expect(page.getByTestId('link-open-bea')).toBeVisible();
  });
  await run('Reduced motion disables entrance animation and selection lift', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await home();
    await t('mood-explorer').click();
    const styles = await t('mood-explorer').evaluate(el => ({
      transform: getComputedStyle(el).transform,
      animation: getComputedStyle(el.querySelector('.ow')).animationName,
    }));
    expect(styles.transform).toBe('none');
    expect(styles.animation).toBe('none');
  });
  await run('Homepage images load and desktop/phone screenshots have no overflow', async () => {
    await mkdir('generated-artifacts/homepage-v5', { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await home();
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.evaluate(() => scrollTo(0, 0));
      const broken = await page.locator('.h5 img').evaluateAll(images => images.filter(image => image.complete && !image.naturalWidth).map(image => image.src));
      expect(broken).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `generated-artifacts/homepage-v5/home-${width}.jpg`, type: 'jpeg', quality: 85, fullPage: true });
      await expect(t('sample-note')).toHaveCount(1);
      await expect(page.locator('footer')).toHaveCount(1);
      await expect(page.locator('.h5')).not.toContainText('Temporary art');
      await expect(page.locator('.h5')).toHaveCSS('background-color', 'rgb(251, 244, 234)');
      const source = await context.newPage();
      await source.setViewportSize({ width, height: 1000 });
      await source.goto(pathToFileURL(resolve('reference/homepage-v5/HomeV5.dc.html')).href);
      await source.waitForSelector('.trunk5 .bg', { state: 'attached' });
      await source.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
      });
      await source.waitForTimeout(1800);
      const reference = await source.screenshot({ path: `generated-artifacts/homepage-v5/source-${width}.jpg`, type: 'jpeg', quality: 85, fullPage: true });
      const actual = await page.screenshot({ type: 'jpeg', quality: 85, fullPage: true });
      const pair = await context.newPage();
      await pair.setViewportSize({ width: width * 2, height: 1000 });
      await pair.setContent(`<body style="margin:0;display:flex;align-items:flex-start">${[reference, actual].map(image => `<img style="display:block;width:${width}px" src="data:image/jpeg;base64,${image.toString('base64')}">`).join('')}</body>`);
      await pair.screenshot({ path: `generated-artifacts/homepage-v5/compare-${width}.jpg`, type: 'jpeg', quality: 85, fullPage: true });
      await pair.close();
      await source.close();
    }
  });
  await run('No browser exceptions', async () => expect(errors).toEqual([]));
} finally {
  await mkdir('generated-artifacts/homepage-v5', { recursive: true });
  await writeFile(`generated-artifacts/homepage-v5/${process.env.HOMEPAGE_CHECK ? 'browser-recheck-results' : 'browser-results'}.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(`\n${results.filter(result => result.passed).length}/${results.length} homepage checks passed`);
if (results.some(result => !result.passed)) process.exitCode = 1;
