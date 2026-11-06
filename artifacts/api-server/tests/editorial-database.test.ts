/**
 * Isolated PostgreSQL/WASM integration checks. No remote DB, external credentials
 * or auth bypass in the application. The auth schema below exists only in memory.
 */
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defaultSite } from "../src/lib/site-content";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const uid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let db: PGlite;
async function asUser(n: number, role = "authenticated") {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${n ? uid(n) : ""}',false); set role ${role};`);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,phone text,email text,email_confirmed_at timestamptz,
      phone_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
  `);
  for (const file of ["001_schema", "002_security", "003_logic"]) {
    const sql = await readFile(`${root}/reference/baksa-kit/supabase/migrations/${file}.sql`, "utf8");
    // gen_random_uuid is built into PostgreSQL; pgcrypto isn't bundled in WASM.
    await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
  }
  // Supabase grants table access by default; RLS and subsequent reviewed revokes
  // still apply. Reproduce those grants before testing the hardening migrations.
  await db.exec("grant all on all tables in schema public to anon,authenticated; grant usage,select on all sequences in schema public to anon,authenticated;");
  for (const file of ["005_reviewed_first_build", "006_editorial_and_operations"]) {
    await db.exec(await readFile(`${root}/supabase/migrations/${file}.sql`, "utf8"));
  }
  await db.exec(`
    insert into auth.users(id,email,email_confirmed_at) values
      ('${uid(1)}','admin@example.invalid',now()),('${uid(2)}','maker@example.invalid',now()),
      ('${uid(3)}','buyer@example.invalid',now()),('${uid(4)}','other@example.invalid',now());
    insert into public.user_roles(user_id,role) values('${uid(1)}','admin'),('${uid(2)}','maker');
    insert into public.makers(id,owner_user_id,brand,craft) values('${uid(20)}','${uid(2)}','Test maker','Test craft');
    insert into public.products(id,maker_id,name,slug,price_paise,material,story,maker_verified)
      values('${uid(30)}','${uid(20)}','Test object','test-object',10000,'Test material','Verified test description',true);
  `);
}, 60_000);
afterAll(async () => { await db?.close(); });

describe("editorial PostgreSQL transactions and RLS", () => {
  it("saves privately, publishes atomically and prevents stale overwrites", async () => {
    await asUser(1);
    const saved = await db.query<{ result: { revision: number } }>("select baksa_edit_site('save',0,$1::jsonb) as result", [JSON.stringify(defaultSite)]);
    expect(saved.rows[0]?.result.revision).toBe(1);
    await expect(db.query("select baksa_edit_site('save',0,$1::jsonb)", [JSON.stringify(defaultSite)])).rejects.toMatchObject({ code: "40001" });
    await asUser(0, "anon");
    const unpublished = await db.query<{ result: { document: unknown } }>("select baksa_published_site() as result");
    expect(unpublished.rows[0]?.result.document).toBeNull();
    await expect(db.query("select draft from site_content")).rejects.toMatchObject({ code: "42501" });
    await asUser(1);
    await db.query("select baksa_edit_site('publish',1)");
    await asUser(0, "anon");
    const published = await db.query<{ result: { document: typeof defaultSite; revision: number } }>("select baksa_published_site() as result");
    expect(published.rows[0]?.result.revision).toBe(1);
    expect(published.rows[0]?.result.document.brand.name).toBe("Baksa Tales");
    expect(published.rows[0]?.result).not.toHaveProperty("draft");
  });
  it("restores history into a draft without changing the public version", async () => {
    await asUser(1);
    const changed = structuredClone(defaultSite); changed.brand.name = "Private draft";
    await db.query("select baksa_edit_site('save',1,$1::jsonb)", [JSON.stringify(changed)]);
    await db.query("select baksa_edit_site('restore',2,null,1)");
    const draft = await db.query<{ result: { revision: number; document: typeof defaultSite } }>("select baksa_site_draft() as result");
    expect(draft.rows[0]?.result.revision).toBe(3);
    expect(draft.rows[0]?.result.document.brand.name).toBe("Baksa Tales");
    await asUser(0, "anon");
    const pub = await db.query<{ result: { revision: number } }>("select baksa_published_site() as result");
    expect(pub.rows[0]?.result.revision).toBe(1);
  });
  it("rejects buyer and maker editorial writes even through direct RPC calls", async () => {
    for (const n of [2, 3]) {
      await asUser(n);
      await expect(db.query("select baksa_edit_site('publish',3)")).rejects.toMatchObject({ code: "42501" });
      await expect(db.query("select baksa_site_draft()")).rejects.toMatchObject({ code: "42501" });
    }
  });
  it("makes product images draft-only and prevents another account editing them", async () => {
    await asUser(2);
    await db.query("select baksa_replace_product_images($1,$2::text[])", [uid(30), ["/images/baksa/t-bluelotus.webp"]]);
    await expect(db.query("insert into product_images(product_id,url) values($1,'https://example.invalid/x.webp')", [uid(30)])).rejects.toMatchObject({ code: "42501" });
    await asUser(3);
    await expect(db.query("select baksa_replace_product_images($1,$2::text[])", [uid(30), ["/images/baksa/t-teapot.webp"]])).rejects.toMatchObject({ code: "42501" });
    await asUser(2);
    await db.query("select submit_product($1)", [uid(30)]);
    await expect(db.query("select baksa_replace_product_images($1,$2::text[])", [uid(30), ["/images/baksa/t-teapot.webp"]])).rejects.toMatchObject({ code: "40001" });
  });
  it("links application approval only to the verified applicant and refuses double approval", async () => {
    await asUser(4);
    await db.query(`insert into vendor_applications(id,brand,contact_name,phone,craft,city,state,gst_registered,applicant_user_id)
      values($1,'New maker','Test applicant','9876543210','Test craft','Test city','Test state',false,$2)`, [uid(40), uid(4)]);
    await expect(db.query("select baksa_review_application($1,'approved','')", [uid(40)])).rejects.toMatchObject({ code: "42501" });
    await asUser(1);
    await db.query("select baksa_review_application($1,'approved','Verified development test')", [uid(40)]);
    const linked = await db.query<{ owner_user_id: string; published: boolean }>("select owner_user_id,published from makers where owner_user_id=$1", [uid(4)]);
    expect(linked.rows).toHaveLength(1);
    expect(linked.rows[0]).toMatchObject({ owner_user_id: uid(4), published: false });
    await expect(db.query("select baksa_review_application($1,'approved','')", [uid(40)])).rejects.toMatchObject({ code: "40001" });
  });
  it("scopes order visibility and blocks invalid, unpaid and cross-maker fulfilment", async () => {
    // Test fixtures only; no application checkout or payment-confirmation bypass.
    await db.exec(`reset role;
      insert into checkouts(id,user_id,items_paise,total_paise,payment_method,payment_status)
        values('${uid(50)}','${uid(3)}',10000,10000,'card','paid'),
              ('${uid(51)}','${uid(3)}',10000,10000,'card','pending');
      insert into orders(id,checkout_id,buyer_id,maker_id,product_id,qty,unit_price_paise,amount_paise,gst_pct,maker_gst_registered)
        values('${uid(60)}','${uid(50)}','${uid(3)}','${uid(20)}','${uid(30)}',1,10000,10000,18,true),
              ('${uid(61)}','${uid(51)}','${uid(3)}','${uid(20)}','${uid(30)}',1,10000,10000,18,true);`);
    await asUser(4);
    const feed = await db.query<{ result: unknown[] }>("select baksa_order_feed() as result");
    expect(feed.rows[0]?.result).toEqual([]);
    await expect(db.query("select baksa_fulfil_order($1,'packed','','','')", [uid(60)])).rejects.toMatchObject({ code: "42501" });
    await asUser(2);
    await expect(db.query("select baksa_fulfil_order($1,'packed','','','')", [uid(61)])).rejects.toMatchObject({ code: "40001" });
    await expect(db.query("select baksa_fulfil_order($1,'dispatched','123','Test carrier','')", [uid(60)])).rejects.toMatchObject({ code: "40001" });
    await db.query("select baksa_fulfil_order($1,'packed','','','Packed')", [uid(60)]);
    await expect(db.query("select baksa_fulfil_order($1,'dispatched','','','')", [uid(60)])).rejects.toThrow();
    await db.query("select baksa_fulfil_order($1,'dispatched','123','Test carrier','Dispatched')", [uid(60)]);
    const events = await db.query<{ status: string }>("select status from order_events where order_id=$1 order by created_at", [uid(60)]);
    expect(events.rows.map(e => e.status)).toEqual(["packed", "dispatched"]);
    const ownFeed = await db.query<{ result: { id: string; paymentStatus: string; status: string }[] }>("select baksa_order_feed() as result");
    expect(ownFeed.rows[0]?.result.find(o => o.id === uid(60))).toMatchObject({ paymentStatus: "paid", status: "dispatched" });
    await asUser(3);
    expect((await db.query<{ result: unknown[] }>("select baksa_order_feed() as result")).rows[0]?.result).toHaveLength(2);
    await expect(db.query("select baksa_fulfil_order($1,'problem','','','Issue')", [uid(60)])).rejects.toMatchObject({ code: "42501" });
  });
});
