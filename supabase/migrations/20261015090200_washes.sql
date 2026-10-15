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
