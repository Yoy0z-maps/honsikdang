-- WP-03b: map-bounds search (master plan §5A, decision Q21).
--
-- search_restaurants now takes exactly one area:
--   bounds  min_lat/min_lng/max_lat/max_lng (the visible map), at most
--           0.2° lat × 0.25° lng (~22 km) — the default discovery mode
--   radius  radius_m 1–5000 around the center — when the radius filter is on
-- The center is always required: results are ordered by distance from it.
-- Other filters and outputs are unchanged (see 20261015021325).
--
-- Rollback (local only): drop this function and re-run the
-- search_restaurants definition from 20261015021325_discovery_search.sql.

drop function public.search_restaurants(double precision, double precision, integer,
  text[], integer, text[], text, integer, integer);

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
           max(v.visited_at) as last_visit
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
    select cd.*, s.n_reviews, s.comfort, s.price, s.last_visit,
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
