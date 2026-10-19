-- WP-07: account deletion anonymizes reviews; retention purge (C-73, C-74).
begin;
\ir _fixtures.psql
select plan(14);

select ok(not has_function_privilege('anon', 'public.delete_my_account()', 'execute'),
  'anon cannot delete accounts');
select ok(not has_function_privilege('authenticated', 'public.purge_expired_data()', 'execute'),
  'users cannot run the retention purge');

:as_anon
select throws_ok($$ select public.delete_my_account() $$, '42501', null,
  'deletion needs a signed-in user');

-- owner has an approved review on A, a profile, a saved place and logs
:as_postgres
insert into public.profiles (id, display_name) values (:'owner_id', '오너') on conflict (id) do update set display_name = excluded.display_name;
insert into public.favorites (user_id, restaurant_id) values (:'owner_id', :'r_approved_other');
insert into private.ai_usage (user_id, model, prompt_version, outcome) values (:'owner_id', 'fixture', 'parse-v3', 'ok');
update public.restaurant_reviews set body = '오너가 쓴 리뷰' where id = :'v_approved_owner';

:as_owner
select lives_ok($$ select public.delete_my_account() $$, 'a user can delete their own account');

:as_postgres
select is_empty(format($$ select 1 from auth.users where id = %L $$, :'owner_id'),
  'the auth user is gone');
select results_eq(
  format($$ select user_id is null, body, status::text from public.restaurant_reviews where id = %L $$, :'v_approved_owner'),
  $$ values (true, '오너가 쓴 리뷰', 'approved') $$,
  'the review stays, approved, without an author');
select is_empty(format($$ select 1 from public.profiles where id = %L $$, :'owner_id'), 'the profile is deleted');
select is_empty(format($$ select 1 from public.favorites where user_id = %L $$, :'owner_id'), 'saved places are deleted');
select is_empty(format($$ select 1 from private.ai_usage where user_id = %L $$, :'owner_id'), 'usage logs are deleted');
select results_eq(
  format($$ select created_by is null from public.restaurants where id = %L $$, :'r_pending_owner'),
  array[true], 'their place proposals stay without an author');

:as_anon
select results_eq(
  format($$ select (public.restaurant_detail(%L) -> 'summary' ->> 'review_count')::int $$, :'r_approved_other'),
  array[2], 'anonymized reviews still count in public summaries');

:as_other
select results_eq(
  format($$ select count(*)::int from public.restaurant_reviews where user_id = %L $$, :'other_id'),
  array[2], 'other users are untouched');

-- retention -----------------------------------------------------------------
:as_postgres
insert into private.ai_usage (user_id, model, prompt_version, outcome, created_at)
values (:'other_id', 'fixture', 'parse-v3', 'ok', now() - interval '91 days'),
       (:'other_id', 'fixture', 'parse-v3', 'ok', now() - interval '89 days');
insert into private.submission_log (user_id, kind, created_at)
values (:'other_id', 'review', now() - interval '31 days');
\set as_service 'reset role; set local "request.jwt.claims" to ''{"role":"service_role"}''; set local role service_role;'
:as_service
select results_eq($$ select public.purge_expired_data() $$,
  $$ values ('{"ai_usage": 1, "submission_log": 1}'::jsonb) $$,
  'the purge removes logs past their retention period');
:as_postgres
select results_eq(format($$ select count(*)::int from private.ai_usage where user_id = %L $$, :'other_id'),
  array[1], 'recent logs are kept');

select * from finish();
rollback;
