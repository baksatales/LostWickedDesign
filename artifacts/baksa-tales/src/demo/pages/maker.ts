import { $, $$, BTN_OUTLINE, byText, cloneEl, type Ctx, esc, fieldError, norm, on, pillGroup, setStyle, setVisible, styleOf, tid } from '../dom';
import {
  HEALTH_LABEL, ORDER_STEP_LABEL, TODAY, emptyDraft, formatINR, getState, growthHealth, imgUrl, makerEarnings, makerOrders,
  productById, respondOpp, salePreview, setStock, subscribe, update, validateProposal, type ProductDraft,
} from '../store';
import { sampleApi } from '../sample-api';
import type { DemoOrder } from '../catalog';

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
  const serverNotice = document.createElement('p');
  serverNotice.setAttribute('role', 'status');
  serverNotice.style.cssText = 'margin: 0 0 16px; padding: 10px 14px; border-radius: 12px;';
  main.insertBefore(serverNotice, main.firstChild);
  const attentionSelectors = [/^Pack order BT-1047/, /^Add tracking for BT-1044/, /Pink Peony Tray/];
  const attentionTargets = attentionSelectors.map(re => {
    const text = $$(root, 'section span > span:first-child').find(node => re.test(norm(node.textContent)));
    const container = text?.parentElement;
    return {
      icon: container?.previousElementSibling as HTMLElement | null,
      text: container as HTMLElement | null,
      link: container?.nextElementSibling as HTMLElement | null,
    };
  });
  type ServerOrder = { id: string; productId: string; makerId: string; qty: number; amountPaise: number; customer: string; city: string; date: string; status: DemoOrder['status']; courier: string; tracking: string; deliveredOn: string | null; settled: boolean; issue: string };
  let serverEarnings: { nextPayoutPaise: number; nextPayoutDate: string } | null = null;
  let alive = true;
  const paint = () => {
    const s = getState(); const e = makerEarnings(s);
    const payout = byText(main, 'span', 'Next payout')?.nextElementSibling;
    if (payout) {
      const [amt, when] = $$(payout, 'span');
      amt.textContent = serverEarnings ? formatINR(serverEarnings.nextPayoutPaise) : '—';
      when.textContent = serverEarnings ? (serverEarnings.nextPayoutPaise ? `On ${longDate(serverEarnings.nextPayoutDate.slice(0, 10))}` : 'Nothing due yet') : 'Loading server totals';
      tid(amt, 'text-next-payout');
    }
    const prod = byText(main, 'span', 'Products')?.nextElementSibling;
    if (prod) {
      const mine = s.products.filter(p => p.makerId === 'm1');
      const live = mine.filter(p => p.status === 'live').length, ch = mine.filter(p => p.status === 'changes').length, wait = mine.filter(p => p.status === 'review').length;
      const [a, b] = $$(prod, 'span'); a.textContent = `${live} live`; b.textContent = `${ch ? `${ch} needs changes` : 'none need changes'}, ${wait ? `${wait} waiting` : 'none waiting'}`;
    }
    const opp = byText(main, 'span', 'New opportunities')?.nextElementSibling;
    if (opp) { const open = s.opps.filter(o => o.makerId === 'm1' && o.status === 'open'); $$(opp, 'span')[0].textContent = String(open.length); }
    // attention items disappear once done
    const attentionOrder = s.orders.find(o => ['problem', 'delayed'].includes(o.status));
    const newOrder = s.orders.find(o => o.status === 'new');
    const packedOrder = s.orders.find(o => o.status === 'packed');
    const peony = s.products.find(p => p.id === 't-pinkpeony');
    const items: (string | null)[] = [
      attentionOrder ? `Resolve order ${attentionOrder.id}` : newOrder ? `Pack order ${newOrder.id}` : null,
      packedOrder ? `Add tracking for ${packedOrder.id}` : null,
      peony?.status === 'changes' ? 'Pink Peony Tray needs changes' : null,
    ];
    let open = 0;
    items.forEach((label, i) => {
      const target = attentionTargets[i];
      [target.icon, target.text, target.link].forEach(x => setVisible(x, !!label));
      if (label && target.text) target.text.textContent = label;
      if (label && target.link) (target.link as HTMLAnchorElement).onclick = event => { event.preventDefault(); ctx.navigate(label.includes('product') || label.includes('Peony') ? '/maker/products' : '/maker/orders'); };
      if (label) open++;
    });
    const cnt = byText(root, 'span', /things? today$/); if (cnt) cnt.textContent = open ? `${open} thing${open === 1 ? '' : 's'} today` : 'All done today';
  };
  paint();
  Promise.all([
    sampleApi<{ sample: true; orders: ServerOrder[] }>('/sample/maker/orders'),
    sampleApi<{ sample: true; nextPayoutPaise: number; nextPayoutDate: string }>('/sample/maker/earnings'),
  ])
    .then(([ordersResult, earnings]) => {
      if (!alive) return;
      serverEarnings = earnings;
      update(state => ({
        ...state,
        orders: [...state.orders.filter(order => order.makerId !== 'm1'), ...ordersResult.orders.map(order => ({
          id: order.id, productId: order.productId, makerId: order.makerId === 'tathaastu' ? 'm1' : 'm2',
          qty: order.qty, amountPaise: order.amountPaise, customer: order.customer, city: order.city,
          date: order.date.slice(0, 10), status: order.status, courier: order.courier || undefined,
          tracking: order.tracking || undefined, deliveredOn: order.deliveredOn?.slice(0, 10) ?? null,
          settled: order.settled, issue: order.issue || undefined,
        }))],
      }));
      serverNotice.textContent = 'Needs-attention orders and payout totals are loaded from your secure sample workspace.';
      serverNotice.style.background = '#F1F7F4'; serverNotice.style.color = '#2C4640';
    })
    .catch(error => {
      if (!alive) return;
      serverNotice.setAttribute('role', 'alert');
      serverNotice.textContent = error instanceof Error ? error.message : 'The server dashboard data could not be loaded.';
      serverNotice.style.background = '#F7D9CF'; serverNotice.style.color = '#8E2A22';
    });
  ctx.cleanups.push(subscribe(paint), () => { alive = false; });
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
  let serverReady = false;
  let alive = true;
  type ServerOrder = {
    id: string; productId: string; productName: string; makerId: string; qty: number; amountPaise: number;
    customer: string; city: string; date: string; status: DemoOrder['status']; courier: string; tracking: string;
    deliveredOn: string | null; settled: boolean; issue: string;
  };
  const mapServerOrder = (o: ServerOrder): DemoOrder => ({
    id: o.id, productId: o.productId, makerId: o.makerId === 'tathaastu' ? 'm1' : 'm2',
    qty: o.qty, amountPaise: o.amountPaise, customer: o.customer, city: o.city, date: o.date.slice(0, 10),
    status: o.status, courier: o.courier || undefined, tracking: o.tracking || undefined,
    deliveredOn: o.deliveredOn?.slice(0, 10) ?? null, settled: o.settled, issue: o.issue || undefined,
  });
  const replaceOrders = (state: ReturnType<typeof getState>, remote: ServerOrder[]) => ({
    ...state,
    orders: [...state.orders.filter(order => order.makerId !== 'm1'), ...remote.map(mapServerOrder)],
  });
  const saveFulfilment = async (id: string, payload: { status: 'packed' | 'dispatched' | 'delivered' | 'problem'; courier: string; tracking: string; note: string }, actions: HTMLElement) => {
    if (!serverReady) return;
    try {
      const saved = await sampleApi<ServerOrder>(`/sample/orders/${encodeURIComponent(id)}/fulfilment`, {
        method: 'PATCH', body: JSON.stringify(payload),
      });
      if (!alive) return;
      update(state => ({ ...state, orders: [...state.orders.filter(order => order.id !== id), mapServerOrder(saved)] }));
      delete errors[id];
    } catch (error) {
      errors[id] = error instanceof Error ? error.message : 'Order update was not saved.';
      fieldError(actions, errors[id], `error-order-${id}`);
    }
  };
  const reportProblem = (id: string, actions: HTMLElement) => {
    const note = window.prompt('Briefly describe the problem so the Baksa team can help.');
    if (note?.trim()) void saveFulfilment(id, { status: 'problem', courier: '', tracking: '', note: note.trim() }, actions);
  };
  const addProblemLink = (id: string, actions: HTMLElement, style: string) => {
    const link = document.createElement('a');
    link.href = '#problem';
    link.textContent = 'Report a problem';
    link.setAttribute('style', style);
    tid(link, `link-problem-${id}`);
    link.onclick = event => { event.preventDefault(); event.stopPropagation(); reportProblem(id, actions); };
    actions.appendChild(link);
  };

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
        b.onclick = () => { void saveFulfilment(o.id, { status: 'packed', courier: '', tracking: '', note: '' }, actions); };
        const prob = $<HTMLAnchorElement>(actions, 'a');
        if (prob) {
          tid(prob, `link-problem-${o.id}`);
          prob.onclick = e => { e.preventDefault(); e.stopPropagation(); reportProblem(o.id, actions); };
        }
      } else if (o.status === 'packed') {
        const sel = $<HTMLSelectElement>(actions, 'select')!; const tr = $<HTMLInputElement>(actions, 'input')!; const b = $<HTMLButtonElement>(actions, 'button')!;
        tid(sel, `select-courier-${o.id}`); tid(tr, `input-tracking-${o.id}`); tid(b, `button-dispatch-${o.id}`);
        b.onclick = () => {
          if (!sel.value.trim() || !tr.value.trim()) { fieldError(actions, 'Add both the courier and tracking number before dispatch.', `error-dispatch-${o.id}`); tr.focus(); return; }
          void saveFulfilment(o.id, { status: 'dispatched', courier: sel.value, tracking: tr.value, note: '' }, actions);
        };
        addProblemLink(o.id, actions, styleOf(byText(tpl.new, 'a', 'Report a problem')));
        if (errors[o.id]) fieldError(actions, errors[o.id], `error-dispatch-${o.id}`);
      } else if (o.status === 'dispatched') {
        const b = $<HTMLButtonElement>(actions, 'button')!; tid(b, `button-deliver-${o.id}`);
        b.onclick = () => { void saveFulfilment(o.id, { status: 'delivered', courier: o.courier ?? '', tracking: o.tracking ?? '', note: '' }, actions); };
        addProblemLink(o.id, actions, styleOf(byText(tpl.new, 'a', 'Report a problem')));
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
  render();
  sampleApi<{ sample: true; orders: ServerOrder[] }>('/sample/maker/orders')
    .then(result => {
      if (!alive) return;
      serverReady = true;
      update(state => replaceOrders(state, result.orders));
    })
    .catch(error => {
      if (!alive) return;
      const message = error instanceof Error ? error.message : 'Could not load server orders. Changes are disabled.';
      const p = document.createElement('p'); p.setAttribute('role', 'alert'); p.textContent = message;
      p.style.cssText = 'padding: 12px; color: #8E2A22; background: #F7D9CF; border-radius: 12px;';
      list.insertBefore(p, note);
    });
  ctx.cleanups.push(subscribe(render), () => { alive = false; });
}

/* ------------------------------------------------------------------ Products */
export function hydrateMakerProducts(ctx: Ctx) {
  const { root } = ctx;
  const rows = $$<HTMLElement>(root, 'main img').map(i => i.parentElement!).filter(r => $(r, 'p'));
  const list = rows[0]?.parentElement; if (!list) return;
  const tplRow = cloneEl(rows[0]);
  const s0 = getState();
  const inputs = new Map<string, HTMLInputElement>();
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('data-testid', 'maker-stock-save-status');
  status.style.cssText = 'display:none; margin: 0 0 16px; padding: 10px 14px; border-radius: 12px; background: #F1F7F4; color: #2C4640; font: 14px/1.5 Arial, sans-serif;';
  const main = $(root, 'main');
  if (main) main.insertBefore(status, main.firstChild);
  const draftSection = document.createElement('section');
  draftSection.setAttribute('data-testid', 'maker-saved-drafts');
  draftSection.style.cssText = 'margin: 26px 0; padding: 22px; border: 1px solid #D8CABB; border-radius: 18px; background: #FFFCF5;';
  const draftHeading = document.createElement('h2');
  draftHeading.textContent = 'Saved product drafts';
  draftHeading.style.cssText = 'margin: 0 0 12px; font: 24px/1.2 Georgia, serif; color: #402A1E;';
  const draftList = document.createElement('div');
  draftList.setAttribute('data-testid', 'maker-draft-list');
  draftList.style.cssText = 'display: grid; gap: 10px;';
  draftSection.append(draftHeading, draftList);
  list.appendChild(draftSection);
  sampleApi<{ sample: true; drafts: { id: string; name: string; updatedAt: string; status: 'draft' | 'submitted' | 'live' | 'changes'; step: number }[] }>('/sample/maker/drafts')
    .then(result => {
      if (!alive) return;
      draftList.replaceChildren();
      if (!result.drafts.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No saved drafts yet. Your product details will be saved securely as you work.';
        empty.style.margin = '0';
        draftList.appendChild(empty);
      }
      result.drafts.forEach(draft => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px; border-radius: 12px; background: #F7F0E5;';
        const label = document.createElement('span');
        label.textContent = `${draft.name.trim() || 'Untitled draft'} · Step ${draft.step} of 7${draft.status === 'draft' ? '' : ` · ${draft.status === 'live' ? 'Approved' : draft.status === 'changes' ? 'Changes requested' : 'Submitted for review'}`}`;
        const open = document.createElement('button');
        open.type = 'button'; open.textContent = draft.status === 'draft' ? 'Reopen draft' : 'View submission';
        open.setAttribute('data-testid', `button-reopen-draft-${draft.id}`);
        open.style.cssText = 'border: 0; border-radius: 999px; padding: 10px 16px; background: #6C1D16; color: #FFF9F1; cursor: pointer;';
        open.onclick = () => ctx.navigate(`/maker/products/new?draftId=${encodeURIComponent(draft.id)}`);
        row.append(label, open); draftList.appendChild(row);
      });
    })
    .catch(error => {
      if (!alive) return;
      const failed = document.createElement('p');
      failed.setAttribute('role', 'alert');
      failed.textContent = error instanceof Error ? error.message : 'Saved drafts could not be loaded.';
      failed.style.color = '#8E2A22';
      draftList.replaceChildren(failed);
    });
  let serverReady = false;
  let alive = true;
  const report = (message: string, isError = false) => {
    status.textContent = message;
    status.style.display = 'block';
    status.style.background = isError ? '#F7D9CF' : '#F1F7F4';
    status.style.color = isError ? '#8E2A22' : '#2C4640';
  };
  const bindRow = (row: HTMLElement, id: string) => {
    tid(row, `row-product-${id}`);
    const input = $<HTMLInputElement>(row, 'input[type="number"]');
    if (!input) return;
    tid(input, `input-stock-${id}`);
    input.value = String(productById(getState(), id)?.stock ?? input.value);
    input.disabled = true;
    inputs.set(id, input);
    input.addEventListener('change', async () => {
      const n = Number(input.value);
      if (!serverReady || input.value === '' || !Number.isInteger(n) || n < 0) return;
      const oldStock = productById(getState(), id)?.stock ?? 0;
      input.disabled = true;
      try {
        const result = await sampleApi<{ id: string; stock: number }>(`/sample/maker/products/${encodeURIComponent(id)}/stock`, {
          method: 'PUT', body: JSON.stringify({ stock: n }),
        });
        if (!alive) return;
        update(state => setStock(state, id, result.stock));
        input.value = String(result.stock);
        report('Stock saved to your isolated sample workspace.');
      } catch (error) {
        if (!alive) return;
        input.value = String(oldStock);
        report(error instanceof Error ? error.message : 'Stock was not saved. Please try again.', true);
      } finally {
        if (alive) input.disabled = false;
      }
    });
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
  sampleApi<{ sample: true; products: { id: string; stock: number }[] }>('/sample/maker/products')
    .then(result => {
      if (!alive) return;
      const serverProducts = new Map(result.products.map(product => [product.id, product.stock]));
      update(state => {
        let next = state;
        for (const [id, stock] of serverProducts) next = setStock(next, id, stock);
        return next;
      });
      for (const [id, input] of inputs) {
        const stock = serverProducts.get(id);
        if (stock === undefined) {
          input.disabled = true;
          continue;
        }
        input.value = String(stock);
        input.disabled = false;
      }
      serverReady = true;
    })
    .catch(error => {
      if (!alive) return;
      report(error instanceof Error ? error.message : 'Could not load server stock. Changes are disabled.', true);
    });
  const paintChips = () => {
    const s = getState();
    rows.forEach(r => {
      const name = norm($(r, 'p')?.textContent); const p = s.products.find(x => x.name === name && x.makerId === 'm1'); if (!p || p.madeToOrder || p.status !== 'live') return;
      const info = $(r, 'p')!.parentElement!;
      let low = $$(info, 'span').find(x => /left$|^Out of stock$/.test(norm(x.textContent)));
      if (p.stock <= 3) {
        if (!low) { low = document.createElement('span'); low.setAttribute('style', 'margin-left: 6px; background: #F7D9CF; color: #8E2A22; border-radius: 999px; padding: 4px 10px; font-family: Jost, Georgia, serif; font-size: 11px'); info.appendChild(document.createTextNode(' ')); info.appendChild(low); }
        low.textContent = p.stock === 0 ? 'Out of stock' : `Only ${p.stock} left`; tid(low, `status-stock-${p.id}`);
      } else low?.remove();
    });
  };
  paintChips(); ctx.cleanups.push(subscribe(paintChips), () => { alive = false; });
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
  let draft: ProductDraft = emptyDraft();
  let step = Number(ctx.search.get('step') ?? 5) - 1; if (!(step >= 0 && step < 7)) step = 4;
  let draftId = ctx.search.get('draftId') ?? '';
  let serverReady = false;
  let alive = true;
  let factConfirmed = false;
  let saveTimer: number | undefined;
  const draftPayload = () => ({
    name: draft.name, kind: draft.kind, material: draft.material, technique: draft.technique, size: draft.size,
    pricePaise: Math.max(0, Math.round(Number(draft.price) * 100)), gstPct: Math.max(0, Number(draft.gst) || 0),
    stock: Math.max(0, Number(draft.stock) || 0), dispatchDays: Math.max(1, Number(draft.dispatch) || 1),
    madeToOrder: draft.madeToOrder, costPaise: Math.max(0, Math.round(Number(draft.cost || 0) * 100)),
    story: draft.story, photo: draft.photo ?? '', step: step + 1,
  });
  const saveNow = async () => {
    if (!serverReady || !draftId) return false;
    if (saveTimer !== undefined) window.clearTimeout(saveTimer);
    try {
      await sampleApi(`/sample/maker/drafts/${encodeURIComponent(draftId)}`, { method: 'PUT', body: JSON.stringify(draftPayload()) });
      if (saved) saved.textContent = 'Draft saved securely';
      return true;
    } catch (error) {
      if (saved) saved.textContent = 'Draft not saved';
      const message = error instanceof Error ? error.message : 'Draft could not be saved.';
      fieldError(form.parentElement, message, 'error-draft-save');
      return false;
    }
  };
  const save = () => {
    if (saved) saved.textContent = serverReady ? 'Saving securely…' : 'Connecting secure draft…';
    if (saveTimer !== undefined) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => { void saveNow(); }, 450);
  };

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
        () => `${title('Check and ', 'send')}<div data-testid="draft-summary" style="font-size: 19px; display: flex; flex-direction: column; gap: 6px"><p style="margin: 0"><b>${esc(draft.name || 'No name yet')}</b></p><p style="margin: 0">${esc([draft.kind, draft.material, draft.technique, draft.size].filter(Boolean).join(', ') || 'No details yet')}</p><p style="margin: 0">${draft.price ? formatINR(Math.round(Number(draft.price) * 100)) : 'No price yet'} incl. GST, ${draft.madeToOrder ? 'made to order' : `${draft.stock || 0} ready`}, dispatched within ${draft.dispatch} days</p><p style="margin: 0; color: #71645E">${esc(draft.story || 'No story yet')}</p></div><label style="${labStyle}; display:flex; align-items:flex-start; gap:10px"><input type="checkbox" data-testid="checkbox-confirm-product-facts" style="margin-top:5px"><span>I confirm the product details, materials, price, stock and story are accurate.</span></label><div data-testid="draft-result"></div>`,
      ][step]();
      form.innerHTML = body + nav();
      const file = $<HTMLInputElement>(form, 'input[type="file"]');
      file?.addEventListener('change', () => {
        const f = file.files?.[0];
        if (!f) return;
        if (f.size > 220_000 || !/^image\/(png|jpeg|webp)$/i.test(f.type)) {
          fieldError(form, 'For this sample, choose a PNG, JPEG or WebP image under 220 KB.', 'error-draft-photo');
          file.value = '';
          return;
        }
        const r = new FileReader();
        r.onload = () => { draft.photo = String(r.result); save(); render(); };
        r.readAsDataURL(f);
      });
    }
    $$<HTMLInputElement>(form, '[data-k]').forEach(el => {
      const k = el.getAttribute('data-k') as keyof ProductDraft;
      const h = () => { (draft as unknown as Record<string, unknown>)[k] = el.value; save(); paintPreview(); };
      el.addEventListener('input', h); el.addEventListener('change', h);
    });
    const [back, next] = $$<HTMLButtonElement>(form, 'button');
    const factCheckbox = $<HTMLInputElement>(form, '[data-testid="checkbox-confirm-product-facts"]');
    if (factCheckbox) {
      factCheckbox.checked = factConfirmed;
      factCheckbox.addEventListener('change', () => { factConfirmed = factCheckbox.checked; });
    }
    if (!serverReady) { back.disabled = true; next.disabled = true; }
    back.onclick = async () => {
      if (step === 0) { ctx.navigate('/maker/products'); return; }
      const previous = step;
      step -= 1;
      if (!(await saveNow())) { step = previous; return; }
      writeQuery();
      render();
    };
    next.onclick = async () => {
      if (step < 6) {
        const previous = step;
        step += 1;
        if (!(await saveNow())) { step = previous; return; }
        writeQuery();
        render();
        return;
      }
      const out = $(form, '[data-testid="draft-result"]')!;
      if (!factConfirmed) {
        out.innerHTML = '<p role="alert" style="margin: 6px 0 0; font-size: 17px; color: #752F43">Confirm the product facts before submitting.</p>';
        return;
      }
      if (!(await saveNow())) return;
      next.disabled = true;
      try {
        const r = await sampleApi<{ id: string; status: 'live' | 'review'; reason: string | null; spotCheck: boolean; message: string }>(
          `/sample/maker/drafts/${encodeURIComponent(draftId)}/submit`,
          { method: 'POST', body: JSON.stringify({ confirmedFacts: true }) },
        );
        form.innerHTML = `${title('Sent for ', 'review.')}<p data-testid="text-submit-result" style="margin: 10px 0 0; font-size: 19px">${esc(r.message)} ${esc(r.reason ?? '')}</p><button type="button" data-testid="button-to-products" style="${nextStyle}; margin-top: 18px">See my products</button>`;
        $(form, 'button')!.addEventListener('click', () => ctx.navigate('/maker/products'));
      } catch (error) {
        next.disabled = false;
        out.innerHTML = `<p role="alert" style="margin: 6px 0 0; font-size: 17px; color: #752F43">${esc(error instanceof Error ? error.message : 'The product was not submitted.')}</p>`;
      }
    };
    paintPreview();
  };
  const writeQuery = () => {
    const url = new URL(window.location.href);
    if (draftId) url.searchParams.set('draftId', draftId);
    url.searchParams.set('step', String(step + 1));
    window.history.replaceState(null, '', url);
  };
  lis.forEach((li, i) => on(ctx, li, 'click', async () => {
    if (!serverReady) return;
    const previous = step;
    step = i;
    if (!(await saveNow())) { step = previous; return; }
    writeQuery();
    render();
  }));
  if (saved) saved.textContent = 'Connecting secure sample draft…';
  render();
  type ServerDraft = {
    id: string; name: string; kind: string; material: string; technique: string; size: string;
    pricePaise: number; gstPct: number; stock: number; dispatchDays: number; madeToOrder: boolean;
    costPaise: number; story: string; photo: string; step: number; status: 'draft' | 'submitted' | 'live' | 'changes';
  };
  const useServerDraft = (serverDraft: ServerDraft) => {
    draftId = serverDraft.id;
    draft = {
      name: serverDraft.name, kind: serverDraft.kind, material: serverDraft.material, technique: serverDraft.technique,
      size: serverDraft.size, price: String(serverDraft.pricePaise / 100), gst: String(serverDraft.gstPct),
      stock: String(serverDraft.stock), dispatch: String(serverDraft.dispatchDays), madeToOrder: serverDraft.madeToOrder,
      cost: String(serverDraft.costPaise / 100), story: serverDraft.story, photo: serverDraft.photo || null,
    };
    step = Math.max(0, Math.min(6, serverDraft.step - 1));
    serverReady = serverDraft.status === 'draft';
    writeQuery();
    if (serverDraft.status !== 'draft') {
      const statusMessage = serverDraft.status === 'submitted' ? 'This sample draft has been submitted and is waiting for admin review.' :
        serverDraft.status === 'live' ? 'The sample listing was approved. It is visible in the sample catalogue only.' :
          'The admin requested changes. A revised submission requires a new sample draft.';
      form.innerHTML = `${title(serverDraft.status === 'live' ? 'Approved in the ' : 'Sent for ', serverDraft.status === 'live' ? 'sample shop.' : 'review.')}<p data-testid="text-submit-result" style="margin: 10px 0 0; font-size: 19px">${statusMessage}</p><button type="button" data-testid="button-to-products" style="${nextStyle}; margin-top: 18px">See my products</button>`;
      $(form, 'button')!.addEventListener('click', () => ctx.navigate('/maker/products'));
      if (saved) saved.textContent = 'Submission recorded';
      return;
    }
    if (saved) saved.textContent = 'Draft saved securely';
    render();
  };
  const requestedDraftId = draftId;
  const initialize = async () => {
    try {
      if (requestedDraftId) {
        const serverDraft = await sampleApi<ServerDraft>(`/sample/maker/drafts/${encodeURIComponent(requestedDraftId)}`);
        if (alive) useServerDraft(serverDraft);
      } else {
        const created = await sampleApi<ServerDraft>('/sample/maker/drafts', { method: 'POST', body: JSON.stringify(draftPayload()) });
        if (alive) {
          useServerDraft(created);
          if (saved) saved.textContent = 'Draft saved securely';
        }
      }
    } catch (error) {
      if (!alive) return;
      if (saved) saved.textContent = 'Draft not connected';
      fieldError(form.parentElement, error instanceof Error ? error.message : 'Secure sample draft could not be opened.', 'error-draft-load');
    }
  };
  void initialize();
  ctx.cleanups.push(() => {
    alive = false;
    if (saveTimer !== undefined) window.clearTimeout(saveTimer);
  });
}

/* ------------------------------------------------------------------ Earnings */
export function hydrateMakerEarnings(ctx: Ctx) {
  const { root } = ctx;
  const cards = $$(root, 'main > section:first-of-type > div');
  type Earnings = {
    sample: true; makerId: string; makerBrand: string; deliveredCount: number;
    split: { grossPaise: number; gstPaise: number; taxablePaise: number; commissionPaise: number; commissionGstPaise: number; tcsPaise: number; paymentFeePaise: number; deductionsPaise: number; payoutPaise: number; netAfterGstPaise: number };
    runs: { makerId: string; makerBrand: string; date: string; orderIds: string[]; split: Earnings['split'] }[];
    nextRunDate: string; nextPayoutPaise: number; nextPayoutDate: string; pendingCount: number; pendingPaise: number;
  };
  let earnings: Earnings | null = null;
  let alive = true;
  const message = document.createElement('p');
  message.setAttribute('role', 'status');
  message.style.cssText = 'margin: 0 0 18px; padding: 12px 16px; border-radius: 12px;';
  message.textContent = 'Loading server-calculated earnings…';
  const main = $(root, 'main');
  if (main) main.insertBefore(message, main.firstChild);
  const paint = () => {
    const e = earnings;
    if (!e) return;
    const sp = e.split;
    const v = (i: number) => $$(cards[i], 'p');
    v(0)[1].textContent = formatINR(sp.grossPaise); v(0)[2].textContent = `${e.deliveredCount} delivered order${e.deliveredCount === 1 ? '' : 's'}`;
    v(1)[1].textContent = formatINR(sp.taxablePaise);
    v(2)[1].textContent = minus(sp.deductionsPaise);
    v(3)[1].textContent = formatINR(e.nextPayoutPaise); v(3)[2].textContent = longDate(e.nextPayoutDate.slice(0, 10));
    ['text-customers-paid', 'text-sales-before-gst', 'text-deductions', 'text-next-payout'].forEach((id, i) => tid(v(i)[1], id));
    const sched = byText(root, 'h2', /When you’ll be/)!.parentElement!;
    const runBox = sched.querySelector('div > div') as HTMLElement;
    const pend = $$(sched, 'div').find(x => /^Not delivered yet|^Nothing waiting/.test(norm(x.textContent))) as HTMLElement;
    $$(sched, '[data-run]').forEach(x => x.remove());
    if (runBox && !runBox.hasAttribute('data-tpl')) runBox.setAttribute('data-tpl', '');
    runBox.style.display = 'none';
    e.runs.forEach(r => {
      const date = r.date.slice(0, 10);
      const b = cloneEl(runBox); b.removeAttribute('data-tpl'); b.setAttribute('data-run', date); b.style.display = ''; tid(b, `row-payout-${date}`);
      const leaf = $$(b, 'span').filter(x => !x.children.length);
      leaf[0].textContent = String(d(date).getUTCDate()); leaf[1].textContent = MONTHS[d(date).getUTCMonth()].toUpperCase();
      leaf[2].textContent = longDate(date); leaf[3].textContent = `${r.orderIds.length} order${r.orderIds.length === 1 ? '' : 's'}: ${r.orderIds.join(', ')}`;
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
  sampleApi<Earnings>('/sample/maker/earnings')
    .then(result => {
      if (!alive) return;
      earnings = result;
      message.textContent = 'Calculated on the server from your delivered sample orders. Payout dates follow the weekly schedule; no bank transfer is made.';
      message.style.background = '#F1F7F4'; message.style.color = '#2C4640';
      paint();
    })
    .catch(error => {
      if (!alive) return;
      message.setAttribute('role', 'alert');
      message.textContent = error instanceof Error ? error.message : 'Earnings could not be loaded. No browser-only totals are shown.';
      message.style.background = '#F7D9CF'; message.style.color = '#8E2A22';
      cards.forEach(card => $$(card, 'p').forEach(value => { value.textContent = '—'; }));
    });
  ctx.cleanups.push(() => { alive = false; });
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
      if (!err) { err = document.createElement('p'); tid(err, 'error-growth'); err.setAttribute('role', 'alert'); err.setAttribute('style', 'margin: 0; font-size: 17px; color: #752F43; grid-column: 1 / -1'); boxes[0].insertAdjacentElement('beforebegin', err); }
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
    type ServerProfit = { productId: string; name: string; pricePaise: number; costPaise: number | null; split: { netAfterGstPaise: number }; leftPerSalePaise: number; marginPct: number; health: 'too_thin' | 'tight' | 'healthy' };
    const profitById = new Map<string, ServerProfit>();
    const rowInputs = new Map<string, HTMLInputElement>();
    const paintRows = new Map<string, () => void>();
    const inputStyle = styleOf($<HTMLInputElement>(table, 'tbody input'));
    const profitNotice = document.createElement('p');
    profitNotice.setAttribute('role', 'status');
    profitNotice.style.cssText = 'margin: 10px 0; padding: 10px 14px; border-radius: 12px;';
    wrap.before(profitNotice);
    const profitProductIds = ['t-lotuspond', 't-marigold', 't-teapot'];
    $$<HTMLTableRowElement>(table, 'tbody tr').forEach((tr, rowIndex) => {
      const tds = $$<HTMLTableCellElement>(tr, 'td');
      const p = getState().products.find(x => x.name === norm(tds[0].textContent)) ??
        getState().products.find(x => x.id === profitProductIds[rowIndex]);
      if (!p) return;
      tid(tr, `row-profit-${p.id}`);
      tds[1].textContent = formatINR(p.pricePaise); tds[2].textContent = '—';
      let input = $<HTMLInputElement>(tds[3], 'input');
      if (!input) {
        input = document.createElement('input');
        input.type = 'number'; input.min = '0'; input.step = '1'; input.placeholder = 'Add ₹';
        input.setAttribute('aria-label', `Cost for ${p.name}`);
        setStyle(input, inputStyle);
        tds[3].replaceChildren(input);
      }
      const paintRow = () => {
        const result = profitById.get(p.id);
        if (!result) { tds[4].textContent = '—'; tds[5].textContent = 'Loading server total'; return; }
        tds[2].textContent = formatINR(result.split.netAfterGstPaise);
        if (result.costPaise === null) { tds[4].textContent = '—'; tds[5].textContent = 'Add a cost'; return; }
        tds[4].textContent = formatINR(result.leftPerSalePaise);
        tds[5].innerHTML = ''; const c = document.createElement('span');
        c.textContent = HEALTH_LABEL[result.health === 'too_thin' ? 'too_thin' : result.health];
        setStyle(c, result.health === 'healthy' ? chipHealthy : result.health === 'tight' ? chipTight : chipTight.replace('#FBE3B2', '#F7D9CF').replace('#7A5517', '#8E2A22'));
        tid(c, `status-profit-${p.id}`); tds[5].appendChild(c);
      };
      if (input) {
        tid(input, `input-cost-${p.id}`);
        input.disabled = true; rowInputs.set(p.id, input);
        input.addEventListener('change', async () => {
          if (input.value !== '' && (!Number.isFinite(Number(input.value)) || Number(input.value) < 0)) return;
          input.disabled = true;
          try {
            const saved = await sampleApi<ServerProfit>(`/sample/maker/products/${encodeURIComponent(p.id)}/cost`, {
              method: 'PUT', body: JSON.stringify({ costPaise: input.value === '' ? null : Math.round(Number(input.value) * 100) }),
            });
            profitById.set(p.id, saved);
            input.value = saved.costPaise === null ? '' : String(saved.costPaise / 100);
            profitNotice.textContent = 'Private costs and profit estimates are saved and calculated on the server.';
            profitNotice.style.background = '#F1F7F4'; profitNotice.style.color = '#2C4640';
            paintRow();
          } catch (error) {
            profitNotice.textContent = error instanceof Error ? error.message : 'The private cost was not saved.';
            profitNotice.style.background = '#F7D9CF'; profitNotice.style.color = '#8E2A22';
          } finally { input.disabled = false; }
        });
      }
      paintRows.set(p.id, paintRow);
      paintRow();
    });
    sampleApi<{ sample: true; products: ServerProfit[] }>('/sample/maker/profits')
      .then(result => {
        result.products.forEach(product => {
          profitById.set(product.productId, product);
          const input = rowInputs.get(product.productId);
          if (input) { input.value = product.costPaise === null ? '' : String(product.costPaise / 100); input.disabled = false; }
        });
        profitNotice.textContent = 'Private costs and profit estimates are calculated on the server and visible only to your shop.';
        profitNotice.style.background = '#F1F7F4'; profitNotice.style.color = '#2C4640';
        rowInputs.forEach((input, id) => { if (!profitById.has(id)) input.disabled = true; });
        paintRows.forEach(paint => paint());
      })
      .catch(error => {
        profitNotice.setAttribute('role', 'alert');
        profitNotice.textContent = error instanceof Error ? error.message : 'Server profit totals could not be loaded. Editing is disabled.';
        profitNotice.style.background = '#F7D9CF'; profitNotice.style.color = '#8E2A22';
      });
  }
  ['#health', '#profits'].forEach(h => { const a = $(root, `a[href="${h}"]`); tid(a, `link-tool-${h.slice(1)}`); });
  const ask = $(root, 'main a[href="#ask"]'); tid(ask, 'link-tool-ask');
  on(ctx, ask, 'click', e => { e.preventDefault(); e.stopPropagation(); window.open('https://wa.me/?text=' + encodeURIComponent('Sahayak, I have a question about my pricing.'), '_blank', 'noopener'); });
}

/* ------------------------------------------------------------------ Settings */
export function hydrateMakerSettings(ctx: Ctx) {
  const { root } = ctx;
  const form = $<HTMLFormElement>(root, 'main form')!;
  const gst = $<HTMLSelectElement>(form, '[data-testid="select-maker-gst"]')!;
  const state = $<HTMLInputElement>(form, '[data-testid="input-maker-state"]')!;
  const trust = $(root, '[data-testid="status-maker-trust"]');
  const count = $(root, '[data-testid="text-approved-count"]');
  const payout = $(root, '[data-testid="text-payout-onboarding"]');
  const message = $(root, '[data-testid="text-maker-settings-status"]');
  const save = $<HTMLButtonElement>(form, 'button[type="submit"]')!;
  tid(gst, 'select-maker-gst'); tid(state, 'input-maker-state'); tid(save, 'button-save-maker-settings');
  let serverReady = false;
  sampleApi<{ sample: true; makerId: string; brand: string; trusted: boolean; approvedCount: number; gstRegistered: boolean; state: string; payoutOnboarding: 'not_configured'; message: string }>('/sample/maker/settings')
    .then(result => {
      gst.value = String(result.gstRegistered);
      state.value = result.state;
      trust!.textContent = result.trusted ? 'Trusted maker' : 'Not yet trusted';
      count!.textContent = `${result.approvedCount} approved listing${result.approvedCount === 1 ? '' : 's'}; Baksa controls trust status.`;
      payout!.textContent = result.message;
      serverReady = true;
      save!.disabled = false;
    })
    .catch(error => {
      if (message) { message.setAttribute('role', 'alert'); message.textContent = error instanceof Error ? error.message : 'Settings could not be loaded.'; }
      save!.disabled = true;
    });
  if (save) save.disabled = true;
  on(ctx, form, 'submit', async event => {
    event.preventDefault();
    if (!serverReady) return;
    const stateValue = state.value.trim();
    if (stateValue.length < 2 || stateValue.length > 80) {
      fieldError(state, 'Enter your state or union territory.', 'error-maker-settings');
      return;
    }
    save!.disabled = true;
    try {
      const result = await sampleApi<{ gstRegistered: boolean; state: string }>('/sample/maker/settings', {
        method: 'PUT',
        body: JSON.stringify({ gstRegistered: gst.value === 'true', state: stateValue }),
      });
      gst.value = String(result.gstRegistered); state.value = result.state;
      if (message) { message.removeAttribute('role'); message.textContent = 'Your GST status and state were saved to your sample shop.'; }
    } catch (error) {
      if (message) { message.setAttribute('role', 'alert'); message.textContent = error instanceof Error ? error.message : 'Settings were not saved.'; }
    } finally { save!.disabled = false; }
  });
}

/* ------------------------------------------------------------------ Opportunities and courses */
export function hydrateMakerOpportunities(ctx: Ctx) {
  const { root } = ctx;
  const arts = $$<HTMLElement>(root, 'main section article');
  const ids = ['op1', 'op2'];
  const serverOpportunityStatus = new Map<string, 'open' | 'yes' | 'no'>();
  const respond = async (id: string, decision: 'yes' | 'no') => {
    try {
      if (ids.includes(id) || id.startsWith('brief-')) {
        const saved = await sampleApi<{ id: string; status: 'open' | 'yes' | 'no' }>(`/sample/maker/opportunities/${encodeURIComponent(id)}/response`, {
          method: 'PATCH', body: JSON.stringify({ decision }),
        });
        serverOpportunityStatus.set(id, saved.status);
      }
      update(s => respondOpp(s, id, decision === 'yes'));
    } catch (error) {
        const card = root.querySelector<HTMLElement>(`[data-testid="card-opp-${id}"]`);
      let notice = card?.querySelector<HTMLElement>('[data-testid="error-opportunity-response"]');
      if (card && !notice) { notice = document.createElement('p'); tid(notice, 'error-opportunity-response'); notice.setAttribute('role', 'alert'); card.appendChild(notice); }
      if (notice) notice.textContent = error instanceof Error ? error.message : 'Your response was not saved.';
    }
  };
  const paint = () => {
    const s = getState();
    arts.forEach((a, i) => {
      const o = s.opps.find(x => x.id === ids[i]); if (!o) return;
      tid(a, `card-opp-${o.id}`);
      const [yes, no] = $$<HTMLButtonElement>(a, 'button');
      tid(yes, `button-opp-yes-${o.id}`); tid(no, `button-opp-no-${o.id}`);
      let st = $(a, '[data-opp-status]');
      const status = serverOpportunityStatus.get(o.id) ?? o.status;
      if (status !== 'open') {
        yes.style.display = 'none'; no.style.display = 'none';
        if (!st) { st = document.createElement('p'); st.setAttribute('data-opp-status', ''); st.setAttribute('style', 'margin: 12px 0 0; font-family: Jost, Georgia, serif; font-size: 13px; color: #2C4640'); a.appendChild(st); }
        tid(st, `status-opp-${o.id}`);
        st.textContent = status === 'yes' ? 'You said yes. The Baksa team will call you with the details.' : 'Not this time. Thanks for letting us know.';
      } else { yes.style.display = ''; no.style.display = ''; st?.remove(); }
    });
    // extra briefs sent from admin
    const host = arts[0]?.parentElement;
    if (host) {
      $$(host, 'article[data-extra]').forEach(x => x.remove());
      s.opps.filter(o => !ids.includes(o.id) && serverOpportunityStatus.has(o.id)).forEach(o => {
        const a = cloneEl(arts[0]); a.setAttribute('data-extra', ''); tid(a, `card-opp-${o.id}`);
        $(a, 'h2')!.textContent = o.title; $(a, 'h2 + p')!.textContent = o.detail;
        const [yes, no] = $$<HTMLButtonElement>(a, 'button');
        $$(a, '[data-opp-status]').forEach(x => x.remove());
        if (o.status === 'open') { yes.style.display = ''; no.style.display = ''; yes.onclick = () => { void respond(o.id, 'yes'); }; no.onclick = () => { void respond(o.id, 'no'); }; }
        else { yes.remove(); no.remove(); const p = document.createElement('p'); p.setAttribute('style', 'margin: 12px 0 0; font-family: Jost, Georgia, serif; font-size: 13px; color: #2C4640'); p.textContent = o.status === 'yes' ? 'You said yes.' : 'Not this time.'; a.appendChild(p); }
        host.appendChild(a);
      });
    }
  };
  arts.forEach((a, i) => { const [yes, no] = $$<HTMLButtonElement>(a, 'button'); on(ctx, yes, 'click', () => { void respond(ids[i], 'yes'); }); on(ctx, no, 'click', () => { void respond(ids[i], 'no'); }); });
  paint(); ctx.cleanups.push(subscribe(paint));
  void sampleApi<{ sample: true; opportunities: Array<{ id: string; type: 'corporate' | 'event'; title: string; detail: string; status: 'open' | 'yes' | 'no' }> }>('/sample/maker/opportunities')
    .then(data => {
      data.opportunities.forEach(o => {
        serverOpportunityStatus.set(o.id, o.status);
        const card = root.querySelector<HTMLElement>(`[data-testid="card-opp-${o.id}"]`);
        if (card) { const heading = $(card, 'h2'); const detail = $(card, 'h2 + p'); if (heading) heading.textContent = o.title; if (detail) detail.textContent = o.detail; }
        update(s => {
          const existing = s.opps.find(old => old.id === o.id);
          const makerId = o.id.endsWith('-m2') ? 'm2' : 'm1';
          const updated = existing
            ? s.opps.map(old => old.id === o.id ? { ...old, title: o.title, detail: o.detail, status: o.status } : old)
            : [...s.opps, { id: o.id, makerId, from: o.id.startsWith('brief-') ? o.id.split('-').slice(1, -1).join('-') : undefined, type: o.type === 'event' ? 'Event' : 'Corporate brief', title: o.title, detail: o.detail, status: o.status }];
          return { ...s, opps: updated };
        });
      });
      paint();
    })
    .catch(error => { const note = document.createElement('p'); tid(note, 'error-opportunities-load'); note.setAttribute('role', 'alert'); note.textContent = error instanceof Error ? error.message : 'Opportunities could not be loaded.'; arts[0]?.parentElement?.insertAdjacentElement('beforebegin', note); });

  const form = $<HTMLFormElement>(root, 'main form');
  if (form) {
    const [title, length, price] = $$<HTMLInputElement>(form, 'input'); const type = $<HTMLSelectElement>(form, 'select')!; const about = $<HTMLTextAreaElement>(form, 'textarea')!;
    tid(title, 'input-proposal-title'); tid(type, 'select-proposal-type'); tid(length, 'input-proposal-length'); tid(price, 'input-proposal-price'); tid(about, 'input-proposal-about');
    const btn = byText<HTMLButtonElement>(form, 'button', 'Send my proposal'); tid(btn, 'button-send-proposal');
    const send = async (e: Event) => {
      e.preventDefault();
      const err = validateProposal({ title: title.value, length: length.value, price: price.value, about: about.value });
      fieldError(btn, err, 'error-proposal'); if (err) return;
      if (btn) btn.disabled = true;
      try {
        const proposal = await sampleApi<{ title: string }>('/sample/maker/masterclass-proposals', {
          method: 'POST',
          body: JSON.stringify({ title: title.value.trim(), type: type.value, duration: length.value.trim(), pricePaise: Math.round(Number(price.value) * 100), about: about.value.trim() }),
        });
        update(s => ({ ...s, proposals: [...s.proposals, { title: title.value.trim(), type: type.value, length: length.value.trim(), pricePaise: Math.round(Number(price.value) * 100), about: about.value.trim(), status: 'sent' }] }));
        const ok = document.createElement('p'); tid(ok, 'text-proposal-sent'); ok.setAttribute('role', 'status');
        ok.setAttribute('style', 'margin: 12px 0 0; background: #D5E6DE; border-radius: 16px; padding: 12px 14px; font-size: 18px; color: #22332F');
        ok.textContent = `Proposal sent: “${proposal.title}”. The Baksa team can now review it.`;
        $$(form, '[data-testid="text-proposal-sent"]').forEach(x => x.remove());
        form.appendChild(ok); form.reset();
      } catch (error) {
        fieldError(btn, error instanceof Error ? error.message : 'Proposal could not be saved.', 'error-proposal-save');
      } finally { if (btn) btn.disabled = false; }
    };
    on(ctx, btn, 'click', send); on(ctx, form, 'submit', send);
  }
  if (ctx.path === '/maker/courses') {
    const h = byText(root, 'h1', 'My courses');
    if (h) requestAnimationFrame(() => h.scrollIntoView({ block: 'start' }));
  }
  void TODAY; void BTN_OUTLINE;
}
