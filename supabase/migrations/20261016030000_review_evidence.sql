-- WP-05c: review-level embeddings and grounded evidence (decisions Q50–Q55).
--
-- * Evidence is extractive (Q50): the best-matching approved review of a
--   restaurant, quoted verbatim. No generated text.
-- * Review vectors (Q51) are kept for approved reviews of approved
--   restaurants only; anything else is removed by the backlog sweep and is
--   filtered again at read time.
-- * The backlog is derived from data (no extra triggers): every approved
--   review whose current text has no vector for the model.
--
-- Rollback:
--   drop function if exists public.restaurant_evidence(uuid[], text, text, double precision),
--     public.review_embedding_backlog(integer, text), public.review_embeddings_store(text, jsonb),
--     private.review_embedding_text(uuid);
--   drop table if exists private.review_embeddings;

create table private.review_embeddings (
  review_id uuid not null references public.restaurant_reviews (id) on delete cascade,
  model text not null check (char_length(model) <= 60),
  content_hash text not null,
  embedding extensions.vector(1024) not null,
  embedded_at timestamptz not null default now(),
  primary key (review_id, model)
);
alter table private.review_embeddings enable row level security;
revoke all on table private.review_embeddings from public, anon, authenticated;

-- Text embedded for a review; null unless the review and its restaurant are
-- public and the review has a body. Same 300-character cut as the
-- restaurant source text.
create function private.review_embedding_text(vid uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select left(btrim(v.body), 300)
    from public.restaurant_reviews v
    join public.restaurants r on r.id = v.restaurant_id
   where v.id = vid and v.status = 'approved' and r.status = 'approved'
     and nullif(btrim(v.body), '') is not null;
$$;
revoke all on function private.review_embedding_text(uuid) from public, anon, authenticated;

-- Worker API (service_role only) ---------------------------------------------

-- Removes vectors that may no longer be shown, then returns up to `batch`
-- reviews that need a (new) vector.
create function public.review_embedding_backlog(batch integer, model text)
returns table (review_id uuid, content text, content_hash text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if batch is null or batch not between 1 and 100 then
    raise exception 'batch must be between 1 and 100' using errcode = '22023';
  end if;

  delete from private.review_embeddings e
   where private.review_embedding_text(e.review_id) is null;

  return query
  select v.id, t.txt, md5(t.txt)
    from public.restaurant_reviews v
    cross join lateral (select private.review_embedding_text(v.id) as txt) t
   where t.txt is not null
     and not exists (select 1 from private.review_embeddings e
                      where e.review_id = v.id and e.model = review_embedding_backlog.model
                        and e.content_hash = md5(t.txt))
   order by v.created_at desc, v.id
   limit batch;
end;
$$;
revoke all on function public.review_embedding_backlog(integer, text) from public, anon, authenticated;
grant execute on function public.review_embedding_backlog(integer, text) to service_role;

-- items = [{review_id, content_hash, embedding}]; stored only if the text is
-- still current.
create function public.review_embeddings_store(model text, items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  vid uuid;
  txt text;
  stored integer := 0;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 100 then
    raise exception 'items must be an array of at most 100' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(items) loop
    vid := (item->>'review_id')::uuid;
    txt := private.review_embedding_text(vid);
    if txt is not null and md5(txt) = item->>'content_hash' then
      insert into private.review_embeddings (review_id, model, content_hash, embedding)
      values (vid, review_embeddings_store.model, item->>'content_hash',
              (item->>'embedding')::extensions.vector(1024))
      on conflict on constraint review_embeddings_pkey do update
        set content_hash = excluded.content_hash, embedding = excluded.embedding,
            embedded_at = now();
      stored := stored + 1;
    end if;
  end loop;
  return stored;
end;
$$;
revoke all on function public.review_embeddings_store(text, jsonb) from public, anon, authenticated;
grant execute on function public.review_embeddings_store(text, jsonb) to service_role;

-- Evidence (Q50/Q52) -----------------------------------------------------------

-- For each candidate restaurant: its approved review closest to the query,
-- if at least `min_similarity` (cosine). The quote is the stored review
-- text itself; nothing is generated. Pending/removed reviews and
-- non-public restaurants never appear, whatever vectors exist.
create function public.restaurant_evidence(
  restaurant_ids uuid[],
  query_embedding text,
  model text,
  min_similarity double precision
)
returns table (
  restaurant_id uuid,
  review_id uuid,
  body text,
  visited_at date,
  similarity double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  q extensions.vector(1024);
begin
  if (select auth.uid()) is null and coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  if coalesce(cardinality(restaurant_ids), 0) > 50 then
    raise exception 'at most 50 restaurants' using errcode = '22023';
  end if;
  if min_similarity is null or min_similarity not between -1 and 1 then
    raise exception 'min_similarity must be between -1 and 1' using errcode = '22023';
  end if;
  q := query_embedding::extensions.vector(1024);

  return query
  select distinct on (v.restaurant_id)
         v.restaurant_id, v.id, v.body, v.visited_at,
         (1 - (e.embedding operator(extensions.<=>) q))::double precision
    from public.restaurant_reviews v
    join public.restaurants r on r.id = v.restaurant_id and r.status = 'approved'
    join private.review_embeddings e
      on e.review_id = v.id and e.model = restaurant_evidence.model
     and e.content_hash = md5(left(btrim(v.body), 300))
   where v.restaurant_id = any (restaurant_ids)
     and v.status = 'approved'
     and 1 - (e.embedding operator(extensions.<=>) q) >= min_similarity
   order by v.restaurant_id, e.embedding operator(extensions.<=>) q, v.visited_at desc;
end;
$$;
revoke all on function public.restaurant_evidence(uuid[], text, text, double precision) from public, anon, authenticated;
grant execute on function public.restaurant_evidence(uuid[], text, text, double precision) to authenticated, service_role;
