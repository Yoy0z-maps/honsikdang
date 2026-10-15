-- WP-04d: saving places (Q35/Q36).
--
-- Only approved restaurants can be saved (a user's own pending proposal is
-- visible to them but is not a place to go yet). my_saved() lists saved
-- places including ones that were archived later, without exposing their
-- address or location once they are no longer public.
--
-- Rollback:
--   drop function if exists public.my_saved();
--   drop policy favorites_insert_own on public.favorites;
--   create policy favorites_insert_own on public.favorites for insert to authenticated
--     with check (user_id = (select auth.uid())
--                 and exists (select 1 from public.restaurants r where r.id = restaurant_id));

drop policy favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id and r.status = 'approved'
    )
  );

create function public.my_saved()
returns table (
  id uuid,
  name text,
  category_label text,
  status public.restaurant_status,
  address text,
  lat double precision,
  lng double precision,
  saved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.name, c.label, r.status,
         case when r.status = 'approved' then r.address end,
         case when r.status = 'approved' then extensions.st_y(r.location::extensions.geometry) end,
         case when r.status = 'approved' then extensions.st_x(r.location::extensions.geometry) end,
         f.created_at
    from public.favorites f
    join public.restaurants r on r.id = f.restaurant_id
    join public.restaurant_categories c on c.id = r.category_id
   where f.user_id = (select auth.uid())
   order by f.created_at desc
   limit 200;
$$;
revoke all on function public.my_saved() from public, anon, authenticated;
grant execute on function public.my_saved() to authenticated;
