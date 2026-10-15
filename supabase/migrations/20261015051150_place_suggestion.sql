-- WP-04b: place suggestion with duplicate detection (FR-006, decision Q17).
--
-- Duplicate rules over approved + pending restaurants (rejected/archived are
-- ignored):
--   block  same normalized name within 50 m
--   warn   name similarity >= 0.4 within 100 m, or any restaurant within 20 m;
--          submission requires confirm_not_duplicate and the candidates are
--          recorded for moderators (04c)
--
-- Direct INSERT on restaurants is revoked from API roles: suggestions go
-- through suggest_restaurant so dedupe and the daily limit (5, Q16) cannot
-- be bypassed (gap found while designing 04b; WP-02 allowed direct inserts).
--
-- Rollback (local only):
--   drop function if exists public.suggest_restaurant, private.place_duplicates,
--     private.validate_place_input, private.limit_place_submissions;
--   drop trigger if exists restaurants_rate_limit on public.restaurants;
--   drop table if exists public.restaurant_duplicate_candidates;
--   alter table public.restaurants drop column if exists name_normalized;
--   drop function if exists private.normalize_name(text);
--   (and restore the insert grant/policy from 20261015005832)

-- ---------------------------------------------------------------------------
-- Name normalization: NFKC, lower case, letters/digits only.
-- ---------------------------------------------------------------------------
create function private.normalize_name(raw text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(lower(normalize(coalesce(raw, ''), NFKC)), '[^[:alnum:]]', '', 'g');
$$;
revoke all on function private.normalize_name(text) from public, anon, authenticated;
-- Needed whenever an API role writes restaurants.name (generated column).
grant execute on function private.normalize_name(text) to authenticated;

alter table public.restaurants
  add column name_normalized text
  generated always as (private.normalize_name(name)) stored;

create index restaurants_name_normalized_trgm_idx
  on public.restaurants using gin (name_normalized extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Only suggest_restaurant may create restaurants from the API.
-- ---------------------------------------------------------------------------
drop policy restaurants_insert_proposal on public.restaurants;
revoke insert on table public.restaurants from authenticated;

create function private.limit_place_submissions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    perform private.enforce_submission_limit('place', 5);
  end if;
  return new;
end;
$$;
revoke all on function private.limit_place_submissions() from public, anon, authenticated;

create trigger restaurants_rate_limit
  before insert on public.restaurants
  for each row execute function private.limit_place_submissions();

-- ---------------------------------------------------------------------------
-- Matching, used by suggest_restaurant (which runs as definer and so sees
-- all approved/pending rows). Not exposed via the Data API.
-- ---------------------------------------------------------------------------
create function private.place_duplicates(p_lat double precision, p_lng double precision, p_name text)
returns table (
  restaurant_id uuid,
  name text,
  status public.restaurant_status,
  created_by uuid,
  distance_m integer,
  name_similarity real,
  reason text,
  blocking boolean
)
language sql
stable
set search_path = ''
as $$
  with p as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g,
           private.normalize_name(p_name) as n
  ), m as (
    select r.id, r.name, r.status, r.created_by,
           round(extensions.st_distance(r.location, p.g))::integer as dist,
           extensions.similarity(r.name_normalized, p.n) as sim,
           (r.name_normalized = p.n and extensions.st_dwithin(r.location, p.g, 50)) as same_name,
           extensions.st_dwithin(r.location, p.g, 20) as very_close
      from public.restaurants r, p
     where r.status in ('approved', 'pending')
       and extensions.st_dwithin(r.location, p.g, 100)
  )
  select m.id, m.name, m.status, m.created_by, m.dist, m.sim,
         case when m.same_name then 'same_name'
              when m.very_close then 'very_close'
              else 'similar_name' end,
         m.same_name
    from m
   where m.same_name or m.very_close or m.sim >= 0.4
   order by m.same_name desc, m.dist
   limit 10;
$$;
revoke all on function private.place_duplicates(double precision, double precision, text)
  from public, anon, authenticated;

create function private.validate_place_input(
  p_name text, p_address text, p_lat double precision, p_lng double precision
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid coordinates' using errcode = 'invalid_parameter_value';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 100
     or private.normalize_name(p_name) = '' then
    raise exception 'invalid name' using errcode = 'invalid_parameter_value';
  end if;
  if p_address is not null and char_length(btrim(p_address)) not between 2 and 200 then
    raise exception 'invalid address' using errcode = 'invalid_parameter_value';
  end if;
end;
$$;
revoke all on function private.validate_place_input(text, text, double precision, double precision)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Candidates recorded for moderators (admin-only read).
-- ---------------------------------------------------------------------------
create table public.restaurant_duplicate_candidates (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  candidate_id uuid not null references public.restaurants (id) on delete cascade,
  reason text not null check (reason in ('same_name', 'very_close', 'similar_name')),
  name_similarity real not null,
  distance_m integer not null,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, candidate_id)
);
create index restaurant_duplicate_candidates_candidate_idx
  on public.restaurant_duplicate_candidates (candidate_id);

alter table public.restaurant_duplicate_candidates enable row level security;
revoke all on table public.restaurant_duplicate_candidates from anon, authenticated;
grant select on table public.restaurant_duplicate_candidates to authenticated;

create policy restaurant_duplicate_candidates_select_admin on public.restaurant_duplicate_candidates
  for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- suggest_restaurant
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so dedupe also sees other users' pending proposals (hidden
-- by RLS). Guards: requires auth.uid(); status/source/creator are fixed; the
-- daily limit applies via trigger (auth.uid() is still the caller); other
-- users' pending matches are reported without name or id.
create function public.suggest_restaurant(
  name text,
  address text,
  lat double precision,
  lng double precision,
  category_slug text,
  confirm_not_duplicate boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  category smallint;
  found jsonb;
  has_block boolean;
  has_any boolean;
  new_id uuid;
begin
  if uid is null then
    raise exception 'sign in required' using errcode = 'insufficient_privilege';
  end if;
  perform private.validate_place_input(suggest_restaurant.name, suggest_restaurant.address,
                                       suggest_restaurant.lat, suggest_restaurant.lng);
  if suggest_restaurant.address is null then
    raise exception 'invalid address' using errcode = 'invalid_parameter_value';
  end if;
  select c.id into category from public.restaurant_categories c where c.slug = suggest_restaurant.category_slug;
  if category is null then
    raise exception 'unknown category' using errcode = 'invalid_parameter_value';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'restaurant_id', case when d.status = 'approved' or d.created_by = uid then d.restaurant_id end,
           'restaurant_name', case when d.status = 'approved' or d.created_by = uid then d.name end,
           'status', d.status,
           'mine', d.created_by is not distinct from uid,
           'distance_m', d.distance_m,
           'reason', d.reason,
           'blocking', d.blocking
         ) order by d.blocking desc, d.distance_m), '[]'::jsonb),
         coalesce(bool_or(d.blocking), false),
         count(*) > 0
    into found, has_block, has_any
    from private.place_duplicates(suggest_restaurant.lat, suggest_restaurant.lng,
                                  suggest_restaurant.name) as d;

  if has_block then
    return jsonb_build_object('status', 'blocked', 'matches', found);
  end if;
  if has_any and not coalesce(confirm_not_duplicate, false) then
    return jsonb_build_object('status', 'needs_confirmation', 'matches', found);
  end if;

  insert into public.restaurants (name, address, location, category_id, status, source_type, created_by)
  values (btrim(suggest_restaurant.name), btrim(suggest_restaurant.address),
          extensions.st_setsrid(extensions.st_makepoint(suggest_restaurant.lng, suggest_restaurant.lat), 4326)::extensions.geography,
          category, 'pending', 'user_submitted', uid)
  returning id into new_id;

  insert into public.restaurant_duplicate_candidates (restaurant_id, candidate_id, reason, name_similarity, distance_m)
  select new_id, d.restaurant_id, d.reason, d.name_similarity, d.distance_m
    from private.place_duplicates(suggest_restaurant.lat, suggest_restaurant.lng,
                                  suggest_restaurant.name) as d
   where d.restaurant_id <> new_id;

  return jsonb_build_object('status', 'created', 'restaurant_id', new_id, 'matches', found);
end;
$$;
revoke all on function public.suggest_restaurant(text, text, double precision, double precision, text, boolean)
  from public, anon, authenticated;
grant execute on function public.suggest_restaurant(text, text, double precision, double precision, text, boolean)
  to authenticated;
