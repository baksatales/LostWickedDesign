import { $, $$, BTN_OUTLINE, byText, cloneEl, type Ctx, esc, fieldError, norm, on, pillGroup, setStyle, setVisible, styleOf, tid } from '../dom';
import {
  HEALTH_LABEL, ORDER_STEP_LABEL, TODAY, advanceOrder, emptyDraft, formatINR, getState, growthHealth, imgUrl, makerEarnings, makerOrders,
  productById, respondOpp, salePreview, setStock, submitProduct, subscribe, update, validateProposal, type ProductDraft,
} from '../store';
import { splitSale } from '../domain';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const d = (iso: string) => new Date(iso + 'T00:00:00Z');
export const shortDate = (iso: string) => `${d(iso).getUTCDate()} ${MONTHS[d(iso).getUTCMonth()]}`;
export const longDate = (iso: string) => `${DAYS[d(iso).getUTCDay()]} ${shortDate(iso)}`;
const minus = (p: number) => `− ${formatINR(p)}`;

/* ------------------------------------------------------------------ Home */
export function hydrateMakerHome(ctx: Ctx) {
  const { root } = ctx;
  const main = $(root, 'main') ?? root;
  const paint = () => {
    const s = getState(); const e = makerEarnings(s);
    const payout = byText(main, 'span', 'Next payout')?.nextElementSibling;
    if (payout) { const [amt, when] = $$(payout, 'span'); amt.textContent = formatINR(e.nextPayoutPaise); when.textContent = e.nextPayoutPaise ? `On ${longDate(e.nextPayoutDate)}` : 'Nothing due yet'; tid(amt, 'text-next-payout'); }
    const prod = byText(main, 'span', 'Products')?.nextElementSibling;
    if (prod) {
      const mine = s.products.filter(p => p.makerId === 'm1');
      const live = mine.filter(p => p.status === 'live').length, ch = mine.filter(p => p.status === 'changes').length, wait = mine.filter(p => p.status === 'review').length;
      const [a, b] = $$(prod, 'span'); a.textContent = `${live} live`; b.textContent = `${ch ? `${ch} needs changes` : 'none need changes'}, ${wait ? `${wait} waiting` : 'none waiting'}`;
    }
    const opp = byText(main, 'span', 'New opportunities')?.nextElementSibling;
    if (opp) { const open = s.opps.filter(o => o.makerId === 'm1' && o.status === 'open'); $$(opp, 'span')[0].textContent = String(open.length); }
    // attention items disappear once done
    const o1047 = s.orders.find(o => o.id === 'BT-1047'); const o1044 = s.orders.find(o => o.id === 'BT-1044'); const peony = s.products.find(p => p.id === 't-pinkpeony');
    const items: [RegExp, boolean][] = [[/^Pack order BT-1047/, o1047?.status === 'new'], [/^Add tracking for BT-1044/, o1044?.status === 'packed'], [/Pink Peony Tray/, peony?.status === 'changes']];
    let open = 0;
    items.forEach(([re, show]) => {
      const t = $$(root, 'section span > span:first-child').find(x => re.test(norm(x.textContent)));
      const textSpan = t?.parentElement; const icon = textSpan?.previousElementSibling as HTMLElement | null; const link = textSpan?.nextElementSibling as HTMLElement | null;
      [icon, textSpan, link].forEach(x => setVisible(x as HTMLElement | null, show));
      if (show) open++;
    });
    const cnt = byText(root, 'span', /things? today$/); if (cnt) cnt.textContent = open ? `${open} thing${open === 1 ? '' : 's'} today` : 'All done today';
  };
  paint(); ctx.cleanups.push(subscribe(paint));
}

/* ------------------------------------------------------------------ Orders */
export function hydrateMakerOrders(ctx: Ctx) {
  const { root } = ctx;
  const filters = $$<HTMLButtonElement>(root, 'div[aria-label="Filter orders"] button');
  const fActive = styleOf(filters[0]), fIdle = styleOf(filters[1]);
  const arts = $$<HTMLElement>(root, 'main article');
  const tpl = { new: cloneEl(arts[0]), packed: cloneEl(arts[1]), dispatched: cloneEl(arts[2]) };
  const note = arts[3]; const list = arts[0].parentElement!;
  arts.slice(0, 3).forEach(a => a.remove());
  const chip = { new: styleOf($$(tpl.new, 'span')[1]), packed: styleOf($$(tpl.packed, 'span')[1]), dispatched: styleOf($$(tpl.dispatched, 'span')[1]) };
  const stepOn = styleOf($$(tpl.packed, 'div > span')[0]);
  const stepOff = styleOf(byText(tpl.packed, 'span', 'On the way'));
  const keys = ['all', 'new', 'packed', 'dispatched', 'delivered'] as const;
  let filter: (typeof keys)[number] = 'all';
  const errors: Record<string, string> = {};

  const render = () => {
    const s = getState(); const mine = makerOrders(s);
    const count = (k: string) => mine.filter(o => k === 'all' || o.status === k).length;
    const labels = ['All', 'To pack', 'To dispatch', 'On the way', 'Delivered'];
    filters.forEach((b, i) => { b.textContent = `${labels[i]} (${count(keys[i])})`; tid(b, `button-filter-${keys[i]}`); });
    pillGroup(filters, fActive, fIdle, keys.indexOf(filter));
    $$(list, 'article[data-order]').forEach(a => a.remove());
    const order = ['new', 'packed', 'dispatched', 'problem', 'delivered'];
    const shown = mine.filter(o => filter === 'all' || o.status === filter).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.date.localeCompare(a.date));
    shown.forEach(o => {
      const p = productById(s, o.productId)!;
      const base = o.status === 'new' ? tpl.new : o.status === 'packed' ? tpl.packed : tpl.dispatched;
      const a = cloneEl(base); a.setAttribute('data-order', o.id); tid(a, `card-order-${o.id}`);
      $<HTMLImageElement>(a, 'img')!.src = imgUrl(p.img);
      const spans = $$(a, 'span'); spans[0].textContent = o.id;
      const st = spans[1]; st.textContent = ORDER_STEP_LABEL[o.status]; tid(st, `status-order-${o.id}`);
      if (o.status === 'delivered') setStyle(st, chip.dispatched.replace(/background: [^;]+/, 'background: #D5E6DE').replace(/color: [^;]+/, 'color: #2C4640'));
      else if (o.status === 'problem') setStyle(st, chip.new.replace(/background: [^;]+/, 'background: #F7D9CF').replace(/color: [^;]+/, 'color: #8E2A22'));
      else setStyle(st, chip[o.status as 'new' | 'packed' | 'dispatched'] ?? chip.new);
      $(a, 'h2')!.textContent = `${p.name} × ${o.qty}`;
      $(a, 'h2 + p')!.textContent = o.status === 'dispatched' || o.status === 'delivered' ? `${o.customer}, ${o.city}. ${o.courier ? `${o.courier} ${o.tracking}` : `Ordered ${shortDate(o.date)}`}` : `${o.customer}, ${o.city}. Ordered ${shortDate(o.date)}`;
      const amount = $(a, 'h2')!.parentElement!.nextElementSibling; if (amount) amount.textContent = formatINR(o.amountPaise);
      const idx = { new: 0, packed: 1, dispatched: 2, delivered: 3, problem: 3 }[o.status as string] ?? 0;
      const bar = byText(a, 'span', 'Ordered')!.parentElement!;
      $$(bar, 'span').forEach((x, i) => setStyle(x, i <= idx ? stepOn : stepOff));
      const actions = bar.nextElementSibling as HTMLElement;
      if (o.status === 'new') {
        const b = $<HTMLButtonElement>(actions, 'button')!; tid(b, `button-pack-${o.id}`);
        b.onclick = () => { const r = advanceOrder(getState(), o.id); if (r.ok) update(() => r.state); };
        const prob = $<HTMLAnchorElement>(actions, 'a'); tid(prob, `link-problem-${o.id}`);
        if (prob) prob.onclick = e => { e.preventDefault(); e.stopPropagation(); update(st => ({ ...st, orders: st.orders.map(x => x.id === o.id ? { ...x, status: 'problem', issue: 'Maker reported a problem' } : x) })); };
      } else if (o.status === 'packed') {
        const sel = $<HTMLSelectElement>(actions, 'select')!; const tr = $<HTMLInputElement>(actions, 'input')!; const b = $<HTMLButtonElement>(actions, 'button')!;
        tid(sel, `select-courier-${o.id}`); tid(tr, `input-tracking-${o.id}`); tid(b, `button-dispatch-${o.id}`);
        b.onclick = () => {
          const r = advanceOrder(getState(), o.id, { courier: sel.value, tracking: tr.value });
          if (!r.ok) { errors[o.id] = r.error!; fieldError(actions, r.error, `error-dispatch-${o.id}`); tr.focus(); return; }
          delete errors[o.id]; update(() => r.state);
        };
        if (errors[o.id]) fieldError(actions, errors[o.id], `error-dispatch-${o.id}`);
      } else if (o.status === 'dispatched') {
        const b = $<HTMLButtonElement>(actions, 'button')!; tid(b, `button-deliver-${o.id}`);
        b.onclick = () => { const r = advanceOrder(getState(), o.id); if (r.ok) update(() => r.state); };
      } else {
        actions.innerHTML = o.status === 'problem'
          ? `<span style="font-size: 17px; color: #8E2A22">Problem reported${o.issue ? `: ${esc(o.issue)}` : ''}. The Baksa team will be in touch.</span>`
          : `<span style="font-size: 17px; color: #2C4640">Delivered${o.deliveredOn ? ` ${shortDate(o.deliveredOn)}` : ''}${o.settled ? '. Paid out.' : '. In your next payouts.'}</span>`;
      }
      list.insertBefore(a, note);
    });
    const due = mine.filter(o => o.status === 'delivered' && !o.settled).length;
    const np = $(note, 'p'); if (np?.firstChild) np.firstChild.textContent = `${due} delivered order${due === 1 ? ' is' : 's are'} in your next payouts. `;
  };
  filters.forEach((b, i) => on(ctx, b, 'click', () => { filter = keys[i]; render(); }));
  render(); ctx.cleanups.push(subscribe(render));
}

/* ------------------------------------------------------------------ Products */
export function hydrateMakerProducts(ctx: Ctx) {
  const { root } = ctx;
  const rows = $$<HTMLElement>(root, 'main img').map(i => i.parentElement!).filter(r => $(r, 'p'));
  const list = rows[0]?.parentElement; if (!list) return;
  const tplRow = cloneEl(rows[0]);
  const s0 = getState();
  const bindRow = (row: HTMLElement, id: string) => {
    tid(row, `row-product-${id}`);
    const input = $<HTMLInputElement>(row, 'input[type="number"]');
    if (!input) return;
    tid(input, `input-stock-${id}`);
    input.value = String(productById(getState(), id)?.stock ?? input.value);
    input.addEventListener('input', () => { const n = Number(input.value); if (input.value !== '' && Number.isFinite(n) && n >= 0) update(s => setStock(s, id, n)); });
  };
  rows.forEach(r => { const name = norm($(r, 'p')?.textContent); const p = s0.products.find(x => x.name === name && x.makerId === 'm1'); if (p) bindRow(r, p.id); });
  const fix = byText<HTMLAnchorElement>(root, 'a', 'Fix and send'); tid(fix, 'link-fix-and-send');
  // pieces added in this demo
  s0.products.filter(p => p.makerId === 'm1' && p.id.startsWith('new-')).forEach(p => {
    const r = cloneEl(tplRow); $<HTMLImageElement>(r, 'img')!.src = imgUrl(p.img);
    const ps = $$(r, 'p'); ps[0].textContent = p.name; ps[1].textContent = `${formatINR(p.pricePaise)} incl. GST, ${p.madeToOrder ? 'made to order, within' : 'dispatched within'} ${p.dispatchDays} days`;
    const chip = $(r, 'p + p + span'); if (chip) chip.textContent = p.status === 'live' ? 'Live' : 'Waiting for review';
    list.appendChild(r); bindRow(r, p.id);
  });
  const paintChips = () => {
    const s = getState();
    rows.forEach(r => {
      const name = norm($(r, 'p')?.textContent); const p = s.products.find(x => x.name === name && x.makerId === 'm1'); if (!p || p.madeToOrder || p.status !== 'live') return;
      const info = $(r, 'p')!.parentElement!;
      let low = $$(info, 'span').find(x => /left$|^Out of stock$/.test(norm(x.textContent)));
      if (p.stock <= 3) {
        if (!low) { low = document.createElement('span'); low.setAttribute('style', 'margin-left: 6px; background: #F7D9CF; color: #8E2A22; border-radius: 999px; padding: 4px 10px; font-family: Arvo, Georgia, serif; font-size: 11px'); info.appendChild(document.createTextNode(' ')); info.appendChild(low); }
        low.textContent = p.stock === 0 ? 'Out of stock' : `Only ${p.stock} left`; tid(low, `status-stock-${p.id}`);
      } else low?.remove();
    });
  };
  paintChips(); ctx.cleanups.push(subscribe(paintChips));
}

/* ------------------------------------------------------------------ Add product */
const STEP_NAMES = ['Photos', 'What is it?', 'How it’s made', 'Size', 'Price and stock', 'Its story', 'Check and send'];
export function hydrateMakerAddProduct(ctx: Ctx) {
  const { root } = ctx;
  const lis = $$<HTMLLIElement>(root, 'ol[aria-label="Steps"] li');
  const sDone = styleOf(lis[0]), sNow = styleOf(lis[4]), sTodo = styleOf(lis[5]);
  const form = lis[0].closest('ol')!.parentElement!.querySelector('section')!;
  const preview = form.nextElementSibling as HTMLElement;
  const step5 = form.innerHTML;
  const h2 = $(form, 'h2')!; const h2Style = styleOf(h2); const emStyle = styleOf($(h2, 'em'));
  const lab = $(form, 'label')!; const labStyle = styleOf(lab); const inStyle = styleOf($(lab, 'input')); const hintStyle = styleOf($(lab, 'span'));
  const backStyle = styleOf(byText(form, 'button', 'Back')); const nextStyle = styleOf(byText(form, 'button', /^Next/));
  const saved = byText(root, 'span', 'Draft saved'); tid(saved, 'text-draft-saved');
  const draftKey = 'baksa-approved-draft';
  let draft: ProductDraft = (() => { try { return { ...emptyDraft(), ...JSON.parse(sessionStorage.getItem(draftKey) ?? '{}') }; } catch { return emptyDraft(); } })();
  let step = Number(ctx.search.get('step') ?? 5) - 1; if (!(step >= 0 && step < 7)) step = 4;
  const save = () => { try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); } catch { /* ignore */ } if (saved) saved.textContent = 'Draft saved'; };

  const paintPreview = () => {
    const price = Math.round(Number(draft.price) * 100) || 0; const gst = Number(draft.gst) || 0; const cost = Math.round(Number(draft.cost || 0) * 100);
    const rows = $$(preview, ':scope > div:first-of-type > div > span:last-child');
    const gp = $$(preview, 'p');
    if (price <= 0) { if (rows[0]) rows[0].textContent = '—'; return; }
    const v = salePreview(price, gst, cost); const sp = v.split;
    rows[0].textContent = formatINR(price); rows[1].textContent = formatINR(sp.gstPaise); rows[2].textContent = minus(sp.deductionsPaise); rows[3].textContent = formatINR(sp.payoutPaise);
    const gstLabel = rows[1].previousElementSibling; if (gstLabel) gstLabel.textContent = `GST inside that price (${gst}%)`;
    tid(rows[3], 'text-preview-receive');
    gp[1].textContent = `${formatINR(sp.gstPaise)} of that is GST, which you pay in your own GST return.`;
    gp[2].textContent = `After GST and your ${formatINR(cost)} cost`;
    const keep = $(gp[3], 'span'); if (keep) { keep.textContent = formatINR(v.keepPaise); tid(keep, 'text-preview-keep'); }
    const bar = $(preview, 'div > span[style*="width"]') as HTMLElement | null; if (bar) bar.style.width = `${Math.max(0, Math.min(100, Math.round(v.marginPct)))}%`;
    const chip = $(gp[4], 'span'); if (chip) { chip.textContent = HEALTH_LABEL[v.health as keyof typeof HEALTH_LABEL]; tid(chip, 'status-preview-health'); }
    if (gp[4].lastChild) gp[4].lastChild.textContent = ` ${Math.round(v.marginPct)}% of the price before GST. ${v.health === 'healthy' ? 'Room for your time and rent.' : v.health === 'tight' ? 'Tight: little room for your time.' : 'Too thin: each sale barely pays.'}`;
  };

  const L = (label: string, key: keyof ProductDraft, type = 'text', hint = '') =>
    `<label style="${labStyle}">${label}<input data-k="${key}" data-testid="input-draft-${key}" type="${type}" value="${esc(String(draft[key] ?? ''))}" style="${inStyle}">${hint ? `<span style="${hintStyle}">${hint}</span>` : ''}</label>`;
  const nav = () => `<button type="button" data-testid="button-step-back" style="${backStyle}">Back</button><button type="button" data-testid="button-step-next" style="${nextStyle}">${step === 6 ? 'Send for review' : `Next: ${STEP_NAMES[step + 1].toLowerCase()}`}</button>`;
  const title = (a: string, b: string) => `<h2 style="${h2Style}">${a}<em style="${emStyle}">${b}</em></h2>`;

  const render = () => {
    lis.forEach((li, i) => { setStyle(li, i < step ? sDone : i === step ? sNow : sTodo); if (i === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); li.style.cursor = 'pointer'; tid(li, `step-${i + 1}`); });
    if (step === 4) {
      form.innerHTML = step5;
      const [price, gst, stock, dispatch, made, cost] = [...$$<HTMLInputElement>(form, 'label input, label select')];
      const map: [HTMLInputElement, keyof ProductDraft][] = [[price, 'price'], [gst, 'gst'], [stock, 'stock'], [dispatch, 'dispatch'], [cost, 'cost']];
      map.forEach(([el, k]) => { el.setAttribute('data-k', k); tid(el, `input-draft-${k}`); });
      $$<HTMLOptionElement>(gst, 'option').forEach(o => (o.value = o.textContent!.replace('%', '')));
      price.value = draft.price; (gst as unknown as HTMLSelectElement).value = draft.gst; stock.value = draft.stock; dispatch.value = draft.dispatch; cost.value = draft.cost;
      made.checked = draft.madeToOrder; tid(made, 'checkbox-made-to-order');
      made.addEventListener('change', () => { draft.madeToOrder = made.checked; stock.disabled = made.checked; save(); });
      stock.disabled = draft.madeToOrder;
      const btns = $$<HTMLButtonElement>(form, 'button'); tid(btns[0], 'button-step-back'); tid(btns[1], 'button-step-next');
    } else {
      const body = [
        () => `${title('Add your ', 'photos')}<label style="${labStyle}">Photos of the piece<input type="file" accept="image/*" data-testid="input-draft-photo" style="${inStyle}"><span style="${hintStyle}">Window light and one close-up of the detail. In this sample the photo stays on this device.</span></label>${draft.photo ? `<img src="${draft.photo.startsWith('data:') ? draft.photo : imgUrl(draft.photo)}" alt="" data-testid="img-draft-photo" style="width: 140px; height: 170px; object-fit: cover; border-radius: 22px">` : ''}`,
        () => `${title('What ', 'is it?')}${L('Product name', 'name', 'text')}${L('What kind of piece is it?', 'kind', 'text', 'For example, a candle, a face oil, a tray.')}`,
        () => `${title('How it’s ', 'made')}${L('Materials', 'material')}${L('Technique', 'technique', 'text', 'In your own words.')}`,
        () => `${title('Its ', 'size')}${L('Size or weight', 'size', 'text', 'For example, 18 cm across, or 100 ml.')}`,
        () => '',
        () => `${title('Its ', 'story')}<label style="${labStyle}">A few lines in your voice<textarea data-k="story" data-testid="input-draft-story" rows="5" style="${inStyle}; height: auto; padding: 12px 14px">${esc(draft.story)}</textarea><span style="${hintStyle}">Who made it, how, and why it matters.</span></label>`,
        () => `${title('Check and ', 'send')}<div data-testid="draft-summary" style="font-size: 19px; display: flex; flex-direction: column; gap: 6px"><p style="margin: 0"><b>${esc(draft.name || 'No name yet')}</b></p><p style="margin: 0">${esc([draft.kind, draft.material, draft.technique, draft.size].filter(Boolean).join(', ') || 'No details yet')}</p><p style="margin: 0">${draft.price ? formatINR(Math.round(Number(draft.price) * 100)) : 'No price yet'} incl. GST, ${draft.madeToOrder ? 'made to order' : `${draft.stock || 0} ready`}, dispatched within ${draft.dispatch} days</p><p style="margin: 0; color: #5C463C">${esc(draft.story || 'No story yet')}</p></div><div data-testid="draft-result"></div>`,
      ][step]();
      form.innerHTML = body + nav();
      const file = $<HTMLInputElement>(form, 'input[type="file"]');
      file?.addEventListener('change', () => { const f = file.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { draft.photo = String(r.result); save(); render(); }; r.readAsDataURL(f); });
    }
    $$<HTMLInputElement>(form, '[data-k]').forEach(el => {
      const k = el.getAttribute('data-k') as keyof ProductDraft;
      const h = () => { (draft as unknown as Record<string, unknown>)[k] = el.value; save(); paintPreview(); };
      el.addEventListener('input', h); el.addEventListener('change', h);
    });
    const [back, next] = $$<HTMLButtonElement>(form, 'button');
    back.onclick = () => { if (step > 0) { step -= 1; render(); } else ctx.navigate('/maker/products'); };
    next.onclick = () => {
      if (step < 6) { step += 1; render(); return; }
      const r = submitProduct(getState(), draft);
      const out = $(form, '[data-testid="draft-result"]')!;
      if (!r.ok) { out.innerHTML = r.errors.map(e => `<p role="alert" style="margin: 6px 0 0; font-size: 17px; color: #C23A36">${esc(e)}</p>`).join(''); return; }
      update(() => r.state);
      draft = emptyDraft(); try { sessionStorage.removeItem(draftKey); } catch { /* ignore */ }
      form.innerHTML = `${title(r.status === 'live' ? 'It’s ' : 'Sent for ', r.status === 'live' ? 'live.' : 'review.')}<p data-testid="text-submit-result" style="margin: 10px 0 0; font-size: 19px">${r.status === 'live' ? 'You’re a trusted maker: it’s in the shop now. The Baksa team may spot-check it.' : `The Baksa team will review it. ${esc(r.reason ?? '')}.`}</p><button type="button" data-testid="button-to-products" style="${nextStyle}; margin-top: 18px">See my products</button>`;
      $(form, 'button')!.addEventListener('click', () => ctx.navigate('/maker/products'));
    };
    paintPreview();
  };
  lis.forEach((li, i) => on(ctx, li, 'click', () => { step = i; render(); }));
  render();
}

/* ------------------------------------------------------------------ Earnings */
export function hydrateMakerEarnings(ctx: Ctx) {
  const { root } = ctx;
  const cards = $$(root, 'main > section:first-of-type > div');
  const paint = () => {
    const s = getState(); const e = makerEarnings(s); const sp = e.split;
    const v = (i: number) => $$(cards[i], 'p');
    v(0)[1].textContent = formatINR(sp.grossPaise); v(0)[2].textContent = `${e.deliveredCount} delivered order${e.deliveredCount === 1 ? '' : 's'}`;
    v(1)[1].textContent = formatINR(sp.taxablePaise);
    v(2)[1].textContent = minus(sp.deductionsPaise);
    v(3)[1].textContent = formatINR(e.nextPayoutPaise); v(3)[2].textContent = longDate(e.nextPayoutDate);
    ['text-customers-paid', 'text-sales-before-gst', 'text-deductions', 'text-next-payout'].forEach((id, i) => tid(v(i)[1], id));
    const sched = byText(root, 'h2', /When you’ll be/)!.parentElement!;
    const runBox = sched.querySelector('div > div') as HTMLElement;
    const pend = $$(sched, 'div').find(x => /^Not delivered yet|^Nothing waiting/.test(norm(x.textContent))) as HTMLElement;
    $$(sched, '[data-run]').forEach(x => x.remove());
    if (runBox && !runBox.hasAttribute('data-tpl')) runBox.setAttribute('data-tpl', '');
    runBox.style.display = 'none';
    e.runs.forEach(r => {
      const b = cloneEl(runBox); b.removeAttribute('data-tpl'); b.setAttribute('data-run', r.date); b.style.display = ''; tid(b, `row-payout-${r.date}`);
      const leaf = $$(b, 'span').filter(x => !x.children.length);
      leaf[0].textContent = String(d(r.date).getUTCDate()); leaf[1].textContent = MONTHS[d(r.date).getUTCMonth()].toUpperCase();
      leaf[2].textContent = longDate(r.date); leaf[3].textContent = `${r.orderIds.length} order${r.orderIds.length === 1 ? '' : 's'}: ${r.orderIds.join(', ')}`;
      leaf[4].textContent = formatINR(r.split.payoutPaise);
      runBox.parentElement!.insertBefore(b, pend);
    });
    if (pend) pend.textContent = e.pendingCount ? `Not delivered yet: ${e.pendingCount} order${e.pendingCount === 1 ? '' : 's'} worth ${formatINR(e.pendingPaise)}. They’re scheduled once delivered.` : 'Nothing waiting for delivery.';
    const how = byText(root, 'h2', 'How it’s worked out')!.parentElement!;
    const vals = $$(how, 'div > div > span:last-child');
    [sp.grossPaise, -sp.commissionPaise, -sp.commissionGstPaise, -sp.tcsPaise, -sp.paymentFeePaise, sp.payoutPaise].forEach((x, i) => { if (vals[i]) vals[i].textContent = x < 0 ? minus(-x) : formatINR(x); });
    tid(vals[5], 'text-payout-total');
    const gstP = byText(how, 'p', /GST you collected/); if (gstP) gstP.textContent = `${formatINR(sp.gstPaise)} of this payout is GST you collected. It isn’t your income: you pay it in your GST return.`;
  };
  paint(); ctx.cleanups.push(subscribe(paint));
}

/* ------------------------------------------------------------------ Growth */
export function hydrateMakerGrowth(ctx: Ctx) {
  const { root } = ctx;
  const health = $(root, 'section#health')!;
  const inputs = $$<HTMLInputElement>(health, 'input');
  const keys = ['price', 'materials', 'packaging', 'shipping', 'fixed', 'demand'];
  inputs.forEach((i, n) => tid(i, `input-growth-${keys[n]}`));
  const boxes = $$(health, 'div').filter(x => $$(x, ':scope > p').length === 3);
  const healthyChipBox = styleOf($(boxes[0], 'span'));
  const lossBg = styleOf(boxes[3]);
  const profitBg = lossBg.replace('#F7D9CF', '#D5E6DE');
  const paint = () => {
    const v = inputs.map(i => Number(i.value));
    const g = growthHealth({ pricePaise: v[0] * 100, materialsPaise: v[1] * 100, packagingPaise: v[2] * 100, shippingPaise: v[3] * 100, monthlyFixedPaise: v[4] * 100, demand: v[5], hoursPerPiece: 5, hoursPerWeek: 40, people: 2 });
    let err = $(health, '[data-testid="error-growth"]');
    if (!g.ok) {
      if (!err) { err = document.createElement('p'); tid(err, 'error-growth'); err.setAttribute('role', 'alert'); err.setAttribute('style', 'margin: 0; font-size: 17px; color: #C23A36; grid-column: 1 / -1'); boxes[0].insertAdjacentElement('beforebegin', err); }
      err.textContent = g.error; return;
    }
    err?.remove();
    const P = (i: number) => $$(boxes[i], ':scope > p');
    P(0)[1].textContent = formatINR(g.margin.leftPerSalePaise); tid(P(0)[1], 'text-left-per-sale');
    const chip = $(P(0)[2], 'span')!; chip.textContent = HEALTH_LABEL[g.margin.health];
    setStyle(chip, g.margin.health === 'healthy' ? healthyChipBox : g.margin.health === 'tight' ? healthyChipBox.replace('#34514B', '#FBE3B2').replace('#F1F7F4', '#7A5517') : healthyChipBox.replace('#34514B', '#F7D9CF').replace('#F1F7F4', '#8E2A22'));
    chip.nextSibling!.textContent = ` ${Math.round(g.margin.marginPct)}% of the price before GST`;
    P(1)[1].textContent = g.breakEven === null ? 'Not possible' : `${g.breakEven} a month`; tid(P(1)[1], 'text-break-even');
    P(1)[2].textContent = g.breakEven === null ? 'Each sale loses money at this price.' : `Sell ${g.breakEven} to cover ${formatINR(v[4] * 100)} of monthly costs.`;
    P(2)[1].textContent = `${g.capacity} a month`; tid(P(2)[1], 'text-capacity');
    const pr = g.potential.profitPaise;
    P(3)[0].textContent = `At ${v[5]} sales a month`;
    P(3)[1].textContent = pr < 0 ? minus(-pr) : formatINR(pr); tid(P(3)[1], 'text-monthly-result');
    const more = g.breakEven === null ? null : Math.max(0, g.breakEven - g.potential.units);
    P(3)[2].textContent = pr < 0 ? (more !== null && g.breakEven! <= g.capacity ? `A loss. ${more} more sales would get you to break-even.` : 'A loss. Raise the price or lower your costs.') : 'A profit after your monthly costs.';
    setStyle(boxes[3], pr < 0 ? lossBg : profitBg);
  };
  inputs.forEach(i => on(ctx, i, 'input', paint));
  paint();

  // Product profits table
  const table = $(root, 'section#profits table');
  if (table) {
    const wrap = document.createElement('div'); wrap.setAttribute('data-bt-scroll', ''); wrap.style.overflowX = 'auto'; table.replaceWith(wrap); wrap.appendChild(table);
    const chipTight = styleOf(byText(table, 'span', 'Tight')); const chipHealthy = styleOf(byText(table, 'span', 'Healthy'));
    $$<HTMLTableRowElement>(table, 'tbody tr').forEach(tr => {
      const tds = $$<HTMLTableCellElement>(tr, 'td'); const p = getState().products.find(x => x.name === norm(tds[0].textContent)); if (!p) return;
      tid(tr, `row-profit-${p.id}`);
      const sp = splitSale(p.pricePaise, p.gstPct, true);
      tds[1].textContent = formatINR(p.pricePaise); tds[2].textContent = formatINR(sp.netAfterGstPaise);
      const input = $<HTMLInputElement>(tds[3], 'input');
      const paintRow = () => {
        const cost = getState().costs[p.id];
        if (cost === undefined) { tds[4].textContent = '—'; tds[5].textContent = 'Add a cost'; return; }
        const pv = salePreview(p.pricePaise, p.gstPct, cost);
        tds[4].textContent = formatINR(pv.keepPaise);
        tds[5].innerHTML = ''; const c = document.createElement('span'); c.textContent = HEALTH_LABEL[pv.health as keyof typeof HEALTH_LABEL];
        setStyle(c, pv.health === 'healthy' ? chipHealthy : pv.health === 'tight' ? chipTight : chipTight.replace('#FBE3B2', '#F7D9CF').replace('#7A5517', '#8E2A22'));
        tid(c, `status-profit-${p.id}`); tds[5].appendChild(c);
      };
      if (input) {
        tid(input, `input-cost-${p.id}`);
        const c0 = getState().costs[p.id]; if (c0 !== undefined) input.value = String(c0 / 100);
        input.addEventListener('input', () => { const n = Number(input.value); update(s => { const costs = { ...s.costs }; if (input.value === '' || !(n >= 0)) delete costs[p.id]; else costs[p.id] = Math.round(n * 100); return { ...s, costs }; }); paintRow(); });
      }
      paintRow();
    });
  }
  ['#health', '#profits'].forEach(h => { const a = $(root, `a[href="${h}"]`); tid(a, `link-tool-${h.slice(1)}`); });
  const ask = $(root, 'main a[href="#ask"]'); tid(ask, 'link-tool-ask');
  on(ctx, ask, 'click', e => { e.preventDefault(); e.stopPropagation(); window.open('https://wa.me/?text=' + encodeURIComponent('Sahayak, I have a question about my pricing.'), '_blank', 'noopener'); });
}

/* ------------------------------------------------------------------ Opportunities and courses */
export function hydrateMakerOpportunities(ctx: Ctx) {
  const { root } = ctx;
  const arts = $$<HTMLElement>(root, 'main section article');
  const ids = ['op1', 'op2'];
  const paint = () => {
    const s = getState();
    arts.forEach((a, i) => {
      const o = s.opps.find(x => x.id === ids[i]); if (!o) return;
      tid(a, `card-opp-${o.id}`);
      const [yes, no] = $$<HTMLButtonElement>(a, 'button');
      tid(yes, `button-opp-yes-${o.id}`); tid(no, `button-opp-no-${o.id}`);
      let st = $(a, '[data-opp-status]');
      if (o.status !== 'open') {
        yes.style.display = 'none'; no.style.display = 'none';
        if (!st) { st = document.createElement('p'); st.setAttribute('data-opp-status', ''); st.setAttribute('style', 'margin: 12px 0 0; font-family: Arvo, Georgia, serif; font-size: 13px; color: #2C4640'); a.appendChild(st); }
        tid(st, `status-opp-${o.id}`);
        st.textContent = o.status === 'yes' ? 'You said yes. The Baksa team will call you with the details.' : 'Not this time. Thanks for letting us know.';
        const undo = document.createElement('button'); undo.type = 'button'; undo.textContent = 'Change my answer'; undo.setAttribute('style', 'margin-left: 10px; min-height: 44px; border: 0; background: none; color: #611811; text-decoration: underline; font-family: Arvo, Georgia, serif; font-size: 13px; cursor: pointer');
        tid(undo, `button-opp-undo-${o.id}`);
        undo.onclick = () => update(x => ({ ...x, opps: x.opps.map(y => y.id === o.id ? { ...y, status: 'open' } : y) }));
        st.appendChild(undo);
      } else { yes.style.display = ''; no.style.display = ''; st?.remove(); }
    });
    // extra briefs sent from admin
    const host = arts[0]?.parentElement;
    if (host) {
      $$(host, 'article[data-extra]').forEach(x => x.remove());
      s.opps.filter(o => o.makerId === 'm1' && !ids.includes(o.id)).forEach(o => {
        const a = cloneEl(arts[0]); a.setAttribute('data-extra', ''); tid(a, `card-opp-${o.id}`);
        $(a, 'h2')!.textContent = o.title; $(a, 'h2 + p')!.textContent = o.detail;
        const [yes, no] = $$<HTMLButtonElement>(a, 'button');
        $$(a, '[data-opp-status]').forEach(x => x.remove());
        if (o.status === 'open') { yes.style.display = ''; no.style.display = ''; yes.onclick = () => update(x => respondOpp(x, o.id, true)); no.onclick = () => update(x => respondOpp(x, o.id, false)); }
        else { yes.remove(); no.remove(); const p = document.createElement('p'); p.setAttribute('style', 'margin: 12px 0 0; font-family: Arvo, Georgia, serif; font-size: 13px; color: #2C4640'); p.textContent = o.status === 'yes' ? 'You said yes.' : 'Not this time.'; a.appendChild(p); }
        host.appendChild(a);
      });
    }
  };
  arts.forEach((a, i) => { const [yes, no] = $$<HTMLButtonElement>(a, 'button'); on(ctx, yes, 'click', () => update(s => respondOpp(s, ids[i], true))); on(ctx, no, 'click', () => update(s => respondOpp(s, ids[i], false))); });
  paint(); ctx.cleanups.push(subscribe(paint));

  const form = $<HTMLFormElement>(root, 'main form');
  if (form) {
    const [title, length, price] = $$<HTMLInputElement>(form, 'input'); const type = $<HTMLSelectElement>(form, 'select')!; const about = $<HTMLTextAreaElement>(form, 'textarea')!;
    tid(title, 'input-proposal-title'); tid(type, 'select-proposal-type'); tid(length, 'input-proposal-length'); tid(price, 'input-proposal-price'); tid(about, 'input-proposal-about');
    const btn = byText<HTMLButtonElement>(form, 'button', 'Send my proposal'); tid(btn, 'button-send-proposal');
    const send = (e: Event) => {
      e.preventDefault();
      const err = validateProposal({ title: title.value, length: length.value, price: price.value, about: about.value });
      fieldError(btn, err, 'error-proposal'); if (err) return;
      update(s => ({ ...s, proposals: [...s.proposals, { title: title.value.trim(), type: type.value, length: length.value.trim(), pricePaise: Math.round(Number(price.value) * 100), about: about.value.trim(), status: 'sent' }] }));
      const ok = document.createElement('p'); tid(ok, 'text-proposal-sent'); ok.setAttribute('role', 'status');
      ok.setAttribute('style', 'margin: 12px 0 0; background: #D5E6DE; border-radius: 16px; padding: 12px 14px; font-size: 18px; color: #22332F');
      ok.textContent = `Proposal sent: “${title.value.trim()}”. We usually review within a week.`;
      $$(form, '[data-testid="text-proposal-sent"]').forEach(x => x.remove());
      form.appendChild(ok); form.reset();
    };
    on(ctx, btn, 'click', send); on(ctx, form, 'submit', send);
  }
  if (ctx.path === '/maker/courses') {
    const h = byText(root, 'h1', 'My courses');
    if (h) requestAnimationFrame(() => h.scrollIntoView({ block: 'start' }));
  }
  void TODAY; void BTN_OUTLINE;
}
