-- WP-08: overall star rating and menu prices on reviews (C-85…C-87).
--
-- * restaurant_reviews.overall_rating ★1–5: required for new reviews and
--   edits (RPCs check), null for reviews written before this change (Q74).
-- * review_menu_items: up to 5 "menu + price" lines per review, same
--   visibility and freeze rules as review tags; changes send the review back
--   to moderation.
-- * restaurant_detail / search_restaurants / my_reviews expose them.
--
-- Rollback: drop table public.review_menu_items; alter table
--   public.restaurant_reviews drop column overall_rating; re-run the previous
--   definitions of submit_review, update_my_review, my_reviews,
--   restaurant_detail (20261015021325) and search_restaurants (20261015043247).

alter table public.restaurant_reviews
  add column overall_rating smallint check (overall_rating between 1 and 5);
grant insert (overall_rating), update (overall_rating)
  on table public.restaurant_reviews to authenticated;

-- Editing the rating is a content edit like the others: back to moderation.
create or replace function private.guard_review_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or (select private.is_admin()) then
    return new;
  end if;

  if old.status = 'removed' then
    raise exception 'removed reviews cannot be edited'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status is distinct from old.status and new.status <> 'pending' then
    raise exception 'only moderators can change review status'
      using errcode = 'insufficient_privilege';
  end if;

  if (new.visited_at, new.solo_comfort, new.seat_type, new.solo_order_available,
      new.price_paid, new.wait_minutes, new.body, new.overall_rating)
     is distinct from
     (old.visited_at, old.solo_comfort, old.seat_type, old.solo_order_available,
      old.price_paid, old.wait_minutes, old.body, old.overall_rating) then
    new.status := 'pending';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Menu prices
-- ---------------------------------------------------------------------------
create table public.review_menu_items (
  review_id uuid not null references public.restaurant_reviews (id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  name text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  price integer not null check (price between 100 and 1000000),
  primary key (review_id, position)
);

alter table public.review_menu_items enable row level security;
revoke all on table public.review_menu_items from anon, authenticated;
grant select on table public.review_menu_items to anon, authenticated;
grant insert (review_id, position, name, price), delete
  on table public.review_menu_items to authenticated;

-- Visibility follows the parent review's RLS.
create policy review_menu_items_select_visible on public.review_menu_items
  for select to anon, authenticated
  using (exists (select 1 from public.restaurant_reviews r where r.id = review_id));

create policy review_menu_items_insert_own on public.review_menu_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.restaurant_reviews r
      where r.id = review_id and r.user_id = (select auth.uid()) and r.status <> 'removed'
    )
  );

create policy review_menu_items_delete_own on public.review_menu_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.restaurant_reviews r
      where r.id = review_id and r.user_id = (select auth.uid()) and r.status <> 'removed'
    )
  );

-- Same trigger function as tags: author edits send the review to moderation.
create trigger review_menu_items_mark_pending
  after insert or delete on public.review_menu_items
  for each row execute function private.review_tags_mark_pending();

-- Validates [{"name","price"}…] (≤5) for the RPCs below.
create function private.check_menu_items(items jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 5 then
    raise exception 'menu_items must be an array of at most 5 items' using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.check_menu_items(jsonb) from public, anon, authenticated;
grant execute on function private.check_menu_items(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- submit / update with rating and menu items
-- ---------------------------------------------------------------------------
drop function public.submit_review(uuid, date, smallint, public.seat_type, boolean,
  integer, integer, text, text[]);
drop function public.update_my_review(uuid, date, smallint, public.seat_type, boolean,
  integer, integer, text, text[]);

create function public.submit_review(
  restaurant_id uuid,
  visited_at date,
  solo_comfort smallint,
  seat_type public.seat_type,
  overall_rating smallint,
  solo_order_available boolean default null,
  price_paid integer default null,
  wait_minutes integer default null,
  body text default null,
  tag_slugs text[] default '{}',
  menu_items jsonb default '[]'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  tag_ids smallint[] := private.resolve_tag_ids(tag_slugs);
  new_id uuid;
begin
  if overall_rating is null then
    raise exception 'overall_rating is required' using errcode = '22023';
  end if;
  perform private.check_menu_items(menu_items);

  insert into public.restaurant_reviews
    (restaurant_id, visited_at, solo_comfort, seat_type, overall_rating,
     solo_order_available, price_paid, wait_minutes, body)
  values
    (submit_review.restaurant_id, submit_review.visited_at, submit_review.solo_comfort,
     submit_review.seat_type, submit_review.overall_rating, submit_review.solo_order_available,
     submit_review.price_paid, submit_review.wait_minutes, nullif(btrim(submit_review.body), ''))
  returning id into new_id;

  insert into public.review_tags (review_id, tag_id)
  select new_id, t from unnest(tag_ids) as t;

  insert into public.review_menu_items (review_id, position, name, price)
  select new_id, e.ord, btrim(e.item->>'name'), (e.item->>'price')::integer
    from jsonb_array_elements(menu_items) with ordinality as e (item, ord);

  return new_id;
end;
$$;
revoke all on function public.submit_review(uuid, date, smallint, public.seat_type, smallint,
  boolean, integer, integer, text, text[], jsonb) from public, anon, authenticated;
grant execute on function public.submit_review(uuid, date, smallint, public.seat_type, smallint,
  boolean, integer, integer, text, text[], jsonb) to authenticated;

create function public.update_my_review(
  review_id uuid,
  visited_at date,
  solo_comfort smallint,
  seat_type public.seat_type,
  overall_rating smallint,
  solo_order_available boolean default null,
  price_paid integer default null,
  wait_minutes integer default null,
  body text default null,
  tag_slugs text[] default '{}',
  menu_items jsonb default '[]'
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  tag_ids smallint[] := private.resolve_tag_ids(tag_slugs);
  wanted jsonb;
  current_items jsonb;
begin
  if overall_rating is null then
    raise exception 'overall_rating is required' using errcode = '22023';
  end if;
  perform private.check_menu_items(menu_items);

  update public.restaurant_reviews r
     set visited_at = update_my_review.visited_at,
         solo_comfort = update_my_review.solo_comfort,
         seat_type = update_my_review.seat_type,
         overall_rating = update_my_review.overall_rating,
         solo_order_available = update_my_review.solo_order_available,
         price_paid = update_my_review.price_paid,
         wait_minutes = update_my_review.wait_minutes,
         body = nullif(btrim(update_my_review.body), '')
   where r.id = update_my_review.review_id
     and r.user_id = (select auth.uid());

  if not found then
    raise exception 'review not found' using errcode = 'no_data_found';
  end if;

  delete from public.review_tags rt
   where rt.review_id = update_my_review.review_id
     and rt.tag_id <> all (tag_ids);

  insert into public.review_tags (review_id, tag_id)
  select update_my_review.review_id, t
    from unnest(tag_ids) as t
   where not exists (
     select 1 from public.review_tags rt
      where rt.review_id = update_my_review.review_id and rt.tag_id = t
   );

  -- Menu lines are replaced only when they actually changed, so an
  -- unchanged edit does not trigger moderation through them.
  select coalesce(jsonb_agg(jsonb_build_object('name', btrim(e.item->>'name'),
                                               'price', (e.item->>'price')::integer)
                            order by e.ord), '[]')
    into wanted
    from jsonb_array_elements(menu_items) with ordinality as e (item, ord);
  select coalesce(jsonb_agg(jsonb_build_object('name', m.name, 'price', m.price)
                            order by m.position), '[]')
    into current_items
    from public.review_menu_items m
   where m.review_id = update_my_review.review_id;

  if wanted is distinct from current_items then
    delete from public.review_menu_items m where m.review_id = update_my_review.review_id;
    insert into public.review_menu_items (review_id, position, name, price)
    select update_my_review.review_id, e.ord, e.item->>'name', (e.item->>'price')::integer
      from jsonb_array_elements(wanted) with ordinality as e (item, ord);
  end if;
end;
$$;
revoke all on function public.update_my_review(uuid, date, smallint, public.seat_type, smallint,
  boolean, integer, integer, text, text[], jsonb) from public, anon, authenticated;
grant execute on function public.update_my_review(uuid, date, smallint, public.seat_type, smallint,
  boolean, integer, integer, text, text[], jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- my_reviews (edit form prefill)
-- ---------------------------------------------------------------------------
drop function public.my_reviews(uuid);
create function public.my_reviews(review_id uuid default null)
returns table (
  id uuid,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_status public.restaurant_status,
  visited_at date,
  solo_comfort smallint,
  seat_type public.seat_type,
  solo_order_available boolean,
  price_paid integer,
  wait_minutes integer,
  body text,
  status public.review_status,
  tag_slugs text[],
  created_at timestamptz,
  updated_at timestamptz,
  moderation_reason text,
  overall_rating smallint,
  menu_items jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.restaurant_id, r.name, r.status,
         v.visited_at, v.solo_comfort, v.seat_type, v.solo_order_available,
         v.price_paid, v.wait_minutes, v.body, v.status,
         coalesce((
           select array_agg(t.slug order by t.id)
             from public.review_tags rt
             join public.tags t on t.id = rt.tag_id
            where rt.review_id = v.id
         ), '{}'),
         v.created_at, v.updated_at,
         case when v.status in ('rejected', 'removed')
              then private.latest_moderation_reason('review', v.id) end,
         v.overall_rating,
         coalesce((
           select jsonb_agg(jsonb_build_object('name', m.name, 'price', m.price) order by m.position)
             from public.review_menu_items m
            where m.review_id = v.id
         ), '[]')
    from public.restaurant_reviews v
    join public.restaurants r on r.id = v.restaurant_id
   where v.user_id = (select auth.uid())
     and (my_reviews.review_id is null or v.id = my_reviews.review_id)
   order by v.created_at desc
   limit 100;
$$;
revoke all on function public.my_reviews(uuid) from public, anon, authenticated;
grant execute on function public.my_reviews(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- restaurant_detail: rating summary, per-review rating and menu, menu prices
-- ---------------------------------------------------------------------------
create or replace function public.restaurant_detail(restaurant_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'address', r.address,
    'lat', extensions.st_y(r.location::extensions.geometry),
    'lng', extensions.st_x(r.location::extensions.geometry),
    'category', jsonb_build_object('slug', c.slug, 'label', c.label),
    'source_type', r.source_type,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'summary', (
      select jsonb_build_object(
        'review_count', count(*),
        'avg_solo_comfort', round(avg(v.solo_comfort), 1),
        'avg_rating', round(avg(v.overall_rating), 1),
        'rating_count', count(v.overall_rating),
        'median_price', round(percentile_cont(0.5) within group (order by v.price_paid))::integer,
        'price_sample_count', count(v.price_paid),
        'median_wait_minutes', round(percentile_cont(0.5) within group (order by v.wait_minutes))::integer,
        'wait_sample_count', count(v.wait_minutes),
        'solo_order_yes', count(*) filter (where v.solo_order_available),
        'solo_order_no', count(*) filter (where not v.solo_order_available),
        'last_visited_at', max(v.visited_at)
      )
      from public.restaurant_reviews v
      where v.restaurant_id = r.id and v.status = 'approved'
    ),
    'tags', coalesce((
      select jsonb_agg(
               jsonb_build_object('slug', t.slug, 'label', t.label, 'review_count', x.n)
               order by x.n desc, t.slug)
      from (
        select rt.tag_id, count(*)::integer as n
        from public.review_tags rt
        join public.restaurant_reviews v on v.id = rt.review_id
        where v.restaurant_id = r.id and v.status = 'approved'
        group by rt.tag_id
      ) as x
      join public.tags t on t.id = x.tag_id
    ), '[]'::jsonb),
    -- Latest reported price per menu name (approved reviews, at most 10).
    'menu_prices', coalesce((
      select jsonb_agg(jsonb_build_object('name', mp.name, 'price', mp.price,
                                          'visited_at', mp.visited_at)
                       order by mp.visited_at desc, mp.name)
      from (
        select distinct on (lower(m.name)) m.name, m.price, v.visited_at
          from public.review_menu_items m
          join public.restaurant_reviews v on v.id = m.review_id
         where v.restaurant_id = r.id and v.status = 'approved'
         order by lower(m.name), v.visited_at desc, v.created_at desc
      ) as mp
      limit 10
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', v.id,
                 'visited_at', v.visited_at,
                 'created_at', v.created_at,
                 'updated_at', v.updated_at,
                 'solo_comfort', v.solo_comfort,
                 'overall_rating', v.overall_rating,
                 'seat_type', v.seat_type,
                 'solo_order_available', v.solo_order_available,
                 'price_paid', v.price_paid,
                 'wait_minutes', v.wait_minutes,
                 'body', v.body,
                 'tags', coalesce((
                   select jsonb_agg(t.label order by t.label)
                   from public.review_tags rt
                   join public.tags t on t.id = rt.tag_id
                   where rt.review_id = v.id
                 ), '[]'::jsonb),
                 'menu_items', coalesce((
                   select jsonb_agg(jsonb_build_object('name', m.name, 'price', m.price)
                                    order by m.position)
                   from public.review_menu_items m
                   where m.review_id = v.id
                 ), '[]'::jsonb)
               )
               order by v.visited_at desc, v.created_at desc)
      from (
        select *
        from public.restaurant_reviews rv
        where rv.restaurant_id = r.id and rv.status = 'approved'
        order by rv.visited_at desc, rv.created_at desc
        limit 50
      ) as v
    ), '[]'::jsonb)
  )
  from public.restaurants r
  join public.restaurant_categories c on c.id = r.category_id
  where r.id = restaurant_detail.restaurant_id
    and r.status = 'approved';
$$;

-- ---------------------------------------------------------------------------
-- search_restaurants: + avg_rating, rating_count (same filters and order)
-- ---------------------------------------------------------------------------
drop function public.search_restaurants(double precision, double precision, integer,
  text[], integer, text[], text, integer, integer, double precision, double precision,
  double precision, double precision);

create function public.search_restaurants(
  center_lat double precision,
  center_lng double precision,
  radius_m integer default null,
  category_slugs text[] default null,
  max_price integer default null,
  tag_slugs text[] default null,
  query text default null,
  result_limit integer default 20,
  result_offset integer default 0,
  min_lat double precision default null,
  min_lng double precision default null,
  max_lat double precision default null,
  max_lng double precision default null
)
returns table (
  id uuid,
  name text,
  address text,
  lat double precision,
  lng double precision,
  category_slug text,
  category_label text,
  distance_m integer,
  review_count integer,
  avg_solo_comfort numeric,
  median_price integer,
  last_visited_at date,
  avg_rating numeric,
  rating_count integer,
  tag_review_count integer,
  total_count integer,
  excluded_no_price_count integer
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  center extensions.geography;
  box extensions.geography;
  use_bounds boolean;
  bound_count integer;
  pattern text;
  needed_tags integer;
begin
  if center_lat is null or center_lng is null
     or center_lat not between -90 and 90
     or center_lng not between -180 and 180 then
    raise exception 'center_lat and center_lng must be valid WGS84 coordinates'
      using errcode = 'invalid_parameter_value';
  end if;

  bound_count := num_nonnulls(min_lat, min_lng, max_lat, max_lng);
  if bound_count not in (0, 4) then
    raise exception 'bounds need all of min_lat, min_lng, max_lat, max_lng'
      using errcode = 'invalid_parameter_value';
  end if;
  use_bounds := bound_count = 4;
  if use_bounds = (radius_m is not null) then
    raise exception 'pass exactly one area: radius_m or bounds'
      using errcode = 'invalid_parameter_value';
  end if;

  if use_bounds then
    if min_lat not between -90 and 90 or max_lat not between -90 and 90
       or min_lng not between -180 and 180 or max_lng not between -180 and 180
       or min_lat >= max_lat or min_lng >= max_lng then
      raise exception 'bounds must be valid WGS84 with min < max'
        using errcode = 'invalid_parameter_value';
    end if;
    -- 1e-9 tolerance: e.g. 37.6 - 37.4 is 0.20000000000000284 in float8.
    if max_lat - min_lat > 0.2 + 1e-9 or max_lng - min_lng > 0.25 + 1e-9 then
      raise exception 'bounds too large; zoom in'
        using errcode = 'invalid_parameter_value';
    end if;
    box := extensions.st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::extensions.geography;
  elsif radius_m not between 1 and 5000 then
    raise exception 'radius_m must be between 1 and 5000'
      using errcode = 'invalid_parameter_value';
  end if;

  if result_limit is null or result_limit not between 1 and 50 then
    raise exception 'result_limit must be between 1 and 50'
      using errcode = 'invalid_parameter_value';
  end if;
  if result_offset is null or result_offset not between 0 and 1000 then
    raise exception 'result_offset must be between 0 and 1000'
      using errcode = 'invalid_parameter_value';
  end if;
  if max_price is not null and max_price not between 0 and 1000000 then
    raise exception 'max_price must be between 0 and 1000000'
      using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(cardinality(category_slugs), 0) > 20 or coalesce(cardinality(tag_slugs), 0) > 20 then
    raise exception 'at most 20 categories and 20 tags'
      using errcode = 'invalid_parameter_value';
  end if;
  if query is not null and char_length(query) > 100 then
    raise exception 'query must be at most 100 characters'
      using errcode = 'invalid_parameter_value';
  end if;

  center := extensions.st_setsrid(extensions.st_makepoint(center_lng, center_lat), 4326)::extensions.geography;

  pattern := nullif(btrim(query), '');
  if pattern is not null then
    pattern := '%' || replace(replace(replace(pattern, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  needed_tags := (select count(distinct s) from unnest(coalesce(tag_slugs, '{}')) as s);

  return query
  with candidates as (
    select r.id as rid,
           r.name as rname,
           r.address as raddress,
           r.location as rlocation,
           c.slug as cslug,
           c.label as clabel,
           extensions.st_distance(r.location, center) as distance
      from public.restaurants r
      join public.restaurant_categories c on c.id = r.category_id
     where r.status = 'approved'
       and (
         (use_bounds
           -- && narrows via the GiST index; the explicit lat/lng test makes
           -- the edges exact (geography boxes are geocentric).
           and r.location operator(extensions.&&) box
           and extensions.st_y(r.location::extensions.geometry) between min_lat and max_lat
           and extensions.st_x(r.location::extensions.geometry) between min_lng and max_lng)
         or (not use_bounds and extensions.st_dwithin(r.location, center, radius_m))
       )
       and (coalesce(cardinality(category_slugs), 0) = 0 or c.slug = any (category_slugs))
       and (pattern is null or r.name ilike pattern or r.address ilike pattern)
  ),
  stats as (
    select cd.rid,
           count(v.id)::integer as n_reviews,
           round(avg(v.solo_comfort), 1) as comfort,
           round(percentile_cont(0.5) within group (order by v.price_paid))::integer as price,
           max(v.visited_at) as last_visit,
           round(avg(v.overall_rating), 1) as rating,
           count(v.overall_rating)::integer as n_ratings
      from candidates cd
      left join public.restaurant_reviews v
        on v.restaurant_id = cd.rid and v.status = 'approved'
     group by cd.rid
  ),
  tag_matches as (
    select v.restaurant_id as rid,
           count(distinct t.slug)::integer as matched_tags,
           count(distinct v.id)::integer as n_tag_reviews
      from public.restaurant_reviews v
      join public.review_tags rt on rt.review_id = v.id
      join public.tags t on t.id = rt.tag_id
     where needed_tags > 0
       and v.status = 'approved'
       and v.restaurant_id in (select cd.rid from candidates cd)
       and t.slug = any (tag_slugs)
     group by v.restaurant_id
  ),
  eligible as (
    select cd.*, s.n_reviews, s.comfort, s.price, s.last_visit, s.rating, s.n_ratings,
           coalesce(tm.n_tag_reviews, 0) as n_tag_reviews
      from candidates cd
      join stats s on s.rid = cd.rid
      left join tag_matches tm on tm.rid = cd.rid
     where needed_tags = 0 or coalesce(tm.matched_tags, 0) = needed_tags
  ),
  priced as (
    select e.*
      from eligible e
     where max_price is null or (e.price is not null and e.price <= max_price)
  )
  select p.rid,
         p.rname,
         p.raddress,
         extensions.st_y(p.rlocation::extensions.geometry),
         extensions.st_x(p.rlocation::extensions.geometry),
         p.cslug,
         p.clabel,
         round(p.distance)::integer,
         p.n_reviews,
         p.comfort,
         p.price,
         p.last_visit,
         p.rating,
         p.n_ratings,
         p.n_tag_reviews,
         (select count(*) from priced)::integer,
         (select count(*) from eligible e2 where max_price is not null and e2.price is null)::integer
    from priced p
   order by p.distance, p.rid
   limit result_limit
  offset result_offset;
end;
$$;
revoke all on function public.search_restaurants(double precision, double precision, integer,
  text[], integer, text[], text, integer, integer, double precision, double precision,
  double precision, double precision) from public, anon, authenticated;
grant execute on function public.search_restaurants(double precision, double precision, integer,
  text[], integer, text[], text, integer, integer, double precision, double precision,
  double precision, double precision) to anon, authenticated;
