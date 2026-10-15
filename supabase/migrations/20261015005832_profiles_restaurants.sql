-- WP-02: profiles, restaurant categories, restaurants.
--
-- Access model (see specs/decisions.md §11):
--   profiles     owner reads/updates own display_name; admin reads; no public read (Q4)
--   categories   public read; admin writes
--   restaurants  public reads approved; authenticated proposes (forced pending);
--                creator sees own proposals; admin reads/updates/deletes all
--
-- Rollback (local only):
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop table if exists public.restaurants, public.restaurant_categories, public.profiles;
--   drop type if exists public.restaurant_status, public.restaurant_source;
--   drop function if exists private.handle_new_user();

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(btrim(display_name)) between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Create a profile row for every new auth user. Metadata is user-controlled,
-- so nothing is copied from raw_user_meta_data.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- restaurant_categories (reference data, decision Q5)
-- ---------------------------------------------------------------------------
create table public.restaurant_categories (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (char_length(btrim(label)) between 1 and 30),
  sort_order smallint not null default 0
);

alter table public.restaurant_categories enable row level security;
revoke all on table public.restaurant_categories from anon, authenticated;
grant select on table public.restaurant_categories to anon, authenticated;
grant insert (slug, label, sort_order), update (slug, label, sort_order), delete
  on table public.restaurant_categories to authenticated;

create policy restaurant_categories_select_all on public.restaurant_categories
  for select to anon, authenticated
  using (true);

create policy restaurant_categories_insert_admin on public.restaurant_categories
  for insert to authenticated
  with check ((select private.is_admin()));

create policy restaurant_categories_update_admin on public.restaurant_categories
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy restaurant_categories_delete_admin on public.restaurant_categories
  for delete to authenticated
  using ((select private.is_admin()));

insert into public.restaurant_categories (slug, label, sort_order) values
  ('korean', '한식', 10),
  ('japanese', '일식', 20),
  ('chinese', '중식', 30),
  ('western', '양식', 40),
  ('bunsik', '분식', 50),
  ('asian', '아시안', 60),
  ('fast_food', '패스트푸드', 70),
  ('cafe_bakery', '카페·베이커리', 80),
  ('other', '기타', 90);

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------
create type public.restaurant_status as enum ('pending', 'approved', 'rejected', 'archived');
-- External sources are excluded until provider data rights are verified (D-07).
create type public.restaurant_source as enum ('user_submitted', 'admin_entered');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  address text not null check (char_length(btrim(address)) between 1 and 200),
  -- WGS84; input as (longitude, latitude); distances in meters.
  location extensions.geography(Point, 4326) not null,
  category_id smallint not null references public.restaurant_categories (id),
  status public.restaurant_status not null default 'pending',
  source_type public.restaurant_source not null default 'user_submitted',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurants_location_idx on public.restaurants using gist (location);
create index restaurants_status_category_idx on public.restaurants (status, category_id);
create index restaurants_created_by_idx on public.restaurants (created_by);

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function private.set_updated_at();

alter table public.restaurants enable row level security;
revoke all on table public.restaurants from anon, authenticated;
grant select on table public.restaurants to anon, authenticated;
grant insert (name, address, location, category_id, status, source_type),
  update (name, address, location, category_id, status, source_type),
  delete
  on table public.restaurants to authenticated;

create policy restaurants_select_approved on public.restaurants
  for select to anon
  using (status = 'approved');

create policy restaurants_select_visible on public.restaurants
  for select to authenticated
  using (
    status = 'approved'
    or created_by = (select auth.uid())
    or (select private.is_admin())
  );

-- Non-admins may only propose: pending, user-submitted, attributed to themselves.
create policy restaurants_insert_proposal on public.restaurants
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (
      created_by = (select auth.uid())
      and status = 'pending'
      and source_type = 'user_submitted'
    )
  );

create policy restaurants_update_admin on public.restaurants
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy restaurants_delete_admin on public.restaurants
  for delete to authenticated
  using ((select private.is_admin()));
