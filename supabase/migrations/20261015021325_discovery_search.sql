-- WP-03: discovery search and restaurant detail.
--
-- Both functions are SECURITY INVOKER (the default), so restaurants/reviews
-- RLS still applies to the caller. They additionally restrict to approved
-- rows so the public view is identical for every role.
--
-- Filter semantics (specs/decisions.md §12):
--   area        radius (1-5000 m) around a center; results ordered by distance, id
--   categories  any of the given slugs (OR)
--   max_price   median approved price_paid <= max_price; restaurants without
--               price data are excluded and counted (Q9)
--   tags        every given tag appears on >= 1 approved review (Q10)
--   query       case-insensitive substring of name or address
--   all groups are combined with AND
--
-- Rollback (local only):
--   drop function if exists public.search_restaurants(double precision, double precision,
--     integer, text[], integer, text[], text, integer, integer);
--   drop function if exists public.restaurant_detail(uuid);
--   drop index if exists public.restaurants_name_trgm_idx, public.restaurants_address_trgm_idx;

create extension if not exists pg_trgm with schema extensions;

create index restaurants_name_trgm_idx
  on public.restaurants using gin (name extensions.gin_trgm_ops);
create index restaurants_address_trgm_idx
  on public.restaurants using gin (address extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- search_restaurants
-- ---------------------------------------------------------------------------
create function public.search_restaurants(
  center_lat double precision,
  center_lng double precision,
  radius_m integer default 1000,
  category_slugs text[] default null,
  max_price integer default null,
  tag_slugs text[] default null,
  query text default null,
  result_limit integer default 20,
  result_offset integer default 0
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
  pattern text;
  needed_tags integer;
begin
  if center_lat is null or center_lng is null
     or center_lat not between -90 and 90
     or center_lng not between -180 and 180 then
    raise exception 'center_lat and center_lng must be valid WGS84 coordinates'
      using errcode = 'invalid_parameter_value';
  end if;
  if radius_m is null or radius_m not between 1 and 5000 then
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
    -- Treat the query as a literal substring: escape LIKE wildcards.
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
       and extensions.st_dwithin(r.location, center, radius_m)
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
  text[], integer, text[], text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_restaurants(double precision, double precision, integer,
  text[], integer, text[], text, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- restaurant_detail: public view of one approved restaurant, or null.
-- Reviewer identity is not exposed (Q4).
-- ---------------------------------------------------------------------------
create function public.restaurant_detail(restaurant_id uuid)
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
    'reviews', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', v.id,
                 'visited_at', v.visited_at,
                 'created_at', v.created_at,
                 'updated_at', v.updated_at,
                 'solo_comfort', v.solo_comfort,
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

revoke all on function public.restaurant_detail(uuid) from public, anon, authenticated;
grant execute on function public.restaurant_detail(uuid) to anon, authenticated;
