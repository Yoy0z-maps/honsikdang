-- WP-07: account deletion with review anonymization (C-73) and data
-- retention (C-74).
--
-- * Deleting an account removes the auth user and everything personal
--   (profile, saved places, roles, usage and rate-limit logs cascade), but
--   reviews stay as anonymous content: user_id becomes null. Places,
--   reports and moderation records already keep their rows (set null).
-- * purge_expired_data() (service_role, daily job) deletes AI usage logs
--   after 90 days and rate-limit records after 30 days.
--
-- Rollback:
--   drop function if exists public.delete_my_account(), public.purge_expired_data();
--   delete from public.restaurant_reviews where user_id is null;  -- anonymized rows
--   alter table public.restaurant_reviews drop constraint restaurant_reviews_user_id_fkey,
--     add constraint restaurant_reviews_user_id_fkey foreign key (user_id)
--       references auth.users (id) on delete cascade,
--     alter column user_id set not null;

alter table public.restaurant_reviews
  alter column user_id drop not null,
  drop constraint restaurant_reviews_user_id_fkey,
  add constraint restaurant_reviews_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete set null;

comment on column public.restaurant_reviews.user_id is
  'Author; null after the author deleted their account (anonymized review).';

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  -- Cascades remove the profile, roles, saved places, sessions and logs;
  -- reviews, places, reports and audit rows keep existing without an author.
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;

create function public.purge_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  usage_rows integer;
  limit_rows integer;
begin
  delete from private.ai_usage where created_at < now() - interval '90 days';
  get diagnostics usage_rows = row_count;
  delete from private.submission_log where created_at < now() - interval '30 days';
  get diagnostics limit_rows = row_count;
  return jsonb_build_object('ai_usage', usage_rows, 'submission_log', limit_rows);
end;
$$;
revoke all on function public.purge_expired_data() from public, anon, authenticated;
grant execute on function public.purge_expired_data() to service_role;
