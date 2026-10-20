-- WP-08: overall star rating and menu prices (C-85…C-87).
begin;
\ir _fixtures.psql
select plan(16);

-- writes go through the RPCs only ------------------------------------------------
:as_anon
select throws_ok(
  $$ insert into public.review_menu_items (review_id, position, name, price)
     values ('b0000000-0000-4000-8000-000000000001', 1, '국밥', 9000) $$,
  '42501', null, 'anon cannot write menu items');

:as_owner
select throws_ok(
  $$ select public.submit_review('a0000000-0000-4000-8000-000000000002', '2026-10-01',
       4::smallint, 'counter', null::smallint) $$,
  '22023', null, 'a new review needs a star rating');
select throws_ok(
  $$ select public.submit_review('a0000000-0000-4000-8000-000000000002', '2026-10-01',
       4::smallint, 'counter', 6::smallint) $$,
  '23514', null, 'ratings are 1 to 5');
select throws_ok(
  $$ select public.submit_review('a0000000-0000-4000-8000-000000000002', '2026-10-01',
       4::smallint, 'counter', 5::smallint,
       menu_items => '[{"name":"a","price":1000},{"name":"b","price":1000},{"name":"c","price":1000},
                       {"name":"d","price":1000},{"name":"e","price":1000},{"name":"f","price":1000}]') $$,
  '22023', null, 'at most 5 menu lines');
select throws_ok(
  $$ select public.submit_review('a0000000-0000-4000-8000-000000000002', '2026-10-01',
       4::smallint, 'counter', 5::smallint, menu_items => '[{"name":"국밥","price":50}]') $$,
  '23514', null, 'menu prices are at least 100 won');

select lives_ok(
  $$ select public.submit_review('a0000000-0000-4000-8000-000000000002', '2026-10-01',
       4::smallint, 'counter', 5::smallint,
       menu_items => '[{"name":" 순대국밥 ","price":9000},{"name":"수육","price":15000}]') $$,
  'a rated review with menu prices is accepted');

select results_eq(
  $$ select overall_rating, menu_items from public.my_reviews()
      where restaurant_id = 'a0000000-0000-4000-8000-000000000002' $$,
  $$ values (5::smallint, '[{"name":"순대국밥","price":9000},{"name":"수육","price":15000}]'::jsonb) $$,
  'the author sees the rating and trimmed menu lines in order');

-- not public until approved --------------------------------------------------------
:as_anon
select is_empty(
  $$ select 1 from public.review_menu_items m
       join public.restaurant_reviews v on v.id = m.review_id
      where v.restaurant_id = 'a0000000-0000-4000-8000-000000000002' $$,
  'menu lines of a pending review are not public');

:as_postgres
update public.restaurant_reviews set status = 'approved'
 where restaurant_id = 'a0000000-0000-4000-8000-000000000002' and user_id = :'owner_id';
update public.restaurant_reviews set overall_rating = 3 where id = :'v_approved_other';

:as_anon
select results_eq(
  $$ select (d->'summary'->>'avg_rating')::numeric, (d->'summary'->>'rating_count')::int,
            (d->'summary'->>'review_count')::int
       from (select public.restaurant_detail('a0000000-0000-4000-8000-000000000002') as d) x $$,
  $$ values (5.0::numeric, 1, 1) $$,
  'detail summary averages ratings of approved reviews');
select results_eq(
  $$ select jsonb_path_query_array(public.restaurant_detail('a0000000-0000-4000-8000-000000000002'),
                                   '$.menu_prices[*].name') $$,
  array['["수육", "순대국밥"]'::jsonb],
  'detail lists reported menu prices');
select results_eq(
  $$ select (r->>'overall_rating')::int, jsonb_array_length(r->'menu_items')
       from jsonb_array_elements(public.restaurant_detail('a0000000-0000-4000-8000-000000000002')->'reviews') r $$,
  $$ values (5, 2) $$,
  'each review shows its rating and menu lines');
select results_eq(
  $$ select avg_rating, rating_count from public.search_restaurants(37.566, 126.978, 1000)
      where id = 'a0000000-0000-4000-8000-000000000001' $$,
  $$ values (3.0::numeric, 1) $$,
  'search results carry the rating average and count; reviews without a rating are skipped');

-- edits ---------------------------------------------------------------------------
:as_owner
select lives_ok(
  $$ select public.update_my_review(v.id, v.visited_at, v.solo_comfort, v.seat_type, 5::smallint,
       menu_items => '[{"name":"순대국밥","price":9000},{"name":"수육","price":15000}]')
       from public.restaurant_reviews v
      where v.restaurant_id = 'a0000000-0000-4000-8000-000000000002' $$,
  'saving an unchanged review succeeds');
select results_eq(
  $$ select status::text from public.restaurant_reviews
      where restaurant_id = 'a0000000-0000-4000-8000-000000000002' $$,
  array['approved'], 'unchanged rating and menu keep the review approved');
select lives_ok(
  $$ select public.update_my_review(v.id, v.visited_at, v.solo_comfort, v.seat_type, 5::smallint,
       menu_items => '[{"name":"순대국밥","price":10000}]')
       from public.restaurant_reviews v
      where v.restaurant_id = 'a0000000-0000-4000-8000-000000000002' $$,
  'the author changes a menu price');
select results_eq(
  $$ select status::text from public.restaurant_reviews
      where restaurant_id = 'a0000000-0000-4000-8000-000000000002' $$,
  array['pending'], 'a changed menu sends the review back to moderation');

select * from finish();
rollback;
