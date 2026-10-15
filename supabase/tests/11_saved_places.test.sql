-- WP-04d: saving only approved places; my_saved privacy (Q35/Q36).
begin;
\ir _fixtures.psql
select plan(8);

select ok(not has_function_privilege('anon', 'public.my_saved()', 'execute'),
  'anon cannot list saved places');

:as_owner
select throws_ok(
  $$ insert into public.favorites (restaurant_id) values ('a0000000-0000-4000-8000-000000000003') $$,
  '42501', null, 'a user cannot save their own pending proposal'
);
select lives_ok(
  $$ insert into public.favorites (restaurant_id)
     values ('a0000000-0000-4000-8000-000000000001'), ('a0000000-0000-4000-8000-000000000002') $$,
  'a user can save approved places'
);
select results_eq(
  $$ select name, status::text, address is not null, round(lat::numeric, 3), round(lng::numeric, 3)
       from public.my_saved() where id = 'a0000000-0000-4000-8000-000000000001' $$,
  $$ values ('테스트 식당 A', 'approved', true, 37.566::numeric, 126.978::numeric) $$,
  'my_saved returns the place with lat/lng in WGS84 order'
);

:as_admin
select lives_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000002', 'archive', '폐업') $$,
  'admin archives a saved place'
);

:as_owner
select results_eq(
  $$ select status::text, address, lat, lng from public.my_saved()
      where id = 'a0000000-0000-4000-8000-000000000002' $$,
  $$ values ('archived', null::text, null::double precision, null::double precision) $$,
  'an archived saved place stays listed without its address or location'
);

:as_other
select is_empty($$ select * from public.my_saved() $$, 'other users see none of the owner''s saved places');

:as_owner
select results_eq(
  $$ delete from public.favorites where restaurant_id = 'a0000000-0000-4000-8000-000000000002'
     returning restaurant_id $$,
  array['a0000000-0000-4000-8000-000000000002'::uuid],
  'a user can unsave an archived place'
);

select * from finish();
rollback;
