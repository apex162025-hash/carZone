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
