-- WP-05c: review vectors and grounded evidence (Q50–Q55).
begin;
\ir _fixtures.psql
select plan(15);

select
  (select '[' || string_agg(case when i = 1 then '1' else '0' end, ',' order by i) || ']' from generate_series(1, 1024) i) as v1,
  (select '[' || string_agg(case when i = 2 then '1' else '0' end, ',' order by i) || ']' from generate_series(1, 1024) i) as v2
\gset

\set as_service 'reset role; set local "request.jwt.claims" to ''{"role":"service_role"}''; set local role service_role;'

-- privileges -------------------------------------------------------------------
select ok(not has_function_privilege('authenticated', 'public.review_embedding_backlog(integer, text)', 'execute'),
  'users cannot read the review backlog (it exposes review text)');
select ok(not has_function_privilege('authenticated', 'public.review_embeddings_store(text, jsonb)', 'execute'),
  'users cannot store review vectors');
select ok(not has_function_privilege('anon', 'public.restaurant_evidence(uuid[], text, text, double precision)', 'execute'),
  'anon cannot request evidence');

-- backlog ----------------------------------------------------------------------
update public.restaurant_reviews set body = '조용해서 혼자 먹기 좋다' where id = :'v_approved_other';
update public.restaurant_reviews set body = '   ' where id = :'v_approved_owner';
update public.restaurant_reviews set body = '대기 중인 후기' where id = :'v_pending_other';
-- an approved review on a pending restaurant
insert into public.restaurant_reviews (id, restaurant_id, user_id, visited_at, solo_comfort, seat_type, body, status)
values ('b0000000-0000-4000-8000-0000000000c1', :'r_pending_owner', :'other_id', '2026-10-01', 4, 'counter', '비공개 식당 후기', 'approved');

:as_service
create temporary table backlog on commit drop as
  select * from public.review_embedding_backlog(50, 'test-model');
select set_eq($$ select review_id from backlog $$, array[:'v_approved_other'::uuid],
  'only approved reviews with text on public restaurants need vectors');
select results_eq($$ select content from backlog $$, array['조용해서 혼자 먹기 좋다'],
  'the backlog carries the exact review text');

select is(
  public.review_embeddings_store('test-model',
    (select jsonb_agg(jsonb_build_object('review_id', review_id, 'content_hash', content_hash, 'embedding', :'v1')) from backlog)),
  1, 'vectors are stored for current text');
select is_empty($$ select * from public.review_embedding_backlog(50, 'test-model') $$,
  'stored reviews leave the backlog');

:as_postgres
update public.restaurant_reviews set body = '이제는 시끄럽다' where id = :'v_approved_other';
:as_service
select is(
  public.review_embeddings_store('test-model',
    (select jsonb_agg(jsonb_build_object('review_id', review_id, 'content_hash', content_hash, 'embedding', :'v1')) from backlog)),
  0, 'a vector for outdated text is not stored');
select set_eq($$ select review_id from public.review_embedding_backlog(50, 'test-model') $$,
  array[:'v_approved_other'::uuid], 'edited reviews return to the backlog');

-- evidence -----------------------------------------------------------------------
:as_postgres
update public.restaurant_reviews set body = '조용해서 혼자 먹기 좋다' where id = :'v_approved_other';
-- vectors planted for reviews that must never be quoted
insert into private.review_embeddings (review_id, model, content_hash, embedding)
values (:'v_pending_other', 'test-model', md5('대기 중인 후기'), :'v1'),
       ('b0000000-0000-4000-8000-0000000000c1', 'test-model', md5('비공개 식당 후기'), :'v1');

:as_owner
select results_eq(
  format($$ select restaurant_id, review_id, body, round(similarity::numeric, 3)
              from public.restaurant_evidence(array[%L, %L, %L]::uuid[], %L, 'test-model', 0.5) $$,
         :'r_approved_other', :'r_approved_admin', :'r_pending_owner', :'v1'),
  format($$ values (%L::uuid, %L::uuid, '조용해서 혼자 먹기 좋다', 1.000) $$, :'r_approved_other', :'v_approved_other'),
  'evidence quotes the approved review verbatim; pending reviews and non-public restaurants never appear'
);
select is_empty(
  format($$ select * from public.restaurant_evidence(array[%L]::uuid[], %L, 'test-model', 0.5) $$,
         :'r_approved_other', :'v2'),
  'below the similarity threshold there is no evidence (shown as "근거 없음")');
select is_empty(
  format($$ select * from public.restaurant_evidence(array[%L]::uuid[], %L, 'test-model', 0.5) $$,
         :'r_approved_admin', :'v1'),
  'only requested restaurants are considered');

:as_postgres
update public.restaurant_reviews set status = 'removed' where id = :'v_approved_other';
:as_owner
select is_empty(
  format($$ select * from public.restaurant_evidence(array[%L]::uuid[], %L, 'test-model', 0.5) $$,
         :'r_approved_other', :'v1'),
  'a removed review is never quoted, even before its vector is swept');
:as_service
select lives_ok($$ select * from public.review_embedding_backlog(1, 'test-model') $$, 'the sweep runs');
:as_postgres
select is_empty(
  format($$ select 1 from private.review_embeddings where review_id in (%L, %L) $$,
         :'v_approved_other', :'v_pending_other'),
  'the sweep deletes vectors of reviews that may no longer be shown');

select * from finish();
rollback;
