import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const literal = value => `'${value.replaceAll("'", "''")}'`;
const withoutTransaction = sql => sql.replace(/^[ \t]*(?:begin|commit);[ \t]*$/gim, '');

function analyticsFunction(sql, name) {
  const start = sql.indexOf(`create function public.${name}(`);
  const end = sql.indexOf('$$;', start);
  const revokeEnd = sql.indexOf(';', end + 3);
  if (start < 0 || end < 0 || revokeEnd < 0) throw new Error(`Cannot extract reviewed ${name}`);
  return sql.slice(start, revokeEnd + 1).replace('create function', 'create or replace function');
}

export async function developmentRepairSql() {
  const paths = [
    'reference/baksa-kit/supabase/migrations/002_security.sql',
    'reference/baksa-kit/supabase/migrations/003_logic.sql',
    'supabase/migrations/005_reviewed_first_build.sql',
    'supabase/migrations/006_editorial_and_operations.sql',
    'supabase/migrations/007_editorial_analytics_keys.sql',
  ];
  const [security, logic, hardening, editorial, analytics] = await Promise.all(
    paths.map(async path => withoutTransaction(await readFile(resolve(root, path), 'utf8'))),
  );
  const requiredTables = [...security.matchAll(/alter table (\w+) enable row level security;/g)].map(m => m[1]);
  const policies = [...[security, hardening, editorial].join('\n')
    .matchAll(/create policy "([^"]+)"\s+on\s+(?:public\.)?(\w+)/g)]
    .map(m => `(${literal(m[2])},${literal(m[1])})`);
  const tables = [...requiredTables, 'site_content', 'site_versions'].map(literal).join(',');
  const existingAnalytics = `
alter table public.site_analytics_keys enable row level security;
revoke all on public.site_analytics_keys from public,anon,authenticated;
${analyticsFunction(analytics, 'baksa_key_site')}
${analyticsFunction(analytics, 'baksa_persist_site_keys')}
drop trigger if exists site_keys_before_write on public.site_content;
create trigger site_keys_before_write before insert or update on public.site_content
for each row execute function public.baksa_persist_site_keys();
`;
  return `-- BAKSA TALES: REVIEWED UPDATE FOR THE EXISTING DEVELOPMENT DATABASE
-- Select the SAME development project used by the app. Run the ENTIRE file.
-- Replaces Baksa-owned access policies, triggers and functions with reviewed versions.
-- Preserves saved catalogue, orders, accounts, roles, settings and editorial content.
-- Does not create an admin, publish products, import samples, or enable payments.
-- Unexpected custom policies or an incompatible schema stop the whole update.
begin;
set local search_path=public,extensions;
do $baksa_repair_guard$
declare t text; p record;
begin
  if to_regclass('auth.users') is null or to_regtype('public.app_role') is null then
    raise exception 'Update refused: the expected Supabase/Baksa base schema is missing.';
  end if;
  foreach t in array array[${requiredTables.map(literal).join(',')}] loop
    if to_regclass('public.' || t) is null then
      raise exception 'Update refused: required Baksa table % is missing.', t;
    end if;
  end loop;
  for p in select tablename,policyname from pg_policies
    where schemaname='public' and tablename=any(array[${tables}]) loop
    if not exists(select 1 from (values ${policies.join(',\n')}) known(tbl,policy)
      where known.tbl=p.tablename and known.policy=p.policyname) then
      raise exception 'Update refused: custom policy % on % needs review.',p.policyname,p.tablename;
    end if;
  end loop;
  -- Replace only the recognized policy set; never silently remove custom rules.
  for p in select tablename,policyname from pg_policies
    where schemaname='public' and tablename=any(array[${tables}]) loop
    execute format('drop policy %I on public.%I',p.policyname,p.tablename);
  end loop;
end
$baksa_repair_guard$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_link_maker on auth.users;
drop trigger if exists products_guard on public.products;
drop trigger if exists makers_guard on public.makers;
drop trigger if exists addresses_default on public.addresses;

-- Restore the known baseline and harden it in the SAME transaction.
${security}
${logic}
${hardening}
${editorial}

-- Add defaults only if absent; never replace an owner's saved settings.
insert into public.settings(id) values(true) on conflict(id) do nothing;

do $baksa_analytics_update$
begin
  if to_regclass('public.site_analytics_keys') is null then
    execute $baksa_new_analytics$
${analytics}
$baksa_new_analytics$;
  else
    -- Keep all existing identities: never rerun the one-time legacy backfill.
    execute $baksa_existing_analytics$
${existingAnalytics}
$baksa_existing_analytics$;
  end if;
end
$baksa_analytics_update$;
select pg_notify('pgrst','reload schema');
commit;

select public.baksa_security_revision() as security_revision,
  to_regclass('public.site_content') is not null as editorial_ready,
  exists(select 1 from public.settings where id=true) as settings_ready;
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = resolve(root, 'generated-artifacts/supabase/baksa-development-update.sql');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, await developmentRepairSql(), 'utf8');
  console.log('Prepared generated-artifacts/supabase/baksa-development-update.sql');
}
