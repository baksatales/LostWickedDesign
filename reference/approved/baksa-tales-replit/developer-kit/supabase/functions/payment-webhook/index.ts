// payment-webhook: called by the payment gateway, never by the browser.
// It verifies the gateway's signature, then confirms the checkout (which takes stock atomically).
// Webhooks can arrive more than once; confirm_checkout is safe to call repeatedly.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const raw = await req.text();
  // TODO(developer): implement for the chosen gateway (HMAC of the raw body with the webhook secret).
  if (!(await verifySignature(req, raw))) return new Response('Invalid signature', { status: 401 });

  const event = JSON.parse(raw);
  // TODO(developer): map the gateway's payload. These names are placeholders.
  const checkoutId: string | undefined = event?.checkout_id ?? event?.notes?.checkout_id;
  const status: string | undefined = event?.status;
  const paymentRef: string | undefined = event?.payment_id;
  if (!checkoutId) return new Response('Missing checkout id', { status: 400 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (status === 'paid' || status === 'captured') {
    const { error } = await admin.rpc('confirm_checkout', { _checkout: checkoutId, _provider_ref: paymentRef ?? null });
    if (error) {
      // Something sold out after payment: mark failed and refund in full through the gateway.
      await admin.from('checkouts').update({ payment_status: 'failed' }).eq('id', checkoutId);
      // TODO(developer): call the gateway's refund API here and notify the buyer.
    }
  } else if (status === 'failed') {
    await admin.from('checkouts').update({ payment_status: 'failed' }).eq('id', checkoutId).eq('payment_status', 'pending');
  }
  return new Response('ok');
});

async function verifySignature(_req: Request, _raw: string): Promise<boolean> {
  return false; // stays closed until a real gateway is wired in
}
