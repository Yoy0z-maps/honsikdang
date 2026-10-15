-- search_restaurants and restaurant_detail: hard filters, distance, bounds.
begin;
\ir _fixtures.psql
select plan(30);

-- Replace the shared restaurant fixtures with points at exact geodesic
-- distances (st_project, meters, azimuth in radians) from the center.
delete from public.restaurants;

\set center_lat 37.5663
\set center_lng 126.9779

create temporary table pts (id uuid, name text, dist double precision, az double precision,
                            category text, status text) on commit drop;
insert into pts values
  ('c0000000-0000-4000-8000-000000000001', '가까운 국밥', 100, 0, 'korean', 'approved'),
  ('c0000000-0000-4000-8000-000000000002', '중간 라멘', 800, 1.5, 'japanese', 'approved'),
  ('c0000000-0000-4000-8000-000000000003', '경계 안 분식', 4999, 3.0, 'bunsik', 'approved'),
  ('c0000000-0000-4000-8000-000000000004', '경계 밖 분식', 5001, 3.0, 'bunsik', 'approved'),
  ('c0000000-0000-4000-8000-000000000005', '대기 중 식당', 200, 0.5, 'korean', 'pending'),
  ('c0000000-0000-4000-8000-000000000006', '100% 할인_집', 300, 2.0, 'other', 'approved'),
  ('c0000000-0000-4000-8000-000000000007', '가격 없는 식당', 400, 4.0, 'korean', 'approved');

insert into public.restaurants (id, name, address, location, category_id, status, created_by)
select p.id, p.name, '서울 테스트구 테스트로 ' || p.dist,
       extensions.st_project(
         extensions.st_setsrid(extensions.st_makepoint(:center_lng, :center_lat), 4326)::extensions.geography,
         p.dist, p.az),
       (select id from public.restaurant_categories where slug = p.category),
       p.status::public.restaurant_status, :'admin_id'::uuid
from pts p;

-- Reviews: prices and tags. Pending reviews must never count.
insert into public.restaurant_reviews
  (id, restaurant_id, user_id, visited_at, solo_comfort, seat_type, price_paid, status)
values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', :'owner_id', '2026-10-01', 5, 'counter', 8000, 'approved'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', :'other_id', '2026-10-03', 4, 'counter', 10000, 'approved'),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', :'owner_id', '2026-10-02', 3, 'booth', 15000, 'approved'),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', :'other_id', '2026-10-04', 1, 'booth', 5000, 'pending'),
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000007', :'owner_id', '2026-10-05', 4, 'single_table', null, 'approved');

insert into public.review_tags (review_id, tag_id)
select v.review_id::uuid, t.id
from (values
  ('d0000000-0000-4000-8000-000000000001', 'solo_seat'),
  ('d0000000-0000-4000-8000-000000000002', 'kiosk_order'),
  ('d0000000-0000-4000-8000-000000000003', 'solo_seat'),
  ('d0000000-0000-4000-8000-000000000004', 'kiosk_order')
) as v (review_id, slug)
join public.tags t on t.slug = v.slug;

-- privileges ---------------------------------------------------------------
select ok(has_function_privilege('anon',
  'public.search_restaurants(double precision, double precision, integer, text[], integer, text[], text, integer, integer)',
  'execute'), 'anon can execute search_restaurants');
select ok(has_function_privilege('anon', 'public.restaurant_detail(uuid)', 'execute'),
  'anon can execute restaurant_detail');

:as_anon

-- area and ordering ----------------------------------------------------------
select results_eq(
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000) $$,
  array['가까운 국밥', '100% 할인_집', '가격 없는 식당', '중간 라멘', '경계 안 분식'],
  'only approved restaurants within the radius, ordered by distance'
);

select results_eq(
  $$ select distance_m from public.search_restaurants(37.5663, 126.9779, 5000) where name = '경계 안 분식' $$,
  array[4999],
  'distance_m is the geodesic distance in meters'
);

select is_empty(
  $$ select 1 from public.search_restaurants(37.5663, 126.9779, 5000) where name = '경계 밖 분식' $$,
  'a restaurant 5001 m away is outside a 5000 m radius'
);

select results_eq(
  $$ select count(*)::int from public.search_restaurants(37.5663, 126.9779, 150) $$,
  array[1],
  'a 150 m radius returns only the 100 m restaurant'
);

select is_empty(
  $$ select 1 from public.search_restaurants(37.5663, 126.9779, 5000) where name = '대기 중 식당' $$,
  'pending restaurants are never returned'
);

select results_eq(
  $$ select round(lat::numeric, 3), round(lng::numeric, 3)
       from public.search_restaurants(37.5663, 126.9779, 150) $$,
  $$ values (37.567::numeric, 126.978::numeric) $$,
  'lat/lng are returned in WGS84 degrees (not swapped)'
);

-- aggregates -------------------------------------------------------------------
select results_eq(
  $$ select review_count, avg_solo_comfort, median_price, last_visited_at
       from public.search_restaurants(37.5663, 126.9779, 5000) where name = '중간 라멘' $$,
  $$ values (1, 3.0::numeric, 15000, '2026-10-02'::date) $$,
  'aggregates use approved reviews only'
);

select results_eq(
  $$ select review_count, median_price
       from public.search_restaurants(37.5663, 126.9779, 5000) where name = '가까운 국밥' $$,
  $$ values (2, 9000) $$,
  'median price of 8000 and 10000 is 9000'
);

-- category -----------------------------------------------------------------
select set_eq(
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000, category_slugs => array['korean', 'bunsik']) $$,
  array['가까운 국밥', '가격 없는 식당', '경계 안 분식'],
  'categories combine with OR'
);

select set_eq(
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000, category_slugs => array[]::text[]) $$,
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000) $$,
  'an empty category list means no category filter'
);

-- budget (Q9) ---------------------------------------------------------------
select set_eq(
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000, max_price => 9000) $$,
  array['가까운 국밥'],
  'max_price keeps restaurants whose median price is within budget'
);

select results_eq(
  $$ select distinct excluded_no_price_count, total_count
       from public.search_restaurants(37.5663, 126.9779, 5000, max_price => 9000) $$,
  $$ values (3, 1) $$,
  'restaurants without price data are excluded and counted'
);

select results_eq(
  $$ select distinct excluded_no_price_count
       from public.search_restaurants(37.5663, 126.9779, 5000) $$,
  array[0],
  'no exclusions are reported without a budget filter'
);

-- tags (Q10) ----------------------------------------------------------------
select set_eq(
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000, tag_slugs => array['solo_seat']) $$,
  array['가까운 국밥', '중간 라멘'],
  'tag filter matches restaurants with an approved review carrying the tag'
);

select set_eq(
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000, tag_slugs => array['solo_seat', 'kiosk_order']) $$,
  array['가까운 국밥'],
  'multiple tags combine with AND; pending review tags do not count'
);

select results_eq(
  $$ select tag_review_count from public.search_restaurants(37.5663, 126.9779, 5000, tag_slugs => array['solo_seat', 'kiosk_order']) $$,
  array[2],
  'tag_review_count counts approved reviews carrying any requested tag'
);

select is_empty(
  $$ select 1 from public.search_restaurants(37.5663, 126.9779, 5000, tag_slugs => array['no_such_tag']) $$,
  'an unknown tag matches nothing'
);

-- query --------------------------------------------------------------------
select results_eq(
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000, query => '라멘') $$,
  array['중간 라멘'],
  'query matches a substring of the name'
);

select results_eq(
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000, query => '100%') $$,
  array['100% 할인_집'],
  'LIKE wildcards in the query are treated literally'
);

select results_eq(
  $$ select name from public.search_restaurants(37.5663, 126.9779, 5000, query => '%') $$,
  array['100% 할인_집'],
  'a bare % matches only names containing a literal %, not everything'
);

-- pagination ---------------------------------------------------------------
select results_eq(
  $$ select name, total_count from public.search_restaurants(37.5663, 126.9779, 5000, result_limit => 2, result_offset => 2) $$,
  $$ values ('가격 없는 식당', 5), ('중간 라멘', 5) $$,
  'limit/offset page through results with a stable total_count'
);

-- bounds -------------------------------------------------------------------
select throws_ok(
  $$ select * from public.search_restaurants(37.5663, 126.9779, 5001) $$,
  '22023', null, 'radius above 5000 m is rejected'
);
select throws_ok(
  $$ select * from public.search_restaurants(37.5663, 126.9779, 1000, result_limit => 51) $$,
  '22023', null, 'result_limit above 50 is rejected'
);
select throws_ok(
  $$ select * from public.search_restaurants(126.9779, 37.5663, 1000) $$,
  '22023', null, 'swapped lat/lng (lat 126.9) is rejected'
);
select throws_ok(
  $$ select * from public.search_restaurants(37.5663, 126.9779, 1000, query => repeat('가', 101)) $$,
  '22023', null, 'query longer than 100 characters is rejected'
);

-- detail -------------------------------------------------------------------
select results_eq(
  $$ select (public.restaurant_detail('c0000000-0000-4000-8000-000000000002')
             -> 'summary' ->> 'review_count')::int $$,
  array[1],
  'detail summary counts approved reviews only'
);

select results_eq(
  $$ select jsonb_path_query_array(
             public.restaurant_detail('c0000000-0000-4000-8000-000000000001'),
             '$.reviews[*].visited_at') $$,
  array['["2026-10-03", "2026-10-01"]'::jsonb],
  'detail reviews are ordered by visit date, newest first'
);

select ok(
  public.restaurant_detail('c0000000-0000-4000-8000-000000000005') is null,
  'detail of a pending restaurant is null'
);

select * from finish();
rollback;
