-- FIRST OWNER ONLY: run manually in the connected DEVELOPMENT project's SQL Editor.
-- This grants full administrator access to the exact verified account you choose.
-- Replace the placeholder ONLY in your private SQL Editor, not in the shared repo.
-- Never use this as a public RPC or automatically grant admin to the first signup.
begin;

do $baksa_first_owner$
declare
  owner_email text := 'YOUR_VERIFIED_EMAIL_HERE';
  owner_id uuid;
begin
  if owner_email not like '%@%' then
    raise exception 'Enter your own verified sign-in email in the owner_email line.';
  end if;
  if public.baksa_security_revision() is distinct from 1 then
    raise exception 'Complete the reviewed database setup before granting admin access.';
  end if;
  begin
    select id into strict owner_id
      from auth.users
      where lower(email) = lower(trim(owner_email))
        and email_confirmed_at is not null
      for share;
  exception
    when no_data_found then
      raise exception 'No verified account matches that email. Confirm the email and project first.';
    when too_many_rows then
      raise exception 'More than one verified account matches. Stop and review the accounts.';
  end;
  -- Serialize first-owner grants; two concurrent runs cannot create different owners.
  lock table public.user_roles in share row exclusive mode;
  if exists(select 1 from public.user_roles where role='admin' and user_id<>owner_id) then
    raise exception 'A different admin already exists. Use that admin to review additional access.';
  end if;
  insert into public.user_roles(user_id,role) values(owner_id,'admin')
    on conflict(user_id,role) do nothing;
end
$baksa_first_owner$;

commit;

select exists(
  select 1 from public.user_roles r join auth.users u on u.id=r.user_id
  where r.role='admin' and u.email_confirmed_at is not null
) as owner_admin_ready;
