-- Reviewed additive development migration. Requires supplied 001/002/003 and reviewed 005.
-- No seed data, payments, payouts or public admin privileges.
begin;

create table if not exists public.site_content (
  id boolean primary key default true check (id),
  draft jsonb,
  published jsonb,
  revision integer not null default 0,
  published_revision integer not null default 0,
  updated_at timestamptz not null default now(),
  edited_by uuid references auth.users(id)
);
create table if not exists public.site_versions (
  id bigint generated always as identity primary key,
  document jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id)
);
alter table public.site_content enable row level security;
alter table public.site_versions enable row level security;
revoke all on public.site_content, public.site_versions from anon, authenticated;
grant select on public.site_content, public.site_versions to authenticated;
create policy "team reads editorial state" on public.site_content for select to authenticated using (public.is_admin());
create policy "team reads editorial history" on public.site_versions for select to authenticated using (public.is_admin());

-- Public visitors can only see the published document, never the draft or history.
create or replace function public.baksa_published_site()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('document',published,'revision',published_revision,
    'updatedAt',coalesce((select max(published_at) from public.site_versions)::text,''))
  from public.site_content where id=true;
$$;
revoke all on function public.baksa_published_site() from public;
grant execute on function public.baksa_published_site() to anon,authenticated;

create or replace function public.baksa_site_draft()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s public.site_content;
begin
  if not public.is_admin() then raise exception 'Administrators only' using errcode='42501'; end if;
  select * into s from public.site_content where id=true;
  if not found or s.draft is null then return null; end if;
  return jsonb_build_object('document',s.draft,'revision',s.revision,
    'publishedRevision',s.published_revision,'updatedAt',s.updated_at,
    'history',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'publishedAt',v.published_at) order by v.id desc)
      from (select id,published_at from public.site_versions order by id desc limit 30) v),'[]'::jsonb));
end $$;
revoke all on function public.baksa_site_draft() from public,anon;
grant execute on function public.baksa_site_draft() to authenticated;

create or replace function public.baksa_edit_site(_action text,_expected integer,_document jsonb default null,_version bigint default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.site_content; restored jsonb;
begin
  if not public.is_admin() then raise exception 'Administrators only' using errcode='42501'; end if;
  if _expected is null or _expected<0 then raise exception 'Invalid revision'; end if;
  if _action not in ('save','publish','restore') then raise exception 'Invalid action'; end if;
  insert into public.site_content(id) values(true) on conflict do nothing;
  select * into s from public.site_content where id=true for update;
  if s.revision<>_expected then raise exception 'Draft changed' using errcode='40001'; end if;
  if _action='save' then
    if _document is null or jsonb_typeof(_document)<>'object' or octet_length(_document::text)>200000
      or not (_document ?& array['brand','theme','navigation','footerLinks','sections','stories','trunkCards','pages','labels'])
      then raise exception 'Invalid editorial document'; end if;
    update public.site_content set draft=_document, revision=revision+1,updated_at=now(),edited_by=auth.uid() where id=true;
  elsif _action='publish' then
    if s.draft is null then raise exception 'Save a draft first'; end if;
    if s.published_revision=s.revision then raise exception 'This version is already published' using errcode='40001'; end if;
    update public.site_content set published=draft,published_revision=revision,updated_at=now(),edited_by=auth.uid() where id=true;
    insert into public.site_versions(document,published_by) values(s.draft,auth.uid());
  else
    select document into restored from public.site_versions where id=_version;
    if not found then raise exception 'Version not found' using errcode='P0002'; end if;
    update public.site_content set draft=restored,revision=revision+1,updated_at=now(),edited_by=auth.uid() where id=true;
  end if;
  return public.baksa_site_draft();
end $$;
revoke all on function public.baksa_edit_site(text,integer,jsonb,bigint) from public,anon;
grant execute on function public.baksa_edit_site(text,integer,jsonb,bigint) to authenticated;

-- Every multi-row state change below locks its subject and checks server-owned identity.
create or replace function public.baksa_order_feed()
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',o.id,'ref',o.order_no,'status',o.status,'paymentStatus',c.payment_status,
    'totalPaise',o.amount_paise,'createdAt',o.created_at,
    'trackingNumber',coalesce(o.tracking_no,''),'carrier',coalesce(o.courier,'')) order by o.created_at desc)
    from (select * from public.orders where buyer_id=auth.uid() or public.owns_maker(maker_id) or public.is_admin()
      order by created_at desc limit 100) o
    join public.checkouts c on c.id=o.checkout_id),'[]'::jsonb);
end $$;
revoke all on function public.baksa_order_feed() from public,anon;
grant execute on function public.baksa_order_feed() to authenticated;

create or replace function public.baksa_review_application(_app uuid,_decision text,_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.vendor_applications; mid uuid;
begin
  if not public.is_admin() then raise exception 'Administrators only' using errcode='42501'; end if;
  if _decision not in ('approved','declined','call') or length(coalesce(_note,''))>1000 then raise exception 'Invalid review'; end if;
  select * into a from public.vendor_applications where id=_app for update;
  if not found then raise exception 'Application not found' using errcode='P0002'; end if;
  if a.status not in ('pending','call') then raise exception 'This application is already closed' using errcode='40001'; end if;
  if _decision='approved' then mid:=public.approve_application(_app);
  else update public.vendor_applications set status=_decision::public.application_status where id=_app; end if;
  update public.vendor_applications set admin_note=nullif(trim(_note),'') where id=_app;
  return _app;
end $$;
revoke all on function public.baksa_review_application(uuid,text,text) from public,anon;
grant execute on function public.baksa_review_application(uuid,text,text) to authenticated;

create or replace function public.baksa_replace_product_images(_product uuid,_images text[])
returns uuid language plpgsql security definer set search_path=public as $$
declare p public.products; uri text; n integer:=0;
begin
  select * into p from public.products where id=_product for update;
  if not found or not public.owns_maker(p.maker_id) then raise exception 'Not your product' using errcode='42501'; end if;
  if p.status not in ('draft','changes') then raise exception 'Only private drafts can change' using errcode='40001'; end if;
  if coalesce(array_length(_images,1),0) not between 1 and 8 then raise exception 'Add one to eight images'; end if;
  foreach uri in array _images loop
    if uri is null or length(uri)>500 or not (uri ~ '^https://[A-Za-z0-9.-]+/' or uri ~ '^/images/baksa/[A-Za-z0-9_.-]+\.(webp|png|jpg|jpeg|avif)$')
      then raise exception 'Invalid image URL'; end if;
  end loop;
  delete from public.product_images where product_id=_product;
  foreach uri in array _images loop
    insert into public.product_images(product_id,url,sort) values(_product,uri,n); n:=n+1;
  end loop;
  return _product;
end $$;
revoke all on function public.baksa_replace_product_images(uuid,text[]) from public,anon;
grant execute on function public.baksa_replace_product_images(uuid,text[]) to authenticated;
-- Existing ownership RLS alone allowed editing images on live listings. Only the
-- locked draft-only RPC may now change this table.
revoke insert,update,delete on public.product_images from anon,authenticated;

create or replace function public.baksa_fulfil_order(_order uuid,_status text,_tracking text,_carrier text,_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare o public.orders; pay public.payment_status; allowed boolean:=false;
begin
  select * into o from public.orders where id=_order for update;
  if not found or not (public.is_admin() or public.owns_maker(o.maker_id)) then
    raise exception 'Order unavailable' using errcode='42501'; end if;
  if length(coalesce(_note,''))>1000 or length(coalesce(_tracking,''))>120 or length(coalesce(_carrier,''))>100 then raise exception 'Details are too long'; end if;
  select payment_status into pay from public.checkouts where id=o.checkout_id;
  if pay not in ('paid','cod_pending') then raise exception 'Payment is not confirmed' using errcode='40001'; end if;
  allowed := (_status='packed' and o.status in ('new','delayed'))
    or (_status='dispatched' and o.status='packed')
    or (_status='delayed' and o.status in ('new','packed'))
    or (_status='problem' and o.status in ('new','packed','dispatched','delayed'));
  if not coalesce(allowed,false) then raise exception 'Invalid order transition' using errcode='40001'; end if;
  if _status='dispatched' and (length(trim(coalesce(_tracking,'')))=0 or length(trim(coalesce(_carrier,'')))=0)
    then raise exception 'Carrier and tracking number are required'; end if;
  update public.orders set status=_status::public.order_status,
    tracking_no=case when _status='dispatched' then trim(_tracking) else tracking_no end,
    courier=case when _status='dispatched' then trim(_carrier) else courier end,
    issue_note=case when _status in ('problem','delayed') then _note else issue_note end where id=_order;
  insert into public.order_events(order_id,status,note,actor)
    values(_order,_status::public.order_status,nullif(trim(_note),''),auth.uid());
  return _order;
end $$;
revoke all on function public.baksa_fulfil_order(uuid,text,text,text,text) from public,anon;
grant execute on function public.baksa_fulfil_order(uuid,text,text,text,text) to authenticated;
commit;
