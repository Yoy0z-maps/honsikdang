-- WP-04a: submit/update/my_reviews RPCs, daily limit, removed reviews frozen.
begin;
\ir _fixtures.psql
select plan(22);

-- privileges ---------------------------------------------------------------
select ok(not has_function_privilege('anon',
  'public.submit_review(uuid, date, smallint, public.seat_type, boolean, integer, integer, text, text[])',
  'execute'), 'anon cannot submit reviews');
select ok(not has_function_privilege('anon', 'public.my_reviews(uuid)', 'execute'),
  'anon cannot call my_reviews');

-- submit_review ------------------------------------------------------------
:as_owner
select ok(
  public.submit_review(:'r_approved_admin', '2026-10-01', 4::smallint, 'counter',
    true, 9000, 5, '  맛있음  ', array['solo_seat', 'bar_seat']) is not null,
  'owner can submit a review with tags'
);

select results_eq(
  $$ select status::text, body, tag_slugs from public.my_reviews()
     where restaurant_id = 'a0000000-0000-4000-8000-000000000002' $$,
  $$ values ('pending', '맛있음', array['solo_seat', 'bar_seat']) $$,
  'submitted review is pending, body trimmed, tags attached'
);

select throws_ok(
  $$ select public.submit_review('a0000000-0000-4000-8000-000000000002', '2026-10-01',
       3::smallint, 'booth') $$,
  '23505', null, 'second review of the same restaurant is rejected'
);

select throws_ok(
  $$ select public.submit_review('a0000000-0000-4000-8000-000000000003', '2026-10-01',
       3::smallint, 'booth', tag_slugs => array['no_such_tag']) $$,
  '22023', null, 'unknown tag is rejected'
);

select is_empty(
  $$ select 1 from public.restaurant_reviews
     where restaurant_id = 'a0000000-0000-4000-8000-000000000003'
       and user_id = '00000000-0000-4000-8000-000000000001' $$,
  'a rejected submission leaves no partial review behind'
);

select throws_ok(
  $$ select public.submit_review('a0000000-0000-4000-8000-000000000004', '2026-10-01',
       3::smallint, 'booth') $$,
  '42501', null, 'cannot review a restaurant the user cannot see'
);

select throws_ok(
  $$ select public.submit_review('a0000000-0000-4000-8000-000000000003', current_date + 10,
       3::smallint, 'booth') $$,
  '23514', null, 'future visit date is rejected'
);

-- my_reviews ---------------------------------------------------------------
select results_eq(
  $$ select count(*)::int from public.my_reviews() $$,
  array[2],
  'my_reviews returns only the caller''s reviews'
);

:as_other
select is_empty(
  $$ select 1 from public.my_reviews('b0000000-0000-4000-8000-000000000002') $$,
  'my_reviews never returns another user''s review by id'
);

:as_anon
select throws_ok(
  $$ select * from public.my_reviews() $$,
  '42501', null, 'anon cannot list reviews via my_reviews'
);

-- update_my_review ---------------------------------------------------------
:as_owner
select lives_ok(
  $$ select public.update_my_review('b0000000-0000-4000-8000-000000000002', '2026-10-02',
       2::smallint, 'booth', false, 12000, null, '수정', array['quiet']) $$,
  'owner can update their approved review'
);

select results_eq(
  $$ select status::text, solo_comfort, tag_slugs from public.my_reviews('b0000000-0000-4000-8000-000000000002') $$,
  $$ values ('pending', 2::smallint, array['quiet']) $$,
  'update replaces tags and returns the review to moderation'
);

select throws_ok(
  $$ select public.update_my_review('b0000000-0000-4000-8000-000000000001', '2026-10-02',
       1::smallint, 'booth') $$,
  'P0002', null, 'owner cannot update another user''s review'
);

:as_admin
select throws_ok(
  $$ select public.update_my_review('b0000000-0000-4000-8000-000000000001', '2026-10-02',
       1::smallint, 'booth') $$,
  'P0002', null, 'update_my_review is owner-only, even for admins'
);

-- removed reviews are frozen (Q15) -----------------------------------------
:as_postgres
update public.restaurant_reviews set status = 'removed' where id = :'v_approved_owner';

:as_owner
select throws_ok(
  $$ select public.update_my_review('b0000000-0000-4000-8000-000000000002', '2026-10-02',
       5::smallint, 'counter') $$,
  '42501', null, 'author cannot edit a removed review'
);

select is_empty(
  $$ delete from public.restaurant_reviews
     where id = 'b0000000-0000-4000-8000-000000000002' returning id $$,
  'author cannot delete a removed review (keeps the slot taken)'
);

select results_eq(
  $$ select status::text from public.my_reviews('b0000000-0000-4000-8000-000000000002') $$,
  array['removed'],
  'author still sees their removed review and its status'
);

-- daily limit (Q16) --------------------------------------------------------
:as_postgres
-- 9 more approved restaurants so the owner can reach the limit of 10.
insert into public.restaurants (id, name, address, location, category_id, status, created_by)
select ('e0000000-0000-4000-8000-0000000000' || lpad(g::text, 2, '0'))::uuid,
       '한도 테스트 ' || g, '서울', 'SRID=4326;POINT(126.978 37.566)',
       (select id from public.restaurant_categories where slug = 'korean'),
       'approved', :'admin_id'::uuid
from generate_series(1, 10) as g;

:as_owner
-- The owner already submitted 1 review in this transaction; 9 more reach 10.
select lives_ok(
  $$ select count(public.submit_review(('e0000000-0000-4000-8000-0000000000' || lpad(g::text, 2, '0'))::uuid,
       '2026-10-01', 3::smallint, 'counter'))
     from generate_series(1, 9) as g $$,
  'owner can submit up to 10 reviews in 24 hours'
);

select throws_ok(
  $$ select public.submit_review('e0000000-0000-4000-8000-000000000010', '2026-10-01',
       3::smallint, 'counter') $$,
  'HS429', null, 'the 11th review within 24 hours is rejected'
);

:as_postgres
select lives_ok(
  $$ insert into public.restaurant_reviews (restaurant_id, user_id, visited_at, solo_comfort, seat_type)
     values ('e0000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001',
             '2026-10-01', 3, 'counter') $$,
  'server-side roles are not rate limited'
);

select * from finish();
rollback;
