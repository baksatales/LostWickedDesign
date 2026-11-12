-- PREPARED ONLY. Apply after 005-007 on an explicitly authorized DEVELOPMENT
-- project. This migration neither seeds sample products nor enables payment.
begin;

create table public.baksa_sales_policy (
  id boolean primary key default true check(id),
  environment text not null default 'development' check(environment='development'),
  reservations_enabled boolean not null default false,
  shipping_fee_paise integer check(shipping_fee_paise>=0),
  free_shipping_over_paise integer not null default 250000 check(free_shipping_over_paise>=0)
);
insert into public.baksa_sales_policy(id) values(true);
alter table public.baksa_sales_policy enable row level security;
revoke all on public.baksa_sales_policy from public,anon,authenticated;

-- Approval is deliberate, not inferred from a live status, source image, or seed.
-- A subsequent change to any reviewed fact or price invalidates this snapshot.
create table public.baksa_sales_approvals (
  product_id uuid primary key references public.products(id),
  snapshot jsonb not null,
  approved_by uuid not null references auth.users(id),
  approved_at timestamptz not null default now()
);
alter table public.baksa_sales_approvals enable row level security;
revoke all on public.baksa_sales_approvals from public,anon,authenticated;

create table public.baksa_sales_reservations (
  checkout_id uuid primary key references public.checkouts(id),
  user_id uuid not null references auth.users(id),
  idempotency_key uuid not null,
  request jsonb not null,
  address_snapshot jsonb not null,
  financial_snapshot jsonb not null,
  expires_at timestamptz not null default (now()+interval '15 minutes'),
  inventory_state text not null default 'reserved' check(inventory_state in ('reserved','released')),
  unique(user_id,idempotency_key)
);
alter table public.baksa_sales_reservations enable row level security;
revoke all on public.baksa_sales_reservations from public,anon,authenticated;
-- All authoritative order writes go through reviewed transactions, not REST.
revoke insert,update,delete on public.checkouts,public.orders,public.order_events from anon,authenticated;

create function public.baksa_sales_snapshot(_product uuid) returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object('product',to_jsonb(p)-array['stock','updated_at'],
    'maker',jsonb_build_object('id',m.id,'published',m.published,
      'gstRegistered',m.gst_registered,'state',m.state),
    'images',coalesce((select jsonb_agg(jsonb_build_object('url',i.url,'sort',i.sort) order by i.sort,i.id)
      from public.product_images i where i.product_id=p.id),'[]'::jsonb))
  from public.products p join public.makers m on m.id=p.maker_id where p.id=_product
$$;
revoke all on function public.baksa_sales_snapshot(uuid) from public,anon,authenticated;

create function public.baksa_sales_approve_listing(_product uuid,_facts_price_stock_confirmed boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare p public.products;
begin
  if not public.is_admin() then raise exception 'Administrators only' using errcode='42501'; end if;
  if not coalesce(_facts_price_stock_confirmed,false) then raise exception 'Confirm real product facts, price and stock'; end if;
  select * into p from public.products where id=_product for update;
  if not found or p.status<>'live' or not p.maker_verified or p.stock<1 or not exists(
    select 1 from public.makers where id=p.maker_id and published and (gst_registered or state is not null)
  ) then raise exception 'Reviewed live product with confirmed inventory required'; end if;
  if not exists(select 1 from public.product_reviews where product_id=p.id and decision='approved'
    and gate1_handmade and gate1_material and gate2_photos and gate2_price and gate2_story)
    or not exists(select 1 from public.product_images where product_id=p.id)
    then raise exception 'All five listing checks and photographs are required'; end if;
  insert into public.baksa_sales_approvals(product_id,snapshot,approved_by)
    values(p.id,public.baksa_sales_snapshot(p.id),auth.uid())
    on conflict(product_id) do update set snapshot=excluded.snapshot,approved_by=excluded.approved_by,approved_at=now();
  return p.id;
end $$;
revoke all on function public.baksa_sales_approve_listing(uuid,boolean) from public,anon;
grant execute on function public.baksa_sales_approve_listing(uuid,boolean) to authenticated;

create function public.baksa_sales_readiness() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object('schemaReady',true,
    'approvedProducts',(select count(*) from public.baksa_sales_approvals a
      where a.snapshot=public.baksa_sales_snapshot(a.product_id)),
    'shippingConfigured',shipping_fee_paise is not null,
    'reservationsEnabled',reservations_enabled)
  from public.baksa_sales_policy where id
$$;
revoke all on function public.baksa_sales_readiness() from public;
grant execute on function public.baksa_sales_readiness() to anon,authenticated;

create function public.baksa_sales_quote(_lines jsonb,_address uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a public.addresses; s public.baksa_sales_policy; p public.products; m public.makers;
  l record; items bigint:=0; ship bigint; result jsonb:='[]'::jsonb;
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()
    and (email_confirmed_at is not null or phone_confirmed_at is not null))
    then raise exception 'Verified account required' using errcode='42501'; end if;
  select * into a from public.addresses where id=_address and user_id=auth.uid();
  if not found then raise exception 'Choose your own saved delivery address' using errcode='42501'; end if;
  select * into s from public.baksa_sales_policy where id;
  if not found or s.shipping_fee_paise is null then raise exception 'Owner must confirm shipping settings' using errcode='55000'; end if;
  if _lines is null or jsonb_typeof(_lines)<>'array' then raise exception 'Invalid bag'; end if;
  if jsonb_array_length(_lines) not between 1 and 50 then raise exception 'Invalid bag'; end if;
  if exists(select 1 from jsonb_array_elements(_lines) x where
    jsonb_typeof(x)<>'object' or jsonb_typeof(x->'quantity') is distinct from 'number'
    or coalesce(x->>'quantity','') !~ '^[1-9][0-9]?$'
    or not (x ? 'productId') or (x-'productId'-'quantity')<>'{}'::jsonb)
    then raise exception 'Send product references and whole quantities only'; end if;
  for l in select (x->>'productId')::uuid id,sum((x->>'quantity')::integer)::integer qty
    from jsonb_array_elements(_lines) x group by 1 order by 1 loop
    if l.qty not between 1 and 50 then raise exception 'Maximum 50 of a product'; end if;
    select * into p from public.products where id=l.id;
    if not found then raise exception 'Product not available' using errcode='40001'; end if;
    select * into m from public.makers where id=p.maker_id;
    if p.status<>'live' or not m.published or not p.maker_verified or not exists(
      select 1 from public.baksa_sales_approvals ap where ap.product_id=p.id
        and ap.snapshot=public.baksa_sales_snapshot(p.id)
    ) then raise exception 'Product facts and price are not approved for sales' using errcode='40001'; end if;
    -- For launch, finite confirmed stock is also the made-to-order capacity.
    if p.stock<l.qty then raise exception 'Insufficient confirmed stock' using errcode='40001'; end if;
    if not m.gst_registered and (m.state is null or m.state<>a.state)
      then raise exception 'Delivery state is not eligible' using errcode='40001'; end if;
    items:=items+p.price_paise::bigint*l.qty;
    result:=result||jsonb_build_array(jsonb_build_object('productId',p.id,'makerId',m.id,'name',p.name,
      'quantity',l.qty,'unitPricePaise',p.price_paise,'amountPaise',p.price_paise::bigint*l.qty));
  end loop;
  ship:=case when items>=s.free_shipping_over_paise then 0 else s.shipping_fee_paise end;
  if items+ship>1000000000 then raise exception 'Order exceeds launch limit'; end if;
  return jsonb_build_object('lines',result,'itemsPaise',items,'shippingPaise',ship,'totalPaise',items+ship);
end $$;
revoke all on function public.baksa_sales_quote(jsonb,uuid) from public,anon;
grant execute on function public.baksa_sales_quote(jsonb,uuid) to authenticated;

-- Internal release helper. Shared advisory lock serializes reservations/releases.
-- A paid or refunded checkout is NEVER automatically restocked.
create function public.baksa_sales_release(_checkout uuid) returns void
language plpgsql security definer set search_path=public as $$
declare r public.baksa_sales_reservations; l record; pay public.payment_status;
begin
  perform pg_advisory_xact_lock(824631);
  select * into r from public.baksa_sales_reservations where checkout_id=_checkout for update;
  if not found or r.inventory_state='released' then return; end if;
  select payment_status into pay from public.checkouts where id=_checkout for update;
  if pay not in ('pending','failed') then raise exception 'Paid inventory requires payment reconciliation' using errcode='40001'; end if;
  perform set_config('baksa.trusted_call','on',true);
  for l in select product_id,qty from public.orders where checkout_id=_checkout order by product_id loop
    update public.products set stock=stock+l.qty where id=l.product_id;
  end loop;
  update public.baksa_sales_reservations set inventory_state='released' where checkout_id=_checkout;
  update public.checkouts set payment_status='failed' where id=_checkout;
end $$;
revoke all on function public.baksa_sales_release(uuid) from public,anon,authenticated;

create function public.baksa_sales_cancel(_checkout uuid) returns uuid
language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.baksa_sales_reservations
    where checkout_id=_checkout and (user_id=auth.uid() or public.is_admin()))
    then raise exception 'Checkout unavailable' using errcode='42501'; end if;
  perform public.baksa_sales_release(_checkout); return _checkout;
end $$;
revoke all on function public.baksa_sales_cancel(uuid) from public,anon;
grant execute on function public.baksa_sales_cancel(uuid) to authenticated;

create function public.baksa_sales_reserve(_lines jsonb,_address uuid,_key uuid,_gift_note text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare previous public.baksa_sales_reservations; q jsonb; payload jsonb; a public.addresses;
  cid uuid; l record; p public.products; m public.makers; financial jsonb; expired record;
begin
  if auth.uid() is null or _key is null then raise exception 'Verified identity and request key required' using errcode='42501'; end if;
  if not coalesce((select reservations_enabled from public.baksa_sales_policy where id),false)
    then raise exception 'Development reservations are disabled' using errcode='55000'; end if;
  if length(coalesce(_gift_note,''))>1000 then raise exception 'Gift note is too long'; end if;
  perform pg_advisory_xact_lock(824631);
  payload:=jsonb_build_object('lines',_lines,'addressId',_address,'giftNote',coalesce(_gift_note,''));
  select * into previous from public.baksa_sales_reservations where user_id=auth.uid() and idempotency_key=_key;
  if found then
    if previous.request<>payload then raise exception 'Request key already used for different contents' using errcode='40001'; end if;
    if previous.inventory_state='reserved' and previous.expires_at<=now()
      and (select payment_status from public.checkouts where id=previous.checkout_id) in ('pending','failed') then
      perform public.baksa_sales_release(previous.checkout_id);
      previous.inventory_state:='released';
    end if;
    return jsonb_build_object('checkoutId',previous.checkout_id,'state',previous.inventory_state,
      'expiresAt',previous.expires_at,'paymentStatus',(select payment_status from public.checkouts where id=previous.checkout_id));
  end if;
  for expired in select r.checkout_id from public.baksa_sales_reservations r
    join public.checkouts c on c.id=r.checkout_id where r.inventory_state='reserved'
      and r.expires_at<=now() and c.payment_status in ('pending','failed') order by r.checkout_id loop
    perform public.baksa_sales_release(expired.checkout_id);
  end loop;
  if exists(select 1 from public.baksa_sales_reservations r join public.checkouts c on c.id=r.checkout_id
    where r.user_id=auth.uid() and r.inventory_state='reserved' and c.payment_status='pending')
    then raise exception 'Finish or cancel your previous checkout first' using errcode='40001'; end if;
  -- Lock before calculating: competing requests re-read stock after the lock.
  perform locked_product.id from public.products locked_product where locked_product.id in (
    select (x->>'productId')::uuid from jsonb_array_elements(_lines) x
  ) order by locked_product.id for update;
  perform locked_maker.id from public.makers locked_maker where locked_maker.id in (
    select maker_id from public.products where id in (select (x->>'productId')::uuid from jsonb_array_elements(_lines) x)
  ) order by locked_maker.id for share;
  perform 1 from public.addresses where id=_address and user_id=auth.uid() for share;
  q:=public.baksa_sales_quote(_lines,_address);
  select * into a from public.addresses where id=_address and user_id=auth.uid();
  select to_jsonb(s) into financial from public.settings s where id;
  if financial is null then raise exception 'Financial settings are missing'; end if;
  insert into public.checkouts(user_id,address_id,items_paise,shipping_paise,total_paise,payment_method,gift_note)
    values(auth.uid(),a.id,(q->>'itemsPaise')::integer,(q->>'shippingPaise')::integer,
      (q->>'totalPaise')::integer,'card',nullif(_gift_note,'')) returning id into cid;
  insert into public.baksa_sales_reservations(checkout_id,user_id,idempotency_key,request,address_snapshot,financial_snapshot)
    values(cid,auth.uid(),_key,payload,to_jsonb(a),financial);
  perform set_config('baksa.trusted_call','on',true);
  for l in select * from jsonb_to_recordset(q->'lines') as x("productId" uuid,"quantity" integer) loop
    select * into p from public.products where id=l."productId";
    select * into m from public.makers where id=p.maker_id;
    update public.products set stock=stock-l.quantity where id=p.id;
    insert into public.orders(checkout_id,buyer_id,maker_id,product_id,qty,unit_price_paise,amount_paise,gst_pct,maker_gst_registered,ship_state)
      values(cid,auth.uid(),p.maker_id,p.id,l.quantity,p.price_paise,p.price_paise*l.quantity,
        case when m.gst_registered then p.gst_pct else 0 end,m.gst_registered,a.state);
  end loop;
  return jsonb_build_object('checkoutId',cid,'state','reserved','expiresAt',now()+interval '15 minutes','paymentStatus','pending');
end $$;
revoke all on function public.baksa_sales_reserve(jsonb,uuid,uuid,text) from public,anon;
grant execute on function public.baksa_sales_reserve(jsonb,uuid,uuid,text) to authenticated;

-- No payment confirmation or refund RPC is introduced. The provider integration
-- must verify signed notifications, bind amount/currency/provider order, enforce
-- inventory reservation state, and reconcile late/duplicate events before enabling it.
create or replace function public.baksa_order_feed() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',o.id,'ref',o.order_no,'status',o.status,'paymentStatus',c.payment_status,
    'totalPaise',o.amount_paise,'createdAt',o.created_at,'trackingNumber',coalesce(o.tracking_no,''),
    'carrier',coalesce(o.courier,''),'giftNote',coalesce(c.gift_note,''),'productName',p.name,'quantity',o.qty,
    'deliveryName',coalesce(r.address_snapshot->>'full_name',a.full_name,''),
    'deliveryAddress',concat_ws(', ',coalesce(r.address_snapshot->>'house',a.house),
      coalesce(r.address_snapshot->>'road',a.road),coalesce(r.address_snapshot->>'city',a.city),
      coalesce(r.address_snapshot->>'state',a.state),coalesce(r.address_snapshot->>'pincode',a.pincode)),
    'deliveryPhone',coalesce(r.address_snapshot->>'phone',a.phone,''),'issueNote',coalesce(o.issue_note,'')
  ) order by o.created_at desc)
  from (select * from public.orders where buyer_id=auth.uid() or public.owns_maker(maker_id) or public.is_admin()
    order by created_at desc limit 100) o
  join public.checkouts c on c.id=o.checkout_id join public.products p on p.id=o.product_id
  left join public.addresses a on a.id=c.address_id
  left join public.baksa_sales_reservations r on r.checkout_id=c.id),'[]'::jsonb);
end $$;
revoke all on function public.baksa_order_feed() from public,anon;
grant execute on function public.baksa_order_feed() to authenticated;

-- Replace the existing transaction to enforce note requirements at the SQL
-- boundary too. Delivered is a deliberate operator action, never a payout.
create or replace function public.baksa_fulfil_order(_order uuid,_status text,_tracking text,_carrier text,_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare o public.orders; pay public.payment_status; allowed boolean;
begin
  select * into o from public.orders where id=_order for update;
  if not found or not (public.is_admin() or public.owns_maker(o.maker_id))
    then raise exception 'Order unavailable' using errcode='42501'; end if;
  select payment_status into pay from public.checkouts where id=o.checkout_id;
  if pay not in ('paid','cod_pending') then raise exception 'Payment is not confirmed' using errcode='40001'; end if;
  if length(coalesce(_note,''))>1000 or length(coalesce(_tracking,''))>120 or length(coalesce(_carrier,''))>100
    then raise exception 'Details are too long'; end if;
  allowed:=(_status='packed' and o.status in ('new','delayed'))
    or (_status='dispatched' and o.status='packed')
    or (_status='delivered' and o.status='dispatched' and public.is_admin())
    or (_status='delayed' and o.status in ('new','packed'))
    or (_status='problem' and o.status in ('new','packed','dispatched','delayed'));
  if not coalesce(allowed,false) then raise exception 'Invalid order transition' using errcode='40001'; end if;
  if _status='dispatched' and (length(trim(coalesce(_tracking,'')))=0 or length(trim(coalesce(_carrier,'')))=0)
    then raise exception 'Carrier and tracking number are required'; end if;
  if _status in ('delayed','problem') and length(trim(coalesce(_note,'')))=0
    then raise exception 'Explain the delay or problem'; end if;
  update public.orders set status=_status::public.order_status,
    tracking_no=case when _status='dispatched' then trim(_tracking) else tracking_no end,
    courier=case when _status='dispatched' then trim(_carrier) else courier end,
    issue_note=case when _status in ('problem','delayed') then trim(_note) else issue_note end,
    delivered_on=case when _status='delivered' then (now() at time zone 'Asia/Kolkata')::date else delivered_on end
    where id=_order;
  insert into public.order_events(order_id,status,note,actor)
    values(_order,_status::public.order_status,nullif(trim(_note),''),auth.uid());
  return _order;
end $$;
revoke all on function public.baksa_fulfil_order(uuid,text,text,text,text) from public,anon;
grant execute on function public.baksa_fulfil_order(uuid,text,text,text,text) to authenticated;
commit;
