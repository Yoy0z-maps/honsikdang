-- WP-04c: moderate / resolve_report, transitions, audit atomicity,
-- report limit (Q16), author-only moderation reasons (Q32).
begin;
\ir _fixtures.psql
select plan(39);

-- privileges -----------------------------------------------------------------
:as_owner
select throws_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000003', 'approve') $$,
  '42501', null, 'regular users cannot moderate'
);
select throws_ok(
  $$ select * from public.admin_pending_places() $$,
  '42501', null, 'regular users cannot list the moderation queue'
);
select is(public.am_i_admin(), false, 'am_i_admin is false for regular users');
:as_anon
select throws_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000003', 'approve') $$,
  '42501', null, 'anon cannot moderate'
);
:as_admin
select is(public.am_i_admin(), true, 'am_i_admin is true for admins');

-- restaurant transitions --------------------------------------------------------
select throws_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000003', 'reject') $$,
  '22023', null, 'reject requires a reason (Q28)'
);
select throws_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000003', 'reject', '   ') $$,
  '22023', null, 'a blank reason does not count'
);
select throws_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000003', 'remove', '사유') $$,
  '22023', null, 'review-only actions are rejected for restaurants'
);
select throws_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000001', 'approve') $$,
  'HS409', null, 'approving an already approved restaurant is a conflict'
);
select throws_ok(
  $$ select public.moderate('restaurant', gen_random_uuid(), 'approve') $$,
  'P0002', null, 'unknown targets are reported as not found'
);
select lives_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000003', 'approve', '현장 확인') $$,
  'admin approves a pending place'
);
select throws_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000003', 'approve') $$,
  'HS409', null, 'a second approval (e.g. by another moderator) conflicts'
);
select lives_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000004', 'reject', '위치 확인 불가') $$,
  'admin rejects a pending place with a reason'
);
select lives_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000001', 'archive', '폐업') $$,
  'admin archives an approved place'
);
select lives_ok(
  $$ select public.moderate('restaurant', 'a0000000-0000-4000-8000-000000000001', 'restore') $$,
  'admin restores an archived place'
);
select results_eq(
  $$ select status::text from public.restaurants where id in
       ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003',
        'a0000000-0000-4000-8000-000000000004') order by id $$,
  array['approved', 'approved', 'rejected'],
  'restaurant statuses follow the transitions'
);
select results_eq(
  $$ select action::text, moderator_id, reason from public.moderation_actions
     where target_id = 'a0000000-0000-4000-8000-000000000003' $$,
  $$ values ('approve', '00000000-0000-4000-8000-000000000003'::uuid, '현장 확인') $$,
  'each successful action writes exactly one audit row, attributed to the admin'
);
select results_eq(
  $$ select count(*)::int from public.moderation_actions $$,
  array[4],
  'failed actions leave no audit rows'
);

-- review transitions ------------------------------------------------------------
select lives_ok(
  $$ select public.moderate('review', 'b0000000-0000-4000-8000-000000000003', 'approve') $$,
  'admin approves a pending review'
);
select throws_ok(
  $$ select public.moderate('review', 'b0000000-0000-4000-8000-000000000001', 'remove') $$,
  '22023', null, 'remove requires a reason'
);
select lives_ok(
  $$ select public.moderate('review', 'b0000000-0000-4000-8000-000000000001', 'remove', '광고성 내용') $$,
  'admin removes an approved review'
);
select throws_ok(
  $$ select public.moderate('review', 'b0000000-0000-4000-8000-000000000001', 'reject', '중복') $$,
  'HS409', null, 'a removed review cannot be rejected'
);
select throws_ok(
  $$ select public.moderate('review', 'b0000000-0000-4000-8000-000000000001', 'archive', '사유') $$,
  '22023', null, 'restaurant-only actions are rejected for reviews'
);

-- author sees the reason; others do not (Q32) ---------------------------------
:as_other
select results_eq(
  $$ select status::text, moderation_reason from public.my_reviews('b0000000-0000-4000-8000-000000000001') $$,
  $$ values ('removed', '광고성 내용') $$,
  'the author sees why their review was removed'
);
select results_eq(
  $$ select status::text, moderation_reason from public.my_places()
     where id = 'a0000000-0000-4000-8000-000000000004' $$,
  $$ values ('rejected', '위치 확인 불가') $$,
  'the proposer sees why their place was rejected'
);
select is_empty(
  $$ select * from public.moderation_actions $$,
  'regular users still cannot read the moderation log'
);
:as_owner
select is_empty(
  $$ select 1 from public.my_reviews('b0000000-0000-4000-8000-000000000001') $$,
  'other users cannot read someone else''s moderation reason'
);

-- reports ---------------------------------------------------------------------
:as_owner
select lives_ok(
  $$ insert into public.restaurant_reports (target_type, target_id, reason, note)
     values ('review', 'b0000000-0000-4000-8000-000000000003', 'inappropriate', '욕설') $$,
  'a user reports a visible review'
);
:as_admin
select results_eq(
  $$ select target_type::text, target_status, note from public.admin_open_reports() $$,
  $$ values ('review', 'approved', '욕설') $$,
  'moderators see open reports with their target'
);
select throws_ok(
  $$ select public.resolve_report(id, 'dismiss', 'remove_review') from public.restaurant_reports $$,
  '22023', null, 'a dismissed report cannot act on content'
);
select throws_ok(
  $$ select public.resolve_report(id, 'resolve', 'archive_restaurant', '사유') from public.restaurant_reports $$,
  '22023', null, 'the content action must match the report target'
);
select throws_ok(
  $$ select public.resolve_report(id, 'resolve', 'remove_review') from public.restaurant_reports $$,
  '22023', null, 'removing content through a report still needs a reason'
);
select results_eq(
  $$ select status::text from public.restaurant_reports $$,
  array['open'],
  'failed resolutions change nothing'
);
select lives_ok(
  $$ select public.resolve_report(id, 'resolve', 'remove_review', '신고 확인: 욕설') from public.restaurant_reports $$,
  'resolving a report can remove the review in the same call'
);
select results_eq(
  $$ select (select status::text from public.restaurant_reviews where id = 'b0000000-0000-4000-8000-000000000003'),
            (select status::text from public.restaurant_reports) $$,
  $$ values ('removed', 'resolved') $$,
  'review removed and report resolved together'
);
select results_eq(
  -- Identity values are not reset by rollback, so filter by type, not id.
  $$ select array_agg(target_type::text || ':' || action::text order by id)
     from public.moderation_actions where target_type in ('review', 'report') $$,
  $$ values (array['review:approve', 'review:remove', 'review:remove', 'report:resolve']) $$,
  'both the content action and the report decision are audited'
);
select throws_ok(
  $$ select public.resolve_report(id, 'dismiss') from public.restaurant_reports $$,
  'HS409', null, 'a handled report cannot be decided again'
);

-- report daily limit (20) -------------------------------------------------------
:as_postgres
insert into public.restaurants (id, name, address, location, category_id, status, created_by)
select ('e1000000-0000-4000-8000-0000000000' || lpad(g::text, 2, '0'))::uuid,
       '신고 한도 ' || g, '서울', 'SRID=4326;POINT(127.1 37.6)',
       (select id from public.restaurant_categories where slug = 'korean'), 'approved', :'admin_id'::uuid
from generate_series(1, 21) as g;
:as_other
select lives_ok(
  $$ insert into public.restaurant_reports (target_type, target_id, reason)
     select 'restaurant', ('e1000000-0000-4000-8000-0000000000' || lpad(g::text, 2, '0'))::uuid, 'closed'
     from generate_series(1, 20) as g $$,
  'a user can file 20 reports in 24 hours'
);
select throws_ok(
  $$ insert into public.restaurant_reports (target_type, target_id, reason)
     values ('restaurant', 'e1000000-0000-4000-8000-000000000021', 'closed') $$,
  'HS429', null, 'the 21st report within 24 hours is rejected'
);

select * from finish();
rollback;
