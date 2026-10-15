-- restaurant_categories and restaurants authorization matrix.
begin;
\ir _fixtures.psql
select plan(18);

-- categories ---------------------------------------------------------------
:as_anon
select results_eq(
  $$ select count(*)::int from public.restaurant_categories $$,
  array[9],
  'anon can read the 9 seeded categories'
);

:as_owner
select throws_ok(
  $$ insert into public.restaurant_categories (slug, label) values ('test', '테스트') $$,
  '42501',
  null,
  'regular user cannot create categories'
);

:as_admin
select results_eq(
  $$ insert into public.restaurant_categories (slug, label) values ('test', '테스트') returning slug $$,
  array['test'],
  'admin can create categories'
);

-- restaurants: read --------------------------------------------------------
:as_anon
select set_eq(
  $$ select id from public.restaurants $$,
  array[:'r_approved_other'::uuid, :'r_approved_admin'::uuid],
  'anon sees only approved restaurants'
);

:as_owner
select set_eq(
  $$ select id from public.restaurants $$,
  array[:'r_approved_other'::uuid, :'r_approved_admin'::uuid, :'r_pending_owner'::uuid],
  'owner sees approved restaurants plus their own pending proposal'
);

:as_other
select set_eq(
  $$ select id from public.restaurants $$,
  array[:'r_approved_other'::uuid, :'r_approved_admin'::uuid, :'r_pending_other'::uuid],
  'other user does not see the owner''s pending proposal'
);

:as_admin
select results_eq(
  $$ select count(*)::int from public.restaurants $$,
  array[4],
  'admin sees every restaurant'
);

-- restaurants: write -------------------------------------------------------
:as_anon
select throws_ok(
  $$ insert into public.restaurants (name, address, location, category_id)
     values ('익명 제안', '서울', 'SRID=4326;POINT(127 37.5)', 1) $$,
  '42501',
  null,
  'anon cannot propose restaurants'
);

-- Since WP-04b, API roles cannot insert directly; suggestions go through
-- public.suggest_restaurant (dedupe + daily limit, see 09_place_suggestion).
:as_owner
select throws_ok(
  $$ insert into public.restaurants (name, address, location, category_id)
     values ('새 제안', '서울 테스트구 2', 'SRID=4326;POINT(127 37.5)', 1) $$,
  '42501',
  null,
  'regular users cannot insert restaurants directly'
);

select throws_ok(
  $$ insert into public.restaurants (name, address, location, category_id, status)
     values ('셀프 승인', '서울', 'SRID=4326;POINT(127 37.5)', 1, 'approved') $$,
  '42501',
  null,
  'owner cannot insert an approved restaurant'
);

:as_admin
select throws_ok(
  $$ insert into public.restaurants (name, address, location, category_id)
     values ('관리자 직접', '서울', 'SRID=4326;POINT(127 37.5)', 1) $$,
  '42501',
  null,
  'admins cannot insert directly through the API either'
);

:as_postgres
select throws_ok(
  $$ insert into public.restaurants (name, address, location, category_id)
     values ('   ', '서울', 'SRID=4326;POINT(127 37.5)', 1) $$,
  '23514',
  null,
  'blank restaurant name is rejected by the table constraint'
);

:as_owner

select is_empty(
  $$ update public.restaurants set status = 'approved'
     where id = 'a0000000-0000-4000-8000-000000000003' returning id $$,
  'owner cannot approve their own proposal'
);

select is_empty(
  $$ update public.restaurants set name = '변경'
     where id = 'a0000000-0000-4000-8000-000000000001' returning id $$,
  'owner cannot edit someone else''s restaurant'
);

select is_empty(
  $$ delete from public.restaurants
     where id = 'a0000000-0000-4000-8000-000000000003' returning id $$,
  'owner cannot delete restaurants, even their own proposal'
);

:as_admin
select results_eq(
  $$ update public.restaurants set status = 'approved'
     where id = 'a0000000-0000-4000-8000-000000000003' returning status::text $$,
  array['approved'],
  'admin can approve a pending proposal'
);

select results_eq(
  $$ delete from public.restaurants
     where id = 'a0000000-0000-4000-8000-000000000004' returning id $$,
  array['a0000000-0000-4000-8000-000000000004'::uuid],
  'admin can delete restaurants'
);

:as_anon
select results_eq(
  $$ select count(*)::int from public.restaurants
     where id = 'a0000000-0000-4000-8000-000000000003' $$,
  array[1],
  'approved proposal becomes publicly visible'
);

select * from finish();
rollback;
