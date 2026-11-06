import { expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { developmentSetupSql } from '../../../scripts/src/prepare-supabase-setup.mjs';

it('initializes an empty Supabase-like database atomically without sample data or admin grants', async () => {
  const db = new PGlite();
  try {
    // In-memory test scaffolding only. Never included in the delivered setup SQL.
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key, phone text, email text,
        email_confirmed_at timestamptz, phone_confirmed_at timestamptz,
        raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      alter default privileges in schema public grant all on tables to anon,authenticated;
      alter default privileges in schema public grant all on sequences to anon,authenticated;
    `);
    const script = await developmentSetupSql();
    expect(script).not.toContain('-- SOURCE: reference/baksa-kit/supabase/migrations/004_seed.sql');
    expect(script).not.toContain('create schema auth;');
    // gen_random_uuid is built into PostgreSQL; WASM does not bundle pgcrypto.
    const localScript = script.replace('create extension if not exists pgcrypto;', '');
    await db.exec(localScript);
    const result = await db.query<{ revision: number; settings: number; products: number; admins: number }>(`
      select public.baksa_security_revision() as revision,
        (select count(*)::integer from public.settings) as settings,
        (select count(*)::integer from public.products) as products,
        (select count(*)::integer from public.user_roles where role='admin') as admins;
    `);
    expect(result.rows[0]).toEqual({ revision: 1, settings: 1, products: 0, admins: 0 });
    await expect(db.exec(localScript)).rejects.toThrow('Setup refused');
    await db.exec('rollback;');
    expect((await db.query('select count(*)::integer as n from public.settings')).rows[0]).toEqual({ n: 1 });
  } finally { await db.close(); }
}, 60000);
