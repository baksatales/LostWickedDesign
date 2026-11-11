import { $, $$, byText, cloneEl, type Ctx, fieldError, norm, on, pillGroup, setStyle, setVisible, styleOf, tid } from '../dom';
import {
  ORDER_STEP_LABEL, STAGE_LABEL, adminPayoutRuns, approveListing, canApprove, formatINR, getState, imgUrl, makerById, markPayoutPaid, paidPayouts,
  productById, recordQuote, requestChanges, resolveProblem, reviewQueue, sendToMatched, setApplicationStatus, setEnquiryStage, setMatched,
  setReviewCheck, spotChecks, subscribe, update,
} from '../store';
import { longDate, shortDate } from './maker';

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
      const e = document.createElement('p'); tid(e, 'empty-reviews'); e.setAttribute('style', 'margin: 0; font-size: 19px; color: #5C463C; background: #FFFDF4; border-radius: 20px; padding: 16px');
      e.textContent = flash || (tab === 1 ? 'No spot checks waiting.' : 'Nothing waiting for review.'); listCol.appendChild(e);
    }
    detail.style.display = selected ? '' : 'none';
    if (!selected) return;
    const p = productById(s, selected)!; const m = makerById(s, p.makerId)!;
    const r = s.reviews[p.id] ?? { checks: [false, false, false, false, false], note: '' };
    // The final review design intentionally uses a labelled photo placeholder.
    photo.textContent = 'Product photo'; setStyle(photo, photoStyle);
    $(detail, 'h2')!.textContent = p.name; tid($(detail, 'h2'), 'text-review-name');
    const ps = $$($(detail, 'h2')!.parentElement!, ':scope > p'); ps[0].textContent = `${m.brand}. ${formatINR(p.pricePaise)}, ${p.stock} in stock${p.size ? `, ${p.size}` : ''}`; ps[1].textContent = p.story ?? p.material;
    if (reasonChip) reasonChip.textContent = tab === 1 ? 'Why it’s here: spot check, trusted maker' : `Why it’s here: ${p.reason ?? `new maker, listing ${m.approvedCount + 1} of 3`}`;
    checks.forEach((c, i) => (c.checked = !!r.checks[i]));
    if (document.activeElement !== note) note.value = r.note;
    const ok = canApprove(r.checks);
    approve.disabled = !ok; setStyle(approve, ok ? approveStyle : approveStyle + '; opacity: .45');
    approve.textContent = tab === 1 ? 'Looks good' : 'Approve and publish';
    hint.textContent = flash || (ok ? 'All five ticked.' : 'Tick all five to approve.');
  };
  checks.forEach((c, i) => on(ctx, c, 'change', () => { if (selected) update(s => setReviewCheck(s, selected!, i, c.checked)); }));
  on(ctx, note, 'input', () => { if (selected) { const id = selected; update(s => ({ ...s, reviews: { ...s.reviews, [id]: { ...(s.reviews[id] ?? { checks: [false, false, false, false, false], note: '' }), note: note.value } } })); } });
  on(ctx, approve, 'click', () => {
    if (!selected) return; const name = productById(getState(), selected)!.name;
    if (tab === 1) { update(s => ({ ...s, products: s.products.map(p => p.id === selected ? { ...p, spot: false } : p) })); flash = `${name} checked.`; render(); return; }
    const r = approveListing(getState(), selected); if (!r.ok) { hint.textContent = r.error!; return; }
    flash = `${name} is live.`; update(() => r.state);
  });
  on(ctx, ask, 'click', () => {
    if (!selected) return; const name = productById(getState(), selected)!.name;
    const r = requestChanges(getState(), selected, note.value);
    fieldError(note, r.ok ? null : r.error, 'error-review-note'); if (!r.ok) return;
    flash = `Changes requested on ${name}.`; note.value = ''; update(() => r.state);
  });
  tabs.forEach((t, i) => on(ctx, t, 'click', () => { tab = i; flash = ''; render(); }));

  // vendor applications
  const appTpl = cloneEl($$<HTMLElement>(appsSec, 'article')[0]);
  const chipNew = styleOf($(appTpl, 'h3 + span'));
  const callChip = styleOf($($$(appsSec, 'article')[1] ?? appTpl, 'h3 + span'));
  const renderApps = () => {
    const s = getState();
    appsSec.replaceChildren(...s.applications.map(a => {
      const el = cloneEl(appTpl); tid(el, `card-application-${a.id}`);
      $(el, 'h3')!.textContent = a.brand;
      const chip = $(el, 'h3 + span') as HTMLElement; tid(chip, `status-application-${a.id}`);
      chip.textContent = { pending: 'New', call: 'Call booked', approved: 'Approved, invite sent', declined: 'Declined' }[a.status];
      setStyle(chip, a.status === 'pending' ? chipNew : a.status === 'approved' ? chipNew.replace('#F7D9CF', '#D5E6DE').replace('#611811', '#2C4640') : callChip);
      $(el, 'p')!.textContent = `${a.name}, ${a.place}. ${a.craft}. GST: ${a.gst}`;
      const btnRow = $(el, 'p + div') as HTMLElement; const tplBtns = $$<HTMLButtonElement>(btnRow, 'button');
      const mk = (label: string, st: typeof a.status, k: string) => { const b = cloneEl(tplBtns[0]); b.textContent = label; tid(b, `button-application-${k}-${a.id}`); b.onclick = () => update(x => setApplicationStatus(x, a.id, st)); return b; };
      const styleBy = (b: HTMLButtonElement, i: number) => { setStyle(b, styleOf(tplBtns[Math.min(i, tplBtns.length - 1)])); return b; };
      const btns: HTMLButtonElement[] = [];
      if (a.status === 'pending' || a.status === 'call') { btns.push(styleBy(mk('Approve and invite', 'approved', 'approve'), 0)); if (a.status === 'pending') btns.push(styleBy(mk('Book a call', 'call', 'call'), 1)); btns.push(styleBy(mk('Decline', 'declined', 'decline'), 2)); }
      else { btns.push(styleBy(mk('Undo', 'pending', 'undo'), 1)); }
      btnRow.replaceChildren(...btns);
      return el;
    }));
  };
  render(); renderApps();
  ctx.cleanups.push(subscribe(() => { render(); renderApps(); }));
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
      if (o.status === 'problem') {
        const a = document.createElement('a'); a.href = '#resolve'; a.textContent = 'Resolve'; a.setAttribute('style', styleOf($(probTpl, 'td:last-child a'))); tid(a, `button-resolve-${o.id}`);
        a.onclick = e => { e.preventDefault(); e.stopPropagation(); update(x => resolveProblem(x, o.id)); };
        td[5].append(' ', a);
      }
      return tr;
    }));
    const runs = adminPayoutRuns(s);
    if (h2) h2.textContent = runs[0] ? longDate(runs[0].date).replace(/ (\w{3})$/, (m, mo) => ` ${({ Nov: 'November', Dec: 'December', Oct: 'October' } as Record<string, string>)[mo] ?? mo}`) : 'Nothing due';
    $$(runHost, '[data-run]').forEach(x => x.remove());
    const anchor = runHost.lastElementChild?.nextSibling ?? null;
    const items = [...runs.map(r => ({ ...r, isPaid: false })), ...paidPayouts(s).map(p => ({ ...p, isPaid: true }))];
    items.forEach(r => {
      const el = cloneEl(runTpl); el.setAttribute('data-run', r.makerId); tid(el, `row-payout-${r.makerId}${r.isPaid ? '-paid' : ''}`);
      const leaf = $$(el, 'span').filter(x => !x.children.length);
      leaf[0].textContent = r.brand; leaf[1].textContent = `${r.orderIds.length} order${r.orderIds.length === 1 ? '' : 's'}, customers paid ${formatINR(r.grossPaise)}`; leaf[2].textContent = formatINR(r.payoutPaise);
      const b = $<HTMLButtonElement>(el, 'button')!; tid(b, `button-mark-paid-${r.makerId}`);
      if (r.isPaid) { b.textContent = 'Paid'; b.disabled = true; b.style.opacity = '.6'; el.setAttribute('data-paid', 'true'); tid(b, `status-paid-${r.makerId}`); }
      else b.onclick = () => update(x => markPayoutPaid(x, r.orderIds));
      runHost.insertBefore(el, anchor);
    });
  };
  on(ctx, show, 'change', render);
  render(); ctx.cleanups.push(subscribe(render));
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
    setStyle(stageChip, chipStyles[e.stage] ?? (e.stage === 'won' ? chipStyles.contacted.replace('#FBE3B2', '#D5E6DE').replace('#7A5517', '#2C4640') : e.stage === 'lost' ? chipStyles.contacted.replace('#FBE3B2', '#ECE6CC').replace('#7A5517', '#5C463C') : chipStyles.contacted.replace('#FBE3B2', '#D5E6DE').replace('#7A5517', '#2C4640')));
    sel.value = e.stage;
    boxes.forEach((b, i) => (b.checked = e.matched.includes(makerIds[i])));
    yesP.innerHTML = '';
    e.saidYes.forEach(id => { const c = document.createElement('span'); c.setAttribute('style', yesChipStyle + '; margin-right: 6px'); c.textContent = `${makerById(s, id)!.brand} said yes`; yesP.appendChild(c); });
    const waiting = e.sentTo.filter(id => !e.saidYes.includes(id));
    if (waiting.length) { const t = document.createElement('span'); t.style.fontSize = '16px'; t.style.color = '#5C463C'; t.textContent = ` Sent to ${waiting.map(id => makerById(s, id)!.brand).join(', ')}, waiting.`; yesP.appendChild(t); }
    tid(yesP, 'text-maker-replies');
    if (e.quotePaise && document.activeElement !== quote) quote.value = String(e.quotePaise / 100);
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
      l.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); update(st => setEnquiryStage(st, x.ref, 'contacted')); };
      if (x.stage !== 'new') l.remove();
      host.insertBefore(a, acme);
    });
  };
  on(ctx, sel, 'change', () => update(s => setEnquiryStage(s, ref, sel.value as never)));
  boxes.forEach(b => on(ctx, b, 'change', () => update(s => setMatched(s, ref, makerIds.filter((_, i) => boxes[i].checked)))));
  on(ctx, sendBtn, 'click', () => {
    const r = sendToMatched(getState(), ref);
    fieldError(sendBtn, r.ok ? null : r.error, 'error-send-matched'); if (!r.ok) return;
    msg = `Sent to ${r.sent.map(id => makerById(r.state, id)!.brand).join(', ')}.`; update(() => r.state);
  });
  on(ctx, quoteBtn, 'click', () => {
    const r = recordQuote(getState(), ref, Math.round(Number(quote.value.replace(/,/g, '')) * 100));
    fieldError(quoteBtn, r.ok ? null : r.error, 'error-quote'); if (r.ok) update(() => r.state);
  });
  render(); ctx.cleanups.push(subscribe(render));
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
  on(ctx, appr, 'click', () => status('Approved. Listed in the Academy once the maker confirms dates.'));
  on(ctx, chg, 'click', () => status('Changes requested. The maker sees your note on their dashboard.'));
  const csvBtn = byText<HTMLButtonElement>(root, 'button', 'Choose a CSV file'); tid(csvBtn, 'button-choose-csv');
  const file = document.createElement('input'); file.type = 'file'; file.accept = '.csv,text/csv'; file.style.display = 'none'; tid(file, 'input-csv');
  csvBtn?.insertAdjacentElement('afterend', file);
  on(ctx, csvBtn, 'click', () => file.click());
  on(ctx, file, 'change', () => {
    const f = file.files?.[0]; if (!f) return;
    f.text().then(t => {
      const lines = t.split(/\r?\n/).filter(Boolean); const head = (lines[0] ?? '').toLowerCase().split(',').map(x => x.trim());
      const need = ['id', 'date', 'course', 'learner', 'amount', 'status'];
      const ok = need.every(n => head.includes(n));
      fieldError(csvBtn, ok ? null : 'That file needs the columns: id, date, course, learner, amount, status.', 'error-csv');
      if (ok) { let p = $(root, '[data-testid="text-csv-result"]'); if (!p) { p = document.createElement('p'); tid(p, 'text-csv-result'); p.setAttribute('style', 'margin: 8px 0 0; font-size: 16px; color: #2C4640'); file.insertAdjacentElement('afterend', p); } p.textContent = `Read ${lines.length - 1} rows from ${f.name}. Sample import: figures above are not changed.`; }
    });
  });
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
