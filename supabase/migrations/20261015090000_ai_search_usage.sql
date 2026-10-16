-- WP-05a: AI search quota, monthly budget and usage log (Q41–Q42).
--
-- * Signed-in users only, 30 AI searches per 24 hours (submission_log).
-- * Every model call is logged without the query text: model, prompt
--   version, outcome, tokens, cost and latency.
-- * claim_ai_search() refuses (HS402) once this month's logged cost reaches
--   the budget the server passes in. Calling it directly only spends the
--   caller's own quota; the model is called by the server only.
-- * finish_ai_search() may only complete the caller's own pending row, and
--   token counts are clamped, so a user can inflate the logged cost by at
--   most a few cents per day.
--
-- Rollback:
--   drop function if exists public.claim_ai_search(bigint), public.finish_ai_search(bigint, text, integer, integer, integer);
--   drop table if exists private.ai_usage;
--   delete from private.submission_log where kind = 'ai_search';
--   alter table private.submission_log drop constraint submission_log_kind_check;
--   alter table private.submission_log add constraint submission_log_kind_check
--     check (kind in ('review', 'place', 'report'));

alter table private.submission_log drop constraint submission_log_kind_check;
alter table private.submission_log add constraint submission_log_kind_check
  check (kind in ('review', 'place', 'report', 'ai_search'));

create table private.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  model text not null check (char_length(model) <= 60),
  prompt_version text not null check (char_length(prompt_version) <= 30),
  outcome text not null default 'pending'
    check (outcome in ('pending', 'ok', 'invalid_output', 'timeout', 'error')),
  input_tokens integer not null default 0 check (input_tokens between 0 and 5000),
  output_tokens integer not null default 0 check (output_tokens between 0 and 400),
  cost_micro_usd integer not null default 0 check (cost_micro_usd >= 0),
  latency_ms integer check (latency_ms between 0 and 60000)
);
create index ai_usage_created_idx on private.ai_usage (created_at);
alter table private.ai_usage enable row level security;
revoke all on table private.ai_usage from public, anon, authenticated;

-- Start of the current month in Korea, where the budget is managed.
create function private.ai_month_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
$$;
revoke all on function private.ai_month_start() from public, anon, authenticated;

create function public.claim_ai_search(
  monthly_budget_micro_usd bigint,
  model text,
  prompt_version text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  spent bigint;
  usage_id bigint;
begin
  if uid is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  if monthly_budget_micro_usd is null or monthly_budget_micro_usd < 0 then
    raise exception 'invalid budget' using errcode = '22023';
  end if;

  -- Serialize claims so concurrent requests cannot overshoot the budget check.
  perform pg_advisory_xact_lock(hashtextextended('ai_search_budget', 0));
  select coalesce(sum(u.cost_micro_usd), 0) into spent
    from private.ai_usage u
   where u.created_at >= private.ai_month_start();
  if spent >= monthly_budget_micro_usd then
    raise exception 'monthly AI budget reached' using errcode = 'HS402';
  end if;

  perform private.enforce_submission_limit('ai_search', 30);

  insert into private.ai_usage (user_id, model, prompt_version)
  values (uid, claim_ai_search.model, claim_ai_search.prompt_version)
  returning id into usage_id;
  return usage_id;
end;
$$;
revoke all on function public.claim_ai_search(bigint, text, text) from public, anon, authenticated;
grant execute on function public.claim_ai_search(bigint, text, text) to authenticated;

create function public.finish_ai_search(
  usage_id bigint,
  outcome text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_model text;
  tokens_in integer := least(greatest(coalesce(finish_ai_search.input_tokens, 0), 0), 5000);
  tokens_out integer := least(greatest(coalesce(finish_ai_search.output_tokens, 0), 0), 400);
begin
  if finish_ai_search.outcome not in ('ok', 'invalid_output', 'timeout', 'error') then
    raise exception 'invalid outcome' using errcode = '22023';
  end if;

  select u.model into row_model
    from private.ai_usage u
   where u.id = usage_id and u.user_id = (select auth.uid()) and u.outcome = 'pending'
   for update;
  if not found then
    raise exception 'no pending AI search' using errcode = 'P0002';
  end if;

  update private.ai_usage u
     set outcome = finish_ai_search.outcome,
         input_tokens = tokens_in,
         output_tokens = tokens_out,
         -- Prices in micro-USD per token (USD per million tokens), verified
         -- 2026-10-15; unknown models are priced high on purpose.
         cost_micro_usd = ceil(case row_model
             when 'claude-haiku-5-5' then tokens_in * 0.1 + tokens_out * 0.5
             when 'fixture' then 0
             else tokens_in * 10 + tokens_out * 50
           end),
         latency_ms = least(greatest(coalesce(finish_ai_search.latency_ms, 0), 0), 60000)
   where u.id = usage_id;
end;
$$;
revoke all on function public.finish_ai_search(bigint, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.finish_ai_search(bigint, text, integer, integer, integer) to authenticated;
