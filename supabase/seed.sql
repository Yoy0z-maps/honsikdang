-- LOCAL DEVELOPMENT ONLY — SYNTHETIC DATA.
-- None of these restaurants, addresses, users or reviews are real. Names are
-- prefixed with "[예시]" and addresses use the fictional "예시로" so they cannot
-- be mistaken for real places. Never load this into staging or production.
-- Coordinates cluster around the temporary default center (서울시청, Q7) so
-- the discovery UI and e2e tests have something to show.

-- Supabase Auth only signs in seeded users that look like ones it created:
-- default instance_id, email provider metadata, and empty (not NULL) token
-- columns. Otherwise magic-link sign-in fails with a 500.
insert into auth.users (id, instance_id, email, aud, role, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new,
                        email_change_token_current, phone_change, phone_change_token,
                        reauthentication_token)
select v.id::uuid, '00000000-0000-0000-0000-000000000000', v.email, 'authenticated', 'authenticated', now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
       '', '', '', '', '', '', '', ''
from (values
  ('5eed0000-0000-4000-8000-000000000001', 'seed-user-1@example.invalid'),
  ('5eed0000-0000-4000-8000-000000000002', 'seed-user-2@example.invalid'),
  ('5eed0000-0000-4000-8000-000000000003', 'seed-user-3@example.invalid'),
  ('5eed0000-0000-4000-8000-000000000004', 'seed-admin-2@example.invalid')
) as v (id, email);

insert into public.restaurants (id, name, address, location, category_id, status, source_type, created_by)
select v.id::uuid,
       v.name,
       v.address,
       extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
       (select id from public.restaurant_categories where slug = v.category),
       v.status::public.restaurant_status,
       'admin_entered',
       '5eed0000-0000-4000-8000-000000000001'::uuid
from (values
  ('5eed1000-0000-4000-8000-000000000001', '[예시] 시청 국밥', '서울 중구 예시로 1', 37.5670, 126.9790, 'korean', 'approved'),
  ('5eed1000-0000-4000-8000-000000000002', '[예시] 덕수궁 라멘', '서울 중구 예시로 2', 37.5655, 126.9752, 'japanese', 'approved'),
  ('5eed1000-0000-4000-8000-000000000003', '[예시] 을지로 분식', '서울 중구 예시로 3', 37.5660, 126.9910, 'bunsik', 'approved'),
  ('5eed1000-0000-4000-8000-000000000004', '[예시] 광화문 덮밥', '서울 종로구 예시로 4', 37.5715, 126.9768, 'japanese', 'approved'),
  ('5eed1000-0000-4000-8000-000000000005', '[예시] 서소문 중식', '서울 중구 예시로 5', 37.5630, 126.9725, 'chinese', 'approved'),
  ('5eed1000-0000-4000-8000-000000000006', '[예시] 명동 쌀국수', '서울 중구 예시로 6', 37.5636, 126.9850, 'asian', 'approved'),
  ('5eed1000-0000-4000-8000-000000000007', '[예시] 종로 김밥', '서울 종로구 예시로 7', 37.5700, 126.9830, 'bunsik', 'pending'),
  ('5eed1000-0000-4000-8000-000000000008', '[예시] 남대문 칼국수', '서울 중구 예시로 8', 37.5595, 126.9770, 'korean', 'approved'),
  ('5eed1000-0000-4000-8000-000000000009', '[예시] 서울역 버거', '서울 용산구 예시로 9', 37.5550, 126.9706, 'fast_food', 'approved'),
  ('5eed1000-0000-4000-8000-000000000010', '[예시] 강남 샐러드', '서울 강남구 예시로 10', 37.4979, 127.0276, 'western', 'approved')
) as v (id, name, address, lat, lng, category, status);

insert into public.restaurant_reviews
  (id, restaurant_id, user_id, visited_at, solo_comfort, seat_type, solo_order_available,
   price_paid, wait_minutes, body, status)
values
  ('5eed2000-0000-4000-8000-000000000001', '5eed1000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000001',
   '2026-10-01', 5, 'counter', true, 9000, 0, '예시 리뷰: 바 좌석이 있어 혼자 먹기 편했다.', 'approved'),
  ('5eed2000-0000-4000-8000-000000000002', '5eed1000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000002',
   '2026-09-20', 4, 'single_table', true, 10000, 5, '예시 리뷰: 점심에는 회전이 빠르다.', 'approved'),
  ('5eed2000-0000-4000-8000-000000000003', '5eed1000-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000001',
   '2026-10-05', 5, 'counter', true, 11000, 10, '예시 리뷰: 키오스크로 주문한다.', 'approved'),
  ('5eed2000-0000-4000-8000-000000000004', '5eed1000-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000003',
   '2026-09-28', 3, 'shared_table', true, 6000, 0, null, 'approved'),
  ('5eed2000-0000-4000-8000-000000000005', '5eed1000-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000002',
   '2026-10-03', 4, 'single_table', null, null, null, '예시 리뷰: 가격은 기억나지 않는다.', 'approved'),
  ('5eed2000-0000-4000-8000-000000000006', '5eed1000-0000-4000-8000-000000000006', '5eed0000-0000-4000-8000-000000000003',
   '2026-10-07', 4, 'booth', true, 12000, 15, '예시 리뷰: 조용한 편이다.', 'approved'),
  ('5eed2000-0000-4000-8000-000000000007', '5eed1000-0000-4000-8000-000000000008', '5eed0000-0000-4000-8000-000000000001',
   '2026-09-15', 4, 'single_table', true, 8000, 0, null, 'approved'),
  ('5eed2000-0000-4000-8000-000000000008', '5eed1000-0000-4000-8000-000000000009', '5eed0000-0000-4000-8000-000000000002',
   '2026-10-09', 3, 'counter', true, 9500, 5, '예시 리뷰: 키오스크 주문, 1인석 있음.', 'approved'),
  ('5eed2000-0000-4000-8000-000000000009', '5eed1000-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000003',
   '2026-10-10', 2, 'shared_table', false, 13000, 20, '예시 리뷰: 승인 대기 중인 리뷰.', 'pending');

insert into public.review_tags (review_id, tag_id)
select v.review_id::uuid, t.id
from (values
  ('5eed2000-0000-4000-8000-000000000001', 'solo_seat'),
  ('5eed2000-0000-4000-8000-000000000001', 'bar_seat'),
  ('5eed2000-0000-4000-8000-000000000002', 'quick_turnover'),
  ('5eed2000-0000-4000-8000-000000000003', 'bar_seat'),
  ('5eed2000-0000-4000-8000-000000000003', 'kiosk_order'),
  ('5eed2000-0000-4000-8000-000000000004', 'solo_menu'),
  ('5eed2000-0000-4000-8000-000000000006', 'quiet'),
  ('5eed2000-0000-4000-8000-000000000007', 'solo_seat'),
  ('5eed2000-0000-4000-8000-000000000008', 'kiosk_order'),
  ('5eed2000-0000-4000-8000-000000000008', 'solo_seat'),
  ('5eed2000-0000-4000-8000-000000000009', 'quiet')
) as v (review_id, slug)
join public.tags t on t.slug = v.slug;

-- Local/CI-only moderators (decision Q30): seed-user-3@example.invalid and
-- seed-admin-2@example.invalid sign in through Mailpit and use /admin. Never seed admins in production;
-- see specs/ops/grant-admin.md.
-- A second moderator lets parallel e2e projects sign in without
-- invalidating each other's magic links.
insert into private.user_roles (user_id, role) values
  ('5eed0000-0000-4000-8000-000000000003', 'admin'),
  ('5eed0000-0000-4000-8000-000000000004', 'admin');
