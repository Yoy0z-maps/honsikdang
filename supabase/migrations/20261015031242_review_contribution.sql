-- WP-04a: review contribution.
--
-- 1. Daily submission limits (Q16) via an append-only private log, so
--    deleting and re-creating content does not reset the count.
-- 2. Removed reviews (moderator decision) can no longer be edited or deleted
--    by their author: editing would resubmit them and deleting would free the
--    one-review-per-restaurant slot (Q15). Account deletion still cascades.
-- 3. submit_review / update_my_review: review + tags in one transaction,
--    SECURITY INVOKER so RLS and column grants still apply.
-- 4. my_reviews: the caller's own reviews with restaurant name and status,
--    including restaurants they can no longer see (e.g. archived).
--
-- Rollback (local only):
--   drop function if exists public.submit_review, public.update_my_review, public.my_reviews;
--   drop trigger if exists restaurant_reviews_rate_limit on public.restaurant_reviews;
--   drop function if exists private.limit_review_submissions(), private.enforce_submission_limit(text, integer),
--     private.resolve_tag_ids(text[]);
--   drop table if exists private.submission_log;
--   (and restore guard_review_update / restaurant_reviews_delete_own from 20261015005836)

-- ---------------------------------------------------------------------------
-- 1. submission limits
-- ---------------------------------------------------------------------------
create table private.submission_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('review', 'place', 'report')),
  created_at timestamptz not null default now()
);
create index submission_log_user_kind_time_idx
  on private.submission_log (user_id, kind, created_at);
alter table private.submission_log enable row level security;
revoke all on table private.submission_log from public, anon, authenticated;

-- Raises HS429 when the caller has reached `max_per_day` submissions of `kind`
-- in the last 24 hours, otherwise records one. Requests without a user JWT
-- (postgres, service_role) are not limited. Runs inside the caller's
-- transaction, so a failed insert does not count.
create function private.enforce_submission_limit(kind text, max_per_day integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  recent integer;
begin
  if uid is null then
    return;
  end if;

  -- Serialize concurrent submissions by the same user and kind.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || enforce_submission_limit.kind, 0));

  select count(*) into recent
    from private.submission_log l
   where l.user_id = uid
     and l.kind = enforce_submission_limit.kind
     and l.created_at > now() - interval '24 hours';

  if recent >= max_per_day then
    raise exception 'daily % limit of % reached', enforce_submission_limit.kind, max_per_day
      using errcode = 'HS429';
  end if;

  insert into private.submission_log (user_id, kind) values (uid, enforce_submission_limit.kind);
end;
$$;
revoke all on function private.enforce_submission_limit(text, integer) from public, anon, authenticated;
grant execute on function private.enforce_submission_limit(text, integer) to authenticated;

create function private.limit_review_submissions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.enforce_submission_limit('review', 10);
  return new;
end;
$$;
revoke all on function private.limit_review_submissions() from public, anon, authenticated;

create trigger restaurant_reviews_rate_limit
  before insert on public.restaurant_reviews
  for each row execute function private.limit_review_submissions();

-- ---------------------------------------------------------------------------
-- 2. removed reviews are frozen for their author
-- ---------------------------------------------------------------------------
create or replace function private.guard_review_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or (select private.is_admin()) then
    return new;
  end if;

  if old.status = 'removed' then
    raise exception 'removed reviews cannot be edited'
      using errcode = 'insufficient_privilege';
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

drop policy restaurant_reviews_delete_own on public.restaurant_reviews;
create policy restaurant_reviews_delete_own on public.restaurant_reviews
  for delete to authenticated
  using (user_id = (select auth.uid()) and status <> 'removed');

-- ---------------------------------------------------------------------------
-- 3. submit / update with tags
-- ---------------------------------------------------------------------------
create function private.resolve_tag_ids(slugs text[])
returns smallint[]
language plpgsql
stable
set search_path = ''
as $$
declare
  wanted integer := (select count(distinct s) from unnest(coalesce(slugs, '{}')) as s);
  ids smallint[];
begin
  if wanted > 6 then
    raise exception 'at most 6 tags' using errcode = 'invalid_parameter_value';
  end if;
  select coalesce(array_agg(t.id order by t.id), '{}')
    into ids
    from public.tags t
   where t.slug = any (coalesce(slugs, '{}'));
  if cardinality(ids) <> wanted then
    raise exception 'unknown tag' using errcode = 'invalid_parameter_value';
  end if;
  return ids;
end;
$$;
revoke all on function private.resolve_tag_ids(text[]) from public, anon, authenticated;
grant execute on function private.resolve_tag_ids(text[]) to authenticated;

create function public.submit_review(
  restaurant_id uuid,
  visited_at date,
  solo_comfort smallint,
  seat_type public.seat_type,
  solo_order_available boolean default null,
  price_paid integer default null,
  wait_minutes integer default null,
  body text default null,
  tag_slugs text[] default '{}'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  tag_ids smallint[] := private.resolve_tag_ids(tag_slugs);
  new_id uuid;
begin
  insert into public.restaurant_reviews
    (restaurant_id, visited_at, solo_comfort, seat_type, solo_order_available,
     price_paid, wait_minutes, body)
  values
    (submit_review.restaurant_id, submit_review.visited_at, submit_review.solo_comfort,
     submit_review.seat_type, submit_review.solo_order_available, submit_review.price_paid,
     submit_review.wait_minutes, nullif(btrim(submit_review.body), ''))
  returning id into new_id;

  insert into public.review_tags (review_id, tag_id)
  select new_id, t from unnest(tag_ids) as t;

  return new_id;
end;
$$;
revoke all on function public.submit_review(uuid, date, smallint, public.seat_type, boolean,
  integer, integer, text, text[]) from public, anon, authenticated;
grant execute on function public.submit_review(uuid, date, smallint, public.seat_type, boolean,
  integer, integer, text, text[]) to authenticated;

create function public.update_my_review(
  review_id uuid,
  visited_at date,
  solo_comfort smallint,
  seat_type public.seat_type,
  solo_order_available boolean default null,
  price_paid integer default null,
  wait_minutes integer default null,
  body text default null,
  tag_slugs text[] default '{}'
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  tag_ids smallint[] := private.resolve_tag_ids(tag_slugs);
begin
  update public.restaurant_reviews r
     set visited_at = update_my_review.visited_at,
         solo_comfort = update_my_review.solo_comfort,
         seat_type = update_my_review.seat_type,
         solo_order_available = update_my_review.solo_order_available,
         price_paid = update_my_review.price_paid,
         wait_minutes = update_my_review.wait_minutes,
         body = nullif(btrim(update_my_review.body), '')
   where r.id = update_my_review.review_id
     and r.user_id = (select auth.uid());

  if not found then
    raise exception 'review not found' using errcode = 'no_data_found';
  end if;

  delete from public.review_tags rt
   where rt.review_id = update_my_review.review_id
     and rt.tag_id <> all (tag_ids);

  insert into public.review_tags (review_id, tag_id)
  select update_my_review.review_id, t
    from unnest(tag_ids) as t
   where not exists (
     select 1 from public.review_tags rt
      where rt.review_id = update_my_review.review_id and rt.tag_id = t
   );
end;
$$;
revoke all on function public.update_my_review(uuid, date, smallint, public.seat_type, boolean,
  integer, integer, text, text[]) from public, anon, authenticated;
grant execute on function public.update_my_review(uuid, date, smallint, public.seat_type, boolean,
  integer, integer, text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. my_reviews
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER only to read the restaurant name/status even when RLS
-- would hide the restaurant; rows are strictly limited to auth.uid().
create function public.my_reviews(review_id uuid default null)
returns table (
  id uuid,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_status public.restaurant_status,
  visited_at date,
  solo_comfort smallint,
  seat_type public.seat_type,
  solo_order_available boolean,
  price_paid integer,
  wait_minutes integer,
  body text,
  status public.review_status,
  tag_slugs text[],
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.restaurant_id, r.name, r.status,
         v.visited_at, v.solo_comfort, v.seat_type, v.solo_order_available,
         v.price_paid, v.wait_minutes, v.body, v.status,
         coalesce((
           select array_agg(t.slug order by t.id)
             from public.review_tags rt
             join public.tags t on t.id = rt.tag_id
            where rt.review_id = v.id
         ), '{}'),
         v.created_at, v.updated_at
    from public.restaurant_reviews v
    join public.restaurants r on r.id = v.restaurant_id
   where v.user_id = (select auth.uid())
     and (my_reviews.review_id is null or v.id = my_reviews.review_id)
   order by v.created_at desc
   limit 100;
$$;
revoke all on function public.my_reviews(uuid) from public, anon, authenticated;
grant execute on function public.my_reviews(uuid) to authenticated;
