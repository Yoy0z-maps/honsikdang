-- AI provider switch to OpenAI (decision C-59): price gpt-6-luna in the
-- usage log. Same body as 20261015090000 plus one CASE branch.
-- gpt-6-luna: $0.10 input / $0.50 output per 1M tokens (verified 2026-10-16,
-- https://developers.openai.com/api/docs/models/gpt-6-luna).
--
-- Rollback: re-run the finish_ai_search definition from 20261015090000.

create or replace function public.finish_ai_search(
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
             when 'gpt-6-luna' then tokens_in * 0.1 + tokens_out * 0.5
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
