import { beforeEach, afterEach, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const grantSql = await readFile(`${root}/supabase/manual/first-owner-admin.sql`, 'utf8');
const schema = (await readFile(`${root}/reference/baksa-kit/supabase/migrations/001_schema.sql`, 'utf8'))
  .replace('create extension if not exists pgcrypto;', '');
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const forEmail = (email: string) => grantSql.replace(
  "owner_email text := 'YOUR_VERIFIED_EMAIL_HERE';", `owner_email text := '${email}';`,
);
let db: PGlite;
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    ${schema}
    create function public.baksa_security_revision() returns integer
      language sql as $$select 1$$;
    insert into auth.users values
      ('${id(1)}','owner@example.test',now()),
      ('${id(2)}','other@example.test',now()),
      ('${id(3)}','unverified@example.test',null);
    insert into public.user_roles values('${id(1)}','buyer');
  `);
}, 60000);
afterEach(async () => { await db.close(); });

it('grants only the chosen verified owner and preserves their buyer role on retries', async () => {
  await db.exec(forEmail('OWNER@example.test'));
  await db.exec(forEmail('owner@example.test'));
  expect((await db.query('select user_id,role from public.user_roles order by role')).rows).toEqual([
    { user_id: id(1), role: 'buyer' }, { user_id: id(1), role: 'admin' },
  ]);
});

it.each([
  ['unverified@example.test', 'No verified account'],
  ['missing@example.test', 'No verified account'],
])('refuses %s without assigning any admin', async (email, message) => {
  await expect(db.exec(forEmail(email))).rejects.toThrow(message);
  await db.exec('rollback;');
  expect((await db.query("select count(*)::integer as n from public.user_roles where role='admin'")).rows[0])
    .toEqual({ n: 0 });
});

it('requires an explicit email instead of selecting an arbitrary signup', async () => {
  await expect(db.exec(grantSql)).rejects.toThrow('Enter your own verified sign-in email');
  await db.exec('rollback;');
});

it('refuses to add another owner when a different administrator already exists', async () => {
  await db.exec(`insert into public.user_roles values('${id(2)}','admin');`);
  await expect(db.exec(forEmail('owner@example.test'))).rejects.toThrow('A different admin already exists');
  await db.exec('rollback;');
  expect((await db.query("select user_id from public.user_roles where role='admin'")).rows)
    .toEqual([{ user_id: id(2) }]);
});

it.each(['0', 'null'])('refuses granting access when security revision is %s', async revision => {
  await db.exec(`create or replace function public.baksa_security_revision() returns integer language sql as $$select (${revision})::integer$$;`);
  await expect(db.exec(forEmail('owner@example.test'))).rejects.toThrow('Complete the reviewed database setup');
  await db.exec('rollback;');
});

it('refuses an ambiguous email match instead of choosing the first account', async () => {
  await db.exec(`insert into auth.users values('${id(4)}','owner@example.test',now());`);
  await expect(db.exec(forEmail('owner@example.test'))).rejects.toThrow('More than one verified account matches');
  await db.exec('rollback;');
  expect((await db.query("select count(*)::integer as n from public.user_roles where role='admin'")).rows[0])
    .toEqual({ n: 0 });
});
