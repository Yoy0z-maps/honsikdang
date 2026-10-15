-- favorites, restaurant_reports, moderation_actions authorization matrix.
begin;
\ir _fixtures.psql
select plan(22);

-- favorites ----------------------------------------------------------------
:as_owner
select results_eq(
  $$ insert into public.favorites (restaurant_id)
     values ('a0000000-0000-4000-8000-000000000001') returning user_id $$,
  array[:'owner_id'::uuid],
  'owner can save a favorite'
);

select throws_ok(
  $$ insert into public.favorites (restaurant_id)
     values ('a0000000-0000-4000-8000-000000000001') $$,
  '23505',
  null,
  'duplicate favorite is rejected'
);

select throws_ok(
  $$ insert into public.favorites (user_id, restaurant_id)
     values ('00000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'owner cannot save a favorite for another user'
);

select throws_ok(
  $$ insert into public.favorites (restaurant_id)
     values ('a0000000-0000-4000-8000-000000000004') $$,
  '42501',
  null,
  'owner cannot favorite a restaurant they cannot see'
);

:as_other
select is_empty(
  $$ select * from public.favorites $$,
  'other user cannot see the owner''s favorites'
);

:as_admin
select is_empty(
  $$ select * from public.favorites $$,
  'admin cannot see users'' favorites'
);

:as_anon
select throws_ok(
  $$ select * from public.favorites $$,
  '42501',
  null,
  'anon cannot read favorites'
);

:as_owner
select results_eq(
  $$ delete from public.favorites
     where restaurant_id = 'a0000000-0000-4000-8000-000000000001' returning restaurant_id $$,
  array[:'r_approved_other'::uuid],
  'owner can remove a favorite'
);

-- reports ------------------------------------------------------------------
select results_eq(
  $$ insert into public.restaurant_reports (target_type, target_id, reason)
     values ('restaurant', 'a0000000-0000-4000-8000-000000000001', 'closed')
     returning status::text, reporter_id $$,
  $$ values ('open', '00000000-0000-4000-8000-000000000001'::uuid) $$,
  'owner can report a visible restaurant'
);

select throws_ok(
  $$ insert into public.restaurant_reports (target_type, target_id, reason)
     values ('restaurant', 'a0000000-0000-4000-8000-000000000001', 'spam') $$,
  '23505',
  null,
  'reporting the same target twice is rejected'
);

select throws_ok(
  $$ insert into public.restaurant_reports (target_type, target_id, reason)
     values ('review', 'b0000000-0000-4000-8000-000000000003', 'spam') $$,
  '23503',
  null,
  'owner cannot report a review they cannot see'
);

select throws_ok(
  $$ insert into public.restaurant_reports (target_type, target_id, reason, status)
     values ('review', 'b0000000-0000-4000-8000-000000000001', 'spam', 'resolved') $$,
  '42501',
  null,
  'reporter cannot set report status'
);

select throws_ok(
  $$ update public.restaurant_reports set status = 'dismissed' $$,
  '42501',
  null,
  'reporter cannot change report status'
);

:as_other
select is_empty(
  $$ select * from public.restaurant_reports $$,
  'other user cannot see the owner''s report'
);

:as_anon
select throws_ok(
  $$ select * from public.restaurant_reports $$,
  '42501',
  null,
  'anon cannot read reports'
);

:as_admin
select lives_ok(
  $$ select public.resolve_report(id, 'resolve') from public.restaurant_reports $$,
  'admin can resolve reports via resolve_report'
);

-- moderation_actions -------------------------------------------------------
:as_owner
select throws_ok(
  $$ insert into public.moderation_actions (target_type, target_id, action)
     values ('restaurant', 'a0000000-0000-4000-8000-000000000003', 'approve') $$,
  '42501',
  null,
  'regular user cannot write moderation actions'
);

:as_admin
select throws_ok(
  $$ insert into public.moderation_actions (target_type, target_id, action, reason)
     values ('restaurant', 'a0000000-0000-4000-8000-000000000003', 'approve', '현장 확인') $$,
  '42501',
  null,
  'admins cannot write the log directly either'
);

select results_eq(
  $$ select moderator_id, action::text from public.moderation_actions where target_type = 'report' $$,
  $$ values ('00000000-0000-4000-8000-000000000003'::uuid, 'resolve') $$,
  'resolve_report wrote an audit row attributed to the admin'
);

select throws_ok(
  $$ update public.moderation_actions set reason = '수정' $$,
  '42501',
  null,
  'moderation log cannot be edited, even by admins'
);

select throws_ok(
  $$ delete from public.moderation_actions $$,
  '42501',
  null,
  'moderation log cannot be deleted, even by admins'
);

:as_owner
select is_empty(
  $$ select * from public.moderation_actions $$,
  'regular user cannot read the moderation log'
);

select * from finish();
rollback;
