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
