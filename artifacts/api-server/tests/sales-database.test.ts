// Real PostgreSQL semantics in isolated WASM. Never reads remote credentials/data.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const id = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let db: PGlite;
const user = async (n: number, role = "authenticated") => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${n ? id(n) : ""}',false); set role ${role};`);
};
const adminSQL = async (sql: string) => { await db.exec("reset role"); await db.exec(sql); };
async function fails(sql: string, params: unknown[] = [], code?: string) {
  await db.exec("savepoint expected_failure");
  try {
    const check = expect(db.query(sql, params));
    if (code) await check.rejects.toMatchObject({ code }); else await check.rejects.toThrow();
  } finally { await db.exec("rollback to savepoint expected_failure"); }
}
const lines = (quantity: number) => JSON.stringify([{ productId: id(30), quantity }]);
async function reserve(quantity: number, key = id(100), buyer = 3) {
  await user(buyer);
  return (await db.query<{ r: { checkoutId: string; state: string; paymentStatus: string } }>(
    "select baksa_sales_reserve($1::jsonb,$2,$3,'Remembered, with love') r", [lines(quantity), id(buyer + 40), key])).rows[0]!.r;
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
  for (const name of ["001_schema", "002_security", "003_logic"]) {
    await db.exec((await readFile(`${root}/reference/baksa-kit/supabase/migrations/${name}.sql`, "utf8"))
      .replace("create extension if not exists pgcrypto;", ""));
  }
  await db.exec("grant all on all tables in schema public to anon,authenticated; grant usage,select on all sequences in schema public to anon,authenticated");
  for (const name of ["005_reviewed_first_build", "006_editorial_and_operations", "007_editorial_analytics_keys", "008_sales_mvp"]) {
    await db.exec(await readFile(`${root}/supabase/migrations/${name}.sql`, "utf8"));
  }
  await db.exec(`
    insert into auth.users(id,email,email_confirmed_at) values
      ('${id(1)}','operator@example.invalid',now()),('${id(2)}','maker@example.invalid',now()),
      ('${id(3)}','buyer@example.invalid',now()),('${id(4)}','other@example.invalid',now());
    insert into user_roles values('${id(1)}','admin'),('${id(2)}','maker');
    insert into settings(id) values(true);
    insert into makers(id,owner_user_id,brand,craft,published,gst_registered,state)
      values('${id(20)}','${id(2)}','Fixture maker','Craft',true,true,'Delhi');
    insert into products(id,maker_id,name,slug,price_paise,stock,status,material,story,maker_verified)
      values('${id(30)}','${id(20)}','Fixture object','fixture-object',10000,5,'live','Verified material','Verified story',true);
    insert into product_images(product_id,url) values('${id(30)}','https://example.invalid/fixture.jpg');
    insert into product_reviews(product_id,reviewer,decision,gate1_handmade,gate1_material,gate2_photos,gate2_price,gate2_story)
      values('${id(30)}','${id(1)}','approved',true,true,true,true,true);
    insert into addresses(id,user_id,full_name,phone,house,road,pincode,state) values
      ('${id(43)}','${id(3)}','Buyer fixture','9876543210','1','Test road','110001','Delhi'),
      ('${id(44)}','${id(4)}','Other fixture','9876543210','2','Other road','110001','Delhi');
  `);
  await user(1);
  await db.query("select baksa_sales_approve_listing($1,true)", [id(30)]);
  await db.exec("reset role");
}, 60_000);
beforeEach(async () => { await db.exec("reset role; begin;"); });
afterEach(async () => { await db.exec("rollback; reset role;"); });
afterAll(async () => { await db?.close(); });

it("starts disabled with no invented shipping policy or payment activation", async () => {
  await user(0, "anon");
  const r = (await db.query<{ r: { reservationsEnabled: boolean; shippingConfigured: boolean } }>("select baksa_sales_readiness() r")).rows[0]!.r;
  expect(r).toMatchObject({ reservationsEnabled: false, shippingConfigured: false });
  await user(3);
  await fails("select baksa_sales_reserve($1::jsonb,$2,$3)", [lines(1), id(43), id(100)], "55000");
});
it("quotes authoritative prices, consolidates duplicate lines and uses confirmed shipping", async () => {
  await adminSQL("update baksa_sales_policy set shipping_fee_paise=12000");
  await user(3);
  const r = (await db.query<{ r: { totalPaise: number; lines: unknown[] } }>("select baksa_sales_quote($1::jsonb,$2) r", [
    JSON.stringify([{ productId: id(30), quantity: 1 }, { productId: id(30), quantity: 2 }]), id(43),
  ])).rows[0]!.r;
  expect(r.totalPaise).toBe(42000); expect(r.lines).toHaveLength(1);
  await fails("select baksa_sales_quote($1::jsonb,$2)", [JSON.stringify([{ productId: id(30), quantity: 1, pricePaise: 1 }]), id(43)]);
});
it("denies cross-buyer addresses, anonymous quotes and buyer listing approval", async () => {
  await adminSQL("update baksa_sales_policy set shipping_fee_paise=12000");
  await user(3);
  await fails("select baksa_sales_quote($1::jsonb,$2)", [lines(1), id(44)], "42501");
  await fails("select baksa_sales_approve_listing($1,true)", [id(30)], "42501");
  await user(0, "anon");
  await fails("select baksa_sales_quote($1::jsonb,$2)", [lines(1), id(43)], "42501");
});
it("invalidates owner approval when reviewed facts or prices change", async () => {
  await adminSQL(`update baksa_sales_policy set shipping_fee_paise=12000; update products set price_paise=9999 where id='${id(30)}'`);
  await user(3);
  await fails("select baksa_sales_quote($1::jsonb,$2)", [lines(1), id(43)], "40001");
});
it("requires all five listing gates even if a product was marked live", async () => {
  await adminSQL("delete from product_reviews");
  await user(1);
  await fails("select baksa_sales_approve_listing($1,true)", [id(30)]);
  await fails("select baksa_sales_approve_listing($1,false)", [id(30)]);
});
it("reserves once per request key, freezes totals/address and rejects changed contents", async () => {
  await adminSQL("update baksa_sales_policy set shipping_fee_paise=12000,reservations_enabled=true");
  const first = await reserve(3);
  expect(first.paymentStatus).toBe("pending");
  expect((await reserve(3)).checkoutId).toBe(first.checkoutId);
  await fails("select baksa_sales_reserve($1::jsonb,$2,$3,'Remembered, with love')", [lines(1), id(43), id(100)], "40001");
  await db.exec("reset role");
  expect((await db.query<{ stock: number }>("select stock from products")).rows[0]!.stock).toBe(2);
  const r = (await db.query<{ total_paise: number; gift_note: string; address_snapshot: { house: string } }>(
    "select c.total_paise,c.gift_note,r.address_snapshot from checkouts c join baksa_sales_reservations r on r.checkout_id=c.id")).rows[0]!;
  expect(r.total_paise).toBe(42000); expect(r.gift_note).toBe("Remembered, with love"); expect(r.address_snapshot.house).toBe("1");
});
it("prevents overselling between competing buyers and rolls back failed reservations", async () => {
  await adminSQL("update baksa_sales_policy set shipping_fee_paise=12000,reservations_enabled=true");
  await reserve(3);
  await user(4);
  await fails("select baksa_sales_reserve($1::jsonb,$2,$3)", [lines(3), id(44), id(101)], "40001");
  await db.exec("reset role");
  expect((await db.query<{ n: number }>("select count(*)::int n from checkouts")).rows[0]!.n).toBe(1);
  expect((await db.query<{ stock: number }>("select stock from products")).rows[0]!.stock).toBe(2);
});
it("cancels and restores inventory once, without allowing another buyer to cancel", async () => {
  await adminSQL("update baksa_sales_policy set shipping_fee_paise=12000,reservations_enabled=true");
  const r = await reserve(2);
  await user(4); await fails("select baksa_sales_cancel($1)", [r.checkoutId], "42501");
  await user(3); await db.query("select baksa_sales_cancel($1)", [r.checkoutId]); await db.query("select baksa_sales_cancel($1)", [r.checkoutId]);
  await db.exec("reset role");
  expect((await db.query<{ stock: number }>("select stock from products")).rows[0]!.stock).toBe(5);
  expect((await db.query<{ payment_status: string }>("select payment_status from checkouts")).rows[0]!.payment_status).toBe("failed");
});
it("releases expired pending inventory and returns released for an expired retry", async () => {
  await adminSQL("update baksa_sales_policy set shipping_fee_paise=12000,reservations_enabled=true");
  await reserve(2);
  await adminSQL("update baksa_sales_reservations set expires_at=now()-interval '1 minute'");
  expect((await reserve(2)).state).toBe("released");
  const next = await reserve(5, id(101), 4); expect(next.state).toBe("reserved");
});
it("does not release paid inventory or allow direct payment/status writes", async () => {
  await adminSQL("update baksa_sales_policy set shipping_fee_paise=12000,reservations_enabled=true");
  const r = await reserve(2);
  await adminSQL("update checkouts set payment_status='paid'");
  await user(3); await fails("select baksa_sales_cancel($1)", [r.checkoutId], "40001");
  await fails("update checkouts set payment_status='paid'", [], "42501");
  await fails("update orders set status='delivered'", [], "42501");
  await fails("select confirm_checkout($1,'unverified')", [r.checkoutId], "42501");
});
it("guards fulfillment steps, tracking and delay notes at the SQL boundary", async () => {
  await adminSQL("update baksa_sales_policy set shipping_fee_paise=12000,reservations_enabled=true");
  const r = await reserve(1);
  await db.exec("reset role");
  const oid = (await db.query<{ id: string }>("select id from orders where checkout_id=$1", [r.checkoutId])).rows[0]!.id;
  await user(1);
  await fails("select baksa_fulfil_order($1,'packed','','','')", [oid], "40001");
  await adminSQL("update checkouts set payment_status='paid'");
  await user(3); await fails("select baksa_fulfil_order($1,'packed','','','')", [oid], "42501");
  await user(1);
  await fails("select baksa_fulfil_order($1,'delivered','','','')", [oid], "40001");
  await fails("select baksa_fulfil_order($1,'delayed','','',' ')", [oid]);
  await db.query("select baksa_fulfil_order($1,'packed','','','')", [oid]);
  await fails("select baksa_fulfil_order($1,'dispatched','','','')", [oid]);
  await db.query("select baksa_fulfil_order($1,'dispatched','TRACK-1','Manual courier','')", [oid]);
  await user(2); await fails("select baksa_fulfil_order($1,'delivered','','','')", [oid], "40001");
  await user(1); await db.query("select baksa_fulfil_order($1,'delivered','','','')", [oid]);
  await db.exec("reset role");
  const row = (await db.query<{ settled: boolean; delivered_on: string }>("select settled,delivered_on from orders")).rows[0]!;
  expect(row.settled).toBe(false); expect(row.delivered_on).not.toBeNull();
});
it("serves immutable recipient snapshots and gift notes only to order participants", async () => {
  await adminSQL("update baksa_sales_policy set shipping_fee_paise=12000,reservations_enabled=true");
  await reserve(1);
  await adminSQL("update addresses set house='Changed later'");
  await user(4);
  expect((await db.query<{ r: unknown[] }>("select baksa_order_feed() r")).rows[0]!.r).toEqual([]);
  for (const n of [1, 2, 3]) {
    await user(n);
    const r = (await db.query<{ r: { deliveryAddress: string; giftNote: string }[] }>("select baksa_order_feed() r")).rows[0]!.r[0]!;
    expect(r.deliveryAddress).toContain("1, Test road"); expect(r.deliveryAddress).not.toContain("Changed later");
    expect(r.giftNote).toBe("Remembered, with love");
  }
});
