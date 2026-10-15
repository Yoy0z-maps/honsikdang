-- WP-02: structured solo-dining reviews and tags.
--
-- Decisions (specs/decisions.md §11):
--   Q1 reviews publish only after approval (default 'pending')
--   Q2 one review per user per restaurant (revisits update the same review)
--   Q3 author delete is a hard delete; moderators use status 'removed' instead
--   Q6 price_paid = KRW actually spent by one person on that visit
--
-- Rollback (local only):
--   drop table if exists public.review_tags, public.tags, public.restaurant_reviews;
--   drop type if exists public.review_status, public.seat_type, public.tag_kind;
--   drop function if exists private.guard_review_update(), private.validate_review(),
--     private.review_tags_mark_pending();

-- ---------------------------------------------------------------------------
-- restaurant_reviews
-- ---------------------------------------------------------------------------
create type public.review_status as enum ('pending', 'approved', 'rejected', 'removed');
create type public.seat_type as enum ('counter', 'single_table', 'shared_table', 'booth', 'other');

create table public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visited_at date not null check (visited_at >= date '2000-01-01'),
  solo_comfort smallint not null check (solo_comfort between 1 and 5),
  seat_type public.seat_type not null,
  solo_order_available boolean,
  price_paid integer check (price_paid between 0 and 1000000),
  wait_minutes integer check (wait_minutes between 0 and 600),
  body text check (char_length(body) <= 1000),
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_reviews_one_per_user unique (restaurant_id, user_id)
);

create index restaurant_reviews_user_idx on public.restaurant_reviews (user_id);
create index restaurant_reviews_status_restaurant_idx
  on public.restaurant_reviews (status, restaurant_id);

-- visited_at must not be in the future (Korea time). Kept out of CHECK because
-- current_date is not immutable.
create function private.validate_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.visited_at > (now() at time zone 'Asia/Seoul')::date then
    raise exception 'visited_at cannot be in the future'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_review() from public, anon, authenticated;

-- API users who are not admins cannot change status except back to 'pending',
-- and any content edit they make sends the review back to moderation.
-- Trusted server-side roles (postgres, service_role) are not restricted.
create function private.guard_review_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or (select private.is_admin()) then
    return new;
  end if;

  if new.status is distinct from old.status and new.status <> 'pending' then
    raise exception 'only moderators can change review status'
      using errcode = 'insufficient_privilege';
  end if;

  if (new.visited_at, new.solo_comfort, new.seat_type, new.solo_order_available,
      new.price_paid, new.wait_minutes, new.body)
     is distinct from
     (old.visited_at, old.solo_comfort, old.seat_type, old.solo_order_available,
      old.price_paid, old.wait_minutes, old.body) then
    new.status := 'pending';
  end if;

  return new;
end;
$$;
revoke all on function private.guard_review_update() from public, anon, authenticated;

create trigger restaurant_reviews_validate
  before insert or update on public.restaurant_reviews
  for each row execute function private.validate_review();

create trigger restaurant_reviews_guard_update
  before update on public.restaurant_reviews
  for each row execute function private.guard_review_update();

create trigger restaurant_reviews_set_updated_at
  before update on public.restaurant_reviews
  for each row execute function private.set_updated_at();

alter table public.restaurant_reviews enable row level security;
revoke all on table public.restaurant_reviews from anon, authenticated;
grant select on table public.restaurant_reviews to anon, authenticated;
grant insert (restaurant_id, visited_at, solo_comfort, seat_type, solo_order_available,
              price_paid, wait_minutes, body),
  update (visited_at, solo_comfort, seat_type, solo_order_available,
          price_paid, wait_minutes, body, status),
  delete
  on table public.restaurant_reviews to authenticated;

create policy restaurant_reviews_select_approved on public.restaurant_reviews
  for select to anon
  using (status = 'approved');

create policy restaurant_reviews_select_visible on public.restaurant_reviews
  for select to authenticated
  using (
    status = 'approved'
    or user_id = (select auth.uid())
    or (select private.is_admin())
  );

-- Reviews may target approved restaurants, or a pending one the author can
-- see (their own proposal). The subquery is filtered by restaurants RLS.
create policy restaurant_reviews_insert_own on public.restaurant_reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.status in ('approved', 'pending')
    )
  );

create policy restaurant_reviews_update_own_or_admin on public.restaurant_reviews
  for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));

create policy restaurant_reviews_delete_own on public.restaurant_reviews
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- tags (reference data, decision Q5) and review_tags
-- ---------------------------------------------------------------------------
create type public.tag_kind as enum ('seating', 'ordering', 'speed', 'atmosphere');

create table public.tags (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (char_length(btrim(label)) between 1 and 30),
  kind public.tag_kind not null
);

alter table public.tags enable row level security;
revoke all on table public.tags from anon, authenticated;
grant select on table public.tags to anon, authenticated;
grant insert (slug, label, kind), update (slug, label, kind), delete
  on table public.tags to authenticated;

create policy tags_select_all on public.tags
  for select to anon, authenticated
  using (true);

create policy tags_insert_admin on public.tags
  for insert to authenticated
  with check ((select private.is_admin()));

create policy tags_update_admin on public.tags
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy tags_delete_admin on public.tags
  for delete to authenticated
  using ((select private.is_admin()));

insert into public.tags (slug, label, kind) values
  ('solo_seat', '1인석', 'seating'),
  ('bar_seat', '바 좌석', 'seating'),
  ('solo_menu', '1인 메뉴', 'ordering'),
  ('kiosk_order', '키오스크 주문', 'ordering'),
  ('quick_turnover', '빠른 회전', 'speed'),
  ('quiet', '조용함', 'atmosphere');

create table public.review_tags (
  review_id uuid not null references public.restaurant_reviews (id) on delete cascade,
  tag_id smallint not null references public.tags (id),
  primary key (review_id, tag_id)
);

create index review_tags_tag_idx on public.review_tags (tag_id);

-- Changing tags is a content edit: send the review back to moderation when an
-- API user who is not an admin does it.
create function private.review_tags_mark_pending()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target uuid := coalesce(new.review_id, old.review_id);
begin
  if current_user in ('anon', 'authenticated') and not (select private.is_admin()) then
    update public.restaurant_reviews
       set status = 'pending'
     where id = target
       and status <> 'pending';
  end if;
  return null;
end;
$$;
revoke all on function private.review_tags_mark_pending() from public, anon, authenticated;

create trigger review_tags_mark_pending
  after insert or delete on public.review_tags
  for each row execute function private.review_tags_mark_pending();

alter table public.review_tags enable row level security;
revoke all on table public.review_tags from anon, authenticated;
grant select on table public.review_tags to anon, authenticated;
grant insert (review_id, tag_id), delete on table public.review_tags to authenticated;

-- Tag visibility follows the parent review's RLS.
create policy review_tags_select_visible on public.review_tags
  for select to anon, authenticated
  using (exists (select 1 from public.restaurant_reviews r where r.id = review_id));

create policy review_tags_insert_own on public.review_tags
  for insert to authenticated
  with check (
    exists (
      select 1 from public.restaurant_reviews r
      where r.id = review_id and r.user_id = (select auth.uid())
    )
  );

create policy review_tags_delete_own on public.review_tags
  for delete to authenticated
  using (
    exists (
      select 1 from public.restaurant_reviews r
      where r.id = review_id and r.user_id = (select auth.uid())
    )
  );
