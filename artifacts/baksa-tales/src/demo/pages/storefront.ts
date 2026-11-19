import { $, $$, BTN_OUTLINE, byText, cloneEl, type Ctx, fieldError, norm, on, pillGroup, setStyle, setVisible, styleOf, tid } from '../dom';
import {
  COURSES_BY_TITLE, DEFAULT_RESULTS_ANSWERS, FINDER_STEPS, SHOP_FEELS, addAllToWishlist, addToBag, filterShop, finderResult, finderSummary,
  formatINR, getState, imgUrl, liveProducts, makerById, productById, productByName, productBySlug, setBagOpen, setFinderAnswer,
  submitBrief, subscribe, toggleWishlist, update, type PriceBand, type ShopFilters, type ShopSort, TODAY,
} from '../store';
import { canDeliver, stateFromPincode, type FinderAnswers, type NeedBy } from '../domain';
import type { DemoProduct } from '../catalog';
import { requestOpenBea } from '../BeaPopover';
import { sampleApi, submitSampleCorporateEnquiry } from '../sample-api';

const HEART_FILLED = 'currentColor';

function paintHeart(el: Element | null, saved: boolean) {
  const path = el?.querySelector('path');
  if (path) path.setAttribute('fill', saved ? HEART_FILLED : 'none');
  if (el && el.tagName === 'BUTTON') el.setAttribute('aria-pressed', String(saved));
}

function bagAndOpen(id: string, qty = 1) { update(s => addToBag(s, id, qty)); setBagOpen(true); }

/* ------------------------------------------------------------------ Main */
export function hydrateMain(ctx: Ctx) {
  const { root } = ctx;
  const finderTeaser = byText(root, 'p', /^The gift finder,/);
  if (finderTeaser) finderTeaser.textContent = 'Meet Bea, your gifting concierge';
  const paint = () => {
    const s = getState();
    $$<HTMLButtonElement>(root, 'button[aria-label^="Save "]').forEach(b => {
      const name = (b.getAttribute('aria-label') ?? '').replace(/^Save /, '').replace(/ to wishlist$/, '');
      const p = productByName(s, name); if (p) paintHeart(b, s.wishlist.includes(p.id));
    });
  };
  $$<HTMLButtonElement>(root, 'button[aria-label]').forEach(b => {
    const label = b.getAttribute('aria-label') ?? '';
    const add = label.match(/^Add (.+) to bag$/); const save = label.match(/^Save (.+) to wishlist$/);
    const p = productByName(getState(), (add ?? save)?.[1] ?? '');
    if (!p) return;
    if (add) { tid(b, `button-add-${p.slug}`); on(ctx, b, 'click', e => { e.preventDefault(); bagAndOpen(p.id); }); }
    if (save) { tid(b, `button-wishlist-${p.slug}`); on(ctx, b, 'click', e => { e.preventDefault(); update(s => toggleWishlist(s, p.id)); }); }
  });
  paint(); ctx.cleanups.push(subscribe(paint));
  // "Who are you shopping for?" cards start the finder with that answer.
  const finder = $(root, 'section#finder');
  if (finder) {
    const keys = ['parent', 'partner', 'friend', 'colleague', 'self'];
    $$<HTMLAnchorElement>(finder, 'a.lift').forEach((a, i) => {
      tid(a, `link-finder-start-${keys[i]}`);
      on(ctx, a, 'click', e => { e.preventDefault(); e.stopPropagation(); update(s => ({ ...setFinderAnswer(s, 'recipient', keys[i]), finder: { ...s.finder, answers: { recipient: keys[i] as FinderAnswers['recipient'] }, done: false, query: '' } })); requestOpenBea({ recipient: keys[i] as FinderAnswers['recipient'], step: 1 }); });
    });
  }
  // product tiles in the Edit: whole tile opens the product
  $$<HTMLElement>(root, 'section#edit div.lift').forEach(tile => {
    const img = $(tile, 'img'); const p = img && productByName(getState(), img.getAttribute('alt') ?? '');
    if (!p) return;
    tid(tile, `card-product-${p.slug}`);
    tile.style.cursor = 'pointer';
    on(ctx, tile, 'click', e => { if ((e.target as Element).closest('button')) return; ctx.navigate(`/product/${p.slug}`); });
  });
}

/* ------------------------------------------------------------------ Shop */
export function hydrateShop(ctx: Ctx) {
  const { root } = ctx;
  const filters = $(root, 'section[aria-label="Filters"]');
  if (!filters) return;
  const pills = $$<HTMLButtonElement>(filters, 'button[aria-pressed]');
  const activeStyle = styleOf(pills.find(p => p.getAttribute('aria-pressed') === 'true'));
  const idleStyle = styleOf(pills.find(p => p.getAttribute('aria-pressed') === 'false'));
  const selects = $$<HTMLSelectElement>(filters, 'select');
  const [priceSel, makerSel, sortSel] = selects;
  const fast = $<HTMLInputElement>(filters, 'input[type="checkbox"]');
  tid(priceSel, 'select-price'); tid(makerSel, 'select-maker'); tid(sortSel, 'select-sort'); tid(fast, 'checkbox-fast');
  ['any', 'under1500', '1500to3500', '3500plus'].forEach((v, i) => { if (priceSel?.options[i]) priceSel.options[i].value = v; });
  ['all', 'Tathaastu', 'Mushhk', 'Svara', 'Anirveda'].forEach((v, i) => { if (makerSel?.options[i]) makerSel.options[i].value = v; });
  ['editor', 'priceAsc', 'priceDesc', 'newest'].forEach((v, i) => { if (sortSel?.options[i]) sortSel.options[i].value = v; });

  const firstCard = $<HTMLAnchorElement>(root, 'a[data-route^="/product/"]');
  const grid = firstCard?.parentElement;
  if (!grid || !firstCard) return;
  const cards = $$<HTMLAnchorElement>(grid, 'a[data-route^="/product/"]');
  const tplBadge = cards.find(c => $$(c, ':scope > span:first-child > span').length >= 2)!;
  const makerCard = $<HTMLAnchorElement>(grid, 'a[data-route^="/makers/"]');
  tid(makerCard, 'card-maker-spotlight');
  const moreLink = byText<HTMLAnchorElement>(root, 'a', /^Show \d+ more pieces$/);
  tid(moreLink, 'button-show-more');
  const intro = $(root, 'section h1');
  let countP = byText(root, 'p', /handmade pieces from/);
  if (!countP && intro) {
    countP = document.createElement('p');
    countP.setAttribute('style', 'margin: 0; font-family: Jost, Georgia, serif; font-size: 13px; color: #34514B');
    intro.before(countP);
  }
  tid(countP, 'text-shop-count');
  const emptyBox = document.createElement('div');
  emptyBox.setAttribute('data-testid', 'empty-shop');
  emptyBox.setAttribute('style', 'grid-column: 1 / -1; background: #FFFDF9; border-radius: 28px; padding: 36px; text-align: center; font-size: 20px; color: #71645E');

  const requestedFeel = ctx.search.get('feel') ?? 'all';
  const initialFeel = SHOP_FEELS.find(option => option.feel === requestedFeel)?.feel ?? 'all';
  const f: ShopFilters = { feel: initialFeel, price: 'any', maker: 'all', fast: false, sort: 'editor', q: ctx.search.get('q') ?? '', wishlistOnly: ctx.search.get('wishlist') === '1' };
  let showAll = false;

  const buildCard = (p: DemoProduct) => {
    const c = cloneEl(tplBadge);
    const s = getState();
    c.setAttribute('href', `${import.meta.env.BASE_URL.replace(/\/$/, '')}/product/${p.slug}`);
    c.setAttribute('data-route', `/product/${p.slug}`);
    tid(c, `card-product-${p.slug}`);
    const media = c.firstElementChild!; const img = $<HTMLImageElement>(media, 'img')!;
    img.src = imgUrl(p.img); img.alt = p.name;
    const spans = $$(media, ':scope > span');
    const badge = spans[0], heart = spans[spans.length - 1];
    if (p.badge) badge.textContent = p.badge; else badge.remove();
    heart.setAttribute('role', 'button'); heart.setAttribute('tabindex', '0');
    heart.setAttribute('aria-label', `Save ${p.name} to wishlist`);
    tid(heart, `button-wishlist-${p.slug}`);
    paintHeart(heart, s.wishlist.includes(p.id));
    heart.setAttribute('aria-pressed', String(s.wishlist.includes(p.id)));
    const toggle = (e: Event) => { e.preventDefault(); e.stopPropagation(); update(st => toggleWishlist(st, p.id)); };
    heart.addEventListener('click', toggle);
    heart.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') toggle(e); });
    const info = c.children[1];
    const leaf = $$(info, 'span').filter(x => !x.children.length);
    leaf[0].textContent = makerById(s, p.makerId)?.brand ?? '';
    leaf[1].textContent = p.name;
    leaf[2].textContent = formatINR(p.pricePaise);
    leaf[3].textContent = `Ships in ${p.dispatchDays} days`;
    tid(leaf[2], `text-price-${p.slug}`);
    return c;
  };

  const render = () => {
    const s = getState();
    pillGroup(pills, activeStyle, idleStyle, SHOP_FEELS.findIndex(x => x.feel === f.feel));
    const list = filterShop(s, f);
    const shown = showAll ? list : list.slice(0, 8);
    grid.replaceChildren();
    shown.forEach((p, i) => { grid.appendChild(buildCard(p)); if (i === 3 && makerCard && f.feel === 'all' && !f.q && !f.wishlistOnly) grid.appendChild(makerCard); });
    if (!list.length) {
      emptyBox.innerHTML = '';
      const t = document.createElement('p'); t.style.margin = '0 0 16px';
      t.textContent = f.wishlistOnly ? 'Nothing saved yet. Tap the heart on anything you love.' : 'Nothing matches all of those. Try another feeling or price.';
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('style', BTN_OUTLINE); b.textContent = 'Show everything';
      tid(b, 'button-clear-filters');
      b.onclick = () => { Object.assign(f, { feel: 'all', price: 'any', maker: 'all', fast: false, q: '', wishlistOnly: false }); if (priceSel) priceSel.value = 'any'; if (makerSel) makerSel.value = 'all'; if (fast) fast.checked = false; render(); };
      emptyBox.append(t, b); grid.appendChild(emptyBox);
    }
    const remaining = list.length - shown.length;
    if (moreLink) { moreLink.textContent = `Show ${remaining} more pieces`; moreLink.parentElement!.style.display = remaining > 0 ? '' : 'none'; }
    const makers = new Set(list.map(p => p.makerId)).size;
    if (countP) countP.textContent = `${list.length} handmade piece${list.length === 1 ? '' : 's'} from ${makers} maker${makers === 1 ? '' : 's'}`;
    if (intro) intro.setAttribute('data-filter', f.wishlistOnly ? 'wishlist' : f.q ? 'search' : 'all');
  };
  pills.forEach((b, i) => { tid(b, `button-feel-${SHOP_FEELS[i]?.feel}`); on(ctx, b, 'click', () => { f.feel = SHOP_FEELS[i].feel; render(); }); });
  on(ctx, priceSel, 'change', () => { f.price = priceSel!.value as PriceBand; render(); });
  on(ctx, makerSel, 'change', () => { f.maker = makerSel!.value; render(); });
  on(ctx, sortSel, 'change', () => { f.sort = sortSel!.value as ShopSort; render(); });
  on(ctx, fast, 'change', () => { f.fast = !!fast?.checked; render(); });
  on(ctx, moreLink, 'click', e => { e.preventDefault(); e.stopPropagation(); showAll = true; render(); });
  if (f.q) { const hq = $<HTMLInputElement>(root, '#hq'); if (hq) hq.value = f.q; }
  render();
  ctx.cleanups.push(subscribe(render));
}

/* ------------------------------------------------------------------ Product */
export function hydrateProduct(ctx: Ctx) {
  const { root } = ctx;
  const s0 = getState();
  const p = productBySlug(s0, ctx.params.slug ?? 'blue-lotus-pond') ?? productBySlug(s0, 'blue-lotus-pond')!;
  const m = makerById(s0, p.makerId)!;
  const isSource = p.id === 't-bluelotus';
  const mainImg = $<HTMLImageElement>(root, 'section img');
  const thumbs = $$<HTMLButtonElement>(root, 'button[aria-label^="Photo "]');
  const h1 = $(root, 'h1');
  const priceSpan = h1?.nextElementSibling?.firstElementChild as HTMLElement | null;
  tid(h1, 'text-product-name'); tid(priceSpan, 'text-product-price'); tid(mainImg, 'img-product-main');

  if (!isSource) {
    const others = liveProducts(s0).filter(x => x.makerId === p.makerId && x.id !== p.id).map(x => x.img);
    const photos = [p.img, ...others].slice(0, 3);
    thumbs.forEach((t, i) => { const im = $<HTMLImageElement>(t, 'img'); if (photos[i] && im) im.src = imgUrl(photos[i]); else t.remove(); });
    if (mainImg) { mainImg.src = imgUrl(p.img); mainImg.alt = `${p.name} by ${m.brand}`; }
    if (h1) h1.textContent = p.name;
    if (priceSpan) priceSpan.textContent = formatINR(p.pricePaise);
    const crumb = $(root, 'nav[aria-label="Breadcrumb"]');
    if (crumb) { const last = crumb.lastChild; if (last) last.textContent = ` ${p.name}`; const ml = $$(crumb, 'a')[1]; if (ml) ml.textContent = m.brand; }
    const makerLink = $$<HTMLAnchorElement>(root, 'section a[data-route^="/makers/"]')[0];
    if (makerLink) { const im = $<HTMLImageElement>(makerLink, 'img'); if (im) im.src = imgUrl(m.img); makerLink.lastChild!.textContent = m.brand; const tag = makerLink.nextElementSibling as HTMLElement | null; if (tag && m.id !== 'm1') tag.remove(); }
    const desc = h1?.nextElementSibling?.nextElementSibling;
    if (desc) desc.textContent = m.bio;
    const chips = desc?.nextElementSibling;
    if (chips) { const c = $$(chips, 'span'); if (c[0]) c[0].textContent = p.material; if (c[1]) c[1].textContent = p.technique; if (c[2]) c[2].textContent = p.madeToOrder ? `Made to order, dispatched within ${p.dispatchDays} days` : `Dispatched within ${p.dispatchDays} days`; }
    const story = byText(root, 'p', 'The story behind it')?.closest('section');
    if (story && m.id !== 'm1') {
      const h2 = $(story, 'h2'); if (h2) h2.textContent = m.tagline;
      const ps = $$(story, 'p').filter(x => norm(x.textContent) !== 'The story behind it');
      if (ps[0]) ps[0].textContent = m.story; if (ps[1]) ps[1].textContent = m.bio;
      const a = $(story, 'a[data-route^="/makers/"]'); if (a) a.textContent = `Read ${m.brand}’s full story →`;
    }
    const pairs = byText(root, 'h2', 'Pairs beautifully with')?.parentElement;
    if (pairs) {
      const tiles = $$<HTMLAnchorElement>(pairs, 'a[data-route^="/product/"]');
      const alt = liveProducts(s0).filter(x => x.id !== p.id && x.makerId !== p.makerId).slice(0, tiles.length);
      tiles.forEach((t, i) => { const x = alt[i]; if (!x) return; const im = $<HTMLImageElement>(t, 'img')!; im.src = imgUrl(x.img); im.alt = x.name; const leaf = $$(t, 'span').filter(e => !e.children.length); leaf[0].textContent = makerById(s0, x.makerId)!.brand; leaf[1].textContent = x.name; leaf[2].textContent = formatINR(x.pricePaise); t.setAttribute('data-route', `/product/${x.slug}`); });
    }
  }
  // "Pairs beautifully with" tiles route to their own product.
  $$<HTMLAnchorElement>(root, 'a[data-route^="/product/"]').forEach(a => {
    const name = $(a, 'img')?.getAttribute('alt'); const x = name ? productByName(s0, name) : null;
    if (x) { a.setAttribute('data-route', `/product/${x.slug}`); tid(a, `card-product-${x.slug}`); }
  });

  // photo thumbnails
  const activeT = styleOf(thumbs[0]); const idleT = styleOf(thumbs[1]) || activeT.replace('3px solid #752F43', '3px solid transparent');
  thumbs.forEach((t, i) => {
    tid(t, `button-photo-${i + 1}`);
    on(ctx, t, 'click', () => {
      const src = $<HTMLImageElement>(t, 'img')?.src; if (src && mainImg) mainImg.src = src;
      thumbs.forEach((x, j) => { setStyle(x, j === i ? activeT : idleT); x.setAttribute('aria-pressed', String(j === i)); });
    });
  });

  // quantity and add to bag
  const minus = $<HTMLButtonElement>(root, 'button[aria-label="One fewer"]');
  const plus = $<HTMLButtonElement>(root, 'button[aria-label="One more"]');
  const qtySpan = minus?.nextElementSibling as HTMLElement | null;
  const addLink = byText<HTMLAnchorElement>(root, 'a', /^Add to bag, /);
  const wishBtn = $<HTMLButtonElement>(root, 'button[aria-label="Save to wishlist"]');
  tid(minus, 'button-qty-minus'); tid(plus, 'button-qty-plus'); tid(qtySpan, 'text-qty'); tid(addLink, 'button-add-to-bag'); tid(wishBtn, 'button-save-wishlist');
  let qty = 1;
  const cap = () => (p.madeToOrder ? 20 : Math.max(1, productById(getState(), p.id)?.stock ?? 1));
  const paintQty = () => {
    if (qtySpan) qtySpan.textContent = String(qty);
    if (addLink) addLink.textContent = `Add to bag, ${formatINR(p.pricePaise * qty)}`;
    if (minus) minus.disabled = qty <= 1;
    if (plus) plus.disabled = qty >= cap();
  };
  on(ctx, minus, 'click', () => { qty = Math.max(1, qty - 1); paintQty(); });
  on(ctx, plus, 'click', () => { qty = Math.min(cap(), qty + 1); paintQty(); });
  on(ctx, addLink, 'click', e => { e.preventDefault(); e.stopPropagation(); bagAndOpen(p.id, qty); });
  on(ctx, wishBtn, 'click', () => update(s => toggleWishlist(s, p.id)));
  const paintWish = () => paintHeart(wishBtn, getState().wishlist.includes(p.id));
  paintQty(); paintWish(); ctx.cleanups.push(subscribe(paintWish));

  // delivery check
  const pin = $<HTMLInputElement>(root, '#pin');
  const check = pin?.parentElement?.querySelector('button') ?? null;
  const msg = pin?.parentElement?.nextElementSibling as HTMLElement | null;
  tid(pin, 'input-pin'); tid(check, 'button-check-pin'); tid(msg, 'text-delivery');
  const okColor = msg ? msg.style.color : '#2C4640';
  if (!isSource && msg) msg.textContent = `Usually dispatched within ${p.dispatchDays} days; the courier confirms the date at checkout.`;
  on(ctx, check, 'click', () => {
    if (!pin || !msg) return;
    const st = stateFromPincode(pin.value.trim());
    if (!st) { msg.textContent = 'Enter a valid 6-digit PIN code.'; msg.style.color = '#752F43'; return; }
    msg.style.color = okColor;
    msg.textContent = canDeliver(m, st)
      ? `Delivers to ${st}. Usually dispatched within ${p.dispatchDays} days; the courier confirms the date at checkout.`
      : `Sorry, ${m.brand} can’t deliver to ${st} yet.`;
    if (!canDeliver(m, st)) msg.style.color = '#752F43';
  });
  on(ctx, pin, 'keydown', e => { if ((e as KeyboardEvent).key === 'Enter') check?.click(); });
}

/* ------------------------------------------------------------------ Finder */
export function hydrateFinder(ctx: Ctx) {
  const { root } = ctx;
  const counter = byText(root, 'p', /^Question \d of 4$/);
  const skip = byText<HTMLAnchorElement>(root, 'a', 'Skip and see all gifts');
  const bars = $$(counter?.parentElement?.nextElementSibling ?? root, 'span');
  const onBar = styleOf(bars[0]); const offBar = styleOf(bars[1]);
  const h1 = $(root, 'h1'); const em = h1 && $(h1, 'em'); const emStyle = styleOf(em);
  const optWrap = h1?.nextElementSibling as HTMLElement | null;
  const optTpl = optWrap && cloneEl($<HTMLButtonElement>(optWrap, 'button')!);
  const foot = optWrap?.nextElementSibling as HTMLElement | null;
  const card = counter?.parentElement?.parentElement;
  const intro = document.createElement('div');
  intro.className = 'bt-bea-intro';
  intro.innerHTML = '<span>BEA · YOUR GIFTING CONCIERGE</span><p>I’ll help you find a thoughtful gift from the Baksa Tales catalogue. Choose a reply and I’ll narrow it down.</p>';
  const freeText = document.createElement('details');
  freeText.className = 'bt-bea-free-text';
  freeText.innerHTML = '<summary>Or ask Bea in your own words</summary><form><label for="bea-message">What are you looking for?</label><textarea id="bea-message" data-testid="input-bea-message" maxlength="500" required placeholder="For example: a birthday gift for my mother under ₹1,500"></textarea><button type="submit" data-testid="button-bea-send">Ask Bea</button><p class="bt-bea-disclosure">Sample concierge: uses your words to filter the sample catalogue. It does not use an AI service.</p><p class="bt-bea-error" role="alert" hidden></p></form>';
  intro.appendChild(freeText);
  card?.insertBefore(intro, counter?.parentElement ?? null);
  const transcript = document.createElement('div');
  transcript.className = 'bt-bea-transcript';
  transcript.setAttribute('role', 'log');
  transcript.setAttribute('aria-label', 'Your conversation with Bea');
  h1?.before(transcript);
  tid(counter, 'text-question-count'); tid(skip, 'link-skip-finder'); tid(h1, 'text-question');
  if (skip) skip.textContent = 'Browse the catalogue instead';
  on(ctx, skip, 'click', event => {
    event.preventDefault();
    event.stopPropagation();
    update(s => ({ ...s, finder: { ...s.finder, done: true, query: '' } }));
    ctx.navigate('/results');
  });
  const back = document.createElement('button');
  back.type = 'button'; back.textContent = 'Back'; tid(back, 'button-finder-back');
  back.setAttribute('style', 'min-height: 44px; padding: 0 18px; border-radius: 999px; border: 1.5px solid #752F43; background: transparent; color: #752F43; font-family: Jost, Georgia, serif; font-size: 13px; cursor: pointer; margin-bottom: 12px');
  foot?.prepend(back);
  if (foot) foot.style.display = 'flex', foot.style.flexDirection = 'column', foot.style.alignItems = 'flex-start';

  const startStep = Number(ctx.search.get('step') ?? '1');
  let step = Math.min(4, Math.max(1, Number.isFinite(startStep) ? startStep : 1)) - 1;
  if (step === 0 && !ctx.search.get('step')) update(s => ({ ...s, finder: { ...s.finder, answers: {}, done: false, query: '' } }));

  const freeForm = $<HTMLFormElement>(freeText, 'form')!;
  const freeInput = $<HTMLTextAreaElement>(freeForm, 'textarea')!;
  const freeError = $<HTMLParagraphElement>(freeForm, '[role="alert"]')!;
  on(ctx, freeForm, 'submit', event => {
    event.preventDefault();
    const query = freeInput.value.trim();
    if (query.length < 3) { freeError.textContent = 'Tell Bea a little more about the gift.'; freeError.hidden = false; return; }
    const text = query.toLowerCase();
    const answers: Partial<FinderAnswers> = {};
    if (/\b(mum|mom|mother|father|dad|parent)\b/.test(text)) answers.recipient = 'parent';
    else if (/\b(wife|husband|partner|girlfriend|boyfriend)\b/.test(text)) answers.recipient = 'partner';
    else if (/\b(friend|bestie)\b/.test(text)) answers.recipient = 'friend';
    else if (/\b(colleague|client|coworker|boss)\b/.test(text)) answers.recipient = 'colleague';
    else if (/\bmyself|for me\b/.test(text)) answers.recipient = 'self';
    if (/\bdiwali|festival\b/.test(text)) answers.occasion = 'diwali';
    else if (/\bwedding|marriage\b/.test(text)) answers.occasion = 'wedding';
    else if (/\bbirthday|bday\b/.test(text)) answers.occasion = 'birthday';
    else if (/\bthank|thanks|gratitude\b/.test(text)) answers.occasion = 'thanks';
    else if (/\bhousewarming|new home\b/.test(text)) answers.occasion = 'housewarming';
    if (/\brelax|calm|soothe|unwind\b/.test(text)) answers.feel = 'soother';
    else if (/\buseful|practical|everyday\b/.test(text)) answers.feel = 'thoughtful';
    else if (/\bsurprise|special|memorable|showstopper\b/.test(text)) answers.feel = 'showstopper';
    else if (/\bpersonal|heartfelt|meaningful\b/.test(text)) answers.feel = 'heart';
    const amountMatch = text.match(/(?:under|below|less than|up to|upto|max(?:imum)?|budget(?: is)?)[^\d]{0,12}(\d[\d,]*)/);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : null;
    if (amount !== null && amount > 0) answers.budget = amount < 1500 ? 'b1' : amount < 3500 ? 'b2' : amount < 8000 ? 'b3' : 'b4';
    freeError.hidden = true;
    update(s => ({ ...s, finder: { ...s.finder, answers, query, done: true } }));
    ctx.navigate('/results');
  });

  const render = () => {
    const st = FINDER_STEPS[step];
    const ans = getState().finder.answers as Record<string, string>;
    transcript.replaceChildren();
    for (let index = 0; index < step; index += 1) {
      const past = FINDER_STEPS[index];
      const selected = past.opts.find(([value]) => value === ans[past.key]);
      if (!selected) continue;
      const pair = document.createElement('div');
      pair.className = 'bt-bea-turn';
      const question = document.createElement('p');
      question.className = 'bt-bea-message';
      question.textContent = `${past.q[0]}${past.q[1]}`;
      const answer = document.createElement('p');
      answer.className = 'bt-bea-reply';
      answer.textContent = selected[1];
      pair.append(question, answer);
      transcript.appendChild(pair);
    }
    if (counter) counter.textContent = `Question ${step + 1} of 4`;
    bars.forEach((b, i) => setStyle(b, i <= step ? onBar : offBar));
    if (h1) { h1.textContent = st.q[0]; const e = document.createElement('em'); e.setAttribute('style', emStyle); e.textContent = st.q[1]; h1.appendChild(e); }
    if (optWrap && optTpl) {
      optWrap.replaceChildren(...st.opts.map(([value, label], i) => {
        const b = cloneEl(optTpl);
        const sp = $$(b, 'span'); sp[0].textContent = String(i + 1); sp[sp.length - 1].textContent = label;
        tid(b, `button-option-${value}`);
        b.setAttribute('aria-pressed', String(ans[st.key] === value));
        if (ans[st.key] === value) { b.style.outline = '3px solid #752F43'; b.style.outlineOffset = '-3px'; }
        b.addEventListener('click', () => {
          update(s => setFinderAnswer(s, st.key, value));
          if (step < 3) { step += 1; render(); }
          else { update(s => ({ ...s, finder: { ...s.finder, done: true, query: '' } })); ctx.navigate('/results'); }
        });
        return b;
      }));
    }
    back.style.display = step > 0 ? '' : 'none';
  };
  on(ctx, back, 'click', () => { step = Math.max(0, step - 1); render(); });
  render();
}

/* ------------------------------------------------------------------ Results */
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
export function hydrateResults(ctx: Ctx) {
  const { root } = ctx;
  const h1 = $(root, 'h1'); const em = h1 && $(h1, 'em'); const emStyle = styleOf(em);
  const summary = byText(root, 'p', /Change answers/);
  const finderEyebrow = byText(root, 'p', 'Your gift finder picks');
  if (finderEyebrow) finderEyebrow.textContent = 'Bea’s gift picks';
  const [budgetSel, needSel] = $$<HTMLSelectElement>(root, 'section select');
  const hiddenP = byText(root, 'p', /^Not shown:/);
  const articles = $$<HTMLElement>(root, 'article');
  const list = articles[0]?.parentElement;
  const tpl = articles[0] && cloneEl(articles[0]);
  const liTpl = tpl && cloneEl($<HTMLLIElement>(tpl, 'li')!);
  const saveAll = byText<HTMLButtonElement>(root, 'button', 'Save all to my wishlist');
  const share = byText<HTMLButtonElement>(root, 'button', 'Share the list on WhatsApp');
  tid(h1, 'text-results-heading'); tid(budgetSel, 'select-budget'); tid(needSel, 'select-needed'); tid(hiddenP, 'text-hidden-count'); tid(saveAll, 'button-save-all'); tid(share, 'button-share-whatsapp'); tid(summary, 'text-results-summary');
  if (budgetSel) budgetSel.innerHTML = FINDER_STEPS[3].opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  if (needSel) ['any', 'd10', 'd5'].forEach((v, i) => { if (needSel.options[i]) needSel.options[i].value = v; });

  const answers = (): FinderAnswers => {
    const s = getState();
    const a = s.finder.answers;
    if (s.finder.query) return { ...a, budget: (a.budget ?? 'b4') } as FinderAnswers;
    return a.budget || a.recipient || a.occasion || a.feel ? { ...DEFAULT_RESULTS_ANSWERS, ...a, budget: (a.budget ?? 'b4') } as FinderAnswers : DEFAULT_RESULTS_ANSWERS;
  };
  let ids: string[] = [];
  const render = () => {
    const s = getState(); const a = answers();
    if (budgetSel) budgetSel.value = a.budget;
    if (needSel) needSel.value = s.finder.needBy;
    const r = finderResult(s, a, s.finder.needBy);
    const recs = r.picks.length ? r.picks : r.nearMisses;
    const query = s.finder.query.trim().toLowerCase();
    if (query) {
      const words = query.split(/[^a-z0-9]+/).filter(word => word.length > 2 && !['under', 'with', 'for', 'and', 'the', 'gift', 'her', 'him'].includes(word));
      recs.sort((a, b) => {
        const score = (id: string) => {
          const p = productById(s, id)!;
          const maker = makerById(s, p.makerId)?.brand ?? '';
          const text = `${p.name} ${p.story ?? ''} ${p.material} ${p.technique} ${maker}`.toLowerCase();
          return words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
        };
        return score(b.productId) - score(a.productId);
      });
    }
    ids = recs.map(x => x.productId);
    if (h1) {
      h1.textContent = r.picks.length ? `Bea found ${WORDS[r.picks.length].toLowerCase()} gift${r.picks.length === 1 ? ' ' : 's '}` : 'Bea’s closest ';
      const e = document.createElement('em'); e.setAttribute('style', emStyle); e.textContent = r.picks.length ? (r.picks.length === 1 ? 'that fits.' : 'that fit.') : 'options.'; h1.appendChild(e);
    }
    if (summary?.firstChild) summary.firstChild.textContent = s.finder.query ? `Bea read: “${s.finder.query}”. ` : `${finderSummary(a)} `;
    const h = r.hidden; const parts: string[] = [];
    if (h.notInTime) parts.push(`${h.notInTime} that can’t be dispatched in time`);
    if (h.outOfStock) parts.push(`${h.outOfStock} out of stock`);
    if (h.overBudget) parts.push(`${h.overBudget} over budget`);
    if (h.notDeliverable) parts.push(`${h.notDeliverable} that can’t be delivered to you`);
    if (hiddenP) { hiddenP.textContent = parts.length ? `Not shown: ${parts.join(', ')}.` : ''; hiddenP.style.display = parts.length ? '' : 'none'; }
    if (!list || !tpl || !liTpl) return;
    list.replaceChildren(...recs.map((rec, i) => {
      const p = productById(s, rec.productId)!; const art = cloneEl(tpl);
      tid(art, `card-result-${p.slug}`);
      const img = $<HTMLImageElement>(art, 'img')!; img.src = imgUrl(p.img); img.alt = p.name;
      const rank = img.nextElementSibling; if (rank) rank.textContent = String(i + 1);
      const maker = $(art, 'p'); if (maker) maker.textContent = makerById(s, p.makerId)?.brand ?? '';
      const h2 = $(art, 'h2'); if (h2) h2.textContent = p.name;
      const ul = $(art, 'ul')!;
      ul.replaceChildren(...rec.reasons.map(reason => {
        const li = cloneEl(liTpl); const [dot, txt] = $$(li, 'span');
        txt.textContent = reason.text;
        if (reason.kind === 'partial') { dot.style.background = '#B08A55'; dot.style.borderColor = '#B08A55'; }
        if (reason.kind === 'info') { dot.style.background = 'transparent'; dot.style.borderColor = '#34514B'; txt.style.color = '#71645E'; }
        return li;
      }));
      const [add, details] = $$<HTMLAnchorElement>(art, 'a');
      if (add) { add.textContent = `Add to bag, ${formatINR(p.pricePaise)}`; tid(add, `button-add-${p.slug}`); add.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); bagAndOpen(p.id); }); }
      if (details) { details.setAttribute('data-route', `/product/${p.slug}`); tid(details, `link-details-${p.slug}`); }
      return art;
    }));
    if (!recs.length) {
      const box = document.createElement('div'); tid(box, 'empty-results');
      box.setAttribute('style', 'background: #FFFDF9; border-radius: 28px; padding: 36px; font-size: 20px; color: #71645E');
      box.textContent = 'Nothing fits all of that yet. Try a wider budget or no rush, or browse the whole Edit.';
      list.appendChild(box);
    }
    if (saveAll) { const all = ids.length > 0 && ids.every(id => s.wishlist.includes(id)); saveAll.textContent = all ? 'Saved to your wishlist' : 'Save all to my wishlist'; saveAll.disabled = !ids.length; }
  };
  on(ctx, budgetSel, 'change', () => update(s => setFinderAnswer({ ...s, finder: { ...s.finder, answers: { ...answers() } } }, 'budget', budgetSel!.value)));
  on(ctx, needSel, 'change', () => update(s => ({ ...s, finder: { ...s.finder, answers: { ...answers() }, needBy: needSel!.value as NeedBy } })));
  on(ctx, saveAll, 'click', () => update(s => addAllToWishlist(s, ids)));
  on(ctx, share, 'click', () => {
    const s = getState();
    const text = ['My Baksa Tales gift list:', ...ids.map(id => { const p = productById(s, id)!; return `${p.name}, ${formatINR(p.pricePaise)}`; })].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
  const quiz = byText<HTMLAnchorElement>(root, 'a', 'what kind of giver are you?'); tid(quiz, 'link-giver-quiz');
  render(); ctx.cleanups.push(subscribe(render));
}

/* ------------------------------------------------------------------ Corporate */
export function hydrateCorporate(ctx: Ctx) {
  const { root } = ctx;
  const form = $<HTMLFormElement>(root, 'section#brief form');
  if (!form) return;
  const get = (id: string) => $<HTMLInputElement>(form, `#${id}`)!;
  const ids = { purpose: 'b1', qty: 'b2', budget: 'b3', neededBy: 'b4', name: 'b5', company: 'b6', contact: 'b7' } as const;
  Object.entries(ids).forEach(([k, id]) => tid(get(id), `input-brief-${k}`));
  get('b4').min = TODAY;
  const submit = byText<HTMLButtonElement>(form, 'button', 'Send my brief');
  tid(submit, 'button-send-brief');
  const big = byText(root, 'p', /^Big order\?/)?.parentElement as HTMLElement | null;
  const paintBig = () => { if (big) big.style.display = Number(get('b2').value) >= 200 ? '' : 'none'; };
  on(ctx, get('b2'), 'input', paintBig);
  const send = async (e: Event) => {
    e.preventDefault();
    const input = { purpose: get('b1').value, qty: get('b2').value, budget: get('b3').value, neededBy: get('b4').value, name: get('b5').value, company: get('b6').value, contact: get('b7').value };
    const s = getState();
    const r = submitBrief(s, input);
    (Object.keys(ids) as (keyof typeof ids)[]).forEach(k => fieldError(get(ids[k]), r.errors[k], `error-brief-${k}`));
    if (!r.ok) { const first = (Object.keys(ids) as (keyof typeof ids)[]).find(k => r.errors[k]); if (first) get(ids[first]).focus(); return; }
    if (submit) submit.disabled = true;
    let ref = r.ref!;
    try {
      const saved = await submitSampleCorporateEnquiry({ purpose: input.purpose.trim(), qty: Number(input.qty), budgetPaise: Math.round(Number(input.budget) * 100), neededBy: input.neededBy, name: input.name.trim(), company: input.company.trim(), contact: input.contact.trim() });
      ref = saved.ref;
      const savedState = {
        ...r.state,
        briefs: r.state.briefs.map(brief => brief.ref === r.ref ? { ...brief, ref } : brief),
        enquiries: r.state.enquiries.map(enquiry => enquiry.ref === r.ref ? { ...enquiry, ref } : enquiry),
      };
      update(() => savedState);
      fieldError(submit, null, 'error-brief-save');
    } catch (error) {
      fieldError(submit, error instanceof Error ? error.message : 'Your brief was not saved. Please try again.', 'error-brief-save');
      if (submit) submit.disabled = false;
      return;
    }
    const box = document.createElement('div');
    tid(box, 'brief-confirmation');
    box.setAttribute('role', 'status');
    box.setAttribute('style', 'grid-column: 1 / -1; background: #D5E6DE; border-radius: 28px; padding: 32px; color: #2C4640');
    box.innerHTML = `<p style="margin: 0; font-family: Jost, Georgia, serif; font-size: 13px">Brief received, ${ref}</p><h3 style="margin: 8px 0 0; font-size: 34px; font-weight: 500; color: #352C2B">Thank you, ${input.name.trim().replace(/[<>&]/g, '')}.</h3><p style="margin: 8px 0 0; font-size: 19px">Our gifting team will call you to talk it through. ${input.qty} gifts at about ${formatINR(Math.round(Number(input.budget) * 100))} each.</p>`;
    const again = document.createElement('button'); again.type = 'button'; again.textContent = 'Send another brief'; again.setAttribute('style', BTN_OUTLINE + '; margin-top: 18px'); tid(again, 'button-brief-again');
    again.onclick = () => { box.remove(); Array.from(form.children).forEach(c => ((c as HTMLElement).style.display = '')); get('b5').value = ''; get('b6').value = ''; get('b7').value = ''; paintBig(); };
    box.appendChild(again);
    Array.from(form.children).forEach(c => ((c as HTMLElement).style.display = 'none'));
    form.appendChild(box);
    if (submit) submit.disabled = false;
  };
  on(ctx, submit, 'click', send);
  on(ctx, form, 'submit', send);
  paintBig();
}

/* ------------------------------------------------------------------ Academy */
export function hydrateAcademy(ctx: Ctx) {
  const { root } = ctx;
  const tabs = $$<HTMLButtonElement>(root, 'div[aria-label="Filter classes"] button');
  const active = styleOf(tabs[0]); const idle = styleOf(tabs[1]);
  const articles = $$<HTMLElement>(root, 'article');
  const kinds = ['all', 'Recorded class', 'Live workshop'];
  tabs.forEach((t, i) => {
    tid(t, `tab-${['all', 'recorded', 'live'][i]}`);
    on(ctx, t, 'click', () => {
      pillGroup(tabs, active, idle, i);
      articles.forEach(a => { const k = norm($(a, 'span')?.textContent); setVisible(a, i === 0 || k === kinds[i]); });
    });
  });
  const paint = () => {
    const s = getState();
    articles.forEach(a => {
      const title = norm($(a, 'h2')?.textContent); const c = COURSES_BY_TITLE(s, title); if (!c) return;
      tid(a, `card-course-${c.id}`);
      const link = $<HTMLAnchorElement>(a, 'a'); if (!link) return;
      tid(link, `button-course-${c.id}`);
      if (c.format === 'Live workshop') link.textContent = s.registrations.includes(c.id) ? 'Seat requested' : 'Book a seat';
      else link.textContent = s.bag.some(l => l.id === c.id) ? 'In your bag' : s.registrations.includes(c.id) ? 'Bought' : 'Buy class';
    });
  };
  articles.forEach(a => {
    const link = $<HTMLAnchorElement>(a, 'a');
    on(ctx, link, 'click', e => {
      e.preventDefault(); e.stopPropagation();
      const c = COURSES_BY_TITLE(getState(), norm($(a, 'h2')?.textContent)); if (!c) return;
      if (c.format === 'Live workshop') update(s => ({ ...s, registrations: s.registrations.includes(c.id) ? s.registrations.filter(x => x !== c.id) : [...s.registrations, c.id] }));
      else { update(s => addToBag(s, c.id, 1, 'course')); setBagOpen(true); }
    });
  });
  const propose = $<HTMLAnchorElement>(root, 'a[href="#propose"]'); tid(propose, 'link-propose-class');
  on(ctx, propose, 'click', e => { e.preventDefault(); e.stopPropagation(); ctx.navigate('/maker/courses'); });
  paint(); ctx.cleanups.push(subscribe(paint));
}

/* ------------------------------------------------------------------ Maker story page */
export function hydrateMakerStory(ctx: Ctx) {
  const s = getState();
  $$<HTMLAnchorElement>(ctx.root, 'a[data-route^="/product/"]').forEach(a => {
    const name = $(a, 'img')?.getAttribute('alt') || norm(a.textContent);
    const p = productByName(s, name ?? '') ?? s.products.find(x => norm(a.textContent).includes(x.name));
    if (p) { a.setAttribute('data-route', `/product/${p.slug}`); tid(a, `card-product-${p.slug}`); }
  });
  hydrateMain(ctx);
}
