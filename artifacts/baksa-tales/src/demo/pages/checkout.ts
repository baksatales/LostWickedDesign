import { $, $$, type Ctx, esc, fieldError, setStyle, styleOf, tid } from '../dom';
import {
  PAYMENT_LABEL, bagLines, bagTotals, formatINR, formatPhone, getState, imgUrl, normalisePhone, setBagQty, signIn,
  subscribe, update, validateAddress, validateCode, validatePhone, type Address, type DemoState,
} from '../store';
import { stateFromPincode } from '../domain';
import { SAMPLE_SESSION_KEY } from '../SampleAccount';

interface SampleSessionResponse { token: string; role: string; displayName: string }
interface SampleCheckoutResponse { sample: true; orderId: string; reference: string; itemsPaise: number; discountPaise: number; couponCode: string | null; shippingPaise: number; totalPaise: number; message: string }
const CHECKOUT_KEY = 'baksa-sample-checkout-idempotency';

export function hydrateCheckout(ctx: Ctx) {
  const { root } = ctx;
  const h1 = $(root, 'section h1'); const panel = h1?.parentElement as HTMLElement | null;
  const aside = $(root, 'aside[aria-label="Order summary"]');
  const steps = $$<HTMLLIElement>(root, 'ol[aria-label="Checkout steps"] li');
  if (!panel || !aside || !h1) return;
  const addressHTML = panel.innerHTML;
  const S = {
    h1: styleOf(h1), p: styleOf(h1.nextElementSibling), card: styleOf($(panel, 'div')),
    label: styleOf($(panel, 'label[for="c2"]')), input: styleOf($(panel, '#c2')), btn: styleOf($(panel, 'button')),
    liDone: styleOf(steps[0]), liNow: styleOf(steps[1]), liTodo: styleOf(steps[2]),
    spDone: styleOf(steps[0]?.firstElementChild), spNow: styleOf(steps[1]?.firstElementChild), spTodo: styleOf(steps[2]?.firstElementChild),
  };
  const rowTpl = aside.children[1]?.cloneNode(true) as HTMLElement;
  const totals = aside.lastElementChild as HTMLElement;
  const headP = aside.firstElementChild as HTMLElement;
  // Original rows are templates, not extra bag lines. Replace rather than
  // appending to them, so the visual summary and calculated total agree.
  Array.from(aside.children).slice(1, -1).forEach(row => row.remove());
  tid(aside, 'checkout-summary');
  let codeSentFor: string | null = null;
  let couponCodeDraft = '';

  const paintSteps = (idx: number) => steps.forEach((li, i) => {
    const sp = li.firstElementChild as HTMLElement;
    setStyle(li, i < idx ? S.liDone : i === idx ? S.liNow : S.liTodo);
    setStyle(sp, i < idx ? S.spDone : i === idx ? S.spNow : S.spTodo);
    sp.textContent = i < idx ? '✓' : String(i + 1);
    if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });

  const field = (id: string, label: string, value: string, extra = '') =>
    `<div style="grid-column: 1 / -1"><label for="${id}" style="${S.label}">${label}</label><input id="${id}" data-testid="input-${id}" ${extra} value="${esc(value)}" style="${S.input}"></div>`;

  const renderSummary = (s: DemoState) => {
    const done = s.checkout.step === 'done' && s.checkout.lastOrder;
    const lines = done ? s.checkout.lastOrder!.lines.map((l, i) => ({ ...l, id: String(i), kind: 'product' as const })) : bagLines(s);
    const t = done ? s.checkout.lastOrder! : bagTotals(s);
    const count = lines.reduce((a, l) => a + l.qty, 0);
    headP.textContent = done ? `Your order, ${count} item${count === 1 ? '' : 's'}` : `Your bag, ${count} item${count === 1 ? '' : 's'}`;
    $$(aside, '[data-row]').forEach(r => r.remove());
    lines.forEach(l => {
      const r = rowTpl.cloneNode(true) as HTMLElement; r.setAttribute('data-row', '');
      tid(r, `row-summary-${l.id}`);
      const img = $<HTMLImageElement>(r, 'img')!; img.src = imgUrl(l.img);
      const name = r.children[1] as HTMLElement; name.firstChild!.textContent = l.qty > 1 ? `${l.name} × ${l.qty}` : l.name; (name.lastElementChild as HTMLElement).textContent = l.maker;
      (r.children[2] as HTMLElement).textContent = formatINR(l.linePaise);
      totals.insertAdjacentElement('beforebegin', r);
    });
    if (!lines.length) {
      const r = document.createElement('p'); r.setAttribute('data-row', ''); tid(r, 'empty-bag-summary');
      r.setAttribute('style', 'margin: 0; font-size: 18px; color: #5C463C');
      r.innerHTML = 'Your bag is empty. <a href="#shop">Browse the Edit</a>';
      totals.insertAdjacentElement('beforebegin', r);
    }
    totals.querySelector('[data-coupon-row]')?.remove();
    const vals = $$(totals, ':scope > div > span:last-child');
    vals[0].textContent = formatINR(t.itemsPaise);
    vals[1].textContent = t.shippingPaise ? formatINR(t.shippingPaise) : 'Free';
    vals[1].style.color = t.shippingPaise ? '#2B1712' : '#2C4640';
    vals[2].textContent = formatINR(t.totalPaise);
    if (done && s.checkout.lastOrder!.discountPaise > 0) {
      const row = document.createElement('div');
      row.setAttribute('data-coupon-row', '');
      row.setAttribute('style', 'display:flex;justify-content:space-between;color:#2C4640');
      row.innerHTML = `<span>Coupon ${esc(s.checkout.lastOrder!.couponCode ?? '')}</span><span data-testid="text-coupon-discount">-${formatINR(s.checkout.lastOrder!.discountPaise)}</span>`;
      vals[1].parentElement?.insertAdjacentElement('beforebegin', row);
    }
    tid(vals[0], 'text-items-total'); tid(vals[1], 'text-delivery-fee'); tid(vals[2], 'text-to-pay');
  };

  const render = () => {
    const s = getState(); const step = s.checkout.phone ? s.checkout.step === 'signin' ? 'address' : s.checkout.step : 'signin';
    renderSummary(s);
    paintSteps({ signin: 0, address: 1, payment: 2, done: 3 }[step]);
    panel.setAttribute('data-step', step); tid(panel, `checkout-step-${step}`);

    if (step === 'signin') {
      const sent = codeSentFor !== null;
      panel.innerHTML = `<h1 style="${S.h1}">Sign in to check out</h1><p style="${S.p}">This is a sample-only simulation. No SMS is sent and no real account is signed in. Use any valid 10-digit number and the fixed sample code 246810.</p>
      <div style="${S.card}">${field('phone', 'Mobile number', codeSentFor ?? '', 'type="tel" inputmode="numeric" autocomplete="tel"')}
      ${sent ? field('code', '6-digit sample code', '', 'type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code"') : ''}</div>
      <button type="button" data-testid="${sent ? 'button-verify-code' : 'button-send-code'}" style="${S.btn}">${sent ? 'Verify and continue' : 'Send code'}</button>`;
      const phone = $<HTMLInputElement>(panel, '#phone')!; const code = $<HTMLInputElement>(panel, '#code');
      const go = () => {
        const pe = validatePhone(phone.value); fieldError(phone, pe, 'error-phone'); if (pe) return;
        if (!sent) { codeSentFor = phone.value; render(); $<HTMLInputElement>(panel, '#code')?.focus(); return; }
        const ce = validateCode(code!.value); fieldError(code, ce, 'error-code'); if (ce) return;
        const r = signIn(getState(), phone.value, code!.value);
        if (!r.ok) { fieldError(code, r.error, 'error-code'); return; }
        const button = $(panel, 'button') as HTMLButtonElement;
        button.disabled = true; button.textContent = 'Checking sample code…';
        void fetch('/api/sample/session', {
          method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identity: 'shopper', mobileNumber: normalisePhone(phone.value), simulationCode: code!.value.trim() }),
        }).then(async response => {
          const data = await response.json() as SampleSessionResponse & { error?: string };
          if (!response.ok) throw new Error(data.error || 'Sample sign-in was not completed.');
          if (data.role !== 'shopper' || !data.token) throw new Error('The sample service did not return a shopper identity.');
          localStorage.setItem(SAMPLE_SESSION_KEY, data.token);
          codeSentFor = null;
          const n = r.state; n.checkout.address.phone = n.checkout.address.phone || normalisePhone(phone.value); update(() => n);
        }).catch(error => {
          button.disabled = false; button.textContent = 'Verify and continue';
          fieldError(code, error instanceof Error ? error.message : 'Sample sign-in was not completed.', 'error-code');
        });
      };
      $(panel, 'button')!.addEventListener('click', go);
      [phone, code].forEach(i => i?.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
      return;
    }

    if (step === 'address') {
      panel.innerHTML = addressHTML;
      const a = s.checkout.address;
       const p = $(panel, 'p'); if (p) p.textContent = `Sample number: ${formatPhone(s.checkout.phone!)}. No SMS, delivery updates or real account sign-in.`;
      const ids: [keyof Address, string][] = [['pin', 'c1'], ['house', 'c2'], ['road', 'c3'], ['name', 'c4'], ['phone', 'c5']];
      ids.forEach(([k, id]) => { const el = $<HTMLInputElement>(panel, `#${id}`)!; el.value = String(a[k]); tid(el, `input-address-${k}`); });
      const [def, gift] = $$<HTMLInputElement>(panel, 'input[type="checkbox"]');
      def.checked = a.isDefault; gift.checked = a.gift; tid(def, 'checkbox-default-address'); tid(gift, 'checkbox-gift');
      const pin = $<HTMLInputElement>(panel, '#c1')!; const stateP = pin.nextElementSibling as HTMLElement; tid(stateP, 'text-address-state');
      const paintState = () => { const st = stateFromPincode(pin.value.trim()); stateP.textContent = st ? `State: ${st}` : 'State: enter a valid PIN code'; };
      pin.addEventListener('input', paintState); paintState();
      let note: HTMLElement | null = null;
      const paintGift = () => {
        if (gift.checked && !note) {
          note = document.createElement('div'); note.style.gridColumn = '1 / -1';
          note.innerHTML = `<label for="giftnote" style="${S.label}">Gift note</label><textarea id="giftnote" data-testid="input-gift-note" rows="3" style="${S.input}; height: auto; padding: 10px 14px"></textarea>`;
          gift.closest('label')!.insertAdjacentElement('afterend', note);
        } else if (!gift.checked && note) { note.remove(); note = null; }
      };
      gift.addEventListener('change', paintGift); paintGift();
      const btn = $<HTMLButtonElement>(panel, 'button')!; tid(btn, 'button-deliver-here');
      btn.addEventListener('click', () => {
        const next: Address = { pin: pin.value.trim(), house: $<HTMLInputElement>(panel, '#c2')!.value, road: $<HTMLInputElement>(panel, '#c3')!.value, name: $<HTMLInputElement>(panel, '#c4')!.value, phone: $<HTMLInputElement>(panel, '#c5')!.value, isDefault: def.checked, gift: gift.checked };
        const e = validateAddress(next);
        ids.forEach(([k, id]) => fieldError(k === 'pin' ? stateP : $(panel, `#${id}`), e[k], `error-address-${k}`));
        if (Object.keys(e).length) return;
        if (!bagLines(getState()).length) { fieldError(btn, 'Your bag is empty. Add something first.', 'error-empty-bag'); return; }
        update(st => ({ ...st, checkout: { ...st.checkout, address: next, step: 'payment' } }));
      });
      return;
    }

    if (step === 'payment') {
      const t = bagTotals(s); const a = s.checkout.address;
      const opts = (Object.keys(PAYMENT_LABEL) as (keyof typeof PAYMENT_LABEL)[]).map(k =>
        `<label style="grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; min-height: 52px; padding: 0 16px; border-radius: 16px; border: 1.5px solid ${s.checkout.payment === k ? '#611811' : '#DCCAB0'}; background: #FFFFFF; font-size: 19px; cursor: pointer"><input type="radio" name="pay" value="${k}" data-testid="radio-pay-${k}" ${s.checkout.payment === k ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #611811">${PAYMENT_LABEL[k]}</label>`).join('');
        panel.innerHTML = `<h1 style="${S.h1}">How would you like to pay?</h1><p style="${S.p}">Delivering to ${esc(a.name)}, ${esc(a.house)}, ${esc(a.road)}, ${esc(stateFromPincode(a.pin) ?? '')} ${esc(a.pin)}. <a href="#address" data-testid="link-change-address">Change</a></p>
       <div style="${S.card}">${opts}<label for="sample-coupon" style="${S.label}">Coupon code</label><input id="sample-coupon" data-testid="input-sample-coupon" maxlength="40" autocomplete="off" value="${esc(couponCodeDraft)}" placeholder="Try WELCOME10" style="${S.input}"><p style="grid-column: 1 / -1; margin: 0; font-size: 16px; color: #5C463C">Sample checkout: no money moves. Coupons are checked by the sample service.</p></div>
       <button type="button" data-testid="button-pay" style="${S.btn}">Place sample order · no charge</button>`;
       const couponInput = $<HTMLInputElement>(panel, '#sample-coupon')!;
       couponInput.addEventListener('input', () => { couponCodeDraft = couponInput.value; });
      $$<HTMLInputElement>(panel, 'input[name="pay"]').forEach(r => r.addEventListener('change', () => update(st => ({ ...st, checkout: { ...st.checkout, payment: r.value as keyof typeof PAYMENT_LABEL } }))));
      $(panel, 'a[href="#address"]')!.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); update(st => ({ ...st, checkout: { ...st.checkout, step: 'address' } })); });
       $(panel, 'button')!.addEventListener('click', () => {
         const button = $(panel, 'button') as HTMLButtonElement;
         const current = getState();
         const lines = bagLines(current);
         if (!lines.length) { fieldError(button, 'Your bag is empty. Add something first.', 'error-pay'); return; }
         if (lines.some(line => line.kind !== 'product')) { fieldError(button, 'The sample checkout currently supports physical sample products only.', 'error-pay'); return; }
         const token = localStorage.getItem(SAMPLE_SESSION_KEY);
         if (!token) { fieldError(button, 'Your sample session expired. Sign in again before placing this sample order.', 'error-pay'); return; }
         const address = current.checkout.address;
         const deliveryAddress = {
           name: address.name.trim(), phone: normalisePhone(address.phone),
           line1: `${address.house.trim()}, ${address.road.trim()}`,
           line2: '', state: stateFromPincode(address.pin) ?? '', pin: address.pin,
         };
         const payload = {
           lines: lines.map(line => ({ productId: line.id, quantity: line.qty })),
           deliveryAddress,
            ...(couponCodeDraft.trim() ? { couponCode: couponCodeDraft.trim() } : {}),
         };
         const digest = JSON.stringify(payload);
         let idempotencyKey = '';
         try {
           const stored = JSON.parse(sessionStorage.getItem(CHECKOUT_KEY) ?? 'null') as { digest?: string; key?: string } | null;
           if (stored?.digest === digest && stored.key) idempotencyKey = stored.key;
         } catch { /* use a fresh key if this tab's saved value is unreadable */ }
         if (!idempotencyKey) {
           idempotencyKey = crypto.randomUUID();
           try { sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify({ digest, key: idempotencyKey })); } catch { /* request can still proceed once */ }
         }
         button.disabled = true; button.textContent = 'Saving sample order…';
         void fetch('/api/sample/shopper/checkout', {
           method: 'POST', cache: 'no-store',
           headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
           body: JSON.stringify({ ...payload, idempotencyKey }),
         }).then(async response => {
           const result = await response.json() as SampleCheckoutResponse & { error?: string };
           if (!response.ok) throw new Error(result.error || 'The sample order was not saved.');
           if (!result.sample || !result.orderId || !result.reference) throw new Error('The sample service returned an incomplete order record.');
           const next = JSON.parse(JSON.stringify(current)) as DemoState;
           next.products = next.products.map(product => {
             const line = lines.find(item => item.id === product.id);
             return line ? { ...product, stock: Math.max(0, product.stock - line.qty) } : product;
           });
           next.bag = [];
           next.checkout.step = 'done';
           next.checkout.lastOrder = {
             ref: result.reference,
             lines: lines.map(line => {
               const product = current.products.find(item => item.id === line.id)!;
               return { name: product.name, maker: current.makers.find(item => item.id === product.makerId)?.brand ?? '', img: product.img, qty: line.qty, linePaise: product.pricePaise * line.qty };
             }),
             itemsPaise: result.itemsPaise, shippingPaise: result.shippingPaise, totalPaise: result.totalPaise,
              discountPaise: result.discountPaise, couponCode: result.couponCode,
             address: { ...address }, payment: 'Sample only · no payment collected',
           };
           try { sessionStorage.removeItem(CHECKOUT_KEY); } catch { /* stale keys are harmless */ }
           update(() => next); window.scrollTo({ top: 0 });
         }).catch(error => {
           button.disabled = false; button.textContent = 'Place sample order · no charge';
           fieldError(button, error instanceof Error ? error.message : 'The sample order was not saved.', 'error-pay');
         });
       });
      return;
    }

    const o = s.checkout.lastOrder!;
    panel.innerHTML = `<h1 style="${S.h1}">Thank you, <em style="color: #C23A36">${esc(o.address.name.split(' ')[0])}.</em></h1>
      <p style="${S.p}" data-testid="text-order-ref">Sample order ${o.ref} was saved. No payment was collected. This is not a real purchase. The sample account can show its order history.${o.couponCode ? ` Coupon ${o.couponCode} saved you ${formatINR(o.discountPaise)}.` : ''}</p>
    <div style="${S.card}"><p style="grid-column: 1 / -1; margin: 0; font-size: 19px">This sample walkthrough ends here. No maker received a real order and nothing will be shipped.</p>
    <p style="grid-column: 1 / -1; margin: 0; font-size: 17px; color: #5C463C">Delivering to ${esc(o.address.name)}, ${esc(o.address.house)}, ${esc(o.address.road)}, ${esc(stateFromPincode(o.address.pin) ?? '')} ${esc(o.address.pin)}.</p></div>
    <a href="#shop" data-testid="button-keep-shopping" style="${S.btn}; display: inline-flex; align-items: center; text-decoration: none">Keep browsing the Edit</a>`;
    $(panel, 'a')!.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); update(st => ({ ...st, checkout: { ...st.checkout, step: 'address', lastOrder: null } })); ctx.navigate('/shop'); });
  };
  aside.addEventListener('click', e => { const a = (e.target as Element).closest('a[href="#shop"]'); if (a) { e.preventDefault(); e.stopPropagation(); ctx.navigate('/shop'); } });
  render();
  ctx.cleanups.push(subscribe(render));
  void setBagQty;
}
