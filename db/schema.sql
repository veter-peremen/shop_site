-- SONKEI e-commerce schema (PostgreSQL / Neon)
-- Raw SQL only, no ORM. Run via `npm run db:migrate`.

create extension if not exists "pgcrypto";

-- ===================== Catalog =====================

create table if not exists products (
  id text primary key,
  slug text unique not null,
  sku text,
  wb_id text,
  barcode text,
  brand text,
  category text not null,
  line text not null,
  stage integer,
  size text not null,
  weight_range text,
  count integer not null default 1,
  name_ru text not null,
  name_en text not null,
  short_ru text,
  short_en text,
  description_ru text,
  description_en text,
  color text,
  images text[] not null default '{}',
  video text,
  price integer not null,
  old_price integer,
  bonus_points integer not null default 0,
  rating numeric(3,2) not null default 0,
  reviews_count integer not null default 0,
  stock integer not null default 0,
  dimensions jsonb not null default '{}'::jsonb,
  specs jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products (category);
create index if not exists idx_products_line on products (line);
create index if not exists idx_products_size on products (size);
create index if not exists idx_products_is_active on products (is_active);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  delta integer not null,
  reason text not null,
  comment text,
  created_at timestamptz not null default now()
);

-- ===================== Users =====================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,
  phone text,
  name text,
  role text not null default 'customer', -- customer | admin | manager | content | support
  email_verified_at timestamptz,
  email_notifications_enabled boolean not null default true,
  telegram_notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users add column if not exists email_notifications_enabled boolean not null default true;
alter table users add column if not exists telegram_notifications_enabled boolean not null default true;

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_sessions_user_id on sessions (user_id);

create table if not exists user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  city text,
  address text,
  pickup_point_code text,
  comment text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===================== Cart =====================

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id text not null references products(id),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_carts_user_id on carts (user_id) where user_id is not null;
create unique index if not exists idx_carts_session_id on carts (session_id) where session_id is not null;
create unique index if not exists idx_cart_items_cart_product on cart_items (cart_id, product_id);

-- ===================== Wishlist =====================

create table if not exists wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  session_id text,
  product_id text not null references products(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_wishlist_user_product on wishlist_items (user_id, product_id) where user_id is not null;
create unique index if not exists idx_wishlist_session_product on wishlist_items (session_id, product_id) where session_id is not null;

-- ===================== Orders =====================

create sequence if not exists order_number_seq start 1000;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  user_id uuid references users(id) on delete set null,
  status text not null default 'draft',
  customer_name text,
  customer_phone text,
  customer_email text,
  comment text,
  admin_comment text,
  city text,
  delivery_method text,
  delivery_address text,
  delivery_pickup_point text,
  delivery_price integer not null default 0,
  subtotal integer not null default 0,
  discount integer not null default 0,
  bonus_spent integer not null default 0,
  bonus_earned integer not null default 0,
  total integer not null default 0,
  promo_code text,
  payment_status text not null default 'unpaid',
  delivery_status text,
  tracking_number text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders add column if not exists paid_at timestamptz;

create index if not exists idx_orders_user_id on orders (user_id);
create index if not exists idx_orders_status on orders (status);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text references products(id),
  sku text,
  name_ru text not null,
  name_en text,
  price integer not null,
  quantity integer not null check (quantity > 0),
  bonus_points integer not null default 0,
  created_at timestamptz not null default now()
);

alter table inventory_movements add column if not exists order_id uuid references orders(id) on delete set null;
create index if not exists idx_inventory_movements_order_id on inventory_movements (order_id);

-- ===================== Payments =====================

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  status text not null default 'pending',
  amount integer not null,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ===================== Delivery =====================

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null default 'cdek',
  provider_shipment_id text,
  tracking_number text,
  status text not null default 'created',
  cost integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  status text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists delivery_pickup_points_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'cdek',
  city text not null,
  code text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique (provider, code)
);

-- ===================== Bonuses =====================

create table if not exists bonus_accounts (
  user_id uuid primary key references users(id) on delete cascade,
  balance_pending integer not null default 0,
  balance_active integer not null default 0,
  loyalty_level text not null default 'silk', -- silk | calm | sora
  updated_at timestamptz not null default now()
);

create table if not exists bonus_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  type text not null, -- accrual | activation | spend | refund | expire | manual
  amount integer not null,
  status text not null default 'pending', -- pending | active | spent | cancelled | expired
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  expires_at timestamptz,
  admin_comment text
);

-- ===================== Promo codes =====================

create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null, -- percent | fixed
  value integer not null,
  min_subtotal integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_limit_per_user integer,
  allowed_categories text[],
  allowed_products text[],
  combinable_with_bonuses boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists promo_code_usages (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references promo_codes(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ===================== Reviews / Audit / Settings =====================

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_reviews_product_user on reviews (product_id, user_id) where user_id is not null;

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ===================== Auth tokens =====================

create table if not exists password_reset_tokens (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_password_reset_tokens_user_id on password_reset_tokens (user_id);

create table if not exists email_verification_tokens (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_email_verification_tokens_user_id on email_verification_tokens (user_id);
