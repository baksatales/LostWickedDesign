// import-tagmango: an admin uploads the monthly TagMango sales export for LIVE workshops.
// Recorded classes are sold in the Baksa checkout and need no import.
// Request (POST, admin only): { csv: string }  Columns: id, date (YYYY-MM-DD), course, learner, amount (₹), status
// Rows already imported (same TagMango id) are skipped, so the same file can be uploaded twice safely.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'Sign in' }, 401);
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!role) return json({ error: 'Admins only' }, 403);

  const { csv } = await req.json();
  const { data: courses } = await admin.from('courses').select('id, title').eq('format', 'live');
  const byTitle = new Map((courses ?? []).map((c: any) => [c.title.trim().toLowerCase(), c.id]));

  const rows = String(csv).split(/\r?\n/).filter(l => l.trim());
  const out: any[] = []; const skipped: { line: number; reason: string }[] = [];
  rows.forEach((line, i) => {
    const c = parseCsvLine(line);
    if (i === 0 && /date/i.test(line)) return; // header
    const [extId, date, title, learner, amount, status] = c;
    const courseId = byTitle.get((title ?? '').trim().toLowerCase());
    const rupees = Number(String(amount ?? '').replace(/[₹,\s]/g, ''));
    if (!extId) return skipped.push({ line: i + 1, reason: 'Missing TagMango id' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return skipped.push({ line: i + 1, reason: 'Date must be YYYY-MM-DD' });
    if (!courseId) return skipped.push({ line: i + 1, reason: `No live workshop called “${title}”` });
    if (!Number.isFinite(rupees) || rupees < 0) return skipped.push({ line: i + 1, reason: 'Amount isn’t a number' });
    out.push({ course_id: courseId, learner_name: learner || null, amount_paise: Math.round(rupees * 100), purchased_on: date, source: 'tagmango', external_ref: extId, status: /refund/i.test(status ?? '') ? 'refunded' : 'paid' });
  });
  let imported = 0;
  if (out.length) {
    const { data, error } = await admin.from('course_enrolments').upsert(out, { onConflict: 'source,external_ref', ignoreDuplicates: true }).select('id');
    if (error) return json({ error: error.message }, 500);
    imported = data?.length ?? 0;
  }
  return json({ imported, skipped });
});

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim()); return out;
}
