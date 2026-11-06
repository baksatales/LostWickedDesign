// create-checkout: the ONLY way an order is created.
// The browser sends what's in the bag; the server re-reads every price, stock level and delivery rule
// from the database, works out the total, and creates the checkout and order lines.
//
// Request (POST, signed-in user):
//   { lines: [{ productId?: string, courseId?: string, qty: number }], addressId?: string,
//     paymentMethod: 'upi' | 'card' | 'netbanking' | 'cod', giftNote?: string }
// Response: { checkoutId, totalPaise, next: 'confirmed' | 'pay', gateway?: {...} }
//           or { error, problems?: [{ id, reason }] } with status 409 when something in the bag can't be bought.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { canDeliver, shippingFor, type Settings } from '../_shared/domain.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'Please sign in to check out' }, 401);

  const body = await req.json().catch(() => null);
  const lines: { productId?: string; courseId?: string; qty: number }[] = body?.lines ?? [];
  const method: string = body?.paymentMethod;
  if (!lines.length) return json({ error: 'Your bag is empty' }, 400);
  if (!['upi', 'card', 'netbanking', 'cod'].includes(method)) return json({ error: 'Choose a way to pay' }, 400);
  if (lines.some(l => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 50)) return json({ error: 'Check the quantities in your bag' }, 400);

  const { data: srow } = await admin.from('settings').select('*').single();
  const s: Settings = {
    commissionPct: +srow.commission_pct, commissionGstPct: +srow.commission_gst_pct, tcsPct: +srow.tcs_pct, paymentFeePct: +srow.payment_fee_pct,
    payoutWeekday: srow.payout_weekday, returnWindowDays: srow.return_window_days, transitBufferDays: srow.transit_buffer_days,
    reviewFirstN: srow.review_first_n, freeShippingOverPaise: srow.free_shipping_over_paise, shippingFeePaise: srow.shipping_fee_paise,
  };

  const productIds = lines.filter(l => l.productId).map(l => l.productId!);
  const courseIds = lines.filter(l => l.courseId).map(l => l.courseId!);
  const hasPhysical = productIds.length > 0;

  if (method === 'cod' && courseIds.length) return json({ error: 'Cash on delivery isn’t available for classes' }, 400);

  // delivery address (only needed for physical items)
  let address: { id: string; state: string } | null = null;
  if (hasPhysical) {
    const { data } = await admin.from('addresses').select('id, state').eq('id', body?.addressId ?? '').eq('user_id', user.id).maybeSingle();
    if (!data) return json({ error: 'Choose a delivery address' }, 400);
    address = data;
  }

  const { data: products } = productIds.length
    ? await admin.from('products').select('id, name, price_paise, gst_pct, stock, made_to_order, status, maker_id, makers!inner(id, published, gst_registered, state)').in('id', productIds)
    : { data: [] as any[] };
  const { data: courses } = courseIds.length
    ? await admin.from('courses').select('id, title, price_paise, published, format').in('id', courseIds)
    : { data: [] as any[] };

  const problems: { id: string; reason: string }[] = [];
  let itemsPaise = 0;
  for (const l of lines) {
    if (l.productId) {
      const p = products!.find((x: any) => x.id === l.productId);
      if (!p || p.status !== 'live' || !p.makers.published) { problems.push({ id: l.productId, reason: 'No longer available' }); continue; }
      if (!p.made_to_order && p.stock < l.qty) { problems.push({ id: p.id, reason: p.stock ? `Only ${p.stock} left` : 'Out of stock' }); continue; }
      if (!canDeliver({ gstRegistered: p.makers.gst_registered, state: p.makers.state }, address!.state)) { problems.push({ id: p.id, reason: `Can’t be delivered to ${address!.state} yet` }); continue; }
      itemsPaise += p.price_paise * l.qty;
    } else if (l.courseId) {
      const c = courses!.find((x: any) => x.id === l.courseId);
      if (!c || !c.published || c.format !== 'recorded') { problems.push({ id: l.courseId, reason: 'This class can’t be bought here' }); continue; }
      itemsPaise += c.price_paise;
    }
  }
  if (problems.length) return json({ error: 'Some items in your bag can’t be bought right now', problems }, 409);

  const shippingPaise = shippingFor(itemsPaise, hasPhysical, s);
  const totalPaise = itemsPaise + shippingPaise;

  const { data: checkout, error: cErr } = await admin.from('checkouts').insert({
    user_id: user.id, address_id: address?.id ?? null, items_paise: itemsPaise, shipping_paise: shippingPaise,
    total_paise: totalPaise, payment_method: method, gift_note: body?.giftNote ?? null,
  }).select('id').single();
  if (cErr) return json({ error: 'Couldn’t start checkout. Please try again.' }, 500);

  const orderRows = lines.filter(l => l.productId).map(l => {
    const p = products!.find((x: any) => x.id === l.productId);
    return { checkout_id: checkout.id, buyer_id: user.id, maker_id: p.maker_id, product_id: p.id, qty: l.qty,
             unit_price_paise: p.price_paise, amount_paise: p.price_paise * l.qty,
             gst_pct: p.makers.gst_registered ? p.gst_pct : 0, maker_gst_registered: p.makers.gst_registered, ship_state: address!.state };
  });
  if (orderRows.length) await admin.from('orders').insert(orderRows);
  const enrolRows = courseIds.map(id => ({ course_id: id, user_id: user.id, amount_paise: courses!.find((c: any) => c.id === id).price_paise, source: 'baksa', status: 'pending', checkout_id: checkout.id }));
  if (enrolRows.length) await admin.from('course_enrolments').insert(enrolRows);

  // Cash on delivery, or demo mode: confirm straight away (takes stock atomically).
  if (method === 'cod' || Deno.env.get('DEMO_PAYMENTS') === 'true') {
    const { error } = await admin.rpc('confirm_checkout', { _checkout: checkout.id, _provider_ref: method === 'cod' ? 'cod' : 'demo' });
    if (error) return json({ error: 'Something sold out while you were checking out. Nothing was charged.' }, 409);
    return json({ checkoutId: checkout.id, totalPaise, next: 'confirmed' });
  }

  // Online payment: create an order with the payment gateway and let the browser open its checkout.
  // TODO(developer): choose the gateway, add its keys as secrets, and implement createGatewayOrder.
  // The payment-webhook function confirms the checkout when the gateway reports success.
  try {
    const gateway = await createGatewayOrder(checkout.id, totalPaise);
    await admin.from('checkouts').update({ provider_ref: gateway.orderId }).eq('id', checkout.id);
    return json({ checkoutId: checkout.id, totalPaise, next: 'pay', gateway });
  } catch (_e) {
    return json({ error: 'Online payment isn’t set up yet. Choose cash on delivery or try later.' }, 503);
  }
});

async function createGatewayOrder(_checkoutId: string, _amountPaise: number): Promise<{ orderId: string; publicKey: string }> {
  throw new Error('Payment gateway not configured');
}
