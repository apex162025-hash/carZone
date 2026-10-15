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
