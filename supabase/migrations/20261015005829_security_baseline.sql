-- WP-02: security baseline.
--
-- 1. Stop automatic grants to API roles on objects created by `postgres` in
--    `public`. Hosted Supabase stopped auto-exposing new tables to the Data API
--    (new projects from 2026-05-30, existing from 2026-10-30), but the local
--    stack still carries the old default ACLs. Revoking here makes local and
--    hosted behave the same: every table must grant explicitly.
--    Ref: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
-- 2. `private` schema (not exposed via the Data API) for role data and helper
--    functions. Ref: https://supabase.com/docs/guides/database/postgres/row-level-security
--
-- Rollback (local only):
--   drop schema private cascade;
--   alter default privileges for role postgres in schema public
--     grant all on tables to anon, authenticated;
--   alter default privileges for role postgres in schema public
--     grant all on sequences to anon, authenticated;
--   alter default privileges for role postgres in schema public
--     grant execute on functions to anon, authenticated;
--   alter default privileges for role postgres grant execute on functions to public;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
-- PostgreSQL grants EXECUTE to PUBLIC globally; per-schema defaults cannot
-- remove that, so revoke it globally for functions created by `postgres`.
alter default privileges for role postgres
  revoke execute on functions from public;

create schema private;
revoke all on schema private from public;
-- RLS policies evaluated as `authenticated` call private.is_admin().
grant usage on schema private to authenticated;

-- Role assignments. Written only by SQL or the service role, never by clients.
create table private.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_at timestamptz not null default now()
);
alter table private.user_roles enable row level security;
revoke all on table private.user_roles from public, anon, authenticated;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;
