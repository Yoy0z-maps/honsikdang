-- WP-04b: suggest_restaurant / find_similar_restaurants, dedupe (Q17),
-- daily limit (Q16), masking of other users' pending proposals (Q27).
begin;
\ir _fixtures.psql
select plan(27);

-- All four fixture restaurants sit at C0 = (37.566, 126.978):
--   테스트 식당 A (approved, other), B (approved, admin),
--   C (pending, owner), D (pending, other).
-- Points at exact geodesic distances north of C0 (azimuth 0):
select
  extensions.st_y(p15::extensions.geometry) as p15_lat, extensions.st_x(p15::extensions.geometry) as p15_lng,
  extensions.st_y(p40::extensions.geometry) as p40_lat, extensions.st_x(p40::extensions.geometry) as p40_lng,
  extensions.st_y(p70::extensions.geometry) as p70_lat, extensions.st_x(p70::extensions.geometry) as p70_lng,
  extensions.st_y(p300::extensions.geometry) as p300_lat, extensions.st_x(p300::extensions.geometry) as p300_lng
from (
  select extensions.st_project(c, 15, 0) as p15, extensions.st_project(c, 40, 0) as p40,
         extensions.st_project(c, 70, 0) as p70, extensions.st_project(c, 300, 0) as p300
  from (select 'SRID=4326;POINT(126.978 37.566)'::extensions.geography as c) as base
) as pts
\gset

-- privileges / normalization -------------------------------------------------
select ok(not has_function_privilege('anon',
  'public.suggest_restaurant(text, text, double precision, double precision, text, boolean)', 'execute'),
  'anon cannot suggest restaurants');
select is(private.normalize_name('  [예시] 시청 국밥!! '), '예시시청국밥', 'normalization drops spaces and symbols');
select is(private.normalize_name('ＡＢＣ　Café'), 'abccafé', 'normalization folds full-width and case (NFKC)');

:as_owner

-- block: same normalized name within 50 m -------------------------------------
select results_eq(
  format($$ select r->>'status', r->'matches'->0->>'reason', r->'matches'->0->>'restaurant_name'
            from public.suggest_restaurant('테스트  식당 A!', '서울 테스트로 9', %s, %s, 'korean') as r $$,
         :'p40_lat', :'p40_lng'),
  $$ values ('blocked', 'same_name', '테스트 식당 A') $$,
  'same normalized name 40 m away is blocked and names the approved match'
);

select results_eq(
  format($$ select r->>'status', m->>'restaurant_id', m->>'restaurant_name', m->>'mine'
            from public.suggest_restaurant('테스트 식당 D', '서울 테스트로 9', %s, %s, 'korean') as r,
                 jsonb_array_elements(r->'matches') as m
           where m->>'blocking' = 'true' $$,
         :'p40_lat', :'p40_lng'),
  $$ values ('blocked', null::text, null::text, 'false') $$,
  'another user''s pending proposal blocks without revealing its id or name'
);

-- warn: same name at 70 m, or anything within 20 m ----------------------------
select results_eq(
  format($$ select r->>'status' from public.suggest_restaurant('테스트 식당 A', '서울 테스트로 9', %s, %s, 'korean') as r $$,
         :'p70_lat', :'p70_lng'),
  array['needs_confirmation'],
  'same name 70 m away needs confirmation, not a block'
);

select results_eq(
  format($$ select r->>'status', r->'matches'->0->>'reason'
            from public.suggest_restaurant('완전히 다른 국수집', '서울 테스트로 9', %s, %s, 'korean') as r $$,
         :'p15_lat', :'p15_lng'),
  $$ values ('needs_confirmation', 'very_close') $$,
  'any restaurant within 20 m needs confirmation'
);

select is_empty(
  $$ select 1 from public.restaurants where name = '완전히 다른 국수집' $$,
  'nothing is created without confirmation'
);

-- create ---------------------------------------------------------------------
select results_eq(
  format($$ select r->>'status' from public.suggest_restaurant('완전히 다른 국수집', '서울 테스트로 9', %s, %s, 'korean', true) as r $$,
         :'p15_lat', :'p15_lng'),
  array['created'],
  'confirmed suggestion near others is created'
);

select results_eq(
  $$ select status::text, source_type::text, created_by from public.restaurants where name = '완전히 다른 국수집' $$,
  $$ values ('pending', 'user_submitted', '00000000-0000-4000-8000-000000000001'::uuid) $$,
  'created suggestion is pending, user_submitted and attributed to the caller'
);

select is_empty(
  $$ select * from public.restaurant_duplicate_candidates $$,
  'regular users cannot read duplicate candidates'
);

select results_eq(
  format($$ select r->>'status', jsonb_array_length(r->'matches')
            from public.suggest_restaurant('  멀리 떨어진 덮밥  ', '서울 테스트로 30', %s, %s, 'japanese') as r $$,
         :'p300_lat', :'p300_lng'),
  $$ values ('created', 0) $$,
  'a suggestion with no nearby restaurant is created directly'
);

select results_eq(
  $$ select name, address from public.restaurants where name_normalized = '멀리떨어진덮밥' $$,
  $$ values ('멀리 떨어진 덮밥', '서울 테스트로 30') $$,
  'name and address are trimmed'
);

:as_anon
select is_empty(
  $$ select 1 from public.restaurants where name = '멀리 떨어진 덮밥' $$,
  'a new suggestion is not public'
);

:as_admin
select results_eq(
  $$ select count(*)::int from public.restaurant_duplicate_candidates c
     join public.restaurants r on r.id = c.restaurant_id
     where r.name = '완전히 다른 국수집' and c.reason = 'very_close' $$,
  array[4],
  'moderators see every candidate recorded for the confirmed suggestion'
);

-- matches reveal only what the caller may see ---------------------------------
:as_owner
select set_eq(
  format($$ select coalesce(m->>'restaurant_name', '(hidden)')
            from public.suggest_restaurant('아무 이름', '서울 테스트로 9', %s, %s, 'korean') as r,
                 jsonb_array_elements(r->'matches') as m $$,
         :'p15_lat', :'p15_lng'),
  array['테스트 식당 A', '테스트 식당 B', '테스트 식당 C', '완전히 다른 국수집', '(hidden)'],
  'matches name approved and own proposals; another user''s pending one is hidden'
);
select ok(not has_function_privilege('authenticated',
  'private.place_duplicates(double precision, double precision, text)', 'execute'),
  'the unmasked matcher is not callable by API users');

-- rejected / archived are ignored ---------------------------------------------
:as_postgres
update public.restaurants set status = 'rejected' where name = '멀리 떨어진 덮밥';
:as_owner
select results_eq(
  format($$ select r->>'status' from public.suggest_restaurant('멀리 떨어진 덮밥', '서울 테스트로 30', %s, %s, 'japanese') as r $$,
         :'p300_lat', :'p300_lng'),
  array['created'],
  'a rejected restaurant does not block a new suggestion'
);

-- validation -----------------------------------------------------------------
select throws_ok(
  format($$ select public.suggest_restaurant('!!!', '서울 테스트로 9', %s, %s, 'korean') $$, :'p300_lat', :'p300_lng'),
  '22023', null, 'a name without letters or digits is rejected'
);
select throws_ok(
  format($$ select public.suggest_restaurant('정상 이름', '서', %s, %s, 'korean') $$, :'p300_lat', :'p300_lng'),
  '22023', null, 'an address shorter than 2 characters is rejected'
);
select throws_ok(
  format($$ select public.suggest_restaurant('정상 이름', '서울 테스트로 9', %s, %s, 'no_such') $$, :'p300_lat', :'p300_lng'),
  '22023', null, 'an unknown category is rejected'
);
select throws_ok(
  $$ select public.suggest_restaurant('정상 이름', '서울 테스트로 9', 126.978, 37.566, 'korean') $$,
  '22023', null, 'swapped coordinates (lat 126.9) are rejected'
);

-- daily limit (5) --------------------------------------------------------------
-- Owner has created 3 so far; 2 more reach the limit.
select lives_ok(
  $$ select count(public.suggest_restaurant('한도 테스트 ' || g, '서울 한도로 ' || g,
            37.60 + g * 0.01, 127.00, 'korean')) from generate_series(1, 2) as g $$,
  'owner can suggest up to 5 places in 24 hours'
);
select throws_ok(
  $$ select public.suggest_restaurant('한도 테스트 3', '서울 한도로 3', 37.63, 127.00, 'korean') $$,
  'HS429', null, 'the 6th suggestion within 24 hours is rejected'
);

-- blocked / unconfirmed attempts do not count toward the limit
:as_other
select lives_ok(
  format($$ select public.suggest_restaurant('테스트 식당 A', '서울 테스트로 9', %s, %s, 'korean')
            from generate_series(1, 6) $$, :'p40_lat', :'p40_lng'),
  'blocked attempts do not consume the daily limit'
);
select results_eq(
  $$ select public.suggest_restaurant('다른 사용자 제안', '서울 테스트로 50', 37.70, 127.00, 'korean')->>'status' $$,
  array['created'],
  'a user who only hit blocks can still suggest'
);

-- direct writes stay closed ---------------------------------------------------
select throws_ok(
  $$ insert into public.restaurant_duplicate_candidates (restaurant_id, candidate_id, reason, name_similarity, distance_m)
     select id, id, 'same_name', 1, 0 from public.restaurants limit 1 $$,
  '42501', null, 'users cannot write duplicate candidates'
);

select * from finish();
rollback;
