-- Baksa Tales 2.0: server-side rules. These mirror src/lib/domain.ts exactly.
-- The frontend calls these with supabase.rpc('function_name', {...}).

-- ---------- money ----------
create or replace function split_sale(_gross integer, _gst numeric, _registered boolean)
returns table (gross integer, gst integer, taxable integer, commission integer, commission_gst integer, tcs integer, fee integer, deductions integer, payout integer)
language plpgsql stable as $$
declare s settings; g numeric; t integer; c integer; cg integer; x integer; f integer;
begin
  select * into s from settings limit 1;
  g := case when _registered then _gst else 0 end;
  t := round(_gross * 100.0 / (100 + g));
  c := round(t * s.commission_pct / 100.0);
  cg := round(c * s.commission_gst_pct / 100.0);
  x := case when _registered then round(t * s.tcs_pct / 100.0) else 0 end;
  f := round(_gross * s.payment_fee_pct / 100.0);
  return query select _gross, _gross - t, t, c, cg, x, f, c + cg + x + f, _gross - (c + cg + x + f);
end $$;

-- first payout weekday after the return window has closed, and after today
create or replace function payout_date_for(_delivered date, _today date default current_date)
returns date language plpgsql stable as $$
declare s settings; d date;
begin
  select * into s from settings limit 1;
  d := _delivered + s.return_window_days;
  if d <= _today then d := _today + 1; end if;
  while extract(dow from d) <> s.payout_weekday loop d := d + 1; end loop;
  return d;
end $$;

-- upcoming payouts for the maker dashboard
create or replace function upcoming_payouts(_maker uuid)
returns table (run_date date, order_count integer, payout_paise integer)
language sql stable security definer set search_path = public as $$
  select payout_date_for(o.delivered_on), count(*)::int, sum(x.payout)::int
  from orders o cross join lateral split_sale(o.amount_paise, o.gst_pct, o.maker_gst_registered) x
  where o.maker_id = _maker and o.status = 'delivered' and not o.settled and o.delivered_on is not null
    and (owns_maker(_maker) or is_admin())
  group by 1 order by 1
$$;

-- ---------- listing approval ----------
create or replace function submit_product(_product uuid)
returns product_status language plpgsql security definer set search_path = public as $$
declare p products; m makers; s settings; top integer; st product_status; why text; spot boolean := false;
begin
  select * into p from products where id = _product for update;
  if not found or not owns_maker(p.maker_id) then raise exception 'Not your product'; end if;
  if not p.maker_verified then raise exception 'Please confirm the description is true before sending'; end if;
  select * into m from makers where id = p.maker_id;
  select * into s from settings limit 1;
  select coalesce(max(price_paise), 0) into top from products where maker_id = p.maker_id and status = 'live' and id <> p.id;
  if p.status = 'changes' then st := 'review'; why := 'Sent again after changes were requested';
  elsif not m.trusted then st := 'review'; why := format('New maker: listing %s of the first %s reviewed', m.approved_count + 1, s.review_first_n);
  elsif top > 0 and p.price_paise > top * 2 then st := 'review'; why := 'Price is more than double this maker''s highest live price';
  else st := 'live'; spot := true; end if;
  perform set_config('baksa.trusted_call', 'on', true);
  update products set status = st, review_reason = why, spot_check = spot, submitted_at = now(),
    published_at = case when st = 'live' then now() else published_at end, updated_at = now()
  where id = _product;
  insert into notifications (maker_id, text) values (p.maker_id,
    case when st = 'live' then format('“%s” is live on Baksa Tales.', p.name) else format('“%s” was sent to Baksa for review.', p.name) end);
  return st;
end $$;

-- admin decisions: 'approved' | 'changes' | 'spot_ok' | 'taken_down'
create or replace function review_product(_product uuid, _decision text, _gates jsonb default '{}', _note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p products; m makers; s settings;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into p from products where id = _product for update;
  select * into m from makers where id = p.maker_id for update;
  select * into s from settings limit 1;
  perform set_config('baksa.trusted_call', 'on', true);
  if _decision = 'approved' then
    if not p.maker_verified then raise exception 'The maker has not confirmed the facts'; end if;
    if not coalesce((_gates->>'gate1_handmade')::boolean and (_gates->>'gate1_material')::boolean and (_gates->>'gate2_photos')::boolean
                    and (_gates->>'gate2_price')::boolean and (_gates->>'gate2_story')::boolean, false) then
      raise exception 'All five BT Verified checks must pass';
    end if;
    update products set status = 'live', review_note = null, review_reason = null, published_at = now() where id = _product;
    update makers set approved_count = approved_count + 1,
      trusted = trusted or approved_count + 1 >= s.review_first_n where id = m.id;
    insert into notifications (maker_id, text) values (m.id, format('“%s” is live on Baksa Tales.', p.name));
  elsif _decision in ('changes', 'taken_down') then
    if coalesce(trim(_note), '') = '' then raise exception 'Write a note so the maker knows what to change'; end if;
    update products set status = 'changes', review_note = _note, spot_check = false where id = _product;
    insert into notifications (maker_id, text) values (m.id, format('Baksa asked for changes on “%s”.', p.name));
  elsif _decision = 'spot_ok' then
    update products set spot_check = false where id = _product;
  else raise exception 'Unknown decision %', _decision; end if;
  insert into product_reviews (product_id, reviewer, decision, gate1_handmade, gate1_material, gate2_photos, gate2_price, gate2_story, note)
  values (_product, auth.uid(), _decision, (_gates->>'gate1_handmade')::boolean, (_gates->>'gate1_material')::boolean,
          (_gates->>'gate2_photos')::boolean, (_gates->>'gate2_price')::boolean, (_gates->>'gate2_story')::boolean, _note);
end $$;

-- ---------- orders ----------
-- Makers move their own orders forward. Allowed: new→packed, packed|delayed→dispatched (needs tracking),
-- dispatched→delivered, and any open order → problem (needs a note).
create or replace function maker_update_order(_order uuid, _to order_status, _courier text default null, _tracking text default null, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = _order for update;
  if not found or not owns_maker(o.maker_id) then raise exception 'Not your order'; end if;
  if not ((o.status = 'new' and _to = 'packed')
       or (o.status in ('packed', 'delayed') and _to = 'dispatched')
       or (o.status = 'dispatched' and _to = 'delivered')
       or (o.status in ('new', 'packed', 'dispatched', 'delayed') and _to = 'problem')) then
    raise exception 'Can''t move an order from % to %', o.status, _to;
  end if;
  if _to = 'dispatched' and coalesce(trim(_tracking), '') = '' then raise exception 'Add the tracking number'; end if;
  if _to = 'problem' and coalesce(trim(_note), '') = '' then raise exception 'Describe the problem'; end if;
  update orders set status = _to,
    courier = coalesce(_courier, courier), tracking_no = coalesce(_tracking, tracking_no),
    issue_note = case when _to = 'problem' then _note else issue_note end,
    delivered_on = case when _to = 'delivered' then current_date else delivered_on end
  where id = _order;
  insert into order_events (order_id, status, note, actor) values (_order, _to, _note, auth.uid());
  insert into notifications (user_id, text, link) values (o.buyer_id,
    case _to when 'packed' then 'Your order has been packed by the maker.'
             when 'dispatched' then 'Your order is on the way.'
             when 'delivered' then 'Your order has been delivered.'
             else 'There’s an update on your order.' end, '/orders');
end $$;

-- Admins can set any status. Delayed needs a note (shown to buyer and maker). Refunded excludes it from payouts.
create or replace function admin_update_order(_order uuid, _to order_status, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into o from orders where id = _order for update;
  if _to in ('delayed', 'problem', 'refunded') and coalesce(trim(_note), '') = '' then raise exception 'Add a note'; end if;
  if o.settled and _to = 'refunded' then raise exception 'Already paid out: recover it from the maker''s next payout instead'; end if;
  update orders set status = _to, issue_note = coalesce(_note, issue_note),
    delivered_on = case when _to = 'delivered' then coalesce(delivered_on, current_date) else delivered_on end
  where id = _order;
  insert into order_events (order_id, status, note, actor) values (_order, _to, _note, auth.uid());
  insert into notifications (maker_id, text) values (o.maker_id, format('Baksa updated order %s: %s', o.order_no, coalesce(_note, _to::text)));
  insert into notifications (user_id, text, link) values (o.buyer_id, coalesce(_note, 'There’s an update on your order.'), '/orders');
end $$;

-- Called ONLY by the create-checkout / payment-webhook edge functions (service role) once payment succeeds, or for COD.
-- Takes stock atomically. If anything is short, nothing is taken and the caller must refund.
create or replace function confirm_checkout(_checkout uuid, _provider_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c checkouts; o record;
begin
  select * into c from checkouts where id = _checkout for update;
  if c.payment_status in ('paid', 'cod_pending') then return; end if;   -- already confirmed (webhooks can repeat)
  for o in select ord.*, p.stock, p.made_to_order, p.name from orders ord join products p on p.id = ord.product_id
           where ord.checkout_id = _checkout for update of p loop
    if not o.made_to_order and o.stock < o.qty then
      raise exception 'Out of stock: %', o.name;
    end if;
  end loop;
  perform set_config('baksa.trusted_call', 'on', true);
  update products p set stock = p.stock - ord.qty
    from orders ord where ord.checkout_id = _checkout and ord.product_id = p.id and not p.made_to_order;
  update checkouts set payment_status = case when payment_method = 'cod' then 'cod_pending'::payment_status else 'paid'::payment_status end,
    provider_ref = coalesce(_provider_ref, provider_ref), paid_at = now() where id = _checkout;
  insert into notifications (maker_id, text)
    select ord.maker_id, format('New order %s for %s.', ord.order_no, p.name)
    from orders ord join products p on p.id = ord.product_id where ord.checkout_id = _checkout;
  -- recorded classes in the same checkout become enrolments
  update course_enrolments set status = 'paid' where checkout_id = _checkout;
end $$;

-- ---------- payouts ----------
-- Pays every delivered, unsettled order whose payout date is on or before _run_date.
create or replace function settle_maker(_maker uuid, _run_date date, _bank_ref text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; t record;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select coalesce(sum(x.gross), 0)::int g, coalesce(sum(x.taxable), 0)::int tx, coalesce(sum(x.commission), 0)::int c,
         coalesce(sum(x.commission_gst), 0)::int cg, coalesce(sum(x.tcs), 0)::int tcs, coalesce(sum(x.fee), 0)::int f,
         coalesce(sum(x.payout), 0)::int p, count(*) n
  into t
  from orders o cross join lateral split_sale(o.amount_paise, o.gst_pct, o.maker_gst_registered) x
  where o.maker_id = _maker and o.status = 'delivered' and not o.settled and o.delivered_on is not null
    and payout_date_for(o.delivered_on, _run_date - 1) <= _run_date;
  if t.n = 0 then raise exception 'Nothing is due for this maker on %', _run_date; end if;
  insert into settlements (maker_id, run_date, gross_paise, taxable_paise, commission_paise, commission_gst_paise, tcs_paise, fees_paise, payout_paise, bank_reference, paid_by)
  values (_maker, _run_date, t.g, t.tx, t.c, t.cg, t.tcs, t.f, t.p, _bank_ref, auth.uid()) returning id into sid;
  update orders set settled = true, settlement_id = sid
  where maker_id = _maker and status = 'delivered' and not settled and delivered_on is not null
    and payout_date_for(delivered_on, _run_date - 1) <= _run_date;
  insert into notifications (maker_id, text) values (_maker, format('Payout of ₹%s sent to your bank account.', to_char(t.p / 100.0, 'FM99,99,99,990')));
  return sid;
end $$;

-- ---------- B2B ----------
create or replace function send_enquiry_to_makers(_enquiry uuid, _makers uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare e corporate_enquiries; n integer;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into e from corporate_enquiries where id = _enquiry;
  insert into opportunities (maker_id, enquiry_id, kind, title, detail)
  select mid, e.id, 'corporate_brief',
         format('%s gifts: %s', e.quantity, lower(e.purpose)),
         format('About ₹%s per gift, needed by %s.%s', to_char(e.budget_per_gift_paise / 100.0, 'FM99,99,990'), to_char(e.needed_by, 'DD Mon YYYY'),
                case when array_length(e.customisation, 1) > 0 then ' ' || array_to_string(e.customisation, ', ') || '.' else '' end)
  from unnest(_makers) as mid
  on conflict (maker_id, enquiry_id) do nothing;
  get diagnostics n = row_count;
  insert into notifications (maker_id, text) select mid, 'A new business brief fits your work. See Opportunities.' from unnest(_makers) mid;
  update corporate_enquiries set stage = 'contacted' where id = _enquiry and stage = 'new';
  return n;
end $$;

create or replace function respond_opportunity(_opp uuid, _answer opportunity_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if _answer = 'open' then raise exception 'Answer yes or no'; end if;
  update opportunities set status = _answer where id = _opp and owns_maker(maker_id);
  if not found then raise exception 'Not your opportunity'; end if;
end $$;

-- ---------- academy ----------
create or replace function approve_proposal(_proposal uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare p course_proposals; m makers; cid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into p from course_proposals where id = _proposal for update;
  select * into m from makers where id = p.maker_id;
  insert into courses (title, creator_label, maker_id, format, price_paise, seats, schedule_text, description, tagmango_url, published)
  values (p.title, m.brand, m.id, p.format, p.price_paise, case when p.format = 'live' then 20 end,
          case when p.format = 'live' then 'Dates to be confirmed' else 'Watch any time' end, p.description, p.tagmango_url, true)
  returning id into cid;
  update course_proposals set status = 'approved', course_id = cid where id = _proposal;
  insert into notifications (maker_id, text) values (m.id, format('Your class “%s” is listed in the Makers’ Academy.', p.title));
  return cid;
end $$;

-- ---------- addresses: keep exactly one default ----------
create or replace function one_default_address() returns trigger language plpgsql as $$
begin
  if new.is_default then
    update addresses set is_default = false where user_id = new.user_id and id <> new.id and is_default;
  elsif not exists (select 1 from addresses where user_id = new.user_id and is_default and id <> new.id) then
    new.is_default := true;
  end if;
  return new;
end $$;
create trigger addresses_default before insert or update on addresses for each row execute function one_default_address();

-- ---------- let signed-in users call the functions they need ----------
grant execute on function split_sale(integer, numeric, boolean), payout_date_for(date, date) to anon, authenticated;
grant execute on function upcoming_payouts(uuid), submit_product(uuid), review_product(uuid, text, jsonb, text),
  maker_update_order(uuid, order_status, text, text, text), admin_update_order(uuid, order_status, text),
  settle_maker(uuid, date, text), send_enquiry_to_makers(uuid, uuid[]), respond_opportunity(uuid, opportunity_status),
  approve_proposal(uuid) to authenticated;
revoke execute on function confirm_checkout(uuid, text) from public, anon, authenticated;
grant execute on function confirm_checkout(uuid, text) to service_role;

-- ---------- onboarding: approve an application and link it to the maker's login ----------
-- Matching is on the last 10 digits of the mobile number the applicant gave.
create or replace function approve_application(_app uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a vendor_applications; mid uuid; uid uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into a from vendor_applications where id = _app for update;
  if a.status = 'approved' and a.maker_id is not null then return a.maker_id; end if;
  select id into uid from auth.users where right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = right(regexp_replace(a.phone, '\D', '', 'g'), 10) limit 1;
  insert into makers (owner_user_id, brand, display_name, craft, city, state, instagram, gst_registered, gstin, published, trusted)
  values (uid, a.brand, a.contact_name, a.craft, a.city, a.state, a.link, a.gst_registered, nullif(upper(a.gstin), ''), false, false)
  returning id into mid;
  update vendor_applications set status = 'approved', maker_id = mid where id = _app;
  if uid is not null then insert into user_roles (user_id, role) values (uid, 'maker') on conflict do nothing; end if;
  return mid;
end $$;

-- when an approved applicant signs in for the first time, link them to their shop automatically
create or replace function link_new_user_to_maker() returns trigger
language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  if new.phone is null then return new; end if;
  select a.maker_id into mid from vendor_applications a join makers m on m.id = a.maker_id
  where a.status = 'approved' and m.owner_user_id is null
    and right(regexp_replace(a.phone, '\D', '', 'g'), 10) = right(regexp_replace(new.phone, '\D', '', 'g'), 10)
  limit 1;
  if mid is not null then
    perform set_config('baksa.trusted_call', 'on', true);
    update makers set owner_user_id = new.id where id = mid;
    insert into user_roles (user_id, role) values (new.id, 'maker') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_link_maker after insert on auth.users
  for each row execute function link_new_user_to_maker();

grant execute on function approve_application(uuid) to authenticated;
