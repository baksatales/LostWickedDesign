-- Baksa Tales 2.0: database schema (Supabase / PostgreSQL)
-- Money is stored in PAISE as integers. Dates are dates; timestamps are timestamptz.
-- Run in order: 001_schema.sql, 002_security.sql, 003_logic.sql, 004_seed.sql

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type app_role as enum ('buyer', 'maker', 'admin');
create type gift_feel as enum ('heart', 'showstopper', 'soother', 'thoughtful', 'explorer');
create type recipient as enum ('parent', 'partner', 'friend', 'colleague', 'self');
create type occasion as enum ('diwali', 'wedding', 'birthday', 'thanks', 'housewarming', 'justbecause');
create type product_status as enum ('draft', 'review', 'changes', 'live');
create type order_status as enum ('new', 'packed', 'dispatched', 'delivered', 'delayed', 'problem', 'refunded');
create type payment_method as enum ('upi', 'card', 'netbanking', 'cod');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'cod_pending');
create type course_format as enum ('recorded', 'live');
create type enrolment_source as enum ('baksa', 'tagmango');
create type application_status as enum ('pending', 'call', 'approved', 'declined');
create type proposal_status as enum ('review', 'approved', 'changes');
create type enquiry_stage as enum ('new', 'contacted', 'proposal', 'won', 'lost');
create type opportunity_status as enum ('open', 'yes', 'no');

-- ---------- settings (one row) ----------
create table settings (
  id boolean primary key default true check (id),
  commission_pct numeric(5,2) not null default 12,
  commission_gst_pct numeric(5,2) not null default 18,
  tcs_pct numeric(5,2) not null default 0.5,
  payment_fee_pct numeric(5,2) not null default 2,
  payout_weekday smallint not null default 3 check (payout_weekday between 0 and 6),
  return_window_days smallint not null default 7 check (return_window_days >= 0),
  transit_buffer_days smallint not null default 3,
  review_first_n smallint not null default 3,
  free_shipping_over_paise integer not null default 250000,
  shipping_fee_paise integer not null default 12000,
  academy_creator_share_pct numeric(5,2) not null default 70,
  updated_at timestamptz not null default now()
);

-- ---------- people ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  primary key (user_id, role)
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  house text not null,
  road text not null,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  city text,
  state text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index one_default_address on addresses(user_id) where is_default;

-- ---------- makers ----------
create table makers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  brand text not null,
  display_name text,
  craft text not null,
  city text,
  state text,
  tagline text,
  bio text,
  story text,
  techniques text[] not null default '{}',
  instagram text,
  hero_image_url text,
  olive_green boolean not null default false,       -- fauji-family entrepreneur tag
  gst_registered boolean not null default true,
  gstin text check (gstin is null or gstin ~ '^[0-9A-Z]{15}$'),
  trusted boolean not null default false,            -- trusted makers publish without review
  approved_count integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table vendor_applications (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  contact_name text not null,
  phone text not null,
  craft text not null,
  city text not null,
  state text not null,
  link text,
  gst_registered boolean not null,
  gstin text,
  photo_urls text[] not null default '{}',
  status application_status not null default 'pending',
  admin_note text,
  maker_id uuid references makers(id),               -- set when approved and onboarded
  created_at timestamptz not null default now()
);

-- ---------- catalogue ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  maker_id uuid not null references makers(id) on delete cascade,
  name text not null,
  slug text unique,
  price_paise integer not null check (price_paise > 0),   -- what customers pay, GST included
  gst_pct numeric(5,2) not null default 18 check (gst_pct >= 0),
  stock integer not null default 0 check (stock >= 0),
  made_to_order boolean not null default false,
  dispatch_days smallint not null default 3 check (dispatch_days between 1 and 60),
  material text,
  technique text,
  size text,
  story text,
  feels gift_feel[] not null default '{}',     -- internal merchandising signal; never shown as labels
  occasions occasion[] not null default '{}',
  recipients recipient[] not null default '{}',
  corporate_ok boolean not null default false,
  in_bt_edit boolean not null default false,  -- editorially chosen for the BT Edit
  status product_status not null default 'draft',
  review_reason text,
  review_note text,          -- note from Baksa when changes are requested
  maker_verified boolean not null default false,   -- maker confirmed the description's facts
  spot_check boolean not null default false,       -- published directly; Baksa should glance at it
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_live on products(status) where status = 'live';
create index products_maker on products(maker_id);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text,
  sort smallint not null default 0
);

-- the maker's private cost per piece: only the maker can see it
create table product_costs (
  product_id uuid primary key references products(id) on delete cascade,
  cost_paise integer not null check (cost_paise >= 0)
);

create table product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  reviewer uuid references auth.users(id),
  decision text not null check (decision in ('approved', 'changes', 'spot_ok', 'taken_down')),
  gate1_handmade boolean, gate1_material boolean,
  gate2_photos boolean, gate2_price boolean, gate2_story boolean,
  note text,
  created_at timestamptz not null default now()
);

create table wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- academy ----------
create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  creator_label text not null,                 -- e.g. "Baksa Tales team" or a maker's brand
  maker_id uuid references makers(id),         -- null for Baksa-run classes
  format course_format not null,
  price_paise integer not null check (price_paise >= 0),
  gst_pct numeric(5,2) not null default 18,
  seats integer,                               -- live workshops only
  schedule_text text,
  description text,
  video_url text,                              -- recorded: private storage path, never public
  tagmango_url text,                           -- live: booking page; never shown as a label to buyers
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table course_enrolments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id),
  user_id uuid references auth.users(id),
  learner_name text,
  amount_paise integer not null check (amount_paise >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
  source enrolment_source not null,
  checkout_id uuid,
  purchased_on date not null default current_date,
  external_ref text,                           -- TagMango row id, to avoid importing twice
  unique (source, external_ref)
);

create table course_proposals (
  id uuid primary key default gen_random_uuid(),
  maker_id uuid not null references makers(id) on delete cascade,
  title text not null,
  format course_format not null,
  length_text text not null,
  audience text not null,
  price_paise integer not null check (price_paise >= 0),
  tagmango_url text,
  description text not null,
  status proposal_status not null default 'review',
  admin_note text,
  course_id uuid references courses(id),
  created_at timestamptz not null default now()
);

-- ---------- checkout and orders ----------
create table checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  address_id uuid references addresses(id),
  items_paise integer not null,
  shipping_paise integer not null default 0,
  total_paise integer not null,
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  provider_ref text,                           -- payment gateway order or payment id
  gift_note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- one row per product line; each line belongs to exactly one maker
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null default ('BT-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  checkout_id uuid not null references checkouts(id) on delete cascade,
  buyer_id uuid not null references auth.users(id),
  maker_id uuid not null references makers(id),
  product_id uuid not null references products(id),
  qty integer not null check (qty > 0),
  unit_price_paise integer not null,
  amount_paise integer not null,
  gst_pct numeric(5,2) not null,               -- frozen at the time of sale
  maker_gst_registered boolean not null,       -- frozen at the time of sale
  ship_state text,
  status order_status not null default 'new',
  courier text,
  tracking_no text,
  issue_note text,
  delivered_on date,
  settled boolean not null default false,
  settlement_id uuid,
  created_at timestamptz not null default now()
);
create index orders_maker on orders(maker_id, status);
create index orders_buyer on orders(buyer_id);

create table order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  note text,
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  maker_id uuid not null references makers(id),
  run_date date not null,
  gross_paise integer not null,
  taxable_paise integer not null,
  commission_paise integer not null,
  commission_gst_paise integer not null,
  tcs_paise integer not null,
  fees_paise integer not null,
  payout_paise integer not null,
  bank_reference text,
  paid_at timestamptz not null default now(),
  paid_by uuid references auth.users(id)
);
alter table orders add constraint orders_settlement_fk foreign key (settlement_id) references settlements(id);

-- ---------- B2B ----------
create table corporate_enquiries (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null default ('BT-CG-' || substr(gen_random_uuid()::text, 1, 6)),
  purpose text not null,
  quantity integer not null check (quantity > 0),
  budget_per_gift_paise integer not null check (budget_per_gift_paise >= 0),
  needed_by date not null,
  contact_name text not null,
  company text not null,
  reach text not null,                         -- work email or WhatsApp number
  customisation text[] not null default '{}',
  delivery_cities text,
  reference_link text,
  attachment_paths text[] not null default '{}',
  message text,
  stage enquiry_stage not null default 'new',
  quote_total_paise integer,
  zoho_lead_id text,                           -- filled once the Zoho CRM sync exists
  created_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  maker_id uuid not null references makers(id) on delete cascade,
  enquiry_id uuid references corporate_enquiries(id) on delete cascade,
  kind text not null check (kind in ('corporate_brief', 'event', 'other')),
  title text not null,
  detail text not null,                        -- never includes the buyer's company name
  status opportunity_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (maker_id, enquiry_id)
);

-- ---------- notifications and analytics ----------
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  maker_id uuid references makers(id) on delete cascade,
  text text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  check (user_id is not null or maker_id is not null)
);

-- only written after the visitor agrees to analytics
create table analytics_events (
  id bigint generated always as identity primary key,
  session_id text not null,
  user_id uuid references auth.users(id),
  type text not null check (type in ('quiz_start', 'quiz_complete', 'quiz_skip', 'rec_click', 'rec_add', 'quiz_purchase', 'live_booking_click')),
  product_id uuid,
  course_id uuid,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
