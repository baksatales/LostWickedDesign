-- Baksa Tales 2.0: who can see and change what.
-- Buyers see only their own data. Makers see only their own shop. Admins see everything.
-- Anything that moves money or changes approval status goes through the functions in 003_logic.sql.

-- ---------- role helpers ----------
create or replace function has_role(_uid uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = _uid and role = _role)
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select has_role(auth.uid(), 'admin')
$$;

create or replace function owns_maker(_maker uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from makers where id = _maker and owner_user_id = auth.uid())
$$;

-- every new sign-up gets a profile and the buyer role
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, phone, email, full_name)
  values (new.id, new.phone, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  insert into user_roles (user_id, role) values (new.id, 'buyer') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- enable RLS everywhere ----------
alter table settings enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table addresses enable row level security;
alter table makers enable row level security;
alter table vendor_applications enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_costs enable row level security;
alter table product_reviews enable row level security;
alter table wishlists enable row level security;
alter table courses enable row level security;
alter table course_enrolments enable row level security;
alter table course_proposals enable row level security;
alter table checkouts enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table settlements enable row level security;
alter table corporate_enquiries enable row level security;
alter table opportunities enable row level security;
alter table notifications enable row level security;
alter table analytics_events enable row level security;

-- ---------- policies ----------
create policy "settings readable" on settings for select using (true);
create policy "settings admin" on settings for update using (is_admin());

create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile" on profiles for update using (id = auth.uid());

create policy "see own roles" on user_roles for select using (user_id = auth.uid() or is_admin());
create policy "admin manages roles" on user_roles for all using (is_admin()) with check (is_admin());

create policy "own addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin reads addresses" on addresses for select using (is_admin());

create policy "public makers" on makers for select using (published or owns_maker(id) or is_admin());
create policy "maker edits own shop" on makers for update using (owns_maker(id)) with check (owns_maker(id));
create policy "admin manages makers" on makers for all using (is_admin()) with check (is_admin());

create policy "anyone can apply" on vendor_applications for insert with check (status = 'pending');
create policy "admin reviews applications" on vendor_applications for all using (is_admin()) with check (is_admin());

create policy "live products are public" on products for select
  using ((status = 'live' and exists (select 1 from makers m where m.id = maker_id and m.published)) or owns_maker(maker_id) or is_admin());
create policy "maker adds products" on products for insert with check (owns_maker(maker_id) and status = 'draft');
create policy "maker edits own products" on products for update using (owns_maker(maker_id)) with check (owns_maker(maker_id));
create policy "admin manages products" on products for all using (is_admin()) with check (is_admin());

create policy "images follow product" on product_images for select
  using (exists (select 1 from products p where p.id = product_id));
create policy "maker manages images" on product_images for all
  using (exists (select 1 from products p where p.id = product_id and owns_maker(p.maker_id)))
  with check (exists (select 1 from products p where p.id = product_id and owns_maker(p.maker_id)));
create policy "admin manages images" on product_images for all using (is_admin()) with check (is_admin());

create policy "costs are private to the maker" on product_costs for all
  using (exists (select 1 from products p where p.id = product_id and owns_maker(p.maker_id)))
  with check (exists (select 1 from products p where p.id = product_id and owns_maker(p.maker_id)));

create policy "maker sees reviews of own products" on product_reviews for select
  using (is_admin() or exists (select 1 from products p where p.id = product_id and owns_maker(p.maker_id)));

create policy "own wishlist" on wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "published courses are public" on courses for select using (published or is_admin() or (maker_id is not null and owns_maker(maker_id)));
create policy "admin manages courses" on courses for all using (is_admin()) with check (is_admin());

create policy "learner sees own enrolments" on course_enrolments for select
  using (user_id = auth.uid() or is_admin() or exists (select 1 from courses c where c.id = course_id and c.maker_id is not null and owns_maker(c.maker_id)));
create policy "admin manages enrolments" on course_enrolments for all using (is_admin()) with check (is_admin());

create policy "maker proposes" on course_proposals for insert with check (owns_maker(maker_id) and status = 'review');
create policy "maker sees own proposals" on course_proposals for select using (owns_maker(maker_id) or is_admin());
create policy "admin decides proposals" on course_proposals for update using (is_admin());

create policy "buyer sees own checkouts" on checkouts for select using (user_id = auth.uid() or is_admin());
-- checkouts are created only by the create-checkout edge function (service role)

create policy "buyer, maker or admin sees an order" on orders for select
  using (buyer_id = auth.uid() or owns_maker(maker_id) or is_admin());
-- order status changes go through maker_update_order() / admin_update_order()

create policy "order history follows order" on order_events for select
  using (exists (select 1 from orders o where o.id = order_id and (o.buyer_id = auth.uid() or owns_maker(o.maker_id) or is_admin())));

create policy "maker sees own payouts" on settlements for select using (owns_maker(maker_id) or is_admin());

create policy "anyone can send a brief" on corporate_enquiries for insert with check (stage = 'new' and quote_total_paise is null);
create policy "admin manages briefs" on corporate_enquiries for all using (is_admin()) with check (is_admin());

create policy "maker sees own opportunities" on opportunities for select using (owns_maker(maker_id) or is_admin());
create policy "admin manages opportunities" on opportunities for all using (is_admin()) with check (is_admin());

create policy "own notifications" on notifications for select using (user_id = auth.uid() or (maker_id is not null and owns_maker(maker_id)) or is_admin());
create policy "mark own notifications read" on notifications for update using (user_id = auth.uid() or (maker_id is not null and owns_maker(maker_id)));

create policy "consented events can be written" on analytics_events for insert with check (true);
create policy "admin reads events" on analytics_events for select using (is_admin());

-- ---------- protected columns ----------
-- Makers may edit their products and shop, but never approval, trust, GST status or money fields directly.
create or replace function guard_maker_columns() returns trigger
language plpgsql as $$
begin
  if is_admin() or current_setting('baksa.trusted_call', true) = 'on' then return new; end if;
  if tg_table_name = 'products' then
    if new.status is distinct from old.status or new.spot_check is distinct from old.spot_check
       or new.review_note is distinct from old.review_note or new.review_reason is distinct from old.review_reason
       or new.in_bt_edit is distinct from old.in_bt_edit or new.published_at is distinct from old.published_at then
      raise exception 'Use submit_product() to change a listing''s status';
    end if;
    -- editing the story or photos of a live product sends it back for review if the maker isn't trusted
    if old.status = 'live' and (new.story is distinct from old.story or new.name is distinct from old.name)
       and not exists (select 1 from makers m where m.id = new.maker_id and m.trusted) then
      new.status := 'review'; new.review_reason := 'Edited after going live';
    end if;
  elsif tg_table_name = 'makers' then
    if new.trusted is distinct from old.trusted or new.approved_count is distinct from old.approved_count
       or new.published is distinct from old.published or new.gst_registered is distinct from old.gst_registered
       or new.gstin is distinct from old.gstin or new.state is distinct from old.state or new.owner_user_id is distinct from old.owner_user_id then
      raise exception 'Only Baksa can change trust, GST or state details';
    end if;
  end if;
  return new;
end $$;
create trigger products_guard before update on products for each row execute function guard_maker_columns();
create trigger makers_guard before update on makers for each row execute function guard_maker_columns();
