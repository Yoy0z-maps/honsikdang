-- restaurant_reviews, tags, review_tags authorization matrix (Q1, Q2, Q3).
begin;
\ir _fixtures.psql
select plan(28);

-- reviews: read ------------------------------------------------------------
:as_anon
select set_eq(
  $$ select id from public.restaurant_reviews $$,
  array[:'v_approved_other'::uuid, :'v_approved_owner'::uuid],
  'anon sees only approved reviews'
);

:as_owner
select set_eq(
  $$ select id from public.restaurant_reviews $$,
  array[:'v_approved_other'::uuid, :'v_approved_owner'::uuid],
  'owner does not see another user''s pending review'
);

:as_other
select set_eq(
  $$ select id from public.restaurant_reviews $$,
  array[:'v_approved_other'::uuid, :'v_approved_owner'::uuid, :'v_pending_other'::uuid],
  'author sees their own pending review'
);

:as_admin
select results_eq(
  $$ select count(*)::int from public.restaurant_reviews $$,
  array[3],
  'admin sees every review'
);

-- reviews: create ----------------------------------------------------------
:as_anon
select throws_ok(
  $$ insert into public.restaurant_reviews (restaurant_id, visited_at, solo_comfort, seat_type)
     values ('a0000000-0000-4000-8000-000000000002', '2026-10-01', 4, 'counter') $$,
  '42501',
  null,
  'anon cannot write reviews'
);

:as_owner
select results_eq(
  $$ insert into public.restaurant_reviews (restaurant_id, visited_at, solo_comfort, seat_type, price_paid)
     values ('a0000000-0000-4000-8000-000000000002', '2026-10-01', 4, 'counter', 9000)
     returning status::text, user_id $$,
  $$ values ('pending', '00000000-0000-4000-8000-000000000001'::uuid) $$,
  'owner review on an approved restaurant is created as pending (Q1)'
);

select results_eq(
  $$ insert into public.restaurant_reviews (restaurant_id, visited_at, solo_comfort, seat_type)
     values ('a0000000-0000-4000-8000-000000000003', '2026-10-01', 3, 'booth')
     returning status::text $$,
  array['pending'],
  'owner can review their own pending proposal'
);

select throws_ok(
  $$ insert into public.restaurant_reviews (restaurant_id, visited_at, solo_comfort, seat_type)
     values ('a0000000-0000-4000-8000-000000000004', '2026-10-01', 3, 'booth') $$,
  '42501',
  null,
  'owner cannot review a restaurant they cannot see'
);

select throws_ok(
  $$ insert into public.restaurant_reviews (restaurant_id, visited_at, solo_comfort, seat_type)
     values ('a0000000-0000-4000-8000-000000000001', '2026-10-05', 2, 'counter') $$,
  '23505',
  null,
  'second review of the same restaurant is rejected (Q2)'
);

select throws_ok(
  $$ insert into public.restaurant_reviews (restaurant_id, visited_at, solo_comfort, seat_type, status)
     values ('a0000000-0000-4000-8000-000000000002', '2026-10-01', 4, 'counter', 'approved') $$,
  '42501',
  null,
  'owner cannot set status on insert'
);

select throws_ok(
  $$ insert into public.restaurant_reviews (restaurant_id, visited_at, solo_comfort, seat_type)
     values ('a0000000-0000-4000-8000-000000000003', current_date + 30, 4, 'counter') $$,
  '23514',
  null,
  'future visit date is rejected'
);

select throws_ok(
  $$ insert into public.restaurant_reviews (restaurant_id, visited_at, solo_comfort, seat_type)
     values ('a0000000-0000-4000-8000-000000000003', '2026-10-01', 6, 'counter') $$,
  '23514',
  null,
  'solo_comfort outside 1-5 is rejected'
);

-- reviews: update ----------------------------------------------------------
select results_eq(
  $$ update public.restaurant_reviews set solo_comfort = 3
     where id = 'b0000000-0000-4000-8000-000000000002' returning status::text $$,
  array['pending'],
  'editing an approved review sends it back to moderation'
);

select throws_ok(
  $$ update public.restaurant_reviews set status = 'approved'
     where id = 'b0000000-0000-4000-8000-000000000002' $$,
  '42501',
  null,
  'author cannot approve their own review'
);

select is_empty(
  $$ update public.restaurant_reviews set solo_comfort = 1
     where id = 'b0000000-0000-4000-8000-000000000001' returning id $$,
  'owner cannot edit another user''s review'
);

:as_admin
select throws_ok(
  $$ update public.restaurant_reviews set status = 'approved'
     where id = 'b0000000-0000-4000-8000-000000000003' $$,
  '42501',
  null,
  'even admins cannot change review status directly'
);

select lives_ok(
  $$ select public.moderate('review', 'b0000000-0000-4000-8000-000000000003', 'approve') $$,
  'admin can approve a review via moderate'
);

select is_empty(
  $$ delete from public.restaurant_reviews
     where id = 'b0000000-0000-4000-8000-000000000003' returning id $$,
  'admin cannot hard-delete reviews; moderation uses status removed (Q3)'
);

-- tags ---------------------------------------------------------------------
:as_anon
select results_eq(
  $$ select count(*)::int from public.tags $$,
  array[6],
  'anon can read the 6 seeded tags'
);

:as_owner
select throws_ok(
  $$ insert into public.tags (slug, label, kind) values ('t', '태그', 'speed') $$,
  '42501',
  null,
  'regular user cannot create tags'
);

-- server-side roles ---------------------------------------------------------
:as_postgres
select results_eq(
  $$ update public.restaurant_reviews set status = 'approved'
     where id = 'b0000000-0000-4000-8000-000000000002' returning status::text $$,
  array['approved'],
  'trusted server-side role can change review status'
);

-- review_tags --------------------------------------------------------------

:as_owner
select results_eq(
  $$ insert into public.review_tags (review_id, tag_id)
     select 'b0000000-0000-4000-8000-000000000002', id from public.tags where slug = 'solo_seat'
     returning review_id $$,
  array['b0000000-0000-4000-8000-000000000002'::uuid],
  'owner can tag their own review'
);

select results_eq(
  $$ select status::text from public.restaurant_reviews where id = 'b0000000-0000-4000-8000-000000000002' $$,
  array['pending'],
  'changing tags sends an approved review back to moderation'
);

select throws_ok(
  $$ insert into public.review_tags (review_id, tag_id)
     select 'b0000000-0000-4000-8000-000000000001', id from public.tags where slug = 'quiet' $$,
  '42501',
  null,
  'owner cannot tag another user''s review'
);

:as_postgres
insert into public.review_tags (review_id, tag_id)
select :'v_approved_other'::uuid, id from public.tags where slug = 'quiet';

:as_anon
select results_eq(
  $$ select review_id from public.review_tags $$,
  array[:'v_approved_other'::uuid],
  'anon sees tags only on approved reviews'
);

-- reviews: delete ----------------------------------------------------------
:as_owner
select is_empty(
  $$ delete from public.restaurant_reviews
     where id = 'b0000000-0000-4000-8000-000000000001' returning id $$,
  'owner cannot delete another user''s review'
);

select results_eq(
  $$ delete from public.restaurant_reviews
     where id = 'b0000000-0000-4000-8000-000000000002' returning id $$,
  array[:'v_approved_owner'::uuid],
  'author can hard-delete their own review (Q3)'
);

:as_postgres
select results_eq(
  $$ select count(*)::int from public.review_tags
     where review_id = 'b0000000-0000-4000-8000-000000000002' $$,
  array[0],
  'deleting a review removes its tags'
);

select * from finish();
rollback;
