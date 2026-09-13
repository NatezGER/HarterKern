begin;
create extension if not exists pgtap;
select plan(13);

select has_column('public', 'events', 'trophy_competition_key',
  'events stores a structured trophy competition key');
select has_column('public', 'events', 'trophy_competition_year',
  'events stores a structured trophy competition year');
select has_function('public', 'sync_start_event_v4',
  array['text', 'date', 'jsonb', 'timestamp with time zone',
    'timestamp with time zone', 'text', 'boolean', 'text', 'integer'],
  'versioned event start RPC accepts trophy competition metadata');
select has_column('public', 'player_trophies', 'trophy_competition_key',
  'player trophies expose the concrete competition key');
select has_column('public', 'player_trophies', 'trophy_competition_year',
  'player trophies expose the concrete competition year');

select throws_ok($$
  insert into public.events (
    id, name, start_date, started_at, ends_at, status, awards_trophies,
    trophy_competition_key, trophy_competition_year
  ) values (
    'd3202600-0000-0000-0000-000000000099', 'Invalid competition',
    date '2026-09-13', now(), now() + interval '24 hours', 'closed', false,
    'denmark', 2026
  )
$$, '23514', null, 'competition metadata requires a trophy event');

select throws_ok($$
  insert into public.events (
    id, name, start_date, started_at, ends_at, status, awards_trophies,
    trophy_competition_key, trophy_competition_year
  ) values (
    'd3202600-0000-0000-0000-000000000098', 'Unknown competition',
    date '2026-09-13', now(), now() + interval '24 hours', 'closed', true,
    'unknown', 2026
  )
$$, '23514', null, 'unknown competition editions are rejected server-side');

insert into public.players (id, display_name, is_ak) values
  ('d3202600-0000-0000-0000-000000000001', 'Denmark Gold', false),
  ('d3202600-0000-0000-0000-000000000002', 'Denmark Silver', false),
  ('d3202600-0000-0000-0000-000000000003', 'Denmark Bronze', false);

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at,
  awards_trophies, trophy_competition_key, trophy_competition_year
) values (
  'd3202600-0000-0000-0000-000000000010', 'Neutraler Eventname',
  date '2026-09-13', timestamptz '2026-09-13 18:00:00+02',
  timestamptz '2026-09-14 18:00:00+02', 'closed',
  timestamptz '2026-09-14 18:00:00+02', true, 'denmark', 2026
);

insert into public.event_participants (event_id, player_id) values
  ('d3202600-0000-0000-0000-000000000010', 'd3202600-0000-0000-0000-000000000001'),
  ('d3202600-0000-0000-0000-000000000010', 'd3202600-0000-0000-0000-000000000002'),
  ('d3202600-0000-0000-0000-000000000010', 'd3202600-0000-0000-0000-000000000003');

insert into public.attempts (
  id, player_id, event_id, status, time_hundredths, is_dnf, is_ak,
  submitted_at, source
) values
  ('d3202600-0000-0000-0000-000000000101', 'd3202600-0000-0000-0000-000000000001', 'd3202600-0000-0000-0000-000000000010', 'approved', 250, false, false, '2026-09-13 18:01:00+02', 'admin'),
  ('d3202600-0000-0000-0000-000000000102', 'd3202600-0000-0000-0000-000000000002', 'd3202600-0000-0000-0000-000000000010', 'approved', 300, false, false, '2026-09-13 18:02:00+02', 'admin'),
  ('d3202600-0000-0000-0000-000000000103', 'd3202600-0000-0000-0000-000000000003', 'd3202600-0000-0000-0000-000000000010', 'approved', 350, false, false, '2026-09-13 18:03:00+02', 'admin');

select is((select count(*) from public.player_trophies
  where competition_id = 'd3202600-0000-0000-0000-000000000010'),
  3::bigint, 'Denmark event derives its regular top-three trophies');
select is((select array_agg(trophy_tier order by placement) from public.player_trophies
  where competition_id = 'd3202600-0000-0000-0000-000000000010'),
  array['gold', 'silver', 'bronze'], 'Denmark placements retain gold, silver and bronze');
select is((select min(trophy_competition_key) from public.player_trophies
  where competition_id = 'd3202600-0000-0000-0000-000000000010'),
  'denmark', 'derived trophies carry the Denmark key');
select is((select min(trophy_competition_year) from public.player_trophies
  where competition_id = 'd3202600-0000-0000-0000-000000000010'),
  2026, 'derived trophies carry the Denmark edition year');
select is((select count(*) from public.qualified_official_times
  where event_id = 'd3202600-0000-0000-0000-000000000010'),
  3::bigint, 'Denmark event attempts remain part of regular official statistics');

insert into public.events (
  id, name, start_date, started_at, ends_at, status, closed_at, awards_trophies
) values (
  'd3202600-0000-0000-0000-000000000011', 'Generic Trophy Event',
  date '2026-09-15', timestamptz '2026-09-15 18:00:00+02',
  timestamptz '2026-09-16 18:00:00+02', 'closed',
  timestamptz '2026-09-16 18:00:00+02', true
);
select ok((select trophy_competition_key is null and trophy_competition_year is null
  from public.events where id = 'd3202600-0000-0000-0000-000000000011'),
  'generic trophy events remain valid without a concrete competition');

select * from finish();
rollback;
