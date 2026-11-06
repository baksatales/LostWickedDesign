-- Integration test for the database rules. Run against a scratch database after the migrations:
--   psql -v ON_ERROR_STOP=1 -f tests/flows.sql
-- It plays an admin, a new maker and a buyer, and stops with an error if any rule misbehaves.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

insert into auth.users (id, email, phone) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'admin@example.com', null),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'maker@example.com', null),
  ('aaaaaaaa-0000-4000-8000-000000000003', null, '9876543210');
insert into user_roles values ('aaaaaaaa-0000-4000-8000-000000000001', 'admin'), ('aaaaaaaa-0000-4000-8000-000000000002', 'maker');
select set_config('baksa.trusted_call', 'on', false);
update makers set owner_user_id = 'aaaaaaaa-0000-4000-8000-000000000002' where brand = 'Mushhk';
select set_config('baksa.trusted_call', 'off', false);

-- 1. a new maker adds a product and submits it: it goes to review, not live
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
insert into products (id, maker_id, name, price_paise, stock, dispatch_days, maker_verified, feels, occasions)
  select 'bbbbbbbb-0000-4000-8000-000000000001', id, 'Test Mist', 95000, 5, 2, true, '{soother}', '{housewarming}' from makers where brand = 'Mushhk';
do $$ begin assert submit_product('bbbbbbbb-0000-4000-8000-000000000001') = 'review', 'new maker should go to review'; end $$;
-- the maker cannot publish it directly
do $$ begin
  begin update products set status = 'live' where id = 'bbbbbbbb-0000-4000-8000-000000000001';
        raise exception 'guard failed';
  exception when others then if sqlerrm = 'guard failed' then raise; end if; end;
end $$;
-- nor make themselves trusted
do $$ begin
  begin update makers set trusted = true where brand = 'Mushhk'; raise exception 'guard failed';
  exception when others then if sqlerrm = 'guard failed' then raise; end if; end;
end $$;

-- 2. the admin approves with all five checks; Mushhk reaches 2 of 3
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
do $$ begin
  begin perform review_product('bbbbbbbb-0000-4000-8000-000000000001', 'approved', '{"gate1_handmade":true}'); raise exception 'gates not enforced';
  exception when others then if sqlerrm = 'gates not enforced' then raise; end if; end;
end $$;
select review_product('bbbbbbbb-0000-4000-8000-000000000001', 'approved', '{"gate1_handmade":true,"gate1_material":true,"gate2_photos":true,"gate2_price":true,"gate2_story":true}');
do $$ begin
  assert (select status from products where id = 'bbbbbbbb-0000-4000-8000-000000000001') = 'live';
  assert (select approved_count from makers where brand = 'Mushhk') = 2;
  assert not (select trusted from makers where brand = 'Mushhk');
end $$;

-- 3. the buyer sees live products but not other makers' drafts
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
do $$ begin assert (select count(*) from products where status <> 'live') = 0, 'buyer saw a non-live product'; end $$;

-- 4. checkout: created by the edge function (service role), then confirmed; stock is taken once
reset role;
insert into addresses (id, user_id, full_name, phone, house, road, pincode, state)
  values ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'Test Buyer', '9876543210', 'A-12', 'Sector 9', '110010', 'Delhi');
insert into checkouts (id, user_id, address_id, items_paise, total_paise, payment_method)
  values ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'cccccccc-0000-4000-8000-000000000001', 190000, 202000, 'upi');
insert into orders (id, checkout_id, buyer_id, maker_id, product_id, qty, unit_price_paise, amount_paise, gst_pct, maker_gst_registered, ship_state)
  select 'eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', maker_id, id, 2, 95000, 190000, 18, true, 'Delhi'
  from products where id = 'bbbbbbbb-0000-4000-8000-000000000001';
select confirm_checkout('dddddddd-0000-4000-8000-000000000001', 'pay_test_1');
select confirm_checkout('dddddddd-0000-4000-8000-000000000001', 'pay_test_1'); -- webhook repeats: no double stock take
do $$ begin assert (select stock from products where id = 'bbbbbbbb-0000-4000-8000-000000000001') = 3, 'stock should be 5 - 2'; end $$;

-- 5. the maker moves the order along; dispatch needs tracking
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
select maker_update_order('eeeeeeee-0000-4000-8000-000000000001', 'packed');
do $$ begin
  begin perform maker_update_order('eeeeeeee-0000-4000-8000-000000000001', 'dispatched'); raise exception 'tracking not enforced';
  exception when others then if sqlerrm = 'tracking not enforced' then raise; end if; end;
end $$;
select maker_update_order('eeeeeeee-0000-4000-8000-000000000001', 'dispatched', 'Delhivery', 'DL123');
select maker_update_order('eeeeeeee-0000-4000-8000-000000000001', 'delivered');

-- 6. payout: due only after the return window; the admin settles it
reset role;
update orders set delivered_on = current_date - 10 where id = 'eeeeeeee-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select settle_maker((select id from makers where brand = 'Mushhk'), payout_date_for(current_date - 10));
do $$ begin
  assert (select settled from orders where id = 'eeeeeeee-0000-4000-8000-000000000001');
  assert (select payout_paise from settlements limit 1) = (select payout from split_sale(190000, 18, true));
end $$;

-- 7. the buyer sees only their own orders; another buyer sees none
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', false);
do $$ begin assert (select count(*) from orders) = 1; end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', false);
do $$ begin assert (select count(*) from addresses) = 0, 'maker saw a buyer address'; end $$;
reset role;
select 'ALL DATABASE FLOW TESTS PASSED' as result;

-- 8. onboarding: approve an application; the applicant's first sign-in links them to the new shop
insert into vendor_applications (id, brand, contact_name, phone, craft, city, state, gst_registered)
  values ('ffffffff-0000-4000-8000-000000000001', 'Clay Story', 'Asha', '98111 22233', 'Pottery', 'Jaipur', 'Rajasthan', false);
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', false);
select approve_application('ffffffff-0000-4000-8000-000000000001');
reset role;
insert into auth.users (id, phone) values ('aaaaaaaa-0000-4000-8000-000000000009', '919811122233');
do $$ begin
  assert (select owner_user_id from makers where brand = 'Clay Story') = 'aaaaaaaa-0000-4000-8000-000000000009', 'applicant not linked';
  assert has_role('aaaaaaaa-0000-4000-8000-000000000009', 'maker'), 'maker role not granted';
  assert not (select gst_registered from makers where brand = 'Clay Story');
end $$;
select 'ONBOARDING TEST PASSED' as result;
