-- profiles: owner-only read/update, admin read, no public access (Q4).
begin;
\ir _fixtures.psql
select plan(8);

select results_eq(
  $$ select count(*)::int from public.profiles $$,
  array[3],
  'signup trigger created one profile per auth user'
);

:as_anon
select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  null,
  'anon cannot read profiles'
);

:as_owner
select results_eq(
  $$ select id from public.profiles $$,
  array[:'owner_id'::uuid],
  'owner sees only their own profile'
);

select results_eq(
  $$ update public.profiles set display_name = '혼밥러' where id = '00000000-0000-4000-8000-000000000001' returning display_name $$,
  array['혼밥러'],
  'owner can update their display_name'
);

select is_empty(
  $$ update public.profiles set display_name = '침입' where id = '00000000-0000-4000-8000-000000000002' returning id $$,
  'owner cannot update another profile'
);

select throws_ok(
  $$ update public.profiles set id = gen_random_uuid() where id = '00000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'owner cannot change columns other than display_name'
);

select throws_ok(
  $$ update public.profiles set display_name = '' where id = '00000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'empty display_name is rejected'
);

:as_admin
select results_eq(
  $$ select count(*)::int from public.profiles $$,
  array[3],
  'admin can read all profiles'
);

select * from finish();
rollback;
