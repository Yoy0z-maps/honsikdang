-- WP-02: favorites, reports, moderation audit log.
--
-- Access model (specs/decisions.md §11):
--   favorites           private to the owner; not even admins can read them
--   restaurant_reports  reporter creates/reads own; admin reads and updates status
--   moderation_actions  admin-only, append-only (no update/delete grants at all)
--
-- Rollback (local only):
--   drop table if exists public.moderation_actions, public.restaurant_reports, public.favorites;
--   drop type if exists public.report_target, public.report_reason, public.report_status,
--     public.moderation_target, public.moderation_action;
--   drop function if exists private.validate_report_target();

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create index favorites_restaurant_idx on public.favorites (restaurant_id);

alter table public.favorites enable row level security;
revoke all on table public.favorites from anon, authenticated;
grant select, insert (restaurant_id), delete on table public.favorites to authenticated;

create policy favorites_select_own on public.favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy favorites_insert_own on public.favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.restaurants r where r.id = restaurant_id)
  );

create policy favorites_delete_own on public.favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- restaurant_reports
-- ---------------------------------------------------------------------------
create type public.report_target as enum ('restaurant', 'review');
create type public.report_reason as enum (
  'incorrect_info', 'closed', 'duplicate', 'inappropriate', 'spam', 'other'
);
create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table public.restaurant_reports (
  id uuid primary key default gen_random_uuid(),
  target_type public.report_target not null,
  -- Polymorphic target; existence is checked by trigger.
  target_id uuid not null,
  -- Kept (as null) when the reporter deletes their account.
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  reason public.report_reason not null,
  note text check (char_length(note) <= 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_reports_once_per_reporter unique (reporter_id, target_type, target_id)
);

create index restaurant_reports_status_idx on public.restaurant_reports (status, created_at);
create index restaurant_reports_target_idx on public.restaurant_reports (target_type, target_id);

-- Runs as the reporter, so only targets visible to them under RLS count.
create function private.validate_report_target()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.target_type = 'restaurant' then
    if not exists (select 1 from public.restaurants where id = new.target_id) then
      raise exception 'report target not found' using errcode = 'foreign_key_violation';
    end if;
  elsif not exists (select 1 from public.restaurant_reviews where id = new.target_id) then
    raise exception 'report target not found' using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_report_target() from public, anon, authenticated;

create trigger restaurant_reports_validate_target
  before insert on public.restaurant_reports
  for each row execute function private.validate_report_target();

create trigger restaurant_reports_set_updated_at
  before update on public.restaurant_reports
  for each row execute function private.set_updated_at();

alter table public.restaurant_reports enable row level security;
revoke all on table public.restaurant_reports from anon, authenticated;
grant select, insert (target_type, target_id, reason, note), update (status)
  on table public.restaurant_reports to authenticated;

create policy restaurant_reports_select_own_or_admin on public.restaurant_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));

create policy restaurant_reports_insert_own on public.restaurant_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');

create policy restaurant_reports_update_admin on public.restaurant_reports
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- moderation_actions (append-only audit log)
-- ---------------------------------------------------------------------------
create type public.moderation_target as enum ('restaurant', 'review', 'report');
create type public.moderation_action as enum (
  'approve', 'reject', 'archive', 'remove', 'restore', 'resolve', 'dismiss'
);

create table public.moderation_actions (
  id bigint generated always as identity primary key,
  moderator_id uuid default auth.uid() references auth.users (id) on delete set null,
  target_type public.moderation_target not null,
  target_id uuid not null,
  action public.moderation_action not null,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create index moderation_actions_target_idx
  on public.moderation_actions (target_type, target_id, created_at);
create index moderation_actions_moderator_idx on public.moderation_actions (moderator_id);

alter table public.moderation_actions enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;
grant select, insert (target_type, target_id, action, reason)
  on table public.moderation_actions to authenticated;

create policy moderation_actions_select_admin on public.moderation_actions
  for select to authenticated
  using ((select private.is_admin()));

create policy moderation_actions_insert_admin on public.moderation_actions
  for insert to authenticated
  with check ((select private.is_admin()) and moderator_id = (select auth.uid()));
