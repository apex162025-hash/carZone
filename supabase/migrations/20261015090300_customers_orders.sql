-- =============================================================================
-- Carzen · 04 · Customers, vehicles, orders, payments, finance, day closings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Customers & vehicles. Customers sign in with phone OTP (Supabase Auth).
-- ---------------------------------------------------------------------------

create table public.customers (
  id              text primary key default public.gen_id('cu'),
  user_id         uuid unique references auth.users (id) on delete set null,
  name            text not null check (length(name) between 2 and 80),
  phone           text not null unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  status          public.account_status not null default 'active',
  status_reason   text,
  last_active_at  timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.vehicles (
  id                text primary key default public.gen_id('veh'),
  customer_id       text not null references public.customers (id) on delete cascade,
  make              text not null,
  model             text not null,
  year              smallint check (year between 1950 and 2100),
  color             text not null,
  plate             text not null,
  plate_normalized  text generated always as (public.normalize_plate(plate)) stored,
  is_default        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint vehicles_customer_plate_unique unique (customer_id, plate_normalized)
);
create index vehicles_plate_idx on public.vehicles (plate_normalized);
-- At most one default vehicle per customer.
create unique index vehicles_one_default_idx on public.vehicles (customer_id) where is_default;

-- ---------------------------------------------------------------------------
-- Order numbering — atomic and gap-tolerant, one range per source:
--   app CZ-1xxxx · walk-in CZ-2xxxx · phone CZ-3xxxx
-- ---------------------------------------------------------------------------

create sequence public.order_number_app_seq     minvalue 10001 maxvalue 19999 start 10001;
create sequence public.order_number_walk_in_seq minvalue 20001 maxvalue 29999 start 20001;
create sequence public.order_number_phone_seq   minvalue 30001 maxvalue 39999 start 30001;

create or replace function public.next_order_number(src public.order_source)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  n bigint;
begin
  n := case src
         when 'app'     then nextval('public.order_number_app_seq')
         when 'walk_in' then nextval('public.order_number_walk_in_seq')
         when 'phone'   then nextval('public.order_number_phone_seq')
       end;
  return 'CZ-' || lpad(n::text, 5, '0');
end;
$$;

-- 5-character check-in code shown to the customer (no 0/O/1/I to avoid misreads).
create or replace function public.gen_check_in_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 5);
$$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id                  text primary key default public.gen_id('ord'),
  number              text not null unique check (number ~ '^CZ-[0-9]{5}$'),
  code                text not null default public.gen_check_in_code() check (length(code) = 5),
  source              public.order_source not null,
  customer_id         text references public.customers (id) on delete set null,
  vehicle_id          text references public.vehicles (id) on delete set null,
  plate               text not null,
  plate_normalized    text generated always as (public.normalize_plate(plate)) stored,
  business_id         text not null references public.businesses (id) on delete restrict,
  branch_id           text not null references public.branches (id) on delete restrict,
  offer_id            text,                                   -- FK added in 05_engagement
  subtotal            numeric(10,2) not null check (subtotal >= 0),
  discount_amount     numeric(10,2) check (discount_amount >= 0),
  discount_pct        numeric(5,2)  check (discount_pct between 0 and 100),
  discount_reason     text,
  total               numeric(10,2) not null check (total >= 0),
  duration_min        smallint not null check (duration_min > 0),
  scheduled_at        timestamptz not null,
  status              public.order_status not null default 'pending',
  payment_status      public.order_payment_status not null default 'pending',
  payment_method      public.payment_method,
  assigned_staff_id   text references public.staff (id) on delete set null,
  cancel_reason       text,
  cancelled_by_type   public.actor_type,
  cancelled_by_id     text,
  cancelled_at        timestamptz,
  flag                text check (flag in ('finance_review')),
  closed_in_day_id    text,                                   -- FK to day_closings below
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_total_matches check (total = subtotal - coalesce(discount_amount, 0)),
  constraint orders_discount_reason check (discount_amount is null or discount_reason is not null),
  constraint orders_cancel_consistent check (
    (status = 'cancelled') = (cancelled_at is not null and cancel_reason is not null)),
  constraint orders_paid_has_method check (payment_status = 'pending' or payment_method is not null),
  constraint orders_app_has_customer check (source <> 'app' or customer_id is not null)
);
create index orders_branch_schedule_idx on public.orders (branch_id, scheduled_at desc);
create index orders_business_status_idx on public.orders (business_id, status);
create index orders_customer_idx on public.orders (customer_id, scheduled_at desc) where customer_id is not null;
create index orders_plate_idx on public.orders (plate_normalized);
create index orders_open_idx on public.orders (branch_id, status) where status in ('pending', 'confirmed', 'waiting', 'in_service');
create index orders_unpaid_idx on public.orders (branch_id) where status = 'completed' and payment_status = 'pending';
create index orders_code_idx on public.orders (code);

-- Line items: a snapshot of the service at order time (price changes never rewrite history).
create table public.order_items (
  id            text primary key default public.gen_id('oi'),
  order_id      text not null references public.orders (id) on delete cascade,
  service_id    text references public.services (id) on delete set null,
  name          jsonb not null check (public.is_localized(name)),
  type          public.service_type not null,
  price         numeric(10,2) not null check (price >= 0),
  duration_min  smallint not null check (duration_min > 0),
  position      smallint not null default 0
);
create index order_items_order_idx on public.order_items (order_id, position);
create index order_items_service_idx on public.order_items (service_id);

-- Status timeline (who moved the order to which status, when).
create table public.order_events (
  id          text primary key default public.gen_id('oev'),
  order_id    text not null references public.orders (id) on delete cascade,
  status      public.order_status not null,
  actor_type  public.actor_type not null,
  actor_id    text not null,
  at          timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, at);

create table public.order_notes (
  id               text primary key default public.gen_id('onote'),
  order_id         text not null references public.orders (id) on delete cascade,
  author_staff_id  text references public.staff (id) on delete set null,
  text             text not null check (length(text) between 1 and 500),
  created_at       timestamptz not null default now()
);
create index order_notes_order_idx on public.order_notes (order_id, created_at);

-- ---------------------------------------------------------------------------
-- Payments (money collected at the wash) and platform finance
-- ---------------------------------------------------------------------------

create table public.payments (
  id            text primary key default public.gen_id('pay'),
  order_id      text not null references public.orders (id) on delete restrict,
  amount        numeric(10,2) not null check (amount >= 0),
  method        public.payment_method not null,
  collected_by  text references public.staff (id) on delete set null,
  collected_at  timestamptz not null default now(),
  status        public.payment_status not null default 'paid',
  created_at    timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create index payments_collected_idx on public.payments (collected_by, collected_at);

-- Commission ledger: one row per paid order. Read-only from the UI by design.
create table public.transactions (
  id               text primary key default public.gen_id('tx'),
  order_id         text not null unique references public.orders (id) on delete restrict,
  business_id      text not null references public.businesses (id) on delete restrict,
  gross            numeric(10,2) not null check (gross >= 0),
  commission_rate  numeric(5,2) not null check (commission_rate between 0 and 30),
  commission       numeric(10,2) not null check (commission >= 0),
  net_to_wash      numeric(10,2) not null,
  date             timestamptz not null,
  status           public.transaction_status not null default 'pending',
  flag             text check (flag in ('discrepancy')),
  review_note      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint transactions_net check (net_to_wash = gross - commission)
);
create index transactions_business_date_idx on public.transactions (business_id, date desc);
create index transactions_flag_idx on public.transactions (flag) where flag is not null;

create table public.payouts (
  id            text primary key default public.gen_id('po'),
  business_id   text not null references public.businesses (id) on delete restrict,
  period_start  date not null,
  period_end    date not null,
  amount_due    numeric(12,2) not null check (amount_due >= 0),
  amount_paid   numeric(12,2) not null default 0 check (amount_paid >= 0),
  status        public.payout_status not null default 'due',
  reference     text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint payouts_period check (period_end >= period_start),
  constraint payouts_paid_has_reference check (status = 'due' or (reference is not null and paid_at is not null)),
  constraint payouts_one_per_period unique (business_id, period_start, period_end)
);

-- ---------------------------------------------------------------------------
-- End-of-day reconciliation (Shifts D11 / MG-08). Closing locks the day's paid orders.
-- ---------------------------------------------------------------------------

create table public.day_closings (
  id               text primary key default public.gen_id('dc'),
  branch_id        text not null references public.branches (id) on delete restrict,
  date             date not null,
  expected_cash    numeric(10,2) not null default 0,
  expected_card    numeric(10,2) not null default 0,
  expected_online  numeric(10,2) not null default 0,
  actual_cash      numeric(10,2) not null default 0,
  actual_card      numeric(10,2) not null default 0,
  actual_online    numeric(10,2) not null default 0,
  difference       numeric(10,2) generated always as (
                     (actual_cash + actual_card + actual_online) - (expected_cash + expected_card + expected_online)) stored,
  reason           text,
  orders_locked    integer not null default 0 check (orders_locked >= 0),
  closed_by        text not null references public.staff (id) on delete restrict,
  closed_at        timestamptz not null default now(),
  constraint day_closings_once unique (branch_id, date),
  constraint day_closings_reason check (
    (actual_cash + actual_card + actual_online) = (expected_cash + expected_card + expected_online)
    or reason is not null)
);

alter table public.orders
  add constraint orders_closed_in_day_fkey
  foreign key (closed_in_day_id) references public.day_closings (id) on delete set null;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger customers_updated_at    before update on public.customers    for each row execute function public.set_updated_at();
create trigger vehicles_updated_at     before update on public.vehicles     for each row execute function public.set_updated_at();
create trigger orders_updated_at       before update on public.orders       for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger payouts_updated_at      before update on public.payouts      for each row execute function public.set_updated_at();
