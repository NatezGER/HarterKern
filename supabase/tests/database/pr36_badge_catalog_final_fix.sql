begin;
select plan(13);

select is((select array_agg(threshold order by sort_order) from public.badge_definitions
  where family_key = 'favorite-time' and is_active), array[2,3,5,10],
  'Favorite Time uses 2/3/5/10');
select is((select count(*) from public.badge_definitions where family_key = 'favorite-time'
  and threshold in (4,6)), 0::bigint, 'old Favorite Time thresholds are gone');
select is((select array_agg(tier::text order by sort_order) from public.badge_definitions
  where family_key = 'favorite-time' and is_active), array['bronze','silver','gold','diamond'],
  'Favorite Time remains one four-tier family');
select is((select array_agg(tier::text order by sort_order) from public.badge_definitions
  where family_key = 'bingo' and is_active), array['bronze','silver','gold','diamond'],
  'BINGO lines are one complete four-tier family');
select is((select array_agg(threshold order by sort_order) from public.badge_definitions
  where family_key = 'bingo-completion' and is_active), array[1,2,3,5],
  'BINGO completion remains 1/2/3/5');
select isnt((select family_key from public.badge_definitions where badge_key = 'bingo-diamond'),
  'bingo-completion', 'line and completion families stay separate');
select ok((select metadata ? 'timeHundredths' from public.player_badge_awards
  where badge_key like 'favorite-time-%' limit 1),
  'Favorite Time awards retain the personal time metadata');
select has_view('public', 'bingo_line_diamond_badge_awards',
  'deterministic Diamond line awards view exists');
select is((select count(*) from public.badge_definitions where not is_active
  and badge_key = 'bingo-diamond'), 0::bigint, 'Diamond line definition is active');

select ok((select count(*) from public.get_visible_player_badges(
  '99000000-0000-0000-0000-000000000001')) >= 0,
  'player badge RPC remains callable');
select ok(position('bingo_line_diamond_badge_awards' in pg_get_functiondef(
  'public.get_visible_player_badges(uuid)'::regprocedure)) > 0,
  'RPC includes the canonical Diamond BINGO source directly');
select ok(position('bingo_line_diamond_badge_awards' in pg_get_viewdef(
  'public.public_player_badges'::regclass, true)) > 0,
  'public_player_badges includes Diamond BINGO line awards');
select ok(not exists (
  select ppb.badge_key from public.public_player_badges ppb
  join public.badge_definitions bd on bd.badge_key = ppb.badge_key
  where bd.family_key = 'bingo-completion'
  intersect
  select badge_key from public.bingo_line_diamond_badge_awards
), 'BINGO completion remains separate from line awards');

select * from finish();
rollback;
