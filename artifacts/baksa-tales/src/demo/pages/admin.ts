import { $, $$, byText, cloneEl, type Ctx, fieldError, norm, on, pillGroup, setStyle, setVisible, styleOf, tid } from '../dom';
import {
  ORDER_STEP_LABEL, STAGE_LABEL, approveListing, canApprove, formatINR, getState, imgUrl, makerById,
  productById, recordQuote, requestChanges, resolveProblem, reviewQueue, sendToMatched, setApplicationStatus, setEnquiryStage, setMatched,
  setReviewCheck, spotChecks, subscribe, update,
} from '../store';
import { longDate, shortDate } from './maker';
import { sampleApi } from '../sample-api';
import type { DemoEnquiry, DemoOrder, DemoProduct } from '../catalog';

/** Generic two-state pill group (period switches): the odd-one-out style is "active". */
export function wirePeriodGroups(ctx: Ctx) {
  $$(ctx.root, 'main div[role="group"][aria-label="Period"]').forEach(g => {
    const bs = $$<HTMLButtonElement>(g, 'button');
    const counts = new Map<string, number>(); bs.forEach(b => counts.set(styleOf(b), (counts.get(styleOf(b)) ?? 0) + 1));
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const idle = sorted[0][0]; const active = (sorted[1] ?? sorted[0])[0];
    let cur = bs.findIndex(b => styleOf(b) === active);
    if (bs.length === 2 && sorted.length === 2 && sorted[0][1] === 1) cur = bs.findIndex(b => /border: 0/.test(styleOf(b)));
    const act = styleOf(bs[cur]); const idl = styleOf(bs.find((_, i) => i !== cur));
    bs.forEach((b, i) => { tid(b, `button-period-${norm(b.textContent).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`); b.setAttribute('aria-pressed', String(i === cur)); on(ctx, b, 'click', () => pillGroup(bs, act, idl, i)); });
  });
}

/* ------------------------------------------------------------------ Overview */
export function hydrateAdminOverview(ctx: Ctx) {
  wirePeriodGroups(ctx);
  const paint = () => {
    const s = getState();
    const live = s.products.filter(p => p.status === 'live').length; const makers = s.makers.filter(m => m.published).length;
    const lm = byText(ctx.root, 'p', 'Live makers')?.parentElement; if (lm) { const ps = $$(lm, 'p'); ps[1].textContent = String(makers); ps[2].textContent = `${live} live products`; }
    $$(ctx.root, 'main a').forEach((a, i) => tid(a, `link-attention-${i}`));
    $$(ctx.root, 'main section div').forEach(row => {
      const t = norm(row.children[1]?.textContent);
      const rv = t.match(/^Review “(.+)” from/); if (rv) { const p = s.products.find(x => x.name === rv[1]); setVisible(row as HTMLElement, p?.status === 'review'); }
      if (/^Problem on BT-1030/.test(t)) setVisible(row as HTMLElement, s.orders.find(o => o.id === 'BT-1030')?.status === 'problem');
      if (/^New vendor application: Pattachitra/.test(t)) setVisible(row as HTMLElement, s.applications.find(a => a.id === 'a1')?.status === 'pending');
    });
  };
  paint(); ctx.cleanups.push(subscribe(paint));
  void sampleApi<{
    metrics: { salesPaise: number; commissionPaise: number; orderCount: number; liveMakerCount: number; liveProductCount: number; corporatePipelinePaise: number; openCorporateCount: number; pendingReviewCount: number; openIssueCount: number; pendingApplicationCount: number };
    attention: Array<{ id: string; label: string; href: string; kind: 'order' | 'review' | 'application' | 'corporate' }>;
  }>('/sample/admin/overview')
    .then(({ metrics, attention }) => {
      const metricCards = $$(ctx.root, 'main > section')[0]?.children ?? [];
      for (const card of Array.from(metricCards)) {
        const paragraphs = $$<HTMLElement>(card, 'p');
        const label = norm(paragraphs[0]?.textContent);
        if (label === 'Sales through Baksa') {
          tid(card as HTMLElement, 'metric-card-sales');
          paragraphs[1].textContent = formatINR(metrics.salesPaise);
          tid(paragraphs[1], 'metric-value-sales');
          paragraphs[2].textContent = `${metrics.orderCount} sample orders`;
        } else if (label === 'Baksa commission') {
          paragraphs[1].textContent = formatINR(metrics.commissionPaise);
          tid(paragraphs[1], 'metric-value-commission');
        }
        else if (label === 'Live makers') {
          paragraphs[1].textContent = String(metrics.liveMakerCount);
          tid(paragraphs[1], 'metric-value-live-makers');
          paragraphs[2].textContent = `${metrics.liveProductCount} live products`;
        } else if (label === 'Corporate pipeline') {
          paragraphs[1].textContent = formatINR(metrics.corporatePipelinePaise);
          tid(paragraphs[1], 'metric-value-corporate-pipeline');
          paragraphs[2].textContent = `${metrics.openCorporateCount} open briefs`;
        }
      }
      const host = byText(ctx.root, 'h2', 'Needs attention')?.nextElementSibling as HTMLElement | null;
      if (!host) return;
      const rowTemplate = host.firstElementChild as HTMLElement | null;
      if (!rowTemplate) return;
      host.replaceChildren();
      if (!attention.length) {
        const empty = document.createElement('p'); empty.textContent = 'Nothing needs attention right now.';
        empty.setAttribute('style', 'margin:12px 0;font-size:18px;color:#71645E'); host.appendChild(empty); return;
      }
      attention.forEach((item, index) => {
        const row = cloneEl(rowTemplate); tid(row, `row-attention-${item.kind}-${item.id}`);
        const dot = row.firstElementChild as HTMLElement | null;
        if (dot) dot.style.background = item.kind === 'order' ? '#752F43' : item.kind === 'review' ? '#B08A55' : '#34514B';
        const label = row.children[1] as HTMLElement | undefined; if (label) label.textContent = item.label;
        const link = row.querySelector<HTMLAnchorElement>('a');
        if (link) {
          link.textContent = 'Open'; link.href = item.href; tid(link, `link-attention-${index}`);
          on(ctx, link, 'click', event => { event.preventDefault(); ctx.navigate(item.href); });
        }
        host.appendChild(row);
      });
    })
    .catch(error => {
      const msg = document.createElement('p'); msg.setAttribute('role', 'alert');
      msg.textContent = error instanceof Error ? error.message : 'Admin overview could not be loaded.';
      msg.setAttribute('style', 'padding:12px;color:#8E2A22;background:#F7D9CF;border-radius:12px');
      ctx.root.querySelector('main')?.prepend(msg);
    });
}

/* ------------------------------------------------------------------ Reviews */
export function hydrateAdminReviews(ctx: Ctx) {
  const { root } = ctx;
  const tabs = $$<HTMLButtonElement>(root, 'div[aria-label="Review type"] button');
  const tA = styleOf(tabs[0]), tI = styleOf(tabs[1]);
  const section = tabs[0].parentElement!.nextElementSibling as HTMLElement;
  const sectionDisplay = section.style.display;
  const listCol = section.firstElementChild as HTMLElement; const detail = section.lastElementChild as HTMLElement;
  const itemBtns = $$<HTMLButtonElement>(listCol, 'button');
  const itemTpl = cloneEl(itemBtns[1]); const selStyle = styleOf(itemBtns[0]); const idleItem = styleOf(itemBtns[1]);
  const swatches = [styleOf(itemBtns[0].firstElementChild), styleOf(itemBtns[1].firstElementChild)];
  const appsH2 = byText(root, 'h2', 'Vendor applications')!; const appsSec = appsH2.nextElementSibling as HTMLElement;
  const photo = detail.firstElementChild!.firstElementChild as HTMLElement; const photoStyle = styleOf(photo);
  const checks = $$<HTMLInputElement>(detail, 'input[type="checkbox"]');
  const note = $<HTMLTextAreaElement>(detail, 'textarea')!;
  const approve = byText<HTMLButtonElement>(detail, 'button', 'Approve and publish')!; const ask = byText<HTMLButtonElement>(detail, 'button', 'Ask for changes')!;
  const approveStyle = styleOf(approve).replace(/; opacity: \.45/, '');
  const hint = approve.parentElement!.lastElementChild as HTMLElement;
  const reasonChip = byText(detail, 'span', /^Why it’s here/);
  checks.forEach((c, i) => tid(c, `checkbox-gate-${i + 1}`)); tid(note, 'input-review-note'); tid(approve, 'button-approve'); tid(ask, 'button-ask-changes'); tid(hint, 'text-approve-hint');
  let tab = 0; let selected: string | null = null; let flash = '';
  type ServerReview = {
    id: string; makerId: string; makerBrand: string; name: string; kind: string; material: string;
    technique: string; size: string; pricePaise: number; stock: number; dispatchDays: number; story: string;
    photo: string; submittedAt: string; status: 'review' | 'live' | 'changes'; checks: boolean[]; note: string; reason: string | null;
  };
  const serverReviews = new Map<string, ServerReview>();
  const editedReviews = new Map<string, { checks: boolean[]; note: string }>();

  const queueFor = () => (tab === 1 ? spotChecks(getState()) : reviewQueue(getState()));
  const render = () => {
    const s = getState();
    const q = reviewQueue(s), sc = spotChecks(s), apps = s.applications.filter(a => a.status === 'pending' || a.status === 'call');
    tabs[0].textContent = `Waiting for review (${q.length})`; tabs[1].textContent = `Spot checks (${sc.length})`; tabs[2].textContent = `Vendor applications (${apps.length})`;
    ['tab-waiting', 'tab-spot', 'tab-applications'].forEach((id, i) => tid(tabs[i], id));
    pillGroup(tabs, tA, tI, tab);
    section.style.display = tab === 2 ? 'none' : sectionDisplay;
    setVisible(appsH2, tab === 2 || tab === 0); setVisible(appsSec, tab === 2 || tab === 0);
    const items = queueFor();
    if (!items.find(p => p.id === selected)) selected = items[0]?.id ?? null;
    listCol.replaceChildren(...items.map((p, i) => {
      const b = cloneEl(itemTpl); setStyle(b, p.id === selected ? selStyle : idleItem); tid(b, `button-review-item-${p.id}`);
      setStyle(b.firstElementChild, swatches[i % 2]);
      const sp = Array.from(b.lastElementChild!.children) as HTMLElement[]; sp[0].textContent = p.name; sp[1].textContent = `${makerById(s, p.makerId)!.brand}, ${tab === 1 ? `live ${shortDate(p.published ?? p.submitted ?? '2026-11-03')}` : `sent ${shortDate(p.submitted ?? '2026-11-03')}`}`;
      b.onclick = () => { selected = p.id; flash = ''; render(); };
      return b;
    }));
    if (!items.length) {
      const e = document.createElement('p'); tid(e, 'empty-reviews'); e.setAttribute('style', 'margin: 0; font-size: 19px; color: #71645E; background: #FFFDF9; border-radius: 20px; padding: 16px');
      e.textContent = flash || (tab === 1 ? 'No spot checks waiting.' : 'Nothing waiting for review.'); listCol.appendChild(e);
    }
    detail.style.display = selected ? '' : 'none';
    if (!selected) return;
    const p = productById(s, selected)!; const m = makerById(s, p.makerId)!;
    const serverReview = serverReviews.get(p.id);
    const r = serverReview ? (editedReviews.get(p.id) ?? { checks: serverReview.checks, note: serverReview.note }) :
      s.reviews[p.id] ?? { checks: [false, false, false, false, false], note: '' };
    // The final review design intentionally uses a labelled photo placeholder.
    photo.textContent = 'Product photo'; setStyle(photo, photoStyle);
    $(detail, 'h2')!.textContent = p.name; tid($(detail, 'h2'), 'text-review-name');
    const ps = $$($(detail, 'h2')!.parentElement!, ':scope > p'); ps[0].textContent = `${m.brand}. ${formatINR(p.pricePaise)}, ${p.stock} in stock${p.size ? `, ${p.size}` : ''}`; ps[1].textContent = p.story ?? p.material;
    if (reasonChip) reasonChip.textContent = tab === 1 ? 'Why it’s here: spot check, trusted maker' : `Why it’s here: ${serverReview?.reason ?? p.reason ?? `new maker, listing ${m.approvedCount + 1} of 3`}`;
    checks.forEach((c, i) => (c.checked = !!r.checks[i]));
    if (document.activeElement !== note) note.value = r.note;
    const ok = canApprove(r.checks);
    approve.disabled = !ok; setStyle(approve, ok ? approveStyle : approveStyle + '; opacity: .45');
    approve.textContent = tab === 1 ? 'Looks good' : 'Approve and publish';
    hint.textContent = flash || (ok ? 'All five ticked.' : 'Tick all five to approve.');
  };
  checks.forEach((c, i) => on(ctx, c, 'change', () => {
    if (!selected) return;
    const current = editedReviews.get(selected) ?? serverReviews.get(selected) ?? getState().reviews[selected] ?? { checks: [false, false, false, false, false], note: '' };
    const nextChecks = [...current.checks]; nextChecks[i] = c.checked;
    editedReviews.set(selected, { checks: nextChecks, note: note.value });
    update(s => setReviewCheck(s, selected!, i, c.checked));
  }));
  on(ctx, note, 'input', () => {
    if (!selected) return;
    const current = editedReviews.get(selected) ?? serverReviews.get(selected) ?? getState().reviews[selected] ?? { checks: [false, false, false, false, false], note: '' };
    editedReviews.set(selected, { checks: [...current.checks], note: note.value });
    const id = selected;
    update(s => ({ ...s, reviews: { ...s.reviews, [id]: { ...(s.reviews[id] ?? { checks: [false, false, false, false, false], note: '' }), note: note.value } } }));
  });
  on(ctx, approve, 'click', async () => {
    if (!selected) return; const name = productById(getState(), selected)!.name;
    if (tab === 1) { update(s => ({ ...s, products: s.products.map(p => p.id === selected ? { ...p, spot: false } : p) })); flash = `${name} checked.`; render(); return; }
    if (serverReviews.has(selected)) {
      const selectedId = selected;
      const review = serverReviews.get(selectedId)!;
      const checkList = editedReviews.get(selectedId)?.checks ?? review.checks;
      try {
        const saved = await sampleApi<ServerReview>(`/sample/admin/product-reviews/${encodeURIComponent(selectedId)}`, {
          method: 'PATCH', body: JSON.stringify({ action: 'approve', checks: checkList, note: note.value }),
        });
        serverReviews.set(selectedId, saved);
        editedReviews.delete(selectedId);
        update(state => ({ ...state, products: state.products.map(product => product.id === selectedId ? { ...product, status: 'live' } : product) }));
        flash = `${name} is live in the sample catalogue.`;
        render();
      } catch (error) {
        hint.textContent = error instanceof Error ? error.message : 'The sample approval was not saved.';
      }
      return;
    }
    const r = approveListing(getState(), selected); if (!r.ok) { hint.textContent = r.error!; return; }
    flash = `${name} is live.`; update(() => r.state);
  });
  on(ctx, ask, 'click', async () => {
    if (!selected) return; const name = productById(getState(), selected)!.name;
    if (serverReviews.has(selected)) {
      const selectedId = selected;
      const review = serverReviews.get(selectedId)!;
      const checkList = editedReviews.get(selectedId)?.checks ?? review.checks;
      try {
        const saved = await sampleApi<ServerReview>(`/sample/admin/product-reviews/${encodeURIComponent(selectedId)}`, {
          method: 'PATCH', body: JSON.stringify({ action: 'changes', checks: checkList, note: note.value }),
        });
        serverReviews.set(selectedId, saved);
        editedReviews.delete(selectedId);
        update(state => ({ ...state, products: state.products.map(product => product.id === selectedId ? { ...product, status: 'changes', reason: note.value } : product) }));
        flash = `Changes requested on ${name}.`;
        note.value = '';
        render();
      } catch (error) {
        fieldError(note, error instanceof Error ? error.message : 'The change request was not saved.', 'error-review-note');
      }
      return;
    }
    const r = requestChanges(getState(), selected, note.value);
    fieldError(note, r.ok ? null : r.error, 'error-review-note'); if (!r.ok) return;
    flash = `Changes requested on ${name}.`; note.value = ''; update(() => r.state);
  });
  tabs.forEach((t, i) => on(ctx, t, 'click', () => { tab = i; flash = ''; render(); }));

  let reviewsAlive = true;
  sampleApi<{ sample: true; reviews: ServerReview[] }>('/sample/admin/product-reviews')
    .then(result => {
      if (!reviewsAlive) return;
      result.reviews.forEach(review => {
        serverReviews.set(review.id, review);
      });
      update(state => {
        const additions: DemoProduct[] = result.reviews.map(review => ({
          id: review.id, slug: review.id, name: review.name,
          makerId: review.makerId === 'tathaastu' ? 'm1' : 'm2',
          pricePaise: review.pricePaise, category: review.kind, material: review.material,
          technique: review.technique, size: review.size, dispatchDays: review.dispatchDays, stock: review.stock,
          gstPct: 18, madeToOrder: false, status: review.status, feels: [], occasions: [], recipients: [],
          corp: false, img: review.photo, story: review.story, submitted: review.submittedAt.slice(0, 10),
          reason: review.reason ?? undefined,
        }));
        const ids = new Set(additions.map(product => product.id));
        return { ...state, products: [...state.products.filter(product => !ids.has(product.id)), ...additions] };
      });
      render();
    })
    .catch(error => {
      if (!reviewsAlive) return;
      flash = error instanceof Error ? error.message : 'Sample review items could not be loaded.';
      render();
    });

  // vendor applications
  const appTpl = cloneEl($$<HTMLElement>(appsSec, 'article')[0]);
  const chipNew = styleOf($(appTpl, 'h3 + span'));
  const callChip = styleOf($($$(appsSec, 'article')[1] ?? appTpl, 'h3 + span'));
  const applicationStatuses = new Map<string, 'pending' | 'call' | 'approved' | 'declined'>();
  const renderApps = () => {
    const s = getState();
    appsSec.replaceChildren(...s.applications.map(a => {
      const status = applicationStatuses.get(a.id) ?? a.status;
      const el = cloneEl(appTpl); tid(el, `card-application-${a.id}`);
      $(el, 'h3')!.textContent = a.brand;
      const chip = $(el, 'h3 + span') as HTMLElement; tid(chip, `status-application-${a.id}`);
      chip.textContent = { pending: 'New', call: 'Call booked', approved: 'Approved, invite sent', declined: 'Declined' }[status];
      setStyle(chip, status === 'pending' ? chipNew : status === 'approved' ? chipNew.replace('#F7D9CF', '#D5E6DE').replace('#752F43', '#2C4640') : callChip);
      $(el, 'p')!.textContent = `${a.name}, ${a.place}. ${a.craft}. GST: ${a.gst}`;
      const btnRow = $(el, 'p + div') as HTMLElement; const tplBtns = $$<HTMLButtonElement>(btnRow, 'button');
      const mk = (label: string, decision: 'approve' | 'book_call' | 'decline', k: string) => {
        const b = cloneEl(tplBtns[0]); b.textContent = label; tid(b, `button-application-${k}-${a.id}`);
        b.onclick = async () => {
          b.disabled = true;
          try {
            const saved = await sampleApi<{ status: 'pending' | 'call' | 'approved' | 'declined' }>(`/sample/admin/vendor-applications/${encodeURIComponent(a.id)}`, {
              method: 'PATCH', body: JSON.stringify({ decision }),
            });
            applicationStatuses.set(a.id, saved.status);
            update(x => setApplicationStatus(x, a.id, saved.status));
          } catch (error) {
            flash = error instanceof Error ? error.message : 'Application decision was not saved.';
            render();
          } finally { b.disabled = false; }
        };
        return b;
      };
      const styleBy = (b: HTMLButtonElement, i: number) => { setStyle(b, styleOf(tplBtns[Math.min(i, tplBtns.length - 1)])); return b; };
      const btns: HTMLButtonElement[] = [];
      if (status === 'pending' || status === 'call') {
        btns.push(styleBy(mk('Approve and invite', 'approve', 'approve'), 0));
        if (status === 'pending') btns.push(styleBy(mk('Book a call', 'book_call', 'call'), 1));
        btns.push(styleBy(mk('Decline', 'decline', 'decline'), 2));
      }
      btnRow.replaceChildren(...btns);
      return el;
    }));
  };
  render(); renderApps();
  void sampleApi<{ applications: Array<{ id: string; status: 'pending' | 'call' | 'approved' | 'declined' }> }>('/sample/admin/vendor-applications')
    .then(({ applications }) => {
      applications.forEach(application => applicationStatuses.set(application.id, application.status));
      update(s => ({ ...s, applications: s.applications.map(application => {
        const status = applicationStatuses.get(application.id);
        return status ? { ...application, status } : application;
      }) }));
    })
    .catch(error => { flash = error instanceof Error ? error.message : 'Vendor applications could not be loaded.'; render(); });
  ctx.cleanups.push(subscribe(() => { render(); renderApps(); }), () => { reviewsAlive = false; });
}

/* ------------------------------------------------------------------ Orders and payouts */
export function hydrateAdminOrders(ctx: Ctx) {
  const { root } = ctx;
  const table = $(root, 'main table')!;
  const wrap = document.createElement('div'); wrap.setAttribute('data-bt-scroll', ''); wrap.style.overflowX = 'auto'; table.replaceWith(wrap); wrap.appendChild(table);
  const tbody = $(table, 'tbody')!; const rows = $$<HTMLTableRowElement>(tbody, 'tr');
  const probTpl = cloneEl(rows[0]); const rowTpl = cloneEl(rows[1]);
  const chipStyle: Record<string, string> = {};
  rows.forEach(r => { const c = $(r, 'td:last-child span'); if (c) chipStyle[norm(c.textContent)] = styleOf(c); });
  const show = $<HTMLSelectElement>(root, 'main select')!; tid(show, 'select-order-filter');
  ['all', 'attention', 'delivered'].forEach((v, i) => (show.options[i].value = v));
  const runSec = byText(root, 'p', 'This payout run')!.closest('section')!;
  const runRows = $$<HTMLElement>(runSec, ':scope > div').filter(d => $(d, 'button'));
  const runTpl = cloneEl(runRows[0]); const runHost = runRows[0].parentElement!;
  runRows.forEach(r => r.remove());
  const h2 = $(runSec, 'h2'); const rates = $(runSec, 'a[href="#rates"]'); tid(rates, 'link-edit-rates');
  on(ctx, rates, 'click', e => { e.preventDefault(); e.stopPropagation(); ctx.navigate('/admin/academy'); });
  let serverReady = false;
  let alive = true;
  type ServerOrder = {
    id: string; productId: string; productName: string; makerId: string; makerBrand: string; qty: number;
    amountPaise: number; customer: string; city: string; date: string; status: DemoOrder['status'];
    courier: string; tracking: string; deliveredOn: string | null; settled: boolean; issue: string;
  };
  const mapServerOrder = (o: ServerOrder): DemoOrder => ({
    id: o.id, productId: o.productId, makerId: ({ tathaastu: 'm1', mushhk: 'm2', svara: 'm3', anirveda: 'm4' } as Record<string, string>)[o.makerId] ?? 'm1',
    qty: o.qty, amountPaise: o.amountPaise, customer: o.customer, city: o.city, date: o.date.slice(0, 10),
    status: o.status, courier: o.courier || undefined, tracking: o.tracking || undefined,
    deliveredOn: o.deliveredOn?.slice(0, 10) ?? null, settled: o.settled, issue: o.issue || undefined,
  });
  const saveAdminStatus = async (id: string, status: 'delayed' | 'refunded', note: string) => {
    if (!serverReady) return;
    try {
      const saved = await sampleApi<ServerOrder>(`/sample/admin/orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH', body: JSON.stringify({ status, note }),
      });
      if (!alive) return;
      update(state => ({ ...state, orders: [...state.orders.filter(order => order.id !== id), mapServerOrder(saved)] }));
    } catch (error) {
      const row = tbody.querySelector(`[data-testid="row-order-${CSS.escape(id)}"]`);
      const cell = row?.querySelector('td:last-child');
      fieldError(cell as HTMLElement | null, error instanceof Error ? error.message : 'Order status was not saved.', `error-admin-order-${id}`);
    }
  };
  type PayoutRun = { makerId: string; makerBrand: string; date: string; orderIds: string[]; split: { grossPaise: number; payoutPaise: number } };
  type PaidRun = { makerId: string; makerBrand: string; date: string; orderIds: string[]; grossPaise: number; payoutPaise: number; paidOn: string };
  let payoutData: { sample: true; runs: PayoutRun[]; paidRuns: PaidRun[] } | null = null;
  const makerKey = (id: string) => ({ tathaastu: 'm1', mushhk: 'm2', svara: 'm3', anirveda: 'm4' } as Record<string, string>)[id] ?? id;

  const render = () => {
    const s = getState();
    const order = ['problem', 'delayed', 'new', 'packed', 'dispatched', 'delivered', 'refunded'];
    const list = [...s.orders].filter(o => show.value === 'all' || (show.value === 'attention' ? ['problem', 'delayed'].includes(o.status) : o.status === 'delivered'))
      .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.date.localeCompare(a.date));
    tbody.replaceChildren(...list.map(o => {
      const p = productById(s, o.productId)!; const tr = cloneEl(o.status === 'problem' ? probTpl : rowTpl); tid(tr, `row-order-${o.id}`);
      const td = $$(tr, 'td');
      td[0].textContent = o.id;
      td[1].textContent = o.qty > 1 ? `${p.name} × ${o.qty}` : p.name;
      if (o.status === 'problem') { const sp = cloneEl($(probTpl, 'td:nth-child(2) span') ?? $$(probTpl, 'td')[1].querySelector('span')!); sp.textContent = o.issue ?? 'Problem reported'; td[1].appendChild(sp); }
      td[2].textContent = makerById(s, o.makerId)!.brand; td[3].textContent = `${o.customer}, ${o.city}`; td[4].textContent = formatINR(o.amountPaise);
      const label = o.status === 'problem' ? 'Problem' : ORDER_STEP_LABEL[o.status];
      td[5].innerHTML = ''; const chip = document.createElement('span'); chip.textContent = label; setStyle(chip, chipStyle[label] ?? chipStyle['New']); tid(chip, `status-order-${o.id}`); td[5].appendChild(chip);
      if (serverReady && !['delivered', 'refunded'].includes(o.status)) {
        const actions = document.createElement('span');
        actions.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;';
        if (!['problem', 'delayed'].includes(o.status)) {
          const delayed = document.createElement('button');
          delayed.type = 'button'; delayed.textContent = 'Mark delayed'; delayed.style.cssText = styleOf($(probTpl, 'td:last-child a'));
          tid(delayed, `button-delay-${o.id}`);
          delayed.onclick = () => {
            const note = window.prompt('Add a note about the delay for the buyer and Baksa team.');
            if (note?.trim()) void saveAdminStatus(o.id, 'delayed', note.trim());
          };
          actions.appendChild(delayed);
        }
        const refund = document.createElement('button');
        refund.type = 'button'; refund.textContent = 'Record refunded status'; refund.title = 'Records the status only; no payment gateway refund is sent.';
        refund.style.cssText = styleOf($(probTpl, 'td:last-child a'));
        tid(refund, `button-refund-${o.id}`);
        refund.onclick = () => {
          const note = window.prompt('Add a note. This records a sample status only; it does not refund a payment.');
          if (note?.trim()) void saveAdminStatus(o.id, 'refunded', note.trim());
        };
        actions.appendChild(refund);
        td[5].appendChild(actions);
      }
      return tr;
    }));
    const runs = payoutData?.runs ?? [];
    if (h2) h2.textContent = runs[0] ? longDate(runs[0].date.slice(0, 10)).replace(/ (\w{3})$/, (m, mo) => ` ${({ Nov: 'November', Dec: 'December', Oct: 'October' } as Record<string, string>)[mo] ?? mo}`) : payoutData ? 'Nothing due' : 'Loading weekly payout runs';
    $$(runHost, '[data-run]').forEach(x => x.remove());
    const anchor = runHost.lastElementChild?.nextSibling ?? null;
    const items = [
      ...runs.map(r => ({ makerId: r.makerId, brand: r.makerBrand, date: r.date, orderIds: r.orderIds, grossPaise: r.split.grossPaise, payoutPaise: r.split.payoutPaise, isPaid: false })),
      ...(payoutData?.paidRuns ?? []).map(r => ({ makerId: r.makerId, brand: r.makerBrand, date: r.date, orderIds: r.orderIds, grossPaise: r.grossPaise, payoutPaise: r.payoutPaise, isPaid: true })),
    ];
    items.forEach(r => {
      const uiMakerId = makerKey(r.makerId);
      const el = cloneEl(runTpl); el.setAttribute('data-run', uiMakerId); tid(el, `row-payout-${uiMakerId}${r.isPaid ? '-paid' : ''}`);
      const leaf = $$(el, 'span').filter(x => !x.children.length);
      leaf[0].textContent = r.brand; leaf[1].textContent = `${r.orderIds.length} order${r.orderIds.length === 1 ? '' : 's'}, customers paid ${formatINR(r.grossPaise)}`; leaf[2].textContent = formatINR(r.payoutPaise);
      const b = $<HTMLButtonElement>(el, 'button')!; tid(b, `button-mark-paid-${uiMakerId}`);
      if (r.isPaid) { b.textContent = 'Paid'; b.disabled = true; b.style.opacity = '.6'; el.setAttribute('data-paid', 'true'); tid(b, `status-paid-${uiMakerId}`); }
      else b.onclick = async () => {
        b.disabled = true;
        try {
          const date = r.date.slice(0, 10);
          await sampleApi(`/sample/admin/payouts/${encodeURIComponent(r.makerId)}/${date}/paid`, { method: 'POST' });
          payoutData = await sampleApi('/sample/admin/payouts');
          render();
        } catch (error) {
          b.disabled = false;
          fieldError(el, error instanceof Error ? error.message : 'Payout was not recorded.', `error-payout-${uiMakerId}`);
        }
      };
      runHost.insertBefore(el, anchor);
    });
  };
  on(ctx, show, 'change', render);
  render();
  Promise.all([
    sampleApi<{ sample: true; orders: ServerOrder[] }>('/sample/admin/orders'),
    sampleApi<{ sample: true; runs: PayoutRun[]; paidRuns: PaidRun[] }>('/sample/admin/payouts'),
  ])
    .then(([ordersResult, payoutsResult]) => {
      if (!alive) return;
      serverReady = true;
      payoutData = payoutsResult;
      const remote = ordersResult.orders.map(mapServerOrder);
      update(state => ({ ...state, orders: remote }));
    })
    .catch(error => {
      if (!alive) return;
      const p = document.createElement('p'); p.setAttribute('role', 'alert');
      p.textContent = error instanceof Error ? error.message : 'Could not load server orders.';
      p.style.cssText = 'padding: 12px; color: #8E2A22; background: #F7D9CF; border-radius: 12px;';
      table.parentElement?.insertBefore(p, table);
    });
  ctx.cleanups.push(subscribe(render), () => { alive = false; });
}

/* ------------------------------------------------------------------ Enquiries */
export function hydrateAdminEnquiries(ctx: Ctx) {
  const { root } = ctx;
  const arts = $$<HTMLElement>(root, 'main article');
  const main = arts[0]; const acme = arts[1];
  const stats = $$(root, 'main section > div');
  const ref = 'BT-CG-0012';
  const stageChip = $$(main, 'span')[1]; tid(stageChip, `status-enquiry-${ref}`);
  const chipStyles: Record<string, string> = { new: styleOf($$(acme, 'span')[1]), contacted: styleOf(stageChip) };
  const sel = $<HTMLSelectElement>(main, 'select')!; tid(sel, `select-stage-${ref}`);
  const stageKeys = ['contacted', 'new', 'quote', 'won', 'lost']; stageKeys.forEach((k, i) => (sel.options[i].value = k));
  const fs = $$<HTMLFieldSetElement>(main, 'fieldset');
  const boxes = $$<HTMLInputElement>(fs[0], 'input[type="checkbox"]'); const makerIds = ['m1', 'm2', 'm3', 'm4'];
  boxes.forEach((b, i) => tid(b, `checkbox-match-${makerIds[i]}`));
  const yesP = $$(fs[0], 'p')[0]; const yesChipStyle = styleOf($(yesP, 'span'));
  const sendBtn = $<HTMLButtonElement>(fs[0], 'button')!; tid(sendBtn, 'button-send-matched');
  const quote = $<HTMLInputElement>(fs[1], 'input')!; const quoteBtn = $<HTMLButtonElement>(fs[1], 'button')!;
  tid(quote, 'input-quote'); tid(quoteBtn, 'button-record-quote');
  const open = $<HTMLAnchorElement>(acme, 'a'); tid(open, 'link-open-brief');
  on(ctx, open, 'click', e => { e.preventDefault(); e.stopPropagation(); main.scrollIntoView({ behavior: 'smooth' }); });
  let msg = '';
  const render = () => {
    const s = getState(); const e = s.enquiries.find(x => x.ref === ref)!;
    const all = s.enquiries.map(x => x.stage);
    const extraNew = 1; // the sample BT-CG-0014 brief in the approved design
    const n = (k: string) => all.filter(x => x === k).length + (k === 'new' ? extraNew : 0);
    ['new', 'contacted', 'quote', 'won'].forEach((k, i) => { const ps = $$(stats[i], 'p'); ps[1].textContent = String(n(k)); tid(ps[1], `text-stage-count-${k}`); });
    stageChip.textContent = STAGE_LABEL[e.stage];
    setStyle(stageChip, chipStyles[e.stage] ?? (e.stage === 'won' ? chipStyles.contacted.replace('#FBE3B2', '#D5E6DE').replace('#7A5517', '#2C4640') : e.stage === 'lost' ? chipStyles.contacted.replace('#FBE3B2', '#ECE6CC').replace('#7A5517', '#71645E') : chipStyles.contacted.replace('#FBE3B2', '#D5E6DE').replace('#7A5517', '#2C4640')));
    sel.value = e.stage;
    boxes.forEach((b, i) => (b.checked = e.matched.includes(makerIds[i])));
    yesP.innerHTML = '';
    e.saidYes.forEach(id => { const c = document.createElement('span'); c.setAttribute('style', yesChipStyle + '; margin-right: 6px'); c.textContent = `${makerById(s, id)!.brand} said yes`; yesP.appendChild(c); });
    const waiting = e.sentTo.filter(id => !e.saidYes.includes(id));
    if (waiting.length) { const t = document.createElement('span'); t.style.fontSize = '16px'; t.style.color = '#71645E'; t.textContent = ` Sent to ${waiting.map(id => makerById(s, id)!.brand).join(', ')}, waiting.`; yesP.appendChild(t); }
    tid(yesP, 'text-maker-replies');
    if (document.activeElement !== quote) quote.value = e.quotePaise ? String(e.quotePaise / 100) : '';
    let m = $(fs[1], '[data-testid="text-quote-status"]');
    if (e.quotePaise) { if (!m) { m = document.createElement('p'); tid(m, 'text-quote-status'); m.setAttribute('style', 'margin: 8px 0 0; font-size: 16px; color: #2C4640'); fs[1].appendChild(m); } m.textContent = `Quote sent: ${formatINR(e.quotePaise)} including GST.`; } else m?.remove();
    let f = $(fs[0], '[data-testid="text-send-status"]');
    if (msg) { if (!f) { f = document.createElement('p'); tid(f, 'text-send-status'); f.setAttribute('style', 'margin: 8px 0 0; font-size: 16px; color: #2C4640'); sendBtn.insertAdjacentElement('afterend', f); } f.textContent = msg; } else f?.remove();
    // briefs sent from the Corporate page
    const host = acme.parentElement!;
    $$(host, 'article[data-brief]').forEach(x => x.remove());
    s.enquiries.filter(x => x.ref !== ref).forEach(x => {
      const a = cloneEl(acme); a.setAttribute('data-brief', x.ref); tid(a, `card-enquiry-${x.ref}`);
      const sp = $$(a, 'div > span'); sp[0].textContent = x.ref; sp[1].textContent = STAGE_LABEL[x.stage]; if (x.qty < 200) sp[2]?.remove();
      $(a, 'h2')!.textContent = `${x.company}, ${x.qty} gifts`;
      $(a, 'h2 + p')!.textContent = `About ${formatINR(x.budgetPaise)} each, needed by ${x.neededBy}. ${x.contact}, ${x.email}`;
      const l = $<HTMLAnchorElement>(a, 'a')!; l.textContent = 'Mark as contacted'; tid(l, `button-contacted-${x.ref}`);
      l.onclick = ev => {
        ev.preventDefault(); ev.stopPropagation();
        void sampleApi(`/sample/admin/enquiries/${encodeURIComponent(x.ref)}/stage`, { method: 'PATCH', body: JSON.stringify({ stage: 'contacted' }) })
          .then(() => update(st => setEnquiryStage(st, x.ref, 'contacted')))
          .catch(error => { msg = error instanceof Error ? error.message : 'Stage was not saved.'; render(); });
      };
      if (x.stage !== 'new') l.remove();
      const controls = document.createElement('div');
      controls.setAttribute('style', 'margin-top:14px;padding-top:12px;border-top:1px solid #E8DDD1;display:grid;gap:10px');
      const stageSelect = document.createElement('select');
      const dynamicStages: DemoEnquiry['stage'][] = ['new', 'contacted', 'quote', 'won', 'lost'];
      dynamicStages.forEach(stage => {
        const option = document.createElement('option'); option.value = stage; option.textContent = STAGE_LABEL[stage]; stageSelect.appendChild(option);
      });
      stageSelect.value = x.stage; tid(stageSelect, `select-stage-${x.ref}`);
      stageSelect.setAttribute('style', 'min-height:42px;border:1px solid #E8DDD1;border-radius:10px;padding:0 10px;background:#FFFDF9;color:#352C2B');
      stageSelect.onchange = () => {
        const stage = stageSelect.value as DemoEnquiry['stage'];
        void sampleApi(`/sample/admin/enquiries/${encodeURIComponent(x.ref)}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) })
          .then(() => update(st => setEnquiryStage(st, x.ref, stage)))
          .catch(error => { msg = error instanceof Error ? error.message : 'Stage was not saved.'; render(); });
      };
      const matchLabel = document.createElement('p'); matchLabel.textContent = 'Match sample makers';
      matchLabel.setAttribute('style', 'margin:0;font-family:Arvo,Georgia,serif;font-size:12px;color:#71645E');
      const matchWrap = document.createElement('div'); matchWrap.setAttribute('style', 'display:flex;gap:12px;flex-wrap:wrap');
      const matchBoxes = ['m1', 'm2'].map(id => {
        const label = document.createElement('label'); label.setAttribute('style', 'display:flex;gap:6px;align-items:center;font-size:15px');
        const box = document.createElement('input'); box.type = 'checkbox'; box.checked = x.matched.includes(id); box.value = id;
        tid(box, `checkbox-match-${id}-${x.ref}`); label.append(box, document.createTextNode(makerById(getState(), id)?.brand ?? id)); matchWrap.appendChild(label); return box;
      });
      const matchButton = document.createElement('button'); matchButton.type = 'button'; matchButton.textContent = 'Save matches and send brief';
      matchButton.setAttribute('style', 'min-height:42px;width:max-content;border:0;border-radius:999px;background:#34514B;color:#F1F7F4;padding:0 16px;font:12px Arvo,Georgia,serif;cursor:pointer');
      tid(matchButton, `button-send-matched-${x.ref}`);
      matchButton.onclick = async () => {
        const makerIds = matchBoxes.filter(box => box.checked).map(box => box.value);
        if (!makerIds.length) { matchButton.textContent = 'Choose at least one maker'; return; }
        matchButton.disabled = true;
        try {
          const saved = await sampleApi<{ matchedMakerIds: string[]; sentToMakerIds: string[]; stage: DemoEnquiry['stage'] }>(`/sample/admin/enquiries/${encodeURIComponent(x.ref)}/matches`, { method: 'PUT', body: JSON.stringify({ makerIds }) });
          update(st => ({ ...st, enquiries: st.enquiries.map(enquiry => enquiry.ref === x.ref ? { ...enquiry, matched: saved.matchedMakerIds, sentTo: saved.sentToMakerIds, stage: saved.stage } : enquiry) }));
        } catch (error) { matchButton.textContent = error instanceof Error ? error.message : 'Matches were not saved.'; }
        finally { matchButton.disabled = false; }
      };
      const quoteField = document.createElement('input'); quoteField.type = 'number'; quoteField.min = '1'; quoteField.placeholder = 'Quote total (₹)'; quoteField.value = x.quotePaise ? String(x.quotePaise / 100) : '';
      quoteField.setAttribute('style', 'min-height:42px;max-width:220px;border:1px solid #E8DDD1;border-radius:10px;padding:0 10px;background:#FFFDF9');
      tid(quoteField, `input-quote-${x.ref}`);
      const quoteButton = document.createElement('button'); quoteButton.type = 'button'; quoteButton.textContent = 'Save quote';
      quoteButton.setAttribute('style', 'min-height:42px;width:max-content;border:1px solid #E8DDD1;border-radius:999px;background:#FFFDF9;color:#352C2B;padding:0 16px;font:12px Arvo,Georgia,serif;cursor:pointer');
      tid(quoteButton, `button-quote-${x.ref}`);
      quoteButton.onclick = async () => {
        const quotePaise = Math.round(Number(quoteField.value) * 100);
        if (!Number.isSafeInteger(quotePaise) || quotePaise < 100) { quoteButton.textContent = 'Enter a quote above ₹1'; return; }
        quoteButton.disabled = true;
        try {
          const saved = await sampleApi<{ quotePaise: number | null; stage: DemoEnquiry['stage'] }>(`/sample/admin/enquiries/${encodeURIComponent(x.ref)}/quote`, { method: 'PUT', body: JSON.stringify({ quotePaise }) });
          update(st => ({ ...st, enquiries: st.enquiries.map(enquiry => enquiry.ref === x.ref ? { ...enquiry, quotePaise: saved.quotePaise, stage: saved.stage } : enquiry) }));
        } catch (error) { quoteButton.textContent = error instanceof Error ? error.message : 'Quote was not saved.'; }
        finally { quoteButton.disabled = false; }
      };
      const quoteRow = document.createElement('div'); quoteRow.setAttribute('style', 'display:flex;gap:8px;flex-wrap:wrap'); quoteRow.append(quoteField, quoteButton);
      const privacyNote = document.createElement('small'); privacyNote.textContent = 'Only Tathaastu and Mushhk sample accounts are available for matching; maker briefs hide the company and buyer contact.';
      privacyNote.setAttribute('style', 'font-size:12px;color:#71645E');
      controls.append(stageSelect, matchLabel, matchWrap, matchButton, quoteRow, privacyNote); a.appendChild(controls);
      host.insertBefore(a, acme);
    });
  };
  on(ctx, sel, 'change', () => {
    const stage = sel.value as DemoEnquiry['stage'];
    void sampleApi(`/sample/admin/enquiries/${encodeURIComponent(ref)}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) })
      .then(() => update(s => setEnquiryStage(s, ref, stage)))
      .catch(error => { msg = error instanceof Error ? error.message : 'Stage was not saved.'; render(); });
  });
  boxes.forEach(b => on(ctx, b, 'change', () => update(s => setMatched(s, ref, makerIds.filter((_, i) => boxes[i].checked)))));
  on(ctx, sendBtn, 'click', () => {
    const r = sendToMatched(getState(), ref);
    fieldError(sendBtn, r.ok ? null : r.error, 'error-send-matched'); if (!r.ok) return;
    sendBtn.disabled = true;
    void sampleApi<{ matchedMakerIds: string[]; sentToMakerIds: string[]; stage: DemoEnquiry['stage'] }>(`/sample/admin/enquiries/${encodeURIComponent(ref)}/matches`, { method: 'PUT', body: JSON.stringify({ makerIds: r.sent }) })
      .then(saved => {
        msg = `Saved matches and sent the brief to ${r.sent.map(id => makerById(r.state, id)!.brand).join(', ')}.`;
        update(state => ({ ...state, enquiries: state.enquiries.map(enquiry => enquiry.ref === ref ? { ...enquiry, matched: saved.matchedMakerIds, sentTo: saved.sentToMakerIds, stage: saved.stage } : enquiry) }));
      })
      .catch(error => fieldError(sendBtn, error instanceof Error ? error.message : 'Matches were not saved.', 'error-send-matched'))
      .finally(() => { sendBtn.disabled = false; });
  });
  on(ctx, quoteBtn, 'click', () => {
    const r = recordQuote(getState(), ref, Math.round(Number(quote.value.replace(/,/g, '')) * 100));
    fieldError(quoteBtn, r.ok ? null : r.error, 'error-quote'); if (!r.ok) return;
    quoteBtn.disabled = true;
    void sampleApi<{ quotePaise: number | null; stage: DemoEnquiry['stage'] }>(`/sample/admin/enquiries/${encodeURIComponent(ref)}/quote`, { method: 'PUT', body: JSON.stringify({ quotePaise: Math.round(Number(quote.value.replace(/,/g, '')) * 100) }) })
      .then(saved => update(state => ({ ...state, enquiries: state.enquiries.map(enquiry => enquiry.ref === ref ? { ...enquiry, quotePaise: saved.quotePaise, stage: saved.stage } : enquiry) })))
      .catch(error => fieldError(quoteBtn, error instanceof Error ? error.message : 'Quote was not saved.', 'error-quote'))
      .finally(() => { quoteBtn.disabled = false; });
  });
  render(); ctx.cleanups.push(subscribe(render));
  void sampleApi<{ enquiries: Array<{ ref: string; company: string; contactName: string; contact: string; purpose: string; qty: number; budgetPaise: number; neededBy: string; message: string; stage: DemoEnquiry['stage']; matchedMakerIds: string[]; sentToMakerIds: string[]; responses: Record<string, 'yes' | 'no'>; quotePaise: number | null; createdAt: string }> }>('/sample/admin/enquiries')
    .then(({ enquiries }) => {
      const refs = new Set(enquiries.map(enquiry => enquiry.ref));
      update(state => ({
        ...state,
        enquiries: [
          ...state.enquiries.filter(enquiry => !refs.has(enquiry.ref)),
          ...enquiries.map(enquiry => ({
            ref: enquiry.ref, company: enquiry.company, contact: enquiry.contactName, email: enquiry.contact,
            purpose: enquiry.purpose, qty: enquiry.qty, budgetPaise: enquiry.budgetPaise, neededBy: enquiry.neededBy,
            custom: [], message: enquiry.message, stage: enquiry.stage, date: enquiry.createdAt.slice(0, 10),
            matched: enquiry.matchedMakerIds, sentTo: enquiry.sentToMakerIds,
            saidYes: Object.entries(enquiry.responses).filter(([, value]) => value === 'yes').map(([key]) => key),
            quotePaise: enquiry.quotePaise,
          })),
        ],
      }));
    })
    .catch(error => { msg = error instanceof Error ? error.message : 'Corporate enquiries could not be loaded.'; render(); });
}

/* ------------------------------------------------------------------ Academy and settings */
export function hydrateAdminAcademy(ctx: Ctx) {
  const { root } = ctx;
  wirePeriodGroups(ctx);
  const table = $(root, 'main table');
  if (table) { const w = document.createElement('div'); w.setAttribute('data-bt-scroll', ''); w.style.overflowX = 'auto'; table.replaceWith(w); w.appendChild(table); }
  const prop = byText(root, 'p', 'Shape a soy wax lotus');
  const btnRow = prop?.nextElementSibling?.nextElementSibling as HTMLElement | null;
  const [appr, chg] = btnRow ? $$<HTMLButtonElement>(btnRow, 'button') : [];
  tid(appr, 'button-approve-proposal'); tid(chg, 'button-proposal-changes');
  const status = (t: string) => { if (!btnRow) return; btnRow.innerHTML = ''; const p = document.createElement('p'); tid(p, 'text-proposal-status'); p.setAttribute('style', 'margin: 0; font-size: 17px; color: #2C4640'); p.textContent = t; btnRow.appendChild(p); };
  const reviewStaticProposal = async (decision: 'approve' | 'changes') => {
    const note = decision === 'changes' ? window.prompt('Add a note explaining the requested changes.')?.trim() ?? '' : '';
    if (decision === 'changes' && note.length < 5) return;
    if (appr) appr.disabled = true; if (chg) chg.disabled = true;
    try {
      const saved = await sampleApi<{ status: 'approved' | 'changes'; note: string }>('/sample/admin/masterclass-proposals/proposal-sample-lotus', {
        method: 'PATCH', body: JSON.stringify({ decision, note }),
      });
      status(saved.status === 'approved' ? 'Approved. Listed after the maker confirms dates.' : `Changes requested: ${saved.note}`);
    } catch (error) { status(error instanceof Error ? error.message : 'Proposal review was not saved.'); }
    finally { if (appr) appr.disabled = false; if (chg) chg.disabled = false; }
  };
  on(ctx, appr, 'click', () => { void reviewStaticProposal('approve'); });
  on(ctx, chg, 'click', () => { void reviewStaticProposal('changes'); });
  const csvBtn = byText<HTMLButtonElement>(root, 'button', 'Choose a CSV file'); tid(csvBtn, 'button-choose-csv');
  const file = document.createElement('input'); file.type = 'file'; file.accept = '.csv,text/csv'; file.style.display = 'none'; tid(file, 'input-csv');
  csvBtn?.insertAdjacentElement('afterend', file);
  const importPanel = byText(root, 'p', 'Import live workshop sales')?.parentElement as HTMLElement | null;
  const salesHost = document.createElement('div'); tid(salesHost, 'academy-sales-records');
  salesHost.setAttribute('style', 'margin-top:14px;text-align:left;overflow-x:auto;max-width:100%;min-width:0;box-sizing:border-box');
  importPanel?.appendChild(salesHost);
  type AcademySalesData = {
    sales: Array<{ id: string; date: string; course: string; learner: string; amountPaise: number; status: 'paid' | 'refunded' | 'cancelled'; source: 'sample' | 'tagmango_import' }>;
    summary: { revenuePaise: number; seatsSold: number; refundedCount: number; importedCount: number };
  };
  const paintAcademySales = (result: AcademySalesData) => {
    const revenueCard = byText(root, 'p', 'Course revenue')?.parentElement;
    if (revenueCard) {
      const ps = $$(revenueCard, 'p'); ps[1].textContent = formatINR(result.summary.revenuePaise); tid(ps[1], 'text-academy-revenue');
      ps[2].textContent = `${result.summary.importedCount} imported rows · sample records are labeled`; tid(ps[2], 'text-academy-revenue-note');
    }
    const seatsCard = byText(root, 'p', 'Seats sold')?.parentElement;
    if (seatsCard) {
      const ps = $$(seatsCard, 'p'); ps[1].textContent = String(result.summary.seatsSold); tid(ps[1], 'text-academy-seats');
      ps[2].textContent = `${result.summary.refundedCount} refunded, not counted`;
    }
    salesHost.replaceChildren();
    const heading = document.createElement('h3'); heading.textContent = 'Class sales'; heading.setAttribute('style', 'margin:0 0 8px;font-size:20px;font-weight:500');
    const table = document.createElement('table'); table.setAttribute('style', 'width:100%;border-collapse:collapse;font-size:14px;min-width:640px');
    table.innerHTML = '<thead><tr><th style="text-align:left">Date</th><th style="text-align:left">Course</th><th style="text-align:left">Learner</th><th style="text-align:right">Amount</th><th style="text-align:left">Status</th></tr></thead>';
    const body = document.createElement('tbody'); tid(body, 'tbody-academy-sales');
    result.sales.forEach(sale => {
      const row = document.createElement('tr'); tid(row, `row-academy-sale-${sale.id}`); row.setAttribute('style', 'border-top:1px solid #E8DDD1');
      const values = [sale.date, sale.course, sale.learner, formatINR(sale.amountPaise), sale.status === 'paid' ? 'Paid' : sale.status];
      values.forEach((value, index) => {
        const cell = document.createElement('td'); cell.textContent = value;
        cell.setAttribute('style', `padding:7px 4px;${index === 3 ? 'text-align:right' : ''}`);
        row.appendChild(cell);
      });
      row.setAttribute('data-source', sale.source);
      body.appendChild(row);
    });
    table.appendChild(body); salesHost.append(heading, table);
  };
  on(ctx, csvBtn, 'click', () => file.click());
  on(ctx, file, 'change', () => {
    const f = file.files?.[0]; if (!f) return;
    if (csvBtn) csvBtn.disabled = true;
    f.text()
      .then(csv => sampleApi<AcademySalesData & { imported: number }>('/sample/admin/academy/import', { method: 'POST', body: JSON.stringify({ csv }) }))
      .then(result => {
        paintAcademySales(result);
        let p = $(root, '[data-testid="text-csv-result"]');
        if (!p) { p = document.createElement('p'); tid(p, 'text-csv-result'); p.setAttribute('style', 'margin: 8px 0 0; font-size: 16px; color: #2C4640'); file.insertAdjacentElement('afterend', p); }
        p.setAttribute('role', 'status'); p.textContent = `Imported ${result.imported} validated sale row${result.imported === 1 ? '' : 's'} into the isolated sample Academy.`;
      })
      .catch(error => fieldError(csvBtn, error instanceof Error ? error.message : 'CSV was not imported.', 'error-csv'))
      .finally(() => { if (csvBtn) csvBtn.disabled = false; });
  });
  void sampleApi<AcademySalesData>('/sample/admin/academy')
    .then(paintAcademySales)
    .catch(error => { salesHost.setAttribute('role', 'alert'); salesHost.textContent = error instanceof Error ? error.message : 'Class sales could not be loaded.'; });
  const proposalPanel = byText(root, 'h2', 'Class proposals')?.parentElement;
  if (proposalPanel) {
    let submittedHost = $(proposalPanel, '[data-testid="submitted-class-proposals"]');
    if (!submittedHost) {
      submittedHost = document.createElement('div'); tid(submittedHost, 'submitted-class-proposals');
      submittedHost.setAttribute('style', 'display:flex;flex-direction:column;gap:12px;margin-top:16px');
      proposalPanel.appendChild(submittedHost);
    }
    void sampleApi<{ proposals: Array<{ id: string; makerId: string; makerBrand: string; title: string; type: 'Live workshop' | 'Recorded class'; duration: string; pricePaise: number; about: string; status: 'submitted' | 'approved' | 'changes'; note: string }> }>('/sample/admin/masterclass-proposals')
      .then(({ proposals }) => {
        submittedHost!.replaceChildren();
        const staticProposal = proposals.find(proposal => proposal.id === 'proposal-sample-lotus');
        if (staticProposal?.status === 'approved') status('Approved. Listed after the maker confirms dates.');
        else if (staticProposal?.status === 'changes') status(`Changes requested: ${staticProposal.note}`);
        proposals.filter(proposal => proposal.id !== 'proposal-sample-lotus').forEach(proposal => {
          const card = document.createElement('article');
          card.setAttribute('style', 'border:1px solid #E8DDD1;border-radius:18px;padding:16px;background:#F6F3DF');
          tid(card, `card-class-proposal-${proposal.id}`);
          const title = document.createElement('h3'); title.textContent = proposal.title;
          title.setAttribute('style', 'margin:0;font-size:22px;font-weight:500');
          const details = document.createElement('p'); details.textContent = `${proposal.makerBrand} · ${proposal.type} · ${proposal.duration} · ${formatINR(proposal.pricePaise)}`;
          details.setAttribute('style', 'margin:6px 0;font-size:15px;color:#71645E');
          const about = document.createElement('p'); about.textContent = proposal.about; about.setAttribute('style', 'margin:0;font-size:17px');
          const note = document.createElement('textarea'); note.placeholder = 'Note for the maker (required when asking for changes)'; note.rows = 2;
          note.setAttribute('style', 'width:100%;margin-top:10px;border:1px solid #E8DDD1;border-radius:10px;padding:10px;font:14px Arvo,Georgia,serif;box-sizing:border-box');
          tid(note, `input-class-proposal-note-${proposal.id}`);
          const state = document.createElement('p'); state.setAttribute('role', 'status'); state.textContent = proposal.status === 'submitted' ? 'Awaiting review' : proposal.status === 'approved' ? 'Approved' : `Changes requested: ${proposal.note}`;
          state.setAttribute('style', 'margin:8px 0;font-size:15px;color:#34514B'); tid(state, `status-class-proposal-${proposal.id}`);
          const actions = document.createElement('div'); actions.setAttribute('style', 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px');
          const approve = document.createElement('button'); approve.type = 'button'; approve.textContent = 'Approve and list';
          const changes = document.createElement('button'); changes.type = 'button'; changes.textContent = 'Ask for changes';
          [approve, changes].forEach(btn => btn.setAttribute('style', 'min-height:42px;padding:0 16px;border-radius:999px;border:1px solid #E8DDD1;background:#FFFDF9;color:#352C2B;font:12px Arvo,Georgia,serif;cursor:pointer'));
          tid(approve, `button-approve-class-proposal-${proposal.id}`); tid(changes, `button-changes-class-proposal-${proposal.id}`);
          const review = async (decision: 'approve' | 'changes') => {
            approve.disabled = changes.disabled = true;
            try {
              const result = await sampleApi<{ status: 'submitted' | 'approved' | 'changes'; note: string }>(`/sample/admin/masterclass-proposals/${encodeURIComponent(proposal.id)}`, {
                method: 'PATCH', body: JSON.stringify({ decision, note: note.value }),
              });
              state.textContent = result.status === 'approved' ? 'Approved' : `Changes requested: ${result.note}`;
            } catch (error) { state.textContent = error instanceof Error ? error.message : 'Review was not saved.'; }
            finally { approve.disabled = changes.disabled = false; }
          };
          on(ctx, approve, 'click', () => { void review('approve'); });
          on(ctx, changes, 'click', () => { void review('changes'); });
          actions.append(approve, changes); card.append(title, details, about, note, actions, state); submittedHost!.appendChild(card);
        });
      })
      .catch(error => { submittedHost!.textContent = error instanceof Error ? error.message : 'Class proposals could not be loaded.'; });
  }
  const paint = () => {
    const s = getState();
    $$<HTMLTableRowElement>(root, 'main table tbody tr').forEach(tr => {
      const td = $$(tr, 'td'); const m = s.makers.find(x => norm(td[0].textContent).startsWith(x.brand)); if (!m) return;
      tid(tr, `row-maker-${m.id}`);
      td[1].textContent = String(s.products.filter(p => p.makerId === m.id && p.status === 'live').length);
      const chip = $(td[2], 'span'); if (chip) chip.textContent = m.trusted ? 'Trusted' : `Reviewed, ${m.approvedCount} of 3`;
    });
  };
  paint(); ctx.cleanups.push(subscribe(paint));
}
