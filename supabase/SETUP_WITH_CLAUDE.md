# Carzen · Supabase setup runbook (for Claude)

> **للمستخدم:** ابعت الملف ده لـ Claude على الحساب المربوط بـ Supabase واكتبله:
> «اتبع الملف ده بالظبط وجهّز مشروع Supabase». ولو عايز بيانات العرض، ارفع معاه ملفات
> `supabase/seed-parts/` (11 ملف). هيسألك قبل أي حاجة ممكن تأثر على بيانات موجودة.

---

## 0. Who you are and what you must do

You are setting up the **Carzen** database on a Supabase project, using your Supabase MCP tools
(`list_projects`, `get_project`, `list_tables`, `list_migrations`, `apply_migration`,
`execute_sql`, `get_advisors`, `generate_typescript_types`).

Carzen is a car-wash marketplace + operating system in Cairo (EGP). One database serves four apps:
Super Admin (Carzen staff), Vendor Portal (wash owners and branch managers), the customer mobile app
and the employee mobile app. This runbook contains the **complete, final schema**: 8 migrations
creating 40 tables, 25 enums, 9 functions and 23 triggers, plus RLS and storage. It was generated
from the source repository and validated on PostgreSQL 17 (migrations + full demo seed + role
access checks).

**Target project:** `tbcmgdwzarfdgzzmmele` (confirm with the user before writing anything).

**Talk to the user in Egyptian Arabic.** Keep technical identifiers (table names, SQL) as they are.

## 1. Hard rules

1. **Never destroy data without explicit approval.** Do not `DROP`, `TRUNCATE`, `DELETE` or rename
   anything that exists in the project before this runbook, unless the user approves that exact
   statement in chat after you showed it to them.
2. **Apply the SQL exactly as written** in section 4, in order M1 → M8. Do not "improve", reorder,
   merge or skip statements. If one fails, stop and report the exact error. Don't improvise a fix
   that changes the design.
3. **Do not weaken security.** Do not disable RLS, add policies, or grant table access to
   `anon`/`authenticated`. The empty-policy RLS is intentional (section 6).
4. **No secrets in chat or files.** Never print or ask for the service role key or the database password.
5. **One project only:** `tbcmgdwzarfdgzzmmele`. If your tools can't see it, stop and tell the user
   (they may be signed in to the wrong Supabase account).

## 2. Pre-flight (read-only)

Run these and **show the user a short summary** before changing anything:

1. `get_project` with id `tbcmgdwzarfdgzzmmele`: it must exist and be `ACTIVE_HEALTHY`. Note the region and Postgres version (need ≥ 15).
2. `list_migrations`: what was already applied.
3. `list_tables` with `schemas: ["public"]`, `verbose: false`: the existing tables and their row counts.
4. Collision check with `execute_sql`:

```sql
-- Existing public objects that would collide with the Carzen schema
with ours(name) as (values
  ('areas'),('service_categories'),('amenities'),('platform_settings'),('admin_users'),('admin_role_permissions'),
  ('businesses'),('business_settings'),('branches'),('branch_working_hours'),('branch_amenities'),('branch_blocked_slots'),
  ('branch_photos'),('services'),('staff'),('staff_shift_patterns'),('staff_shifts'),('customers'),('vehicles'),
  ('customer_favorites'),('orders'),('order_items'),('order_events'),('order_notes'),('payments'),('transactions'),
  ('payouts'),('day_closings'),('reviews'),('offers'),('offer_branches'),('offer_categories'),('complaints'),
  ('complaint_notes'),('wash_applications'),('admin_notifications'),('vendor_notifications'),('customer_notifications'),
  ('push_devices'),('audit_logs'))
select 'table' as kind, c.relname as name,
       (select reltuples::bigint from pg_class where oid = c.oid) as approx_rows
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','v','m') and c.relname in (select name from ours)
union all
select 'type', t.typname, null
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
 where n.nspname = 'public' and t.typname in (
   'business_status','staff_role','account_status','service_type','order_status','order_payment_status',
   'order_source','payment_method','actor_type','payment_status','transaction_status','payout_status',
   'shift_review_status','review_status','offer_status','offer_scope','discount_type','complaint_status',
   'complaint_category','application_status','admin_role','admin_status','permission_level',
   'admin_notification_type','vendor_notification_type')
union all
select 'function', p.proname, null
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in (
   'gen_id','set_updated_at','normalize_plate','is_localized','next_order_number','gen_check_in_code',
   'refresh_review_ratings','next_complaint_ticket','audit_logs_immutable')
union all
select 'bucket', id, null from storage.buckets where id in ('application-documents','branch-photos')
order by 1, 2;
```

## 3. Decide the path

- **Path A: no collisions** (the query returns no rows, or only the two buckets). Go to section 4 directly.
- **Path B: collisions exist.** Do **not** apply anything yet. For every colliding object, report
  to the user its name, its row count, and how it relates to the Carzen table (section 7 has the
  common mappings). Then propose one of these, per object, and wait for an explicit choice:
  - **B1: empty or test-only:** drop it (show the exact `DROP … CASCADE` first), then apply.
  - **B2: has data to keep:** rename it to `legacy_<name>` (types: `legacy_<type>`), apply the
    migrations, copy the data into the Carzen tables with `INSERT … SELECT` (show the SQL and get
    approval), compare counts, and only then offer to drop the legacy object.
  - Existing buckets with the same id are fine: M7 upserts their settings.

  Before any B1/B2 change, remind the user to take a backup (Dashboard → Database → Backups).

## 4. Apply the migrations (M1 → M8)

Apply each block below with `apply_migration`, one call per block, in order. After each call,
tell the user one line (e.g. "M3 ✓ customers & orders"). M8 starts with
`create extension if not exists pgcrypto with schema extensions`; that is expected on Supabase.

### M1 · `20261015090000_foundation.sql`

Apply with `apply_migration` → `name: "foundation"`, `project_id: "tbcmgdwzarfdgzzmmele"`, and `query` = the full block below, unchanged.

```sql
-- =============================================================================
-- Carzen · 01 · Foundation
-- Shared helpers and every enum used by the domain tables.
--
-- Conventions (kept Laravel-friendly so the future backend can adopt this schema):
--   * snake_case tables/columns, plural table names, created_at / updated_at.
--   * Primary keys are prefixed text ids ("ord_…", "br_…") generated by gen_id().
--     They are readable in logs, match the ids the mock API already uses, and map to
--     Eloquent with $keyType = 'string', $incrementing = false.
--   * Bilingual text is jsonb {"ar": "...", "en": "..."} (spatie/laravel-translatable shape).
--   * Money is numeric(10,2) in EGP. Times are timestamptz. Phones are E.164 (+20…).
--   * Business rules live in the API layer; the database enforces integrity
--     (types, FKs, checks, uniqueness) and the few operations that must be atomic.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Prefixed, URL-safe identifier: gen_id('ord') → 'ord_3f9c2a7b1d4e8f60'
create or replace function public.gen_id(prefix text)
returns text
language sql
volatile
set search_path = ''
as $$
  select prefix || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
$$;

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Same rule as the API (engine.normalizePlate): drop spaces/dashes, upper-case.
create or replace function public.normalize_plate(plate text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(plate, ''), '[\s-]', '', 'g'));
$$;

-- Validates a bilingual jsonb value: an object with non-empty "ar" and "en" strings.
create or replace function public.is_localized(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
     and jsonb_typeof(value) = 'object'
     and jsonb_typeof(value -> 'ar') = 'string'
     and jsonb_typeof(value -> 'en') = 'string'
     and length(value ->> 'ar') > 0;
$$;

-- ---------------------------------------------------------------------------
-- Enums (values mirror @carzen/contracts exactly)
-- ---------------------------------------------------------------------------

create type public.business_status        as enum ('pending', 'approved', 'active', 'suspended', 'rejected');
create type public.staff_role             as enum ('owner', 'manager', 'employee');
create type public.account_status         as enum ('active', 'suspended');
create type public.service_type           as enum ('primary', 'addon');

create type public.order_status           as enum ('pending', 'confirmed', 'waiting', 'in_service', 'completed', 'cancelled', 'no_show');
create type public.order_payment_status   as enum ('pending', 'paid', 'refunded');
create type public.order_source           as enum ('app', 'walk_in', 'phone');
create type public.payment_method         as enum ('cash', 'card', 'online');
create type public.actor_type             as enum ('customer', 'staff', 'admin', 'system');

create type public.payment_status         as enum ('paid', 'refunded');
create type public.transaction_status     as enum ('pending', 'paid', 'refunded', 'settled');
create type public.payout_status          as enum ('due', 'paid');
create type public.shift_review_status    as enum ('open', 'submitted', 'reviewed', 'flagged');

create type public.review_status          as enum ('visible', 'hidden');
create type public.offer_status           as enum ('draft', 'scheduled', 'active', 'expired', 'disabled');
create type public.offer_scope            as enum ('platform', 'wash');
create type public.discount_type          as enum ('percent', 'fixed');

create type public.complaint_status       as enum ('open', 'in_review', 'waiting', 'resolved', 'closed');
create type public.complaint_category     as enum ('quality', 'pricing', 'behavior', 'booking', 'refund', 'other');
create type public.application_status     as enum ('pending', 'needs_changes', 'approved', 'rejected');

create type public.admin_role             as enum ('super', 'operations', 'finance', 'support');
create type public.admin_status           as enum ('active', 'inactive');
create type public.permission_level       as enum ('none', 'view', 'manage');

create type public.admin_notification_type  as enum ('application', 'complaint', 'critical_review', 'payment_issue', 'unusual_activity', 'system', 'finance_flag');
create type public.vendor_notification_type as enum ('new_booking', 'booking_cancelled', 'cash_difference', 'high_cancellation', 'branch_issue', 'daily_summary', 'review', 'platform', 'payout');
```

### M2 · `20261015090100_platform.sql`

Apply with `apply_migration` → `name: "platform"`, `project_id: "tbcmgdwzarfdgzzmmele"`, and `query` = the full block below, unchanged.

```sql
-- =============================================================================
-- Carzen · 02 · Platform: catalogs, settings, Carzen admins and their roles
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Catalogs (managed from Super Admin → Settings → Catalogs)
-- ---------------------------------------------------------------------------

create table public.areas (
  id          text primary key,                       -- 'nasr', 'helio', …
  name        jsonb not null check (public.is_localized(name)),
  active      boolean not null default true,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.areas is 'Cairo districts a branch can belong to.';

create table public.service_categories (
  id          text primary key,                       -- 'exterior', 'interior', 'full', …
  name        jsonb not null check (public.is_localized(name)),
  active      boolean not null default true,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.amenities (
  id          text primary key,                       -- 'waiting', 'ac', 'wifi', …
  name        jsonb not null check (public.is_localized(name)),
  active      boolean not null default true,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Platform settings: one row per Super Admin settings section.
--   general · booking_defaults · legal · notification_templates · commission
-- ---------------------------------------------------------------------------

create table public.platform_settings (
  key         text primary key check (key in ('general', 'booking_defaults', 'legal', 'notification_templates', 'commission')),
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text                                     -- admin_users.id (FK added below)
);
comment on table public.platform_settings is 'Super Admin settings sections; every change is also written to audit_logs with a reason.';

-- ---------------------------------------------------------------------------
-- Carzen staff (Super Admin users). Sign-in is Supabase Auth (email);
-- user_id links the auth identity to the admin profile.
-- ---------------------------------------------------------------------------

create table public.admin_users (
  id             text primary key default public.gen_id('adm'),
  user_id        uuid unique references auth.users (id) on delete set null,
  name           text not null check (length(name) between 2 and 80),
  email          text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role           public.admin_role not null,
  status         public.admin_status not null default 'active',
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.platform_settings
  add constraint platform_settings_updated_by_fkey
  foreign key (updated_by) references public.admin_users (id) on delete set null;

-- Roles × modules matrix (Super Admin → Roles). The "super" column is fixed by the API.
create table public.admin_role_permissions (
  role            public.admin_role not null,
  permission_key  text not null check (permission_key in (
                    'dashboard', 'customers', 'staff', 'washes', 'applications', 'branches', 'orders',
                    'reviews', 'complaints', 'offers', 'finance', 'reports', 'notifications',
                    'admins', 'roles', 'settings', 'audit')),
  level           public.permission_level not null default 'none',
  updated_at      timestamptz not null default now(),
  primary key (role, permission_key),
  -- The audit log is read-only by design: nobody can "manage" it.
  constraint audit_is_never_managed check (not (permission_key = 'audit' and level = 'manage'))
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger areas_updated_at              before update on public.areas              for each row execute function public.set_updated_at();
create trigger service_categories_updated_at before update on public.service_categories for each row execute function public.set_updated_at();
create trigger amenities_updated_at          before update on public.amenities          for each row execute function public.set_updated_at();
create trigger platform_settings_updated_at  before update on public.platform_settings  for each row execute function public.set_updated_at();
create trigger admin_users_updated_at        before update on public.admin_users        for each row execute function public.set_updated_at();
create trigger admin_role_permissions_updated_at before update on public.admin_role_permissions for each row execute function public.set_updated_at();
```

### M3 · `20261015090200_washes.sql`

Apply with `apply_migration` → `name: "washes"`, `project_id: "tbcmgdwzarfdgzzmmele"`, and `query` = the full block below, unchanged.

```sql
-- =============================================================================
-- Carzen · 03 · Washes: businesses, branches, services, staff, shifts
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Businesses (a wash company; owns one or more branches)
-- ---------------------------------------------------------------------------

create table public.businesses (
  id               text primary key default public.gen_id('biz'),
  name             jsonb not null check (public.is_localized(name)),
  owner_staff_id   text,                                   -- FK added after staff exists
  status           public.business_status not null default 'pending',
  status_reason    text,
  -- null = platform default (platform_settings.commission). 0–30 % like the admin UI allows.
  commission_rate  numeric(5,2) check (commission_rate between 0 and 30),
  rating           numeric(2,1) not null default 0 check (rating between 0 and 5),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Owner-level settings for the vendor portal (Settings screen D19).
create table public.business_settings (
  business_id               text primary key references public.businesses (id) on delete cascade,
  manager_can_edit_services boolean not null default false,
  contact_phone             text check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  contact_email             text,
  -- { new_booking: true, booking_cancelled: true, … } — "platform" is always delivered.
  notification_prefs        jsonb not null default '{}'::jsonb check (jsonb_typeof(notification_prefs) = 'object'),
  updated_at                timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Branches
-- ---------------------------------------------------------------------------

create table public.branches (
  id                  text primary key default public.gen_id('br'),
  business_id         text not null references public.businesses (id) on delete restrict,
  name                jsonb not null check (public.is_localized(name)),
  area_id             text not null references public.areas (id),
  address             jsonb not null check (public.is_localized(address)),
  lat                 numeric(9,6) not null check (lat between -90 and 90),
  lng                 numeric(9,6) not null check (lng between -180 and 180),
  phone               text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  capacity            smallint not null check (capacity between 1 and 30),   -- parallel bays
  active              boolean not null default true,
  featured            boolean not null default false,
  -- Booking rules (D16 / OW-12)
  auto_confirm        boolean not null default false,
  slot_interval_min   smallint not null default 30 check (slot_interval_min in (15, 20, 30, 45, 60)),
  lead_time_min       smallint not null default 60  check (lead_time_min between 0 and 240),
  max_advance_days    smallint not null default 7   check (max_advance_days between 1 and 30),
  free_cancel_min     smallint not null default 120 check (free_cancel_min between 0 and 1440),
  no_show_grace_min   smallint not null default 15  check (no_show_grace_min between 5 and 120),
  reminder_min        smallint not null default 60  check (reminder_min between 5 and 1440),
  -- Denormalized from visible reviews by trigger (see 05_engagement).
  rating              numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count        integer not null default 0 check (review_count >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index branches_business_id_idx on public.branches (business_id);
create index branches_area_id_idx on public.branches (area_id) where active;

-- One row per weekday. weekday: 0 = Sunday … 6 = Saturday (same as WEEK_DAYS).
-- closes_at = '00:00' means midnight (end of day), e.g. 08:00 → 00:00.
create table public.branch_working_hours (
  branch_id  text not null references public.branches (id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  opens_at   time not null,
  closes_at  time not null,
  closed     boolean not null default false,
  primary key (branch_id, weekday),
  constraint working_hours_order check (closed or closes_at = '00:00' or opens_at < closes_at)
);

create table public.branch_amenities (
  branch_id   text not null references public.branches (id) on delete cascade,
  amenity_id  text not null references public.amenities (id),
  primary key (branch_id, amenity_id)
);

-- Periods removed from customer availability (Schedule D7 / MG-05).
create table public.branch_blocked_slots (
  id          text primary key default public.gen_id('blk'),
  branch_id   text not null references public.branches (id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text not null check (length(reason) >= 3),
  created_by  text,                                       -- staff.id (FK added below)
  created_at  timestamptz not null default now(),
  constraint blocked_slot_range check (ends_at > starts_at)
);
create index branch_blocked_slots_branch_idx on public.branch_blocked_slots (branch_id, starts_at);

-- ---------------------------------------------------------------------------
-- Services (price list per branch; prices are never typed on an order)
-- ---------------------------------------------------------------------------

create table public.services (
  id            text primary key default public.gen_id('svc'),
  branch_id     text not null references public.branches (id) on delete cascade,
  type          public.service_type not null,
  category_id   text not null references public.service_categories (id),
  name          jsonb not null check (public.is_localized(name)),
  description   jsonb check (description is null or jsonb_typeof(description) = 'object'),
  price         numeric(10,2) not null check (price between 10 and 5000),
  duration_min  smallint not null check (duration_min between 2 and 240),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index services_branch_idx on public.services (branch_id, type) where active;

-- ---------------------------------------------------------------------------
-- Staff (owners, branch managers, employees). Sign-in is Supabase Auth (phone).
-- ---------------------------------------------------------------------------

create table public.staff (
  id                text primary key default public.gen_id('st'),
  user_id           uuid unique references auth.users (id) on delete set null,
  business_id       text not null references public.businesses (id) on delete cascade,
  branch_id         text references public.branches (id) on delete set null,  -- home branch (owners may be null)
  name              text not null check (length(name) between 2 and 80),
  phone             text not null unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  role              public.staff_role not null,
  status            public.account_status not null default 'active',
  -- Owners may go up to 100 %; the API caps managers/employees (0–50) when editing staff.
  max_discount_pct  smallint not null default 0 check (max_discount_pct between 0 and 100),
  -- { confirmBooking, cancelOrder, closeShift, editServices, refund, collectPayment, runService, manageStaff }
  permissions       jsonb not null check (
                      jsonb_typeof(permissions) = 'object'
                      and permissions ?& array['confirmBooking', 'cancelOrder', 'closeShift', 'editServices',
                                               'refund', 'collectPayment', 'runService', 'manageStaff']),
  joined_at         timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint staff_branch_required check (role = 'owner' or branch_id is not null)
);
create index staff_business_idx on public.staff (business_id, role);
create index staff_branch_idx on public.staff (branch_id) where status = 'active';

alter table public.businesses
  add constraint businesses_owner_staff_id_fkey
  foreign key (owner_staff_id) references public.staff (id) on delete set null
  deferrable initially deferred;

alter table public.branch_blocked_slots
  add constraint branch_blocked_slots_created_by_fkey
  foreign key (created_by) references public.staff (id) on delete set null;

-- Recurring weekly shift pattern. days: 0 = Sunday … 6 = Saturday.
create table public.staff_shift_patterns (
  id         text primary key default public.gen_id('pat'),
  staff_id   text not null references public.staff (id) on delete cascade,
  starts_at  time not null,
  ends_at    time not null,
  days       smallint[] not null check (cardinality(days) between 1 and 7 and days <@ array[0,1,2,3,4,5,6]::smallint[]),
  created_at timestamptz not null default now()
);
create index staff_shift_patterns_staff_idx on public.staff_shift_patterns (staff_id);

-- An actual worked shift and its cash closing (Shifts D11 / MG-07).
create table public.staff_shifts (
  id                text primary key default public.gen_id('sh'),
  staff_id          text not null references public.staff (id) on delete restrict,
  branch_id         text not null references public.branches (id) on delete restrict,
  scheduled_start   timestamptz not null,
  scheduled_end     timestamptz not null,
  actual_start      timestamptz,
  actual_end        timestamptz,
  orders_completed  integer not null default 0 check (orders_completed >= 0),
  cash_payments     numeric(10,2) not null default 0,
  card_payments     numeric(10,2) not null default 0,
  expected_cash     numeric(10,2) not null default 0,
  actual_cash       numeric(10,2),
  difference        numeric(10,2),
  difference_reason jsonb check (difference_reason is null or jsonb_typeof(difference_reason) = 'object'),
  review_status     public.shift_review_status not null default 'open',
  review_note       text,
  reviewed_by       text references public.staff (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint shift_range check (scheduled_end > scheduled_start),
  -- A closing with a cash difference must explain it.
  constraint shift_difference_needs_reason check (coalesce(difference, 0) = 0 or difference_reason is not null)
);
create index staff_shifts_branch_idx on public.staff_shifts (branch_id, scheduled_start desc);
create index staff_shifts_staff_idx on public.staff_shifts (staff_id, scheduled_start desc);
create index staff_shifts_review_idx on public.staff_shifts (review_status) where review_status in ('submitted', 'flagged');

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger businesses_updated_at        before update on public.businesses        for each row execute function public.set_updated_at();
create trigger business_settings_updated_at before update on public.business_settings for each row execute function public.set_updated_at();
create trigger branches_updated_at          before update on public.branches          for each row execute function public.set_updated_at();
create trigger services_updated_at          before update on public.services          for each row execute function public.set_updated_at();
create trigger staff_updated_at             before update on public.staff             for each row execute function public.set_updated_at();
create trigger staff_shifts_updated_at      before update on public.staff_shifts      for each row execute function public.set_updated_at();
```

### M4 · `20261015090300_customers_orders.sql`

Apply with `apply_migration` → `name: "customers_orders"`, `project_id: "tbcmgdwzarfdgzzmmele"`, and `query` = the full block below, unchanged.

```sql
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
```

### M5 · `20261015090400_engagement.sql`

Apply with `apply_migration` → `name: "engagement"`, `project_id: "tbcmgdwzarfdgzzmmele"`, and `query` = the full block below, unchanged.

```sql
-- =============================================================================
-- Carzen · 05 · Engagement: reviews, offers, complaints, wash applications
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Reviews (one per order). The wash replies once and may report it to Carzen.
-- ---------------------------------------------------------------------------

create table public.reviews (
  id                text primary key default public.gen_id('rev'),
  order_id          text not null unique references public.orders (id) on delete cascade,
  customer_id       text not null references public.customers (id) on delete cascade,
  business_id       text not null references public.businesses (id) on delete cascade,
  branch_id         text not null references public.branches (id) on delete cascade,
  service_id        text references public.services (id) on delete set null,
  stars             smallint not null check (stars between 1 and 5),
  comment           jsonb not null check (jsonb_typeof(comment) = 'object'),
  tags              text[] not null default '{}',
  reply             text check (reply is null or length(reply) between 5 and 400),
  reply_at          timestamptz,
  reported_by_wash  boolean not null default false,
  report_reason     text,
  status            public.review_status not null default 'visible',
  hidden_reason     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint reviews_reply_time check ((reply is null) = (reply_at is null)),
  constraint reviews_report_reason check (not reported_by_wash or report_reason is not null),
  constraint reviews_hidden_reason check (status = 'visible' or hidden_reason is not null)
);
create index reviews_branch_idx on public.reviews (branch_id, created_at desc);
create index reviews_business_idx on public.reviews (business_id, status);
create index reviews_reported_idx on public.reviews (created_at desc) where reported_by_wash;

-- Keeps branches.rating / review_count and businesses.rating in sync with visible reviews
-- (same rule as the API's recomputeRatings: average of visible stars, 1 decimal).
create or replace function public.refresh_review_ratings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  b_ids   text[];
  biz_ids text[];
begin
  if tg_op = 'DELETE' then
    b_ids := array[old.branch_id];   biz_ids := array[old.business_id];
  elsif tg_op = 'UPDATE' then
    b_ids := array[old.branch_id, new.branch_id];   biz_ids := array[old.business_id, new.business_id];
  else
    b_ids := array[new.branch_id];   biz_ids := array[new.business_id];
  end if;

  update public.branches br
     set rating = coalesce(s.avg_stars, 0), review_count = coalesce(s.cnt, 0)
    from (select b.id,
                 round(avg(r.stars)::numeric, 1) as avg_stars,
                 count(r.id)::int as cnt
            from public.branches b
            left join public.reviews r on r.branch_id = b.id and r.status = 'visible'
           where b.id = any (b_ids)
           group by b.id) s
   where br.id = s.id;

  update public.businesses bz
     set rating = coalesce(s.avg_stars, 0)
    from (select z.id, round(avg(r.stars)::numeric, 1) as avg_stars
            from public.businesses z
            left join public.reviews r on r.business_id = z.id and r.status = 'visible'
           where z.id = any (biz_ids)
           group by z.id) s
   where bz.id = s.id;

  return null;
end;
$$;

create trigger reviews_refresh_ratings
  after insert or delete or update of stars, status, branch_id, business_id on public.reviews
  for each row execute function public.refresh_review_ratings();

-- ---------------------------------------------------------------------------
-- Offers: platform-wide (Carzen) or wash-scoped. Applied by server-side pricing.
-- ---------------------------------------------------------------------------

create table public.offers (
  id              text primary key default public.gen_id('of'),
  scope           public.offer_scope not null,
  business_id     text references public.businesses (id) on delete cascade,
  title           jsonb not null check (public.is_localized(title)),
  description     jsonb not null check (jsonb_typeof(description) = 'object'),
  discount_type   public.discount_type not null,
  discount_value  numeric(10,2) not null check (discount_value > 0),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          public.offer_status not null default 'draft',
  featured        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint offers_range check (ends_at > starts_at),
  constraint offers_percent_cap check (discount_type <> 'percent' or discount_value <= 50),
  constraint offers_scope_business check ((scope = 'wash') = (business_id is not null))
);
create index offers_business_idx on public.offers (business_id) where business_id is not null;
create index offers_live_idx on public.offers (starts_at, ends_at) where status in ('scheduled', 'active');

create table public.offer_branches (
  offer_id   text not null references public.offers (id) on delete cascade,
  branch_id  text not null references public.branches (id) on delete cascade,
  primary key (offer_id, branch_id)
);
create index offer_branches_branch_idx on public.offer_branches (branch_id);

-- Empty set = every category.
create table public.offer_categories (
  offer_id     text not null references public.offers (id) on delete cascade,
  category_id  text not null references public.service_categories (id),
  primary key (offer_id, category_id)
);

alter table public.orders
  add constraint orders_offer_id_fkey
  foreign key (offer_id) references public.offers (id) on delete set null;
create index orders_offer_idx on public.orders (offer_id) where offer_id is not null;

-- ---------------------------------------------------------------------------
-- Complaints (customer → Carzen support), with an internal notes thread.
-- ---------------------------------------------------------------------------

create sequence public.complaint_ticket_seq start 1001;

create or replace function public.next_complaint_ticket()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'TK-' || nextval('public.complaint_ticket_seq')::text;
$$;

create table public.complaints (
  id                 text primary key default public.gen_id('cmp'),
  ticket             text not null unique default public.next_complaint_ticket(),
  customer_id        text not null references public.customers (id) on delete cascade,
  business_id        text not null references public.businesses (id) on delete cascade,
  branch_id          text not null references public.branches (id) on delete cascade,
  order_id           text references public.orders (id) on delete set null,
  category           public.complaint_category not null,
  description        text not null check (length(description) >= 5),
  status             public.complaint_status not null default 'open',
  assigned_admin_id  text references public.admin_users (id) on delete set null,
  resolution         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint complaints_resolution check (status not in ('resolved', 'closed') or resolution is not null)
);
create index complaints_status_idx on public.complaints (status, created_at desc);
create index complaints_business_idx on public.complaints (business_id);

create table public.complaint_notes (
  id               text primary key default public.gen_id('cnote'),
  complaint_id     text not null references public.complaints (id) on delete cascade,
  author_admin_id  text references public.admin_users (id) on delete set null,
  text             text not null check (length(text) between 1 and 1000),
  created_at       timestamptz not null default now()
);
create index complaint_notes_complaint_idx on public.complaint_notes (complaint_id, created_at);

-- ---------------------------------------------------------------------------
-- Wash applications (partner registration → Super Admin review → approval).
-- The submitted form is kept as submitted (hours/services snapshots in jsonb).
-- ---------------------------------------------------------------------------

create table public.wash_applications (
  id             text primary key default public.gen_id('app'),
  business_name  text not null,
  owner_name     text not null,
  phone          text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email          text not null,
  area_id        text not null references public.areas (id),
  address        text not null,
  lat            numeric(9,6) not null,
  lng            numeric(9,6) not null,
  capacity       smallint not null check (capacity between 1 and 30),
  working_hours  jsonb not null check (jsonb_typeof(working_hours) = 'array'),     -- WorkingDay[7]
  services       jsonb not null check (jsonb_typeof(services) = 'array'),          -- [{name, price, durationMin}]
  documents      text[] not null default '{}',                                     -- storage paths in "application-documents"
  status         public.application_status not null default 'pending',
  review_note    text,
  business_id    text references public.businesses (id) on delete set null,         -- set on approval
  submitted_at   timestamptz not null default now(),
  reviewed_at    timestamptz,
  updated_at     timestamptz not null default now(),
  constraint applications_review check (status = 'pending' or reviewed_at is not null),
  constraint applications_approved_business check (status <> 'approved' or business_id is not null)
);
create index wash_applications_status_idx on public.wash_applications (status, submitted_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger reviews_updated_at           before update on public.reviews           for each row execute function public.set_updated_at();
create trigger offers_updated_at            before update on public.offers            for each row execute function public.set_updated_at();
create trigger complaints_updated_at        before update on public.complaints        for each row execute function public.set_updated_at();
create trigger wash_applications_updated_at before update on public.wash_applications for each row execute function public.set_updated_at();
```

### M6 · `20261015090500_activity.sql`

Apply with `apply_migration` → `name: "activity"`, `project_id: "tbcmgdwzarfdgzzmmele"`, and `query` = the full block below, unchanged.

```sql
-- =============================================================================
-- Carzen · 06 · Activity: notifications (admin + vendor) and the audit log
-- =============================================================================

-- Carzen staff inbox (Super Admin bell).
create table public.admin_notifications (
  id          text primary key default public.gen_id('an'),
  type        public.admin_notification_type not null,
  title       jsonb not null check (public.is_localized(title)),
  body        jsonb not null check (jsonb_typeof(body) = 'object'),
  href        text not null default '/',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index admin_notifications_unread_idx on public.admin_notifications (created_at desc) where not read;

-- Wash inbox (Vendor Portal bell). branch_id null = whole business.
create table public.vendor_notifications (
  id           text primary key default public.gen_id('vn'),
  business_id  text not null references public.businesses (id) on delete cascade,
  branch_id    text references public.branches (id) on delete cascade,
  type         public.vendor_notification_type not null,
  title        jsonb not null check (public.is_localized(title)),
  body         jsonb not null check (jsonb_typeof(body) = 'object'),
  href         text not null default '/',
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index vendor_notifications_business_idx on public.vendor_notifications (business_id, created_at desc);
create index vendor_notifications_unread_idx on public.vendor_notifications (business_id) where not read;

-- ---------------------------------------------------------------------------
-- Audit log: every sensitive action, who did it, before/after and why.
-- Append-only: UPDATE and DELETE are rejected at the database level.
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id          text primary key default public.gen_id('aud'),
  actor_type  public.actor_type not null,
  actor_id    text not null,
  actor_name  text,                     -- snapshot of the name at the time of the action
  action      text not null,            -- 'order.cancel', 'wash.suspend', 'settings.update', …
  entity      text not null,            -- 'orders', 'businesses', 'staff', …
  entity_id   text not null,
  branch_id   text references public.branches (id) on delete set null,
  old_value   text,
  new_value   text,
  reason      text,
  at          timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, at desc);
create index audit_logs_branch_idx on public.audit_logs (branch_id, at desc) where branch_id is not null;
create index audit_logs_actor_idx on public.audit_logs (actor_id, at desc);
create index audit_logs_at_idx on public.audit_logs (at desc);

create or replace function public.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only (% is not allowed)', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_logs_no_update_delete
  before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

comment on table public.audit_logs is
  'Append-only. Rows cannot be updated or deleted (trigger). TRUNCATE is reserved for resetting demo environments.';
```

### M7 · `20261015090600_security_storage.sql`

Apply with `apply_migration` → `name: "security_storage"`, `project_id: "tbcmgdwzarfdgzzmmele"`, and `query` = the full block below, unchanged.

```sql
-- =============================================================================
-- Carzen · 07 · Security model and storage
--
-- The apps never talk to the database directly. Every read/write goes through the
-- Carzen API (/api/v1), which uses the service_role key on the server and enforces
-- business rules + permissions (owner / branch manager / admin roles).
--
-- So for the Data API roles (anon, authenticated):
--   * RLS is enabled on every table with NO policies  → every row is denied.
--   * Table, sequence and function privileges are revoked → defence in depth.
-- service_role bypasses RLS and keeps full access.
-- If a client ever needs direct access (e.g. Realtime on the live board), add a
-- narrow, explicit policy in a new migration — never disable RLS.
-- =============================================================================

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    -- ENABLE (not FORCE): the owner role (postgres: migrations, seed, SQL editor) keeps access.
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Tables/functions created later by migrations follow the same rule.
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, public;
alter default privileges for role postgres in schema public grant all on tables    to service_role;
alter default privileges for role postgres in schema public grant all on sequences to service_role;
alter default privileges for role postgres in schema public grant execute on functions to service_role;

-- ---------------------------------------------------------------------------
-- Storage buckets
--   application-documents  private: commercial register, tax card, ID (signed URLs only)
--   branch-photos          public:  photos shown in the customer app
-- No storage.objects policies: uploads go through the API with the service role.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('application-documents', 'application-documents', false, 10485760,
     array['application/pdf', 'image/jpeg', 'image/png']),
  ('branch-photos', 'branch-photos', true, 5242880,
     array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
```

### M8 · `20261015090700_mobile_apps.sql`

Apply with `apply_migration` → `name: "mobile_apps"`, `project_id: "tbcmgdwzarfdgzzmmele"`, and `query` = the full block below, unchanged.

```sql
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
```

## 5. Demo data (optional; for a trial project, not for real users)

Ask the user: **"تحب أحمّل بيانات العرض؟"** (≈ 9,000 rows: 10 washes, 14 branches, 40 customers,
1,078 orders, identical to the dashboards' demo). Load it only on a fresh install (Path A or
after B1), never on top of real data.

The seed is split into **11 files** in `supabase/seed-parts/` (the user attaches them).
Run each file's full content with `execute_sql`, **in order**, one call per file:

- `seed-01.sql` (68 KB)
- `seed-02.sql` (110 KB)
- `seed-03.sql` (110 KB)
- `seed-04.sql` (137 KB)
- `seed-05.sql` (126 KB)
- `seed-06.sql` (122 KB)
- `seed-07.sql` (122 KB)
- `seed-08.sql` (122 KB)
- `seed-09.sql` (140 KB)
- `seed-10.sql` (150 KB)
- `seed-11.sql` (19 KB)

If a part fails, stop and report the error. The last part ends with a block that moves every date
to the day it is applied (so "today" in the demo is today). It must run last.

If the files are not available, skip this section and tell the user the seed was not loaded.

## 6. Verify

Run with `execute_sql` and show the results:

```sql
select
  (select count(*) from pg_tables where schemaname = 'public')                         as tables,          -- 40
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity)         as rls_enabled,     -- 40
  (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typtype = 'e')                                   as enums,           -- 25
  (select count(*) from storage.buckets
     where id in ('application-documents', 'branch-photos'))                          as buckets,         -- 2
  (select count(*) from information_schema.role_table_grants
     where table_schema = 'public' and grantee in ('anon', 'authenticated'))          as public_grants;   -- 0
```

If the seed was loaded, also:

```sql
select (select count(*) from orders) as orders,                                   -- 1078
       (select count(*) from orders where payment_status = 'paid') as paid,       -- 928
       (select sum(total) from orders where payment_status = 'paid') as gmv,      -- 148921.00
       (select rating from branches where id = 'br_nasr') as nasr_rating,        -- 4.8
       (select count(*) from orders where scheduled_at::date = current_date) as today_orders;
```

Then:
- `get_advisors` with `type: "security"` and again with `"performance"`. An **INFO** "RLS enabled, no
  policy" notice on the tables is **expected and intentional**: the apps reach data only through
  the server (service role) until phase 2 adds controlled access. Report anything else (WARN/ERROR) with its remediation link.
- `generate_typescript_types` and give the user the output (they will add it to the repo).

## 7. Reference

### Design in one paragraph
Ids are prefixed text (`ord_…`, `br_…`, default `gen_id('prefix')`). Bilingual text is jsonb
`{"ar","en"}`. Money is `numeric(10,2)` EGP, times are `timestamptz`, and phones are E.164 (`+20…`). Profile
tables (`customers`, `staff`, `admin_users`) link to `auth.users` through `user_id`. The database enforces
the following on its own:
- integrity: enums, foreign keys, checks such as total = subtotal − discount, a reason on a cancelled order, offers ≤ 50 %, one day-closing per branch;
- atomic numbering: `next_order_number('app'|'walk_in'|'phone')` returns CZ-10001/20045/30023 and `next_complaint_ticket()` returns TK-1040;
- rating sync from visible reviews;
- an append-only `audit_logs`.

Business rules (pricing, the order state machine, owner/manager permissions) live in the API layer.
RLS is on everywhere with no policies, and table/function privileges are revoked from `anon`/`authenticated`.

### Common mappings (Path B)
| Typical existing table | Carzen table(s) |
|---|---|
| `profiles` / `users` | `customers` · `staff` · `admin_users` (each with `user_id → auth.users`) |
| `cars` | `vehicles` |
| `bookings` / `reservations` | `orders` + `order_items` + `order_events` |
| `washes` / `centers` / `shops` | `businesses` + `branches` |
| `services` / `packages` | `services` (per branch, `type` primary/addon) |
| `ratings` | `reviews` |
| `notifications` | `customer_notifications` · `vendor_notifications` · `admin_notifications` |
| `favorites` | `customer_favorites` |
| `device_tokens` / `fcm_tokens` | `push_devices` |

UUID ids can be kept as text with a prefix (e.g. `'cu_' || replace(id::text, '-', '')`). Phones must be E.164 to pass the check.

## 8. What you cannot do from here: hand these to the user

Your MCP tools can't change Auth settings or create Auth users. Tell the user to:

1. **Authentication → Sign In / Providers:** Email: disable "Allow new users to sign up". Phone:
   enable, choose an SMS provider (Twilio Verify also supports WhatsApp), and set minimum password length to 8.
2. **Phone → Test phone numbers** (OTP `123456`): `201001234567` (customer Ahmed), `201200000000`
   (owner Khaled), `201005550102` (manager Mohamed Adel).
3. **URL Configuration:** set the Site URL and the Redirect URLs to the real app/dashboard domains.
4. **Demo accounts.** Either run from the repo root `npm run db:users:demo` (needs `supabase/.env` with
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; creates all accounts with password `demo1234` and
   links them), or add a few users in Dashboard → Authentication, then run this linking SQL (you can run it):

```sql
-- Link Auth users to their Carzen profiles (Auth stores phones without "+")
update public.staff s     set user_id = u.id from auth.users u where s.user_id is null and u.phone = ltrim(s.phone, '+');
update public.customers c set user_id = u.id from auth.users u where c.user_id is null and u.phone = ltrim(c.phone, '+');
update public.admin_users a set user_id = u.id from auth.users u where a.user_id is null and lower(u.email) = lower(a.email);
```

## 9. Final report to the user (in Arabic)

Finish with a short summary:
- the path (A or B) and what was changed;
- M1–M8 status;
- whether the seed was loaded and the verification numbers;
- the advisor findings;
- the manual steps from section 8 still pending.

Do not claim anything you did not verify.

---
*Generated by `supabase/scripts/build-setup-guide.mjs` from the repository's migrations and seed. Regenerate with `npm run db:guide`.*
