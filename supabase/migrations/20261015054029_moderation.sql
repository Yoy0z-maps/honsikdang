-- WP-04c: reporting limit and moderation workflow (FR-008, journey E).
--
-- Status changes and the audit log are only reachable through moderate /
-- resolve_report: API roles lose UPDATE(status) on restaurants, reviews and
-- reports and INSERT on moderation_actions, so a moderator cannot change a
-- status without an audit row or write a fake one (found while designing
-- 04c). Both functions are SECURITY DEFINER with search_path = '', check the
-- admin role first, make the status change and the audit row atomic (K-05),
-- and only apply allowed transitions from the expected current state (HS409
-- otherwise, e.g. two moderators acting on the same item).
--
--   restaurant  approve  pending  -> approved
--               reject   pending  -> rejected   (reason required, Q28)
--               archive  approved -> archived   (reason required)
--               restore  archived -> approved
--   review      approve  pending  -> approved
--               reject   pending  -> rejected   (reason required)
--               remove   approved|pending -> removed (reason required)
--               restore  removed  -> approved
--
-- Rollback (local only):
--   drop function if exists public.moderate, public.resolve_report, public.am_i_admin,
--     public.admin_pending_places, public.admin_open_reports, public.my_places,
--     private.limit_report_submissions, private.latest_moderation_reason;
--   drop trigger if exists restaurant_reports_rate_limit on public.restaurant_reports;
--   (and restore my_reviews from 20261015031242)

-- ---------------------------------------------------------------------------
-- Reports: 20 per 24 hours (Q16)
-- ---------------------------------------------------------------------------
create function private.limit_report_submissions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.enforce_submission_limit('report', 20);
  return new;
end;
$$;
revoke all on function private.limit_report_submissions() from public, anon, authenticated;

create trigger restaurant_reports_rate_limit
  before insert on public.restaurant_reports
  for each row execute function private.limit_report_submissions();

-- ---------------------------------------------------------------------------
-- Close direct status/audit writes for API roles.
-- ---------------------------------------------------------------------------
revoke update (status) on table public.restaurants from authenticated;
revoke update (status) on table public.restaurant_reviews from authenticated;
revoke update (status) on table public.restaurant_reports from authenticated;
revoke insert on table public.moderation_actions from authenticated;
drop policy moderation_actions_insert_admin on public.moderation_actions;
drop policy restaurant_reports_update_admin on public.restaurant_reports;

-- Tag edits by the author still send the review back to moderation; the
-- trigger now needs its own rights to set status.
create or replace function private.review_tags_mark_pending()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.review_id, old.review_id);
begin
  -- current_user is the owner here; the API caller role is in the role GUC.
  if current_setting('role', true) in ('anon', 'authenticated')
     and not (select private.is_admin()) then
    update public.restaurant_reviews
       set status = 'pending'
     where id = target
       and status not in ('pending', 'removed');
  end if;
  return null;
end;
$$;
revoke all on function private.review_tags_mark_pending() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Removed reviews stay frozen: no tag edits either (W4a-01).
drop policy review_tags_insert_own on public.review_tags;
create policy review_tags_insert_own on public.review_tags
  for insert to authenticated
  with check (
    exists (
      select 1 from public.restaurant_reviews r
      where r.id = review_id and r.user_id = (select auth.uid()) and r.status <> 'removed'
    )
  );
drop policy review_tags_delete_own on public.review_tags;
create policy review_tags_delete_own on public.review_tags
  for delete to authenticated
  using (
    exists (
      select 1 from public.restaurant_reviews r
      where r.id = review_id and r.user_id = (select auth.uid()) and r.status <> 'removed'
    )
  );

-- ---------------------------------------------------------------------------
-- am_i_admin: for UI gating only; RPCs and RLS re-check.
-- ---------------------------------------------------------------------------
create function public.am_i_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select private.is_admin()), false);
$$;
revoke all on function public.am_i_admin() from public, anon, authenticated;
grant execute on function public.am_i_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- moderate
-- ---------------------------------------------------------------------------
create function public.moderate(
  target_type public.moderation_target,
  target_id uuid,
  action public.moderation_action,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_reason text := nullif(btrim(moderate.reason), '');
  from_states text[];
  to_state text;
  changed integer;
  target_exists boolean;
begin
  if not (select private.is_admin()) then
    raise exception 'moderators only' using errcode = 'insufficient_privilege';
  end if;
  if clean_reason is not null and char_length(clean_reason) > 500 then
    raise exception 'reason must be at most 500 characters' using errcode = 'invalid_parameter_value';
  end if;

  if moderate.target_type = 'restaurant' then
    case moderate.action
      when 'approve' then from_states := '{pending}';  to_state := 'approved';
      when 'reject'  then from_states := '{pending}';  to_state := 'rejected';
      when 'archive' then from_states := '{approved}'; to_state := 'archived';
      when 'restore' then from_states := '{archived}'; to_state := 'approved';
      else raise exception 'action % not allowed for restaurants', moderate.action
             using errcode = 'invalid_parameter_value';
    end case;
  elsif moderate.target_type = 'review' then
    case moderate.action
      when 'approve' then from_states := '{pending}';          to_state := 'approved';
      when 'reject'  then from_states := '{pending}';          to_state := 'rejected';
      when 'remove'  then from_states := '{approved,pending}'; to_state := 'removed';
      when 'restore' then from_states := '{removed}';          to_state := 'approved';
      else raise exception 'action % not allowed for reviews', moderate.action
             using errcode = 'invalid_parameter_value';
    end case;
  else
    raise exception 'use resolve_report for reports' using errcode = 'invalid_parameter_value';
  end if;

  if moderate.action in ('reject', 'archive', 'remove') and clean_reason is null then
    raise exception 'a reason is required for %', moderate.action using errcode = 'invalid_parameter_value';
  end if;

  if moderate.target_type = 'restaurant' then
    update public.restaurants r
       set status = to_state::public.restaurant_status
     where r.id = moderate.target_id
       and r.status::text = any (from_states);
    get diagnostics changed = row_count;
    target_exists := exists (select 1 from public.restaurants r where r.id = moderate.target_id);
  else
    update public.restaurant_reviews v
       set status = to_state::public.review_status
     where v.id = moderate.target_id
       and v.status::text = any (from_states);
    get diagnostics changed = row_count;
    target_exists := exists (select 1 from public.restaurant_reviews v where v.id = moderate.target_id);
  end if;

  if changed = 0 then
    if not target_exists then
      raise exception 'target not found' using errcode = 'no_data_found';
    end if;
    raise exception 'target is not in a state that allows %', moderate.action using errcode = 'HS409';
  end if;

  insert into public.moderation_actions (target_type, target_id, action, reason)
  values (moderate.target_type, moderate.target_id, moderate.action, clean_reason);
end;
$$;
revoke all on function public.moderate(public.moderation_target, uuid, public.moderation_action, text)
  from public, anon, authenticated;
grant execute on function public.moderate(public.moderation_target, uuid, public.moderation_action, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- resolve_report: decide a report and (optionally) act on its target, atomically.
-- ---------------------------------------------------------------------------
create function public.resolve_report(
  report_id uuid,
  decision text,
  content_action text default 'none',
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  report record;
begin
  if not (select private.is_admin()) then
    raise exception 'moderators only' using errcode = 'insufficient_privilege';
  end if;
  if resolve_report.decision not in ('resolve', 'dismiss')
     or resolve_report.content_action not in ('none', 'remove_review', 'archive_restaurant') then
    raise exception 'invalid decision or content action' using errcode = 'invalid_parameter_value';
  end if;
  if resolve_report.decision = 'dismiss' and resolve_report.content_action <> 'none' then
    raise exception 'a dismissed report cannot act on content' using errcode = 'invalid_parameter_value';
  end if;

  select r.target_type, r.target_id, r.status
    into report
    from public.restaurant_reports r
   where r.id = resolve_report.report_id
     for update;
  if not found then
    raise exception 'report not found' using errcode = 'no_data_found';
  end if;
  if report.status <> 'open' then
    raise exception 'report already handled' using errcode = 'HS409';
  end if;

  if resolve_report.content_action = 'remove_review' then
    if report.target_type <> 'review' then
      raise exception 'remove_review needs a review report' using errcode = 'invalid_parameter_value';
    end if;
    perform public.moderate('review', report.target_id, 'remove', resolve_report.reason);
  elsif resolve_report.content_action = 'archive_restaurant' then
    if report.target_type <> 'restaurant' then
      raise exception 'archive_restaurant needs a restaurant report' using errcode = 'invalid_parameter_value';
    end if;
    perform public.moderate('restaurant', report.target_id, 'archive', resolve_report.reason);
  end if;

  update public.restaurant_reports r
     set status = case resolve_report.decision when 'resolve' then 'resolved' else 'dismissed' end::public.report_status
   where r.id = resolve_report.report_id;

  insert into public.moderation_actions (target_type, target_id, action, reason)
  values ('report', resolve_report.report_id, resolve_report.decision::public.moderation_action,
          nullif(btrim(resolve_report.reason), ''));
end;
$$;
revoke all on function public.resolve_report(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_report(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin read models (invoker + explicit admin check; RLS lets admins read).
-- ---------------------------------------------------------------------------
create function public.admin_pending_places()
returns table (
  id uuid,
  name text,
  address text,
  category_label text,
  lat double precision,
  lng double precision,
  created_at timestamptz,
  candidates jsonb
)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'moderators only' using errcode = 'insufficient_privilege';
  end if;
  return query
  select r.id, r.name, r.address, c.label,
         extensions.st_y(r.location::extensions.geometry),
         extensions.st_x(r.location::extensions.geometry),
         r.created_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', o.id, 'name', o.name, 'status', o.status,
                    'reason', d.reason, 'distance_m', d.distance_m)
                  order by d.distance_m)
             from public.restaurant_duplicate_candidates d
             join public.restaurants o on o.id = d.candidate_id
            where d.restaurant_id = r.id
         ), '[]'::jsonb)
    from public.restaurants r
    join public.restaurant_categories c on c.id = r.category_id
   where r.status = 'pending'
   order by r.created_at
   limit 100;
end;
$$;
revoke all on function public.admin_pending_places() from public, anon, authenticated;
grant execute on function public.admin_pending_places() to authenticated;

create function public.admin_open_reports()
returns table (
  id uuid,
  target_type public.report_target,
  target_id uuid,
  target_label text,
  target_status text,
  reason public.report_reason,
  note text,
  created_at timestamptz
)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'moderators only' using errcode = 'insufficient_privilege';
  end if;
  return query
  select p.id, p.target_type, p.target_id,
         case p.target_type
           when 'restaurant' then (select r.name from public.restaurants r where r.id = p.target_id)
           else (select r.name || ' · ' || coalesce(left(v.body, 80), '(본문 없음)')
                   from public.restaurant_reviews v
                   join public.restaurants r on r.id = v.restaurant_id
                  where v.id = p.target_id)
         end,
         case p.target_type
           when 'restaurant' then (select r.status::text from public.restaurants r where r.id = p.target_id)
           else (select v.status::text from public.restaurant_reviews v where v.id = p.target_id)
         end,
         p.reason, p.note, p.created_at
    from public.restaurant_reports p
   where p.status = 'open'
   order by p.created_at
   limit 100;
end;
$$;
revoke all on function public.admin_open_reports() from public, anon, authenticated;
grant execute on function public.admin_open_reports() to authenticated;

-- ---------------------------------------------------------------------------
-- Moderation reasons for authors (Q32): only on their own rejected/removed/
-- archived items, via the definer functions below.
-- ---------------------------------------------------------------------------
create function private.latest_moderation_reason(p_type public.moderation_target, p_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select m.reason
    from public.moderation_actions m
   where m.target_type = p_type and m.target_id = p_id
     and m.action in ('reject', 'remove', 'archive')
   order by m.created_at desc, m.id desc
   limit 1;
$$;
revoke all on function private.latest_moderation_reason(public.moderation_target, uuid)
  from public, anon, authenticated;

drop function public.my_reviews(uuid);
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
  updated_at timestamptz,
  moderation_reason text
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
         v.created_at, v.updated_at,
         case when v.status in ('rejected', 'removed')
              then private.latest_moderation_reason('review', v.id) end
    from public.restaurant_reviews v
    join public.restaurants r on r.id = v.restaurant_id
   where v.user_id = (select auth.uid())
     and (my_reviews.review_id is null or v.id = my_reviews.review_id)
   order by v.created_at desc
   limit 100;
$$;
revoke all on function public.my_reviews(uuid) from public, anon, authenticated;
grant execute on function public.my_reviews(uuid) to authenticated;

create function public.my_places()
returns table (
  id uuid,
  name text,
  address text,
  category_label text,
  status public.restaurant_status,
  created_at timestamptz,
  moderation_reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.name, r.address, c.label, r.status, r.created_at,
         case when r.status in ('rejected', 'archived')
              then private.latest_moderation_reason('restaurant', r.id) end
    from public.restaurants r
    join public.restaurant_categories c on c.id = r.category_id
   where r.created_by = (select auth.uid())
   order by r.created_at desc
   limit 100;
$$;
revoke all on function public.my_places() from public, anon, authenticated;
grant execute on function public.my_places() to authenticated;
