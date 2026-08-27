begin;
select plan(14);

insert into public.players (id, display_name, is_ak) values
  ('96000000-0000-0000-0000-000000000001', 'No line', false),
  ('96000000-0000-0000-0000-000000000002', 'Bronze line', false),
  ('96000000-0000-0000-0000-000000000003', 'Silver line', false),
  ('96000000-0000-0000-0000-000000000004', 'Gold line', false),
  ('96000000-0000-0000-0000-000000000005', 'Diamond line', false),
  ('96000000-0000-0000-0000-000000000006', 'Frequent non-line', false);

insert into public.historical_attempts (
  player_id, display_name, attempt_date, time_hundredths, sort_order, source
)
select p.player_id, p.display_name, date '2026-08-27', 100 + ending,
  row_number() over (partition by p.player_id order by repetition, ending), 'admin'
from (values
  ('96000000-0000-0000-0000-000000000001'::uuid, 'No line', 1),
  ('96000000-0000-0000-0000-000000000002'::uuid, 'Bronze line', 1),
  ('96000000-0000-0000-0000-000000000003'::uuid, 'Silver line', 2),
  ('96000000-0000-0000-0000-000000000004'::uuid, 'Gold line', 3),
  ('96000000-0000-0000-0000-000000000005'::uuid, 'Diamond line', 5)
) p(player_id, display_name, repetitions)
cross join lateral generate_series(1, p.repetitions) repetition
cross join lateral generate_series(0, case when p.player_id =
  '96000000-0000-0000-0000-000000000001'::uuid then 8 else 9 end) ending;

insert into public.historical_attempts (
  player_id, display_name, attempt_date, time_hundredths, sort_order, source
)
select '96000000-0000-0000-0000-000000000006', 'Frequent non-line',
  date '2026-08-27', 100 + ending, row_number() over (order by repetition, ending), 'admin'
from generate_series(1, 5) repetition
cross join unnest(array[0,1,2,3,4,5,6,7,8,10]) ending;

select is((select bronze_lines from public.player_bingo_statistics where player_id =
  '96000000-0000-0000-0000-000000000001'), 0, 'nine fields create no Bronze line');
select is((select diamond_lines from public.player_bingo_statistics where player_id =
  '96000000-0000-0000-0000-000000000001'), 0, 'no line creates no Diamond line');
select is((select array[qualifies_bronze, qualifies_silver, qualifies_gold, qualifies_diamond]
  from public.player_bingo_lines where player_id = '96000000-0000-0000-0000-000000000002'
  and line_key = 'row-0'), array[true,false,false,false], 'one hit per cell is Bronze only');
select is((select array[qualifies_bronze, qualifies_silver, qualifies_gold, qualifies_diamond]
  from public.player_bingo_lines where player_id = '96000000-0000-0000-0000-000000000003'
  and line_key = 'row-0'), array[true,true,false,false], 'two hits per cell add Silver');
select is((select array[qualifies_bronze, qualifies_silver, qualifies_gold, qualifies_diamond]
  from public.player_bingo_lines where player_id = '96000000-0000-0000-0000-000000000004'
  and line_key = 'row-0'), array[true,true,true,false], 'three hits per cell add Gold');
select is((select array[qualifies_bronze, qualifies_silver, qualifies_gold, qualifies_diamond]
  from public.player_bingo_lines where player_id = '96000000-0000-0000-0000-000000000005'
  and line_key = 'row-0'), array[true,true,true,true], 'five hits per cell add Diamond');
select is((select diamond_lines from public.player_bingo_statistics where player_id =
  '96000000-0000-0000-0000-000000000006'), 0, 'ten frequent endings outside one line create no Diamond');
select is((select count(*) from public.bingo_line_diamond_badge_awards where player_id =
  '96000000-0000-0000-0000-000000000006'), 0::bigint, 'non-line has no Diamond award');
select is((select (metadata->>'diamondLines')::integer from public.bingo_line_diamond_badge_awards
  where player_id = '96000000-0000-0000-0000-000000000005'), 1,
  'Diamond metadata contains the canonical line count');
select is((select (metadata->>'progress')::integer from public.bingo_line_diamond_badge_awards
  where player_id = '96000000-0000-0000-0000-000000000005'), 1,
  'Diamond progress equals the canonical line count');
select is((select badge_key from public.get_visible_player_badges(
  '96000000-0000-0000-0000-000000000005') where family_key = 'bingo'),
  'bingo-diamond', 'player RPC exposes canonical Diamond line award');
select is((select count(*) from public.bingo_line_diamond_badge_awards d where not exists (
  select 1 from public.player_bingo_lines l where l.player_id = d.player_id
    and l.qualifies_diamond)), 0::bigint, 'every Diamond award has a canonical Diamond line');
select is((select array_agg(threshold order by sort_order) from public.badge_definitions
  where family_key = 'bingo-completion' and is_active), array[1,2,3,5],
  'BINGO completion stays unchanged');
select is((select array_agg(threshold order by sort_order) from public.badge_definitions
  where family_key = 'favorite-time' and is_active), array[2,3,5,10],
  'Favorite Time stays unchanged');

select * from finish();
rollback;
