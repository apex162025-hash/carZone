-- =============================================================================
-- Carzen · 08 · Mobile apps (customer app + employee app)
-- What the two mobile apps need beyond the web dashboards: favourites, the customer
-- inbox, per-employee notices, push devices, branch photos, the manager PIN that
-- authorises discounts above an employee's limit, and the shift's opening cash.
-- =============================================================================

-- pgcrypto (crypt / gen_salt for the manager PIN). Supabase installs it in "extensions".
create extension if not exists pgcrypto with schema extensions;

-- Customer's saved branches (heart on the branch card).
create table public.customer_favorites (
  customer_id  text not null references public.customers (id) on delete cascade,
  branch_id    text not null references public.branches (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (customer_id, branch_id)
);
create index customer_favorites_branch_idx on public.customer_favorites (branch_id);

-- Customer inbox (booking updates, reminders, "rate your visit", offers).
create table public.customer_notifications (
  id           text primary key default public.gen_id('cn'),
  customer_id  text not null references public.customers (id) on delete cascade,
  type         text not null check (type in (
                 'booking_confirmed', 'booking_cancelled', 'booking_reminder', 'order_ready',
                 'review_reminder', 'offer', 'complaint_update', 'system')),
  title        jsonb not null check (public.is_localized(title)),
  body         jsonb not null check (jsonb_typeof(body) = 'object'),
  href         text not null default '/',      -- in-app route, e.g. '/bookings/ord_…'
  order_id     text references public.orders (id) on delete set null,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index customer_notifications_inbox_idx on public.customer_notifications (customer_id, created_at desc);
create index customer_notifications_unread_idx on public.customer_notifications (customer_id) where not read;

-- Vendor notices can target one staff member (e.g. "your shift starts at 9:00").
-- staff_id null = everyone allowed to see the business/branch notice.
alter table public.vendor_notifications
  add column staff_id text references public.staff (id) on delete cascade;
create index vendor_notifications_staff_idx on public.vendor_notifications (staff_id, created_at desc) where staff_id is not null;

alter type public.vendor_notification_type add value if not exists 'shift';

-- Push notification devices (FCM / APNs tokens) for every signed-in app user.
create table public.push_devices (
  id            text primary key default public.gen_id('dev'),
  user_id       uuid not null references auth.users (id) on delete cascade,
  app           text not null check (app in ('customer', 'employee', 'partner')),
  platform      text not null check (platform in ('ios', 'android', 'web')),
  token         text not null unique,
  app_version   text,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index push_devices_user_idx on public.push_devices (user_id);

-- Branch photos shown in the customer app (files live in the public "branch-photos" bucket).
create table public.branch_photos (
  id            text primary key default public.gen_id('bph'),
  branch_id     text not null references public.branches (id) on delete cascade,
  storage_path  text not null,                 -- '<branch_id>/<file>.webp' inside bucket branch-photos
  position      smallint not null default 0,
  created_at    timestamptz not null default now(),
  constraint branch_photos_position_unique unique (branch_id, position)
);

-- Manager PIN: lets a manager approve, on the employee's device, a discount above the
-- employee's max_discount_pct. Stored as a bcrypt hash (pgcrypto crypt()), never in clear.
alter table public.staff
  add column pin_hash text;
comment on column public.staff.pin_hash is
  'bcrypt hash of the 4–6 digit manager PIN (extensions.crypt(pin, extensions.gen_salt(''bf''))). Only owners/managers have one.';
alter table public.staff
  add constraint staff_pin_only_for_managers check (pin_hash is null or role in ('owner', 'manager'));

-- Cash in the drawer when the employee starts the shift (expected cash = opening + cash collected).
alter table public.staff_shifts
  add column opening_cash numeric(10,2) not null default 0 check (opening_cash >= 0);

-- Customer app language preference.
alter table public.customers
  add column locale text not null default 'ar' check (locale in ('ar', 'en'));

-- Same security model as every other table (see 07_security_storage).
alter table public.customer_favorites     enable row level security;
alter table public.customer_notifications enable row level security;
alter table public.push_devices           enable row level security;
alter table public.branch_photos          enable row level security;
