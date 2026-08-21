-- Remove the legacy square-only rule superseded by
-- award_assets_dimensions_check. Trophy assets may be portrait while badges
-- and medals remain square through the newer constraint.

alter table public.award_assets
  drop constraint if exists award_assets_check;
