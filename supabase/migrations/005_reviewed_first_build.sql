-- Additive hardening after supplied 001_schema, 002_security and 003_logic.
-- Do NOT apply 004_seed.sql to live data: its claims, prices and stock are unverified.
-- Run on a NEW DEVELOPMENT Supabase project after review. Never use the local auth stub.
-- This migration does not enable payments or payouts.
begin;

alter table public.vendor_applications
  add column if not exists applicant_user_id uuid references auth.users(id);
create unique index if not exists one_maker_per_owner
  on public.makers(owner_user_id) where owner_user_id is not null;

-- No auto-linking to accounts based on a phone string submitted in a public form.
drop trigger if exists on_auth_user_link_maker on auth.users;
drop policy if exists "anyone can apply" on public.vendor_applications;
create policy "verified applicant submits own application"
  on public.vendor_applications for insert to authenticated
  with check (
    applicant_user_id = auth.uid() and status = 'pending'
    and maker_id is null and admin_note is null
  );
create policy "applicant reads own application"
  on public.vendor_applications for select to authenticated
  using (applicant_user_id = auth.uid());

-- Never expose private course video paths through the public courses row.
revoke select on public.courses from anon, authenticated;
grant select (id,title,creator_label,maker_id,format,price_paise,gst_pct,seats,
  schedule_text,description,tagmango_url,published,created_at)
  on public.courses to anon, authenticated;

-- Contact fields are private; public insert is restricted to the inquiry-shaped columns.
revoke insert on public.corporate_enquiries from anon, authenticated;
grant insert (id,ref,purpose,quantity,budget_per_gift_paise,needed_by,contact_name,
  company,reach,customisation,delivery_cities,reference_link,attachment_paths,message,stage)
  on public.corporate_enquiries to anon, authenticated;

-- Do not permit direct client creation of trust or approval fields.
revoke insert, update on public.products from anon, authenticated;
grant insert (maker_id,name,slug,price_paise,gst_pct,stock,made_to_order,dispatch_days,
  material,technique,size,story,feels,occasions,recipients,corporate_ok,status,maker_verified)
  on public.products to authenticated;
grant update (name,slug,price_paise,gst_pct,stock,made_to_order,dispatch_days,
  material,technique,size,story,feels,occasions,recipients,corporate_ok,maker_verified)
  on public.products to authenticated;
revoke update on public.product_images from anon, authenticated;
revoke insert, delete on public.product_images from anon, authenticated;

-- Review-sensitive content cannot change under an open review or published listing.
-- This conservative first build intentionally disables trusted-maker auto-publication.
create or replace function public.guard_maker_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() or current_setting('baksa.trusted_call', true) = 'on' then return new; end if;
  if tg_table_name = 'products' then
    if old.status not in ('draft','changes') then
      raise exception 'Only a private draft or a listing with requested changes can be edited';
    end if;
    if new.maker_id is distinct from old.maker_id
      or new.status is distinct from old.status
      or new.spot_check is distinct from old.spot_check
      or new.review_note is distinct from old.review_note
      or new.review_reason is distinct from old.review_reason
      or new.in_bt_edit is distinct from old.in_bt_edit
      or new.published_at is distinct from old.published_at
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'Use the approved listing workflow';
    end if;
    new.updated_at := now();
  elsif tg_table_name = 'makers' then
    if new.trusted is distinct from old.trusted or new.approved_count is distinct from old.approved_count
      or new.published is distinct from old.published or new.gst_registered is distinct from old.gst_registered
      or new.gstin is distinct from old.gstin or new.state is distinct from old.state
      or new.owner_user_id is distinct from old.owner_user_id then
      raise exception 'Only Baksa can change ownership, publication, trust or tax details';
    end if;
  end if;
  return new;
end $$;

create or replace function public.submit_product(_product uuid)
returns public.product_status language plpgsql security definer set search_path = public as $$
declare p public.products;
begin
  select * into p from public.products where id = _product for update;
  if not found or not public.owns_maker(p.maker_id) then raise exception 'Not your product'; end if;
  if p.status not in ('draft','changes') then raise exception 'This listing is already submitted'; end if;
  if not p.maker_verified then raise exception 'Confirm the product facts first'; end if;
  if length(trim(coalesce(p.name,''))) = 0
    or length(trim(coalesce(p.material,''))) = 0
    or length(trim(coalesce(p.story,''))) = 0 then raise exception 'Complete the product facts'; end if;
  if not exists (select 1 from public.product_images where product_id = p.id) then
    raise exception 'Add a product photograph before submitting';
  end if;
  perform set_config('baksa.trusted_call','on',true);
  update public.products set status='review',submitted_at=now(),review_reason='Submitted for editorial review'
    where id=p.id;
  return 'review'::public.product_status;
end $$;

create or replace function public.review_product(_product uuid,_decision text,_gates jsonb default '{}',_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.products;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  select * into p from public.products where id=_product for update;
  if not found or p.status <> 'review' then raise exception 'This product is not awaiting review'; end if;
  if _decision not in ('approved','changes') then raise exception 'Unknown review decision'; end if;
  if _decision='approved' then
    if not p.maker_verified or not exists(select 1 from public.product_images where product_id=p.id) then
      raise exception 'Confirmed facts and photographs are required';
    end if;
    if not coalesce((_gates->>'gate1_handmade')::boolean,false)
      or not coalesce((_gates->>'gate1_material')::boolean,false)
      or not coalesce((_gates->>'gate2_photos')::boolean,false)
      or not coalesce((_gates->>'gate2_price')::boolean,false)
      or not coalesce((_gates->>'gate2_story')::boolean,false) then raise exception 'All five checks must pass'; end if;
    perform set_config('baksa.trusted_call','on',true);
    update public.products set status='live',published_at=now(),review_note=null,review_reason=null where id=p.id;
    update public.makers set approved_count=approved_count+1,published=true where id=p.maker_id;
  else
    if length(trim(coalesce(_note,'')))=0 then raise exception 'Explain the requested changes'; end if;
    perform set_config('baksa.trusted_call','on',true);
    update public.products set status='changes',review_note=_note,spot_check=false where id=p.id;
  end if;
  insert into public.product_reviews(product_id,reviewer,decision,gate1_handmade,gate1_material,gate2_photos,gate2_price,gate2_story,note)
    values(p.id,auth.uid(),_decision,(_gates->>'gate1_handmade')::boolean,(_gates->>'gate1_material')::boolean,
      (_gates->>'gate2_photos')::boolean,(_gates->>'gate2_price')::boolean,(_gates->>'gate2_story')::boolean,_note);
  insert into public.notifications(maker_id,text) values(p.maker_id,
    case when _decision='approved' then 'Your listing has been approved.' else 'Your listing needs changes: '||_note end);
end $$;

create or replace function public.approve_application(_app uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a public.vendor_applications; mid uuid;
begin
  if not public.is_admin() then raise exception 'Administrators only'; end if;
  select * into a from public.vendor_applications where id=_app for update;
  if not found then raise exception 'Application not found'; end if;
  if a.status='approved' and a.maker_id is not null then return a.maker_id; end if;
  if a.status not in ('pending','call') then raise exception 'This application cannot be approved'; end if;
  if a.applicant_user_id is null or not exists (
    select 1 from auth.users where id=a.applicant_user_id and (email_confirmed_at is not null or phone_confirmed_at is not null)
  ) then raise exception 'The applicant must have a verified account'; end if;
  if exists(select 1 from public.makers where owner_user_id=a.applicant_user_id) then
    raise exception 'A maker shop is already linked to this applicant';
  end if;
  insert into public.makers(owner_user_id,brand,display_name,craft,city,state,gst_registered,gstin,published,trusted)
    values(a.applicant_user_id,a.brand,a.contact_name,a.craft,a.city,a.state,a.gst_registered,a.gstin,false,false)
    returning id into mid;
  update public.vendor_applications set status='approved',maker_id=mid where id=a.id;
  insert into public.user_roles(user_id,role) values(a.applicant_user_id,'maker') on conflict do nothing;
  return mid;
end $$;

-- PostgreSQL grants EXECUTE to PUBLIC by default: a grant to service_role alone
-- does NOT revoke that. Disable all financial and unfinished privileged endpoints.
revoke execute on function public.confirm_checkout(uuid,text) from public, anon, authenticated, service_role;
revoke execute on function public.settle_maker(uuid,date,text) from public, anon, authenticated, service_role;
revoke execute on function public.upcoming_payouts(uuid) from public, anon, authenticated;
revoke execute on function public.maker_update_order(uuid,public.order_status,text,text,text) from public, anon, authenticated;
revoke execute on function public.admin_update_order(uuid,public.order_status,text) from public, anon, authenticated;
revoke execute on function public.link_new_user_to_maker() from public, anon, authenticated;
revoke execute on function public.send_enquiry_to_makers(uuid,uuid[]) from public, anon, authenticated;
revoke execute on function public.approve_proposal(uuid) from public, anon, authenticated;
revoke execute on function public.submit_product(uuid) from public, anon;
revoke execute on function public.review_product(uuid,text,jsonb,text) from public, anon;
revoke execute on function public.approve_application(uuid) from public, anon;
grant execute on function public.submit_product(uuid),public.review_product(uuid,text,jsonb,text),public.approve_application(uuid) to authenticated;

-- Publication status exposed only after this whole transaction succeeds.
create or replace function public.baksa_security_revision() returns integer
language sql stable set search_path=public as $$ select 1 $$;
grant execute on function public.baksa_security_revision() to anon,authenticated;
commit;
