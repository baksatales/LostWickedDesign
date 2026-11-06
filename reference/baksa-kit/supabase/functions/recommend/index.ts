// recommend: the gift finder's ranking runs here so the rules stay consistent and can be tuned in one place.
// Request (POST, sign-in optional):
//   { answers: { recipient?, occasion?, feel?, budget }, filters: { needBy, buyerState? }, sessionId?: string, consent?: boolean }
// Response: { picks: Card[], nearMisses: Card[], hidden: {...} } where Card = product summary + reasons.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { recommend, type Maker, type Product, type FinderAnswers, type FinderFilters, DEFAULT_SETTINGS } from '../_shared/domain.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const body = await req.json().catch(() => ({}));
  const answers = body.answers as FinderAnswers;
  const filters = (body.filters ?? { needBy: 'any' }) as FinderFilters;
  if (!answers?.budget) return new Response(JSON.stringify({ error: 'Choose a budget' }), { status: 400, headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // If the shopper is signed in and didn't say where it's going, use their default address.
  if (!filters.buyerState && req.headers.get('Authorization')) {
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (user) {
      const { data } = await admin.from('addresses').select('state').eq('user_id', user.id).eq('is_default', true).maybeSingle();
      filters.buyerState = data?.state ?? null;
    }
  }

  const { data: srow } = await admin.from('settings').select('transit_buffer_days').single();
  const { data: rows } = await admin.from('products')
    .select('id, name, price_paise, gst_pct, stock, made_to_order, dispatch_days, status, feels, occasions, recipients, maker_id, product_images(url, alt, sort), makers!inner(id, brand, gst_registered, state, trusted, approved_count, published)')
    .eq('status', 'live');

  const makers = new Map<string, Maker>();
  const products: Product[] = (rows ?? []).map((r: any) => {
    makers.set(r.maker_id, { id: r.maker_id, brand: r.makers.brand, gstRegistered: r.makers.gst_registered, state: r.makers.state, trusted: r.makers.trusted, approvedCount: r.makers.approved_count, published: r.makers.published });
    return { id: r.id, makerId: r.maker_id, name: r.name, pricePaise: r.price_paise, gstPct: +r.gst_pct, stock: r.stock, madeToOrder: r.made_to_order, dispatchDays: r.dispatch_days, status: r.status, feels: r.feels, occasions: r.occasions, recipients: r.recipients };
  });
  const result = recommend(products, makers, answers, filters, { ...DEFAULT_SETTINGS, transitBufferDays: srow?.transit_buffer_days ?? 3 });

  const card = (rec: { productId: string; reasons: unknown }) => {
    const r: any = rows!.find((x: any) => x.id === rec.productId);
    const img = (r.product_images ?? []).sort((a: any, b: any) => a.sort - b.sort)[0];
    return { id: r.id, name: r.name, pricePaise: r.price_paise, maker: r.makers.brand, image: img?.url ?? null, madeToOrder: r.made_to_order, dispatchDays: r.dispatch_days, reasons: rec.reasons };
  };

  if (body.consent && body.sessionId) {
    await admin.from('analytics_events').insert({ session_id: body.sessionId, type: 'quiz_complete', props: { answers, filters, picks: result.picks.length } });
  }
  return new Response(JSON.stringify({ picks: result.picks.map(card), nearMisses: result.nearMisses.map(card), hidden: result.hidden, deliveringTo: filters.buyerState ?? null }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
