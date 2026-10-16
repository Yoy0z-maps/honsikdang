-- WP-05b: embedding source, job queue, worker API and re-ranking (Q44–Q47).
begin;
\ir _fixtures.psql
select plan(26);

-- One-hot 1024-dim vectors as text: v1 · v1 = 1, v1 · v2 = 0.
select
  (select '[' || string_agg(case when i = 1 then '1' else '0' end, ',' order by i) || ']' from generate_series(1, 1024) i) as v1,
  (select '[' || string_agg(case when i = 2 then '1' else '0' end, ',' order by i) || ']' from generate_series(1, 1024) i) as v2,
  (select '[' || string_agg(case when i in (1, 2) then '0.7071' else '0' end, ',' order by i) || ']' from generate_series(1, 1024) i) as v12
\gset

\set as_service 'reset role; set local "request.jwt.claims" to ''{"role":"service_role"}''; set local role service_role;'

-- privileges -------------------------------------------------------------------
select ok(not has_function_privilege('authenticated', 'public.embedding_jobs_claim(integer, text)', 'execute'),
  'users cannot claim embedding jobs');
select ok(not has_function_privilege('authenticated', 'public.embedding_jobs_complete(text, jsonb)', 'execute'),
  'users cannot store embeddings');
select ok(not has_function_privilege('anon', 'public.rank_restaurants(uuid[], text, text, text)', 'execute'),
  'anon cannot re-rank (AI search is for signed-in users)');
select ok(has_function_privilege('service_role', 'public.embedding_jobs_claim(integer, text)', 'execute'),
  'the worker role can claim jobs');

-- source text (Q45) --------------------------------------------------------------
update public.restaurant_reviews set body = '조용하고 혼자 먹기 편한 곳' where id = :'v_approved_other';
update public.restaurant_reviews set body = '대기 중인 비밀 후기' where id = :'v_pending_other';
insert into public.review_tags (review_id, tag_id)
select :'v_approved_owner', id from public.tags where slug = 'quiet';

select matches(private.embedding_source(:'r_approved_other'),
  '^테스트 식당 A\n종류: 한식\n특성: 조용함 1건\n리뷰:\n- 조용하고 혼자 먹기 편한 곳$',
  'source text has name, category, approved tags and review text');
select ok(position('비밀' in private.embedding_source(:'r_approved_admin')) = 0,
  'pending review text is never embedded');
select ok(position('other@' in private.embedding_source(:'r_approved_other')) = 0,
  'author data is not part of the source');
select is(private.embedding_source(:'r_pending_owner'), null, 'non-public restaurants have no source');

-- queue triggers -------------------------------------------------------------------
delete from private.embedding_jobs;
update public.restaurant_reviews set body = '자리가 넓어요' where id = :'v_approved_owner';
select set_eq($$ select restaurant_id from private.embedding_jobs $$, array[:'r_approved_other'::uuid],
  'editing a review enqueues its restaurant');
delete from private.embedding_jobs;
insert into public.review_tags (review_id, tag_id)
select :'v_approved_other', id from public.tags where slug = 'solo_seat';
update public.restaurants set name = '테스트 식당 B2' where id = :'r_approved_admin';
select set_eq($$ select restaurant_id from private.embedding_jobs $$,
  array[:'r_approved_other'::uuid, :'r_approved_admin'::uuid],
  'tag and restaurant changes enqueue too');

-- worker -------------------------------------------------------------------------
insert into private.embedding_jobs (restaurant_id) values (:'r_pending_owner') on conflict do nothing;
:as_service
create temporary table claimed on commit drop as
  select * from public.embedding_jobs_claim(10, 'test-model');
select set_eq($$ select restaurant_id from claimed $$,
  array[:'r_approved_other'::uuid, :'r_approved_admin'::uuid],
  'claim returns public restaurants with their text');
select is_empty($$ select * from public.embedding_jobs_claim(10, 'test-model') $$,
  'claimed jobs are leased, not handed out twice');

select is(
  public.embedding_jobs_complete('test-model', (
    select jsonb_agg(jsonb_build_object('restaurant_id', restaurant_id, 'content_hash', content_hash,
             'embedding', case when restaurant_id = :'r_approved_other' then :'v1' else :'v2' end))
      from claimed)),
  2, 'completed jobs store vectors');

:as_postgres
select results_eq(format($$ select count(*)::int from private.embedding_jobs where restaurant_id <> %L $$, :'r_pending_owner'),
  array[0], 'completed jobs leave the queue');
select is_empty(format($$ select 1 from private.embedding_jobs where restaurant_id = %L $$, :'r_pending_owner'),
  'a job for a non-public restaurant is dropped at claim');

-- unchanged text is skipped; stale vectors are not stored
select private.enqueue_embedding(:'r_approved_other');
:as_service
select is_empty($$ select * from public.embedding_jobs_claim(10, 'test-model') $$,
  'unchanged text is not embedded again');
:as_postgres
update public.restaurants set name = '테스트 식당 A2' where id = :'r_approved_other';
:as_service
create temporary table claimed2 on commit drop as
  select * from public.embedding_jobs_claim(10, 'test-model');
:as_postgres
update public.restaurants set name = '테스트 식당 A3' where id = :'r_approved_other';
:as_service
select is(
  public.embedding_jobs_complete('test-model', (
    select jsonb_agg(jsonb_build_object('restaurant_id', restaurant_id, 'content_hash', content_hash, 'embedding', :'v1'))
      from claimed2)),
  0, 'a vector for text that changed meanwhile is not stored');
:as_postgres
select results_eq(format($$ select claimed_at is null from private.embedding_jobs where restaurant_id = %L $$, :'r_approved_other'),
  array[true], 'the re-enqueued job stays open for the newer text');
select results_eq(format($$ select content like '테스트 식당 A2%%' from private.restaurant_embeddings where restaurant_id = %L $$, :'r_approved_other'),
  array[false], 'the stored vector still belongs to the older, consistent text');

-- failure handling
:as_service
select lives_ok($$ select public.embedding_jobs_fail(restaurant_id, 'provider 500') from public.embedding_jobs_claim(10, 'test-model') $$,
  'the worker can report a failure');
:as_postgres
select results_eq(format($$ select attempts, last_error from private.embedding_jobs where restaurant_id = %L $$, :'r_approved_other'),
  $$ values (1, 'provider 500') $$, 'failures are counted and the lease released');

-- re-ranking (Q47) -----------------------------------------------------------------
:as_owner
select results_eq(
  format($$ select id, vector_rank from public.rank_restaurants(array[%L, %L]::uuid[], %L, 'test-model', null) $$,
         :'r_approved_admin', :'r_approved_other', :'v2'),
  format($$ values (%L::uuid, 1), (%L::uuid, 2) $$, :'r_approved_admin', :'r_approved_other'),
  'candidates are ordered by vector similarity'
);
select set_eq(
  format($$ select id from public.rank_restaurants(array[%L, %L]::uuid[], %L, 'test-model', null) $$,
         :'r_approved_other', :'r_pending_other', :'v1'),
  array[:'r_approved_other'::uuid],
  'only candidates are returned, and never non-public ones'
);
select results_eq(
  format($$ select id, vector_rank, lexical_rank from public.rank_restaurants(array[%L, %L]::uuid[], null, 'test-model', '조용 혼자') $$,
         :'r_approved_admin', :'r_approved_other'),
  format($$ values (%L::uuid, null::int, 1), (%L::uuid, null::int, null::int) $$, :'r_approved_other', :'r_approved_admin'),
  'without a query vector, ranking is lexical over the same text; non-matching candidates stay, last'
);
select throws_ok(
  $$ select * from public.rank_restaurants((select array_agg(gen_random_uuid()) from generate_series(1, 51)), null, 'm', null) $$,
  '22023', null, 'at most 50 candidates');
select throws_ok(
  $$ select * from public.rank_restaurants(array[gen_random_uuid()], '[1,2,3]', 'm', null) $$,
  '22000', null, 'query vectors must have 1024 dimensions');

select * from finish();
rollback;
