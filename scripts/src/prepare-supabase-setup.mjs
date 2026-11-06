import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sources = [
  'reference/baksa-kit/supabase/migrations/001_schema.sql',
  'reference/baksa-kit/supabase/migrations/002_security.sql',
  'reference/baksa-kit/supabase/migrations/003_logic.sql',
  'supabase/migrations/005_reviewed_first_build.sql',
  'supabase/migrations/006_editorial_and_operations.sql',
  'supabase/migrations/007_editorial_analytics_keys.sql',
];

export async function developmentSetupSql() {
  const parts = await Promise.all(sources.map(async file => {
    const original = await readFile(resolve(root, file), 'utf8');
    // Remove only the migration's top-level transaction statements.
    // PL/pgSQL BEGIN blocks do not have a semicolon and must remain untouched.
    const sql = original.replace(/^[ \t]*(?:begin|commit);[ \t]*$/gim, '')
      .replace(/^-- Run in order:.*$/gm, '-- Base schema only; the development setup excludes the sample seed.');
    return `\n-- SOURCE: ${file}\n${sql}\n${file.endsWith('001_schema.sql')
      ? '-- Required configuration only; no sample catalogue or people.\ninsert into public.settings default values;\n'
      : ''}`;
  }));
  return `-- BAKSA TALES: NEW DEVELOPMENT PROJECT ONLY
-- Run this entire file once in the Supabase SQL Editor.
-- No credentials, sample products, sample users, admin grants or payment activation.
-- Financial settings are development defaults, not approved launch/tax advice.
-- The base schema and all reviewed hardening commit together or not at all.
begin;
set local search_path = public, extensions;
do $baksa_setup_guard$
begin
  if to_regclass('auth.users') is null
    or not exists(select 1 from pg_roles where rolname='anon')
    or not exists(select 1 from pg_roles where rolname='authenticated') then
    raise exception 'Use the SQL Editor of a new Supabase development project.';
  end if;
  if exists(select 1 from pg_tables where schemaname='public')
    or to_regtype('public.app_role') is not null then
    raise exception 'Setup refused: the public schema is not empty. Do not rerun or apply this to an existing project.';
  end if;
end
$baksa_setup_guard$;
${parts.join('\n')}
select pg_notify('pgrst','reload schema');
commit;

-- Expected result: security_revision = 1, editorial_ready = true, settings_ready = true.
select public.baksa_security_revision() as security_revision,
  to_regclass('public.site_content') is not null as editorial_ready,
  exists(select 1 from public.settings where id=true) as settings_ready;
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = resolve(root, 'generated-artifacts/supabase/baksa-development-setup.sql');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, await developmentSetupSql(), 'utf8');
  console.log('Prepared generated-artifacts/supabase/baksa-development-setup.sql');
}
