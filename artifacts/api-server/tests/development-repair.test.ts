import { afterEach, beforeEach, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { developmentRepairSql } from '../../../scripts/src/prepare-supabase-repair.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
let db: PGlite;
beforeEach(async () => {
  db = new PGlite();
  // Test-only Auth scaffold. This is not part of the remote update file.
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,phone text,email text,
      email_confirmed_at timestamptz,phone_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated;
    alter default privileges in schema public grant all on sequences to anon,authenticated;
  `);
  for (const name of ['001_schema', '002_security', '003_logic']) {
    const sql = await readFile(`${root}/reference/baksa-kit/supabase/migrations/${name}.sql`, 'utf8');
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''));
  }
  await db.exec(`
    insert into public.settings(id,commission_pct) values(true,17);
    insert into public.makers(id,brand,craft) values('10000000-0000-4000-8000-000000000001','Existing shop','Textiles');
    insert into public.products(maker_id,name,price_paise)
      values('10000000-0000-4000-8000-000000000001','Existing product',25000);
  `);
}, 60000);
afterEach(async () => { await db.close(); });

async function snapshot() {
  return (await db.query(`
    select (select jsonb_agg(to_jsonb(p)) from public.products p) as products,
      (select jsonb_agg(to_jsonb(s)) from public.settings s) as settings;
  `)).rows;
}

it('repairs the baseline without changing products or saved financial settings', async () => {
  const before = await snapshot();
  await db.exec(await developmentRepairSql());
  expect(await snapshot()).toEqual(before);
  const state = await db.query(`
    select public.baksa_security_revision() as revision,
      has_function_privilege('authenticated','public.confirm_checkout(uuid,text)','execute') as checkout_allowed,
      (select count(*)::integer from public.user_roles where role='admin') as admins;
  `);
  expect(state.rows[0]).toEqual({ revision: 1, checkout_allowed: false, admins: 0 });
  // A retry must not duplicate policies or reopen revoked financial functions.
  await db.exec(await developmentRepairSql());
  expect(await snapshot()).toEqual(before);
}, 60000);

it('preserves existing editorial revisions and analytics identities exactly', async () => {
  for (const name of ['006_editorial_and_operations', '007_editorial_analytics_keys']) {
    await db.exec(await readFile(`${root}/supabase/migrations/${name}.sql`, 'utf8'));
  }
  await db.exec(`
    insert into public.site_content(id,draft,published,revision,published_revision)
    values(true,'{"stories":[{"id":"existing","title":"Saved title"}],"trunkCards":[]}',
      '{"stories":[],"trunkCards":[]}',7,4);
  `);
  const before = (await db.query('select to_jsonb(s) as document from public.site_content s')).rows;
  const keys = (await db.query('select * from public.site_analytics_keys order by key')).rows;
  await db.exec(await developmentRepairSql());
  expect((await db.query('select to_jsonb(s) as document from public.site_content s')).rows).toEqual(before);
  expect((await db.query('select * from public.site_analytics_keys order by key')).rows).toEqual(keys);
}, 60000);

it('stops for custom access rules without leaving a readiness marker or changing data', async () => {
  await db.exec('create policy "custom rule" on public.products for select using(false);');
  const before = await snapshot();
  await expect(db.exec(await developmentRepairSql())).rejects.toThrow('custom policy');
  await db.exec('rollback;');
  expect(await snapshot()).toEqual(before);
  expect((await db.query("select to_regprocedure('public.baksa_security_revision()') is null as absent")).rows[0])
    .toEqual({ absent: true });
}, 60000);

it('rolls back all policy changes if the existing schema is incompatible', async () => {
  await db.exec('alter table public.vendor_applications drop column maker_id;');
  const before = await snapshot();
  const policies = (await db.query('select * from pg_policies order by schemaname,tablename,policyname')).rows;
  await expect(db.exec(await developmentRepairSql())).rejects.toThrow();
  await db.exec('rollback;');
  expect(await snapshot()).toEqual(before);
  expect((await db.query('select * from pg_policies order by schemaname,tablename,policyname')).rows).toEqual(policies);
  expect((await db.query("select to_regprocedure('public.baksa_security_revision()') is null as absent")).rows[0])
    .toEqual({ absent: true });
}, 60000);
