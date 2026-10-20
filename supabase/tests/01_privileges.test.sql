-- Structural security checks: RLS everywhere, minimal grants, private schema.
begin;
select plan(9);

select is_empty(
  $$ select c.relname
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('public', 'private')
        and c.relkind = 'r'
        and not c.relrowsecurity $$,
  'every table in public and private has RLS enabled'
);

select is_empty(
  $$ select table_name, privilege_type
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'anon'
        and privilege_type <> 'SELECT' $$,
  'anon has no write privileges on any public table'
);

select is_empty(
  $$ select table_name, privilege_type
       from information_schema.role_column_grants
      where table_schema = 'public'
        and grantee = 'anon'
        and privilege_type <> 'SELECT' $$,
  'anon has no column-level write privileges'
);

select set_eq(
  $$ select table_name::text
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'anon'
        and privilege_type = 'SELECT' $$,
  array['restaurant_categories', 'restaurants', 'restaurant_reviews', 'tags', 'review_tags',
        'review_menu_items'],
  'anon can read only the public catalogue tables'
);

select is_empty(
  $$ select table_name, privilege_type
       from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee in ('anon', 'authenticated')
        and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER') $$,
  'API roles have no TRUNCATE/REFERENCES/TRIGGER privileges'
);

select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon cannot use the private schema'
);

select ok(
  not has_table_privilege('authenticated', 'private.user_roles', 'select'),
  'authenticated cannot read role assignments'
);

select ok(
  not has_function_privilege('anon', 'private.is_admin()', 'execute'),
  'anon cannot execute private.is_admin()'
);

select is_empty(
  $$ select 1 from pg_tables where schemaname = 'public' and tablename = 'spatial_ref_sys' $$,
  'PostGIS spatial_ref_sys is not in the exposed public schema'
);

select * from finish();
rollback;
