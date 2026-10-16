-- WP-05a: AI search quota, monthly budget, usage log privacy (Q41/Q42).
begin;
\ir _fixtures.psql
select plan(17);

select ok(not has_function_privilege('anon', 'public.claim_ai_search(bigint, text, text)', 'execute'),
  'anon cannot claim AI searches');
select ok(not has_function_privilege('anon', 'public.finish_ai_search(bigint, text, integer, integer, integer)', 'execute'),
  'anon cannot finish AI searches');

:as_owner
select is_empty($$ select 1 from information_schema.tables where table_name = 'ai_usage' and table_schema = 'public' $$,
  'the usage log is not exposed through the API schema');
select throws_ok($$ select * from private.ai_usage $$, '42501', null,
  'users cannot read the usage log');

select ok(public.claim_ai_search(3000000, 'claude-haiku-5-5', 'parse-v1') > 0,
  'a signed-in user can claim an AI search');
select lives_ok(
  $$ select public.finish_ai_search(max(id), 'ok', 1500, 120, 900)
       from (select public.claim_ai_search(3000000, 'claude-haiku-5-5', 'parse-v1') as id) c $$,
  'the caller finishes their own search');

:as_postgres
select results_eq(
  $$ select outcome, input_tokens, output_tokens, cost_micro_usd, latency_ms
       from private.ai_usage order by id desc limit 1 $$,
  $$ values ('ok', 1500, 120, 210, 900) $$,
  'cost is computed in the database from Haiku 5.5 prices (1500×0.1 + 120×0.5 µUSD)'
);
select is_empty(
  $$ select 1 from information_schema.columns
      where table_schema = 'private' and table_name = 'ai_usage' and column_name ~ 'query|text' $$,
  'the usage log has no column for query text'
);
select set_eq($$ select user_id from private.ai_usage $$, array[:'owner_id'::uuid],
  'rows are attributed to the caller');

:as_owner
select throws_ok(
  $$ select public.finish_ai_search(-1, 'ok', 1, 1, 1) $$,
  'P0002', null, 'a non-existent row cannot be finished');
select lives_ok(
  $$ select public.finish_ai_search(public.claim_ai_search(3000000, 'claude-haiku-5-5', 'parse-v1'), 'ok', 999999, 999999, 1) $$,
  'token counts are clamped instead of failing');

:as_other
select throws_ok(
  $$ select public.finish_ai_search(public.claim_ai_search(3000000, 'claude-haiku-5-5', 'parse-v1') - 1, 'ok', 1, 1, 1) $$,
  'P0002', null, 'another user''s row cannot be finished');

-- budget: logged cost so far = 210 + ceil(5000*0.1 + 400*0.5) = 910 µUSD
select throws_ok(
  $$ select public.claim_ai_search(910, 'claude-haiku-5-5', 'parse-v1') $$,
  'HS402', null, 'claims stop once the monthly budget is reached');

-- daily limit: owner has 3 claims, other has 1
:as_owner
select lives_ok(
  $$ select count(public.claim_ai_search(3000000, 'claude-haiku-5-5', 'parse-v1')) from generate_series(1, 27) $$,
  'up to 30 AI searches in 24 hours');
select throws_ok(
  $$ select public.claim_ai_search(3000000, 'claude-haiku-5-5', 'parse-v1') $$,
  'HS429', null, 'the 31st AI search within 24 hours is rejected');

-- OpenAI parser pricing (decision C-59): 1000×0.1 + 100×0.5 = 150 µUSD
:as_other
select lives_ok(
  $$ select public.finish_ai_search(public.claim_ai_search(3000000, 'gpt-6-luna', 'parse-v2'), 'ok', 1000, 100, 500) $$,
  'an OpenAI parser call is logged');
:as_postgres
select results_eq(
  $$ select cost_micro_usd from private.ai_usage where model = 'gpt-6-luna' $$,
  array[150], 'gpt-6-luna is priced at $0.10 / $0.50 per million tokens');

select * from finish();
rollback;
