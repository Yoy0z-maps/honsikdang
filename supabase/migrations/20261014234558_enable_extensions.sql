-- WP-01: enable spatial and vector extensions.
-- Installed in the dedicated `extensions` schema (not `public`) so PostGIS's
-- spatial_ref_sys table is not exposed via the Data API.
-- Ref: https://supabase.com/docs/guides/database/extensions/postgis
--      https://supabase.com/docs/guides/ai/vector-columns
-- Functions that use these types must set search_path = '' and fully qualify
-- references, e.g. extensions.geography, extensions.st_dwithin.
--
-- Rollback (local only; drops dependent objects):
--   drop extension if exists vector;
--   drop extension if exists postgis;

create extension if not exists postgis with schema extensions;
create extension if not exists vector with schema extensions;
