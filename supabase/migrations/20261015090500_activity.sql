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
