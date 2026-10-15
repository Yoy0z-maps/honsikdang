-- WP-03b: search_restaurants bounds mode (visible map area).
begin;
\ir _fixtures.psql
select plan(11);

delete from public.restaurants;

-- Grid of approved restaurants around 37.56 / 126.97 plus one pending.
insert into public.restaurants (id, name, address, location, category_id, status, created_by)
select v.id::uuid, v.name, '서울', extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
       (select id from public.restaurant_categories where slug = 'korean'),
       v.status::public.restaurant_status, :'admin_id'::uuid
from (values
  ('f0000000-0000-4000-8000-000000000001', '안쪽 A', 37.560, 126.970, 'approved'),
  ('f0000000-0000-4000-8000-000000000002', '안쪽 B', 37.565, 126.975, 'approved'),
  ('f0000000-0000-4000-8000-000000000003', '모서리', 37.570, 126.980, 'approved'),
  ('f0000000-0000-4000-8000-000000000004', '바깥 북', 37.5701, 126.975, 'approved'),
  ('f0000000-0000-4000-8000-000000000005', '바깥 동', 37.565, 126.9801, 'approved'),
  ('f0000000-0000-4000-8000-000000000006', '대기 중', 37.562, 126.972, 'pending')
) as v (id, name, lat, lng, status);

:as_anon

select set_eq(
  $$ select name from public.search_restaurants(37.565, 126.975,
       min_lat => 37.55, min_lng => 126.96, max_lat => 37.57, max_lng => 126.98) $$,
  array['안쪽 A', '안쪽 B', '모서리'],
  'bounds include edges and exclude points just outside and pending rows'
);

select results_eq(
  $$ select name from public.search_restaurants(37.565, 126.975,
       min_lat => 37.55, min_lng => 126.96, max_lat => 37.57, max_lng => 126.98) $$,
  array['안쪽 B', '모서리', '안쪽 A'],
  'bounds results are ordered by distance from the center'
);

select results_eq(
  $$ select distinct total_count from public.search_restaurants(37.565, 126.975,
       min_lat => 37.55, min_lng => 126.96, max_lat => 37.57, max_lng => 126.98,
       query => '안쪽') $$,
  array[2],
  'other filters still apply in bounds mode'
);

select results_eq(
  $$ select count(*)::int from public.search_restaurants(37.565, 126.975, 800) $$,
  array[5],
  'radius mode still works when no bounds are given'
);

select throws_ok(
  $$ select * from public.search_restaurants(37.565, 126.975) $$,
  '22023', null, 'an area is required'
);
select throws_ok(
  $$ select * from public.search_restaurants(37.565, 126.975, 1000,
       min_lat => 37.55, min_lng => 126.96, max_lat => 37.57, max_lng => 126.98) $$,
  '22023', null, 'radius and bounds together are rejected'
);
select throws_ok(
  $$ select * from public.search_restaurants(37.565, 126.975,
       min_lat => 37.55, min_lng => 126.96, max_lat => 37.57) $$,
  '22023', null, 'partial bounds are rejected'
);
select throws_ok(
  $$ select * from public.search_restaurants(37.565, 126.975,
       min_lat => 37.57, min_lng => 126.96, max_lat => 37.55, max_lng => 126.98) $$,
  '22023', null, 'inverted bounds are rejected'
);
select throws_ok(
  $$ select * from public.search_restaurants(37.565, 126.975,
       min_lat => 126.96, min_lng => 37.55, max_lat => 126.98, max_lng => 37.57) $$,
  '22023', null, 'swapped lat/lng bounds are rejected'
);
select throws_ok(
  $$ select * from public.search_restaurants(37.5, 127.0,
       min_lat => 37.4, min_lng => 126.9, max_lat => 37.65, max_lng => 127.1) $$,
  '22023', null, 'bounds larger than 0.2 x 0.25 degrees are rejected'
);
select lives_ok(
  $$ select * from public.search_restaurants(37.5, 127.0,
       min_lat => 37.4, min_lng => 126.9, max_lat => 37.6, max_lng => 127.15) $$,
  'bounds exactly 0.2 x 0.25 degrees are accepted'
);

select * from finish();
rollback;
