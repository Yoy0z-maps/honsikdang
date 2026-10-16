-- WP-05b: restaurant embeddings, embedding job queue, semantic re-ranking
-- (decisions Q44–Q47).
--
-- * Only owned, approved text is embedded (Q45): name, category, approved
--   tags and up to 20 recent approved review texts. Pending/removed reviews
--   and author data never leave the database.
-- * Changes enqueue a job (triggers); a trusted worker (service_role only)
--   claims jobs, embeds the text and stores vectors (Q46).
-- * rank_restaurants() only re-orders candidate ids the caller already got
--   from search_restaurants, so hard filters can never be relaxed (Q47).
--
-- Rollback:
--   drop function if exists public.rank_restaurants(uuid[], text, text, text),
--     public.embedding_jobs_claim(integer, text), public.embedding_jobs_complete(text, jsonb),
--     public.embedding_jobs_fail(uuid, text), private.embedding_source(uuid),
--     private.enqueue_embedding(uuid), private.enqueue_embedding_restaurant(),
--     private.enqueue_embedding_review(), private.enqueue_embedding_review_tag();
--   drop table if exists private.embedding_jobs, private.restaurant_embeddings;

create table private.restaurant_embeddings (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  model text not null check (char_length(model) <= 60),
  content text not null,
  content_hash text not null,
  embedding extensions.vector(1024) not null,
  embedded_at timestamptz not null default now(),
  primary key (restaurant_id, model)
);
alter table private.restaurant_embeddings enable row level security;
revoke all on table private.restaurant_embeddings from public, anon, authenticated;

create table private.embedding_jobs (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  enqueued_at timestamptz not null default now(),
  claimed_at timestamptz,
  attempts integer not null default 0,
  last_error text check (char_length(last_error) <= 200)
);
alter table private.embedding_jobs enable row level security;
revoke all on table private.embedding_jobs from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Source text (Q45). Null when the restaurant is not public.
-- ---------------------------------------------------------------------------
create function private.embedding_source(rid uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select concat_ws(E'\n',
           r.name,
           '종류: ' || c.label,
           (select '특성: ' || string_agg(t.label || ' ' || t.n || '건', ', ' order by t.n desc, t.label)
              from (select tg.label, count(*) as n
                      from public.review_tags rt
                      join public.restaurant_reviews v on v.id = rt.review_id
                      join public.tags tg on tg.id = rt.tag_id
                     where v.restaurant_id = r.id and v.status = 'approved'
                     group by tg.label) as t),
           (select '리뷰:' || E'\n' || string_agg('- ' || b.body, E'\n' order by b.visited_at desc, b.id)
              from (select v.id, v.visited_at, left(btrim(v.body), 300) as body
                      from public.restaurant_reviews v
                     where v.restaurant_id = r.id and v.status = 'approved'
                       and nullif(btrim(v.body), '') is not null
                     order by v.visited_at desc, v.id
                     limit 20) as b))
    from public.restaurants r
    join public.restaurant_categories c on c.id = r.category_id
   where r.id = rid and r.status = 'approved';
$$;
revoke all on function private.embedding_source(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Queue: any change that can alter the source text enqueues the restaurant.
-- Re-enqueueing a claimed job clears the claim so the newer text is embedded.
-- ---------------------------------------------------------------------------
create function private.enqueue_embedding(rid uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.embedding_jobs (restaurant_id)
  select rid where exists (select 1 from public.restaurants r where r.id = rid)
  on conflict (restaurant_id) do update
    set enqueued_at = now(), claimed_at = null, attempts = 0, last_error = null;
$$;
revoke all on function private.enqueue_embedding(uuid) from public, anon, authenticated;

create function private.enqueue_embedding_restaurant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_embedding(new.id);
  return null;
end;
$$;
revoke all on function private.enqueue_embedding_restaurant() from public, anon, authenticated;

create trigger restaurants_enqueue_embedding
  after insert or update of name, category_id, status on public.restaurants
  for each row execute function private.enqueue_embedding_restaurant();

create function private.enqueue_embedding_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_embedding(coalesce(new.restaurant_id, old.restaurant_id));
  return null;
end;
$$;
revoke all on function private.enqueue_embedding_review() from public, anon, authenticated;

create trigger restaurant_reviews_enqueue_embedding
  after insert or delete or update of status, body, visited_at on public.restaurant_reviews
  for each row execute function private.enqueue_embedding_review();

create function private.enqueue_embedding_review_tag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_embedding(v.restaurant_id)
     from public.restaurant_reviews v
    where v.id = coalesce(new.review_id, old.review_id);
  return null;
end;
$$;
revoke all on function private.enqueue_embedding_review_tag() from public, anon, authenticated;

create trigger review_tags_enqueue_embedding
  after insert or delete on public.review_tags
  for each row execute function private.enqueue_embedding_review_tag();

-- Existing restaurants start in the queue.
insert into private.embedding_jobs (restaurant_id)
select id from public.restaurants
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Worker API (service_role only).
-- ---------------------------------------------------------------------------

-- Claims up to `batch` jobs (5-minute lease, at most 5 attempts). Jobs whose
-- restaurant is no longer public drop its vectors; unchanged text is skipped.
create function public.embedding_jobs_claim(batch integer, model text)
returns table (restaurant_id uuid, content text, content_hash text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  job record;
  src text;
  src_hash text;
begin
  if batch is null or batch not between 1 and 100 then
    raise exception 'batch must be between 1 and 100' using errcode = '22023';
  end if;
  if model is null or char_length(model) not between 1 and 60 then
    raise exception 'invalid model' using errcode = '22023';
  end if;

  for job in
    select j.restaurant_id as rid
      from private.embedding_jobs j
     where (j.claimed_at is null or j.claimed_at < now() - interval '5 minutes')
       and j.attempts < 5
     order by j.enqueued_at
     limit batch
     for update skip locked
  loop
    src := private.embedding_source(job.rid);
    if src is null then
      delete from private.restaurant_embeddings e where e.restaurant_id = job.rid;
      delete from private.embedding_jobs j where j.restaurant_id = job.rid;
      continue;
    end if;
    src_hash := md5(src);
    if exists (select 1 from private.restaurant_embeddings e
                where e.restaurant_id = job.rid and e.model = embedding_jobs_claim.model
                  and e.content_hash = src_hash) then
      delete from private.embedding_jobs j where j.restaurant_id = job.rid;
      continue;
    end if;
    update private.embedding_jobs j
       set claimed_at = now(), attempts = j.attempts + 1
     where j.restaurant_id = job.rid;
    restaurant_id := job.rid;
    content := src;
    content_hash := src_hash;
    return next;
  end loop;
end;
$$;
revoke all on function public.embedding_jobs_claim(integer, text) from public, anon, authenticated;
grant execute on function public.embedding_jobs_claim(integer, text) to service_role;

-- Stores vectors for claimed jobs: items = [{restaurant_id, content_hash,
-- embedding: [1024 floats]}]. A vector is stored only if the text it was
-- made from is still current; the job is closed only if it was not
-- re-enqueued after the claim.
create function public.embedding_jobs_complete(model text, items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  rid uuid;
  src text;
  stored integer := 0;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 100 then
    raise exception 'items must be an array of at most 100' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(items) loop
    rid := (item->>'restaurant_id')::uuid;
    src := private.embedding_source(rid);
    if src is not null and md5(src) = item->>'content_hash' then
      insert into private.restaurant_embeddings as e
        (restaurant_id, model, content, content_hash, embedding)
      values (rid, embedding_jobs_complete.model, src, item->>'content_hash',
              (item->>'embedding')::extensions.vector(1024))
      on conflict on constraint restaurant_embeddings_pkey do update
        set content = excluded.content, content_hash = excluded.content_hash,
            embedding = excluded.embedding, embedded_at = now();
      stored := stored + 1;
    end if;
    delete from private.embedding_jobs j
     where j.restaurant_id = rid and j.claimed_at is not null;
  end loop;
  return stored;
end;
$$;
revoke all on function public.embedding_jobs_complete(text, jsonb) from public, anon, authenticated;
grant execute on function public.embedding_jobs_complete(text, jsonb) to service_role;

create function public.embedding_jobs_fail(restaurant_id uuid, error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.embedding_jobs j
     set claimed_at = null, last_error = left(error, 200)
   where j.restaurant_id = embedding_jobs_fail.restaurant_id;
$$;
revoke all on function public.embedding_jobs_fail(uuid, text) from public, anon, authenticated;
grant execute on function public.embedding_jobs_fail(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Re-ranking (Q47). Reciprocal rank fusion (k = 60) of vector similarity and
-- trigram word similarity over the same owned text. Ids that are not public
-- are dropped; ids without a vector still get a lexical rank (name only).
-- ---------------------------------------------------------------------------
create function public.rank_restaurants(
  candidate_ids uuid[],
  query_embedding text,
  model text,
  semantic_text text
)
returns table (id uuid, vector_rank integer, lexical_rank integer, score double precision)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  q extensions.vector(1024);
  txt text := nullif(btrim(semantic_text), '');
begin
  -- Signed-in users (AI search) or the trusted evaluation worker.
  if (select auth.uid()) is null and coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'sign in required' using errcode = '42501';
  end if;
  if coalesce(cardinality(candidate_ids), 0) > 50 then
    raise exception 'at most 50 candidates' using errcode = '22023';
  end if;
  if txt is not null and char_length(txt) > 200 then
    raise exception 'semantic_text must be at most 200 characters' using errcode = '22023';
  end if;
  q := query_embedding::extensions.vector(1024);

  return query
  with cands as (
    select r.id as rid, r.name as rname, e.content as econtent, e.embedding as emb
      from public.restaurants r
      left join private.restaurant_embeddings e
        on e.restaurant_id = r.id and e.model = rank_restaurants.model
     where r.id = any (candidate_ids) and r.status = 'approved'
  ),
  vec as (
    select rid, rank() over (order by emb operator(extensions.<=>) q)::integer as vr
      from cands where emb is not null and q is not null
  ),
  lex as (
    select rid, rank() over (order by s desc)::integer as lr
      from (select rid, extensions.word_similarity(txt, coalesce(econtent, rname)) as s
              from cands where txt is not null) as x
     where s > 0
  )
  select c.rid, v.vr, l.lr,
         (coalesce(1.0 / (60 + v.vr), 0) + coalesce(1.0 / (60 + l.lr), 0))::double precision
    from cands c
    left join vec v on v.rid = c.rid
    left join lex l on l.rid = c.rid
   order by 4 desc, c.rid;
end;
$$;
revoke all on function public.rank_restaurants(uuid[], text, text, text) from public, anon, authenticated;
grant execute on function public.rank_restaurants(uuid[], text, text, text) to authenticated, service_role;
