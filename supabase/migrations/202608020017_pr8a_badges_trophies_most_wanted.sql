-- PR 8A: additive badge, trophy, Most Wanted, personal BINGO and
-- league-statistics foundation.
-- All awards remain derived from qualified source data. No production rows are
-- copied, deleted or rewritten by this migration.

alter table public.events
  add column if not exists awards_trophies boolean not null default false;

alter table public.badge_definitions
  add column if not exists badge_kind text not null default 'tiered',
  add column if not exists design_variant text not null default 'standard',
  add column if not exists scope_type text not null default 'all_time',
  add column if not exists is_active boolean not null default true;

-- PR 7A used the general category `streak` for the original sub-3 badges.
-- It remains a valid legacy category even though PR 8A assigns the known
-- sub-3 definitions to the more precise `sub3_streak` category. The complete
-- allow-list below is the union of every category introduced by PR 7A/main
-- and every category introduced by PR 8A. No legacy row is rewritten merely
-- to satisfy the constraint.
-- Diagnostic equivalent before this migration:
--   select distinct category from public.badge_definitions order by category;
do $$
declare
  unexpected_categories text[];
begin
  select array_agg(category order by category)
  into unexpected_categories
  from (
    select distinct category
    from public.badge_definitions
    where category not in (
      'attempts', 'wins', 'streak', 'performance', 'record', 'podium',
      'win_streak', 'sub3_streak', 'flawless', 'favorite_time',
      'activity', 'community', 'events', 'podiums', 'precision',
      'most_wanted', 'bingo', 'first_attempt', 'dnf', 'glitch',
      'consolation'
    )
  ) unexpected;

  if unexpected_categories is not null then
    raise exception using
      errcode = '23514',
      message = 'badge_definitions contains unsupported categories',
      detail = format('Unexpected categories: %s', array_to_string(unexpected_categories, ', ')),
      hint = 'Review these rows before rerunning PR 8A; no badge definition was changed by this validation.';
  end if;
end;
$$;

-- The preflight above runs first so an unexpected production category leaves
-- any still-present constraints untouched. A previous failed SQL Editor run
-- may already have dropped some or all of these constraints, hence IF EXISTS.
alter table public.badge_definitions
  drop constraint if exists badge_definitions_category_check,
  drop constraint if exists badge_definitions_badge_kind_check,
  drop constraint if exists badge_definitions_design_variant_check,
  drop constraint if exists badge_definitions_scope_type_check;

alter table public.badge_definitions
  add constraint badge_definitions_category_check check (category in (
    'attempts', 'wins', 'streak', 'win_streak', 'sub3_streak', 'flawless',
    'favorite_time', 'activity', 'community', 'events', 'podiums',
    'precision', 'most_wanted', 'bingo', 'performance', 'record', 'first_attempt',
    'dnf', 'glitch', 'consolation', 'podium'
  )),
  add constraint badge_definitions_badge_kind_check
    check (badge_kind in ('tiered', 'single')),
  add constraint badge_definitions_design_variant_check
    check (design_variant in ('standard', 'positive_special', 'consolation')),
  add constraint badge_definitions_scope_type_check
    check (scope_type in ('all_time', 'season', 'event'));

-- Important-event podium badges are replaced by a separate trophy read-model.
update public.badge_definitions
set is_active = false
where badge_key like 'important-event-%'
   or family_key = 'most-wanted';

insert into public.badge_definitions (
  badge_key, category, tier, name, description, threshold, sort_order,
  family_key, requirement, is_secret, badge_kind, design_variant,
  scope_type, is_active
) values
  ('first-sub5', 'performance', 'bronze', 'Unter fünf',
    'Mindestens eine gültige offizielle Zeit unter 5,00 Sekunden.', 500, 10,
    'time-limits', 'Eine offizielle Zeit unter 5,00 Sekunden', false,
    'tiered', 'standard', 'all_time', true),
  ('first-sub4', 'performance', 'silver', 'Unter vier',
    'Mindestens eine gültige offizielle Zeit unter 4,00 Sekunden.', 400, 11,
    'time-limits', 'Eine offizielle Zeit unter 4,00 Sekunden', false,
    'tiered', 'standard', 'all_time', true),
  ('first-sub3', 'performance', 'gold', 'Unter drei',
    'Mindestens eine gültige offizielle Zeit unter 3,00 Sekunden.', 300, 12,
    'time-limits', 'Eine offizielle Zeit unter 3,00 Sekunden', false,
    'tiered', 'standard', 'all_time', true),
  ('first-sub2', 'performance', 'diamond', 'Unter zwei',
    'Mindestens eine gültige offizielle Zeit unter 2,00 Sekunden.', 200, 13,
    'time-limits', 'Eine offizielle Zeit unter 2,00 Sekunden', false,
    'tiered', 'standard', 'all_time', true),

  ('valid-attempts-bronze', 'attempts', 'bronze', 'Eingeschenkt',
    '10 gültige offizielle Versuche.', 10, 20, 'valid-attempts',
    '10 gültige offizielle Versuche', false, 'tiered', 'standard', 'all_time', true),
  ('valid-attempts-silver', 'attempts', 'silver', 'Stammkraft',
    '50 gültige offizielle Versuche.', 50, 21, 'valid-attempts',
    '50 gültige offizielle Versuche', false, 'tiered', 'standard', 'all_time', true),
  ('valid-attempts-gold', 'attempts', 'gold', 'Harter Kern',
    '100 gültige offizielle Versuche.', 100, 22, 'valid-attempts',
    '100 gültige offizielle Versuche', false, 'tiered', 'standard', 'all_time', true),
  ('valid-attempts-diamond', 'attempts', 'diamond', 'Unverwüstlich',
    '500 gültige offizielle Versuche.', 500, 23, 'valid-attempts',
    '500 gültige offizielle Versuche', false, 'tiered', 'standard', 'all_time', true),

  ('event-wins-bronze', 'wins', 'bronze', 'Erster Sieg',
    'Ein abgeschlossenes Event gewonnen.', 1, 30, 'event-wins',
    '1 gewonnenes abgeschlossenes Event', false, 'tiered', 'standard', 'all_time', true),
  ('event-wins-silver', 'wins', 'silver', 'Seriensieger',
    'Fünf abgeschlossene Events gewonnen.', 5, 31, 'event-wins',
    '5 gewonnene abgeschlossene Events', false, 'tiered', 'standard', 'all_time', true),
  ('event-wins-gold', 'wins', 'gold', 'Unangefochten',
    'Zehn abgeschlossene Events gewonnen.', 10, 32, 'event-wins',
    '10 gewonnene abgeschlossene Events', false, 'tiered', 'standard', 'all_time', true),
  ('event-wins-diamond', 'wins', 'diamond', 'Dynastie',
    'Fünfzig abgeschlossene Events gewonnen.', 50, 33, 'event-wins',
    '50 gewonnene abgeschlossene Events', false, 'tiered', 'standard', 'all_time', true),

  ('win-streak-bronze', 'win_streak', 'bronze', 'Doppelschlag',
    'Zwei mitgespielte Events in Folge gewonnen.', 2, 40, 'win-streak',
    '2 mitgespielte Events in Folge gewinnen', false, 'tiered', 'standard', 'all_time', true),
  ('win-streak-silver', 'win_streak', 'silver', 'Hattrick',
    'Drei mitgespielte Events in Folge gewonnen.', 3, 41, 'win-streak',
    '3 mitgespielte Events in Folge gewinnen', false, 'tiered', 'standard', 'all_time', true),
  ('win-streak-gold', 'win_streak', 'gold', 'Siegesserie',
    'Fünf mitgespielte Events in Folge gewonnen.', 5, 42, 'win-streak',
    '5 mitgespielte Events in Folge gewinnen', false, 'tiered', 'standard', 'all_time', true),
  ('win-streak-diamond', 'win_streak', 'diamond', 'Unbesiegbar',
    'Zehn mitgespielte Events in Folge gewonnen.', 10, 43, 'win-streak',
    '10 mitgespielte Events in Folge gewinnen', false, 'tiered', 'standard', 'all_time', true),

  ('sub3-streak-bronze', 'sub3_streak', 'bronze', 'Im Tunnel',
    'Zwei Eventversuche in Folge unter 3,00 Sekunden.', 2, 50, 'sub3-streak',
    '2 Eventversuche in Folge unter 3,00 Sekunden', false, 'tiered', 'standard', 'event', true),
  ('sub3-streak-silver', 'sub3_streak', 'silver', 'Im Flow',
    'Vier Eventversuche in Folge unter 3,00 Sekunden.', 4, 51, 'sub3-streak',
    '4 Eventversuche in Folge unter 3,00 Sekunden', false, 'tiered', 'standard', 'event', true),
  ('sub3-streak-gold', 'sub3_streak', 'gold', 'Unaufhaltsam',
    'Sechs Eventversuche in Folge unter 3,00 Sekunden.', 6, 52, 'sub3-streak',
    '6 Eventversuche in Folge unter 3,00 Sekunden', false, 'tiered', 'standard', 'event', true),
  ('sub3-streak-diamond', 'sub3_streak', 'diamond', 'Maschine',
    'Zehn Eventversuche in Folge unter 3,00 Sekunden.', 10, 53, 'sub3-streak',
    '10 Eventversuche in Folge unter 3,00 Sekunden', false, 'tiered', 'standard', 'event', true),

  ('flawless-bronze', 'flawless', 'bronze', 'Sicherer Stand',
    'Fünf Eventversuche in Folge ohne DNF.', 5, 60, 'flawless',
    '5 Eventversuche in Folge ohne DNF', false, 'tiered', 'standard', 'all_time', true),
  ('flawless-silver', 'flawless', 'silver', 'Fehlerlos',
    'Zehn Eventversuche in Folge ohne DNF.', 10, 61, 'flawless',
    '10 Eventversuche in Folge ohne DNF', false, 'tiered', 'standard', 'all_time', true),
  ('flawless-gold', 'flawless', 'gold', 'Eiskalt',
    '25 Eventversuche in Folge ohne DNF.', 25, 62, 'flawless',
    '25 Eventversuche in Folge ohne DNF', false, 'tiered', 'standard', 'all_time', true),
  ('flawless-diamond', 'flawless', 'diamond', 'Unfehlbar',
    '50 Eventversuche in Folge ohne DNF.', 50, 63, 'flawless',
    '50 Eventversuche in Folge ohne DNF', false, 'tiered', 'standard', 'all_time', true),

  ('favorite-time-bronze', 'favorite_time', 'bronze', 'Déjà-vu',
    'Dieselbe vollständige Zeit zweimal erreicht.', 2, 70, 'favorite-time',
    'Dieselbe Zeit mit zwei Nachkommastellen 2-mal erreichen', false, 'tiered', 'standard', 'all_time', true),
  ('favorite-time-silver', 'favorite_time', 'silver', 'Lieblingszeit',
    'Dieselbe vollständige Zeit viermal erreicht.', 4, 71, 'favorite-time',
    'Dieselbe Zeit mit zwei Nachkommastellen 4-mal erreichen', false, 'tiered', 'standard', 'all_time', true),
  ('favorite-time-gold', 'favorite_time', 'gold', 'Zeitstempel',
    'Dieselbe vollständige Zeit sechsmal erreicht.', 6, 72, 'favorite-time',
    'Dieselbe Zeit mit zwei Nachkommastellen 6-mal erreichen', false, 'tiered', 'standard', 'all_time', true),
  ('favorite-time-diamond', 'favorite_time', 'diamond', 'Zeitlos',
    'Dieselbe vollständige Zeit zehnmal erreicht.', 10, 73, 'favorite-time',
    'Dieselbe Zeit mit zwei Nachkommastellen 10-mal erreichen', false, 'tiered', 'standard', 'all_time', true),

  ('activity-years-bronze', 'activity', 'bronze', 'Wiederholungstäter',
    'In zwei Kalenderjahren offizielle Events mitgespielt.', 2, 80, 'activity-years',
    'In 2 unterschiedlichen Kalenderjahren Events mitspielen', false, 'tiered', 'standard', 'all_time', true),
  ('activity-years-silver', 'activity', 'silver', 'Dauerbrenner',
    'In drei Kalenderjahren offizielle Events mitgespielt.', 3, 81, 'activity-years',
    'In 3 unterschiedlichen Kalenderjahren Events mitspielen', false, 'tiered', 'standard', 'all_time', true),
  ('activity-years-gold', 'activity', 'gold', 'Veteran',
    'In fünf Kalenderjahren offizielle Events mitgespielt.', 5, 82, 'activity-years',
    'In 5 unterschiedlichen Kalenderjahren Events mitspielen', false, 'tiered', 'standard', 'all_time', true),
  ('activity-years-diamond', 'activity', 'diamond', 'Legende',
    'In zehn Kalenderjahren offizielle Events mitgespielt.', 10, 83, 'activity-years',
    'In 10 unterschiedlichen Kalenderjahren Events mitspielen', false, 'tiered', 'standard', 'all_time', true),

  ('community-bronze', 'community', 'bronze', 'Runde gemacht',
    'Mit fünf unterschiedlichen Personen Events mitgespielt.', 5, 90, 'community',
    'Mit 5 unterschiedlichen Spielern oder Gästen spielen', false, 'tiered', 'standard', 'all_time', true),
  ('community-silver', 'community', 'silver', 'Netzwerker',
    'Mit zehn unterschiedlichen Personen Events mitgespielt.', 10, 91, 'community',
    'Mit 10 unterschiedlichen Spielern oder Gästen spielen', false, 'tiered', 'standard', 'all_time', true),
  ('community-gold', 'community', 'gold', 'Publikumsliebling',
    'Mit 15 unterschiedlichen Personen Events mitgespielt.', 15, 92, 'community',
    'Mit 15 unterschiedlichen Spielern oder Gästen spielen', false, 'tiered', 'standard', 'all_time', true),
  ('community-diamond', 'community', 'diamond', 'Alle kennen ihn',
    'Mit 25 unterschiedlichen Personen Events mitgespielt.', 25, 93, 'community',
    'Mit 25 unterschiedlichen Spielern oder Gästen spielen', false, 'tiered', 'standard', 'all_time', true),

  ('events-played-bronze', 'events', 'bronze', 'Dabei sein',
    'Fünf abgeschlossene Events mitgespielt.', 5, 100, 'events-played',
    '5 abgeschlossene Events mitspielen', false, 'tiered', 'standard', 'all_time', true),
  ('events-played-silver', 'events', 'silver', 'Vielspieler',
    'Zehn abgeschlossene Events mitgespielt.', 10, 101, 'events-played',
    '10 abgeschlossene Events mitspielen', false, 'tiered', 'standard', 'all_time', true),
  ('events-played-gold', 'events', 'gold', 'Inventar',
    '25 abgeschlossene Events mitgespielt.', 25, 102, 'events-played',
    '25 abgeschlossene Events mitspielen', false, 'tiered', 'standard', 'all_time', true),
  ('events-played-diamond', 'events', 'diamond', 'Immer da',
    '100 abgeschlossene Events mitgespielt.', 100, 103, 'events-played',
    '100 abgeschlossene Events mitspielen', false, 'tiered', 'standard', 'all_time', true),

  ('podiums-bronze', 'podiums', 'bronze', 'Treppchen',
    'Drei Podiumsplätze erreicht.', 3, 110, 'podiums',
    '3 Podiumsplätze bei abgeschlossenen Events', false, 'tiered', 'standard', 'all_time', true),
  ('podiums-silver', 'podiums', 'silver', 'Podiumssammler',
    'Zehn Podiumsplätze erreicht.', 10, 111, 'podiums',
    '10 Podiumsplätze bei abgeschlossenen Events', false, 'tiered', 'standard', 'all_time', true),
  ('podiums-gold', 'podiums', 'gold', 'Stammgast oben',
    '25 Podiumsplätze erreicht.', 25, 112, 'podiums',
    '25 Podiumsplätze bei abgeschlossenen Events', false, 'tiered', 'standard', 'all_time', true),
  ('podiums-diamond', 'podiums', 'diamond', 'Podiumslegende',
    '50 Podiumsplätze erreicht.', 50, 113, 'podiums',
    '50 Podiumsplätze bei abgeschlossenen Events', false, 'tiered', 'standard', 'all_time', true),

  ('precision-bronze', 'precision', 'bronze', 'Präzise',
    'Ein Event mit mindestens fünf gültigen Versuchen und höchstens 0,20 Sekunden Standardabweichung.', 1, 120, 'precision',
    '1 Präzisions-Event', false, 'tiered', 'standard', 'event', true),
  ('precision-silver', 'precision', 'silver', 'Präzisionsmaschine',
    'Drei qualifizierte Präzisions-Events.', 3, 121, 'precision',
    '3 Präzisions-Events', false, 'tiered', 'standard', 'event', true),
  ('precision-gold', 'precision', 'gold', 'Metronom',
    'Zehn qualifizierte Präzisions-Events.', 10, 122, 'precision',
    '10 Präzisions-Events', false, 'tiered', 'standard', 'event', true),
  ('precision-diamond', 'precision', 'diamond', 'Atomuhr',
    '25 qualifizierte Präzisions-Events.', 25, 123, 'precision',
    '25 Präzisions-Events', false, 'tiered', 'standard', 'event', true),

  ('bingo-bronze', 'bingo', 'bronze', 'BINGO Bronze',
    'Mindestens eine vollständige BINGO-Linie mit je einem eigenen Treffer.', 1, 130, 'bingo',
    'Eine vollständige Bronze-BINGO-Linie', false, 'tiered', 'standard', 'all_time', true),
  ('bingo-silver', 'bingo', 'silver', 'BINGO Silber',
    'Mindestens eine vollständige BINGO-Linie mit je zwei eigenen Treffern.', 2, 131, 'bingo',
    'Eine vollständige Silber-BINGO-Linie', false, 'tiered', 'standard', 'all_time', true),
  ('bingo-gold', 'bingo', 'gold', 'BINGO Gold',
    'Mindestens eine vollständige BINGO-Linie mit je drei eigenen Treffern.', 3, 132, 'bingo',
    'Eine vollständige Gold-BINGO-Linie', false, 'tiered', 'standard', 'all_time', true),

  ('official-world-record', 'record', 'special', 'Weltrekordhalter',
    'Mindestens einmal den offiziellen All-Time-Weltrekord gehalten.', null, 200, null,
    'Mindestens einmal den offiziellen Weltrekord halten', false, 'single', 'positive_special', 'all_time', true),
  ('time-stopper', 'performance', 'special', 'Zeitstopper',
    'Eine gültige offizielle Zeit mit exakt ,00 Hundertsteln.', null, 201, null,
    'Eine offizielle Zeit mit ,00 Hundertsteln erreichen', false, 'single', 'positive_special', 'all_time', true),
  ('first-official-attempt', 'first_attempt', 'special', 'Erster offizieller Versuch',
    'Den ersten gültigen offiziellen Versuch absolviert.', 1, 202, null,
    'Den ersten gültigen offiziellen Versuch absolvieren', false, 'single', 'positive_special', 'all_time', true),
  ('false-starter', 'dnf', 'special', 'Fehlstarter',
    'Insgesamt zehn DNF erreicht.', 10, 203, null,
    '10 DNF erreichen', false, 'single', 'consolation', 'all_time', true),
  ('first-win', 'wins', 'special', 'Der erste Pokal',
    'Das erste abgeschlossene Event gewonnen.', 1, 204, null,
    'Das erste abgeschlossene Event gewinnen', false, 'single', 'positive_special', 'all_time', true),
  ('matrix-glitch', 'glitch', 'special', 'Glitch in der Matrix',
    'Zwei direkt aufeinanderfolgende gültige Versuche mit exakt derselben Zeit.', 2, 205, null,
    'Zwei aufeinanderfolgende gültige Versuche mit identischer Zeit', false, 'single', 'positive_special', 'all_time', true),
  ('almost', 'consolation', 'special', 'Fast …',
    'Eine gültige offizielle Zeit mit ,01 Hundertsteln.', null, 206, null,
    'Eine offizielle Zeit mit ,01 Hundertsteln erreichen', false, 'single', 'consolation', 'all_time', true)
on conflict (badge_key) do update set
  category = excluded.category,
  tier = excluded.tier,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  sort_order = excluded.sort_order,
  family_key = excluded.family_key,
  requirement = excluded.requirement,
  is_secret = excluded.is_secret,
  badge_kind = excluded.badge_kind,
  design_variant = excluded.design_variant,
  scope_type = excluded.scope_type,
  is_active = excluded.is_active;

-- Every valid official time in league history. Guests are intentionally kept
-- for the shared Most Wanted list; player badges filter to permanent players.
create or replace view public.qualified_official_times
with (security_invoker = true)
as
select
  a.id source_id,
  a.player_id,
  a.guest_id,
  coalesce(p.display_name, g.display_name) display_name,
  p.avatar_url,
  p.avatar_path,
  a.guest_id is not null is_guest,
  a.event_id,
  a.time_hundredths,
  a.submitted_at occurred_at,
  (a.submitted_at at time zone 'Europe/Berlin')::date occurred_date,
  'attempt'::text source_type,
  2::integer source_priority,
  coalesce(ead.attempt_number, 0)::integer source_order,
  true has_exact_time
from public.attempts a
left join public.players p on p.id = a.player_id
left join public.event_guests g on g.id = a.guest_id
left join public.events e on e.id = a.event_id
left join public.event_attempt_details ead on ead.attempt_id = a.id
where a.status = 'approved'
  and a.deleted_at is null
  and not a.is_dnf
  and a.time_hundredths is not null
  and not a.is_ak
  and (a.event_id is null or e.deleted_at is null)
  and (
    (a.player_id is not null and not p.is_ak and not p.is_archived)
    or (a.guest_id is not null and g.id is not null)
  )
union all
select
  h.id,
  h.player_id,
  null::uuid,
  h.display_name,
  p.avatar_url,
  p.avatar_path,
  h.is_guest,
  null::uuid,
  h.time_hundredths,
  h.attempt_date::timestamp at time zone 'Europe/Berlin',
  h.attempt_date,
  'historical_attempt'::text,
  1::integer,
  h.sort_order,
  false
from public.historical_attempts h
left join public.players p on p.id = h.player_id
where h.deleted_at is null
  and not h.out_of_competition
  and (h.is_guest or (h.player_id is not null and not p.is_ak and not p.is_archived));

create or replace view public.precision_events
with (security_invoker = true)
as
select
  a.event_id,
  a.player_id,
  e.start_date event_date,
  coalesce(e.closed_at, e.ends_at) qualified_at,
  count(*)::integer valid_attempts,
  stddev_pop(a.time_hundredths)::numeric standard_deviation_hundredths,
  stddev_pop(a.time_hundredths) <= 20 qualifies
from public.attempts a
join public.events e on e.id = a.event_id
join public.players p on p.id = a.player_id
where a.status = 'approved'
  and a.deleted_at is null
  and not a.is_dnf
  and a.time_hundredths is not null
  and not a.is_ak
  and not p.is_ak
  and not p.is_archived
  and e.status = 'closed'
  and e.deleted_at is null
group by a.event_id, a.player_id, e.start_date, e.closed_at, e.ends_at
having count(*) >= 5;

create or replace view public.most_wanted_endings
with (security_invoker = true)
as
with endings as (
  select generate_series(0, 99)::integer ending
), ranked as (
  select
    q.*,
    mod(q.time_hundredths, 100)::integer ending,
    row_number() over (
      partition by mod(q.time_hundredths, 100)
      order by q.occurred_at, q.source_priority, q.source_order, q.source_id
    ) hit_sequence
  from public.qualified_official_times q
), ending_counts as (
  select
    mod(q.time_hundredths, 100)::integer ending,
    count(*)::integer hit_count,
    count(distinct case when q.is_guest then concat('guest:', q.display_name)
      else concat('player:', q.player_id) end)::integer participant_count
  from public.qualified_official_times q
  group by mod(q.time_hundredths, 100)
), first_hits as (
  select * from ranked where hit_sequence = 1
)
select
  e.ending,
  lpad(e.ending::text, 2, '0') ending_label,
  f.source_id first_source_id,
  f.player_id first_player_id,
  f.guest_id first_guest_id,
  f.display_name first_display_name,
  f.avatar_url first_avatar_url,
  f.avatar_path first_avatar_path,
  coalesce(f.is_guest, false) first_is_guest,
  f.time_hundredths first_time_hundredths,
  f.occurred_at first_occurred_at,
  f.occurred_date first_occurred_date,
  coalesce(f.has_exact_time, false) first_has_exact_time,
  f.event_id first_event_id,
  f.source_type first_source_type,
  coalesce(nullif(trim(ev.name), ''), h.historical_label,
    case when f.source_id is null then null else 'Historischer Einzelversuch' end) source_label,
  coalesce(c.hit_count, 0)::integer hit_count,
  coalesce(c.participant_count, 0)::integer participant_count,
  f.source_id is not null achieved
from endings e
left join first_hits f on f.ending = e.ending
left join ending_counts c on c.ending = e.ending
left join public.events ev on ev.id = f.event_id and ev.deleted_at is null
left join public.historical_attempts h
  on h.id = f.source_id and f.source_type = 'historical_attempt';

create or replace view public.most_wanted_progress
with (security_invoker = true)
as
select
  count(*) filter (where achieved)::integer reached_count,
  100::integer total_count,
  round(count(*) filter (where achieved) * 100.0, 1) progress_percent,
  array_agg(ending order by ending) filter (where not achieved) open_endings,
  (array_agg(ending order by hit_count desc, ending) filter (where achieved))[1]
    most_common_ending,
  max(hit_count)::integer most_common_hit_count,
  array_agg(ending order by hit_count, ending) filter (
    where achieved and hit_count = (
      select min(hit_count) from public.most_wanted_endings where achieved
    )
  ) rarest_achieved_endings
from public.most_wanted_endings;

create or replace view public.most_wanted_milestones
with (security_invoker = true)
as
with milestones(threshold) as (
  values (10), (25), (50), (75), (90), (100)
), ordered_hits as (
  select
    mw.*,
    row_number() over (
      order by first_occurred_at, first_source_type, first_source_id, ending
    )::integer reached_sequence
  from public.most_wanted_endings mw
  where achieved
)
select
  m.threshold,
  count(o.ending)::integer current_count,
  count(o.ending) >= m.threshold achieved,
  max(o.first_occurred_at) filter (where o.reached_sequence = m.threshold) achieved_at
from milestones m
left join ordered_hits o on o.reached_sequence <= m.threshold
group by m.threshold
order by m.threshold;

-- Personal BINGO deliberately has its own player-scoped read models. It shares
-- only the qualified source times with league-wide Most Wanted.
create or replace view public.player_bingo_hits
with (security_invoker = true)
as
select
  q.player_id,
  mod(q.time_hundredths, 100)::integer ending,
  lpad(mod(q.time_hundredths, 100)::text, 2, '0') ending_label,
  q.source_id,
  q.source_type,
  q.event_id,
  q.time_hundredths,
  q.occurred_at,
  q.occurred_date,
  q.has_exact_time,
  q.source_priority,
  q.source_order,
  coalesce(nullif(trim(e.name), ''), h.historical_label,
    case when q.source_type = 'historical_attempt'
      then 'Historischer Einzelversuch' else 'Offizieller Versuch' end) source_label,
  row_number() over (
    partition by q.player_id, mod(q.time_hundredths, 100)
    order by q.occurred_at, q.source_priority, q.source_order, q.source_id
  )::integer hit_sequence
from public.qualified_official_times q
left join public.events e on e.id = q.event_id and e.deleted_at is null
left join public.historical_attempts h
  on h.id = q.source_id and q.source_type = 'historical_attempt'
where q.player_id is not null and not q.is_guest;

create or replace view public.player_bingo_fields
with (security_invoker = true)
as
with endings as (
  select generate_series(0, 99)::integer ending
), hit_counts as (
  select
    player_id,
    ending,
    count(*)::integer hit_count,
    min(occurred_at) filter (where hit_sequence = 1) bronze_achieved_at,
    min(occurred_at) filter (where hit_sequence = 2) silver_achieved_at,
    min(occurred_at) filter (where hit_sequence = 3) gold_achieved_at
  from public.player_bingo_hits
  group by player_id, ending
)
select
  p.id player_id,
  e.ending,
  lpad(e.ending::text, 2, '0') ending_label,
  coalesce(h.hit_count, 0)::integer hit_count,
  case
    when coalesce(h.hit_count, 0) >= 3 then 'gold'
    when coalesce(h.hit_count, 0) = 2 then 'silver'
    when coalesce(h.hit_count, 0) = 1 then 'bronze'
    else 'open'
  end field_tier,
  h.bronze_achieved_at,
  h.silver_achieved_at,
  h.gold_achieved_at
from public.players p
cross join endings e
left join hit_counts h on h.player_id = p.id and h.ending = e.ending
where not p.is_ak and not p.is_archived;

create or replace view public.player_bingo_lines
with (security_invoker = true)
as
with line_cells as (
  select concat('row-', row_number) line_key, 'row'::text line_type,
    row_number line_number, row_number * 10 + column_number ending
  from generate_series(0, 9) row_number
  cross join generate_series(0, 9) column_number
  union all
  select concat('column-', column_number), 'column'::text, column_number,
    row_number * 10 + column_number
  from generate_series(0, 9) column_number
  cross join generate_series(0, 9) row_number
  union all
  select 'diagonal-main', 'diagonal'::text, 0, step * 11
  from generate_series(0, 9) step
  union all
  select 'diagonal-anti', 'diagonal'::text, 1, 9 + step * 9
  from generate_series(0, 9) step
), evaluated as (
  select
    f.player_id,
    l.line_key,
    l.line_type,
    l.line_number,
    min(f.hit_count)::integer minimum_hit_count,
    array_agg(l.ending order by l.ending) endings,
    max(f.bronze_achieved_at) bronze_achieved_at,
    max(f.silver_achieved_at) silver_achieved_at,
    max(f.gold_achieved_at) gold_achieved_at
  from public.player_bingo_fields f
  join line_cells l on l.ending = f.ending
  group by f.player_id, l.line_key, l.line_type, l.line_number
)
select
  player_id,
  line_key,
  line_type,
  line_number,
  endings,
  minimum_hit_count,
  minimum_hit_count >= 1 qualifies_bronze,
  minimum_hit_count >= 2 qualifies_silver,
  minimum_hit_count >= 3 qualifies_gold,
  case when minimum_hit_count >= 3 then 'gold'
    when minimum_hit_count >= 2 then 'silver'
    when minimum_hit_count >= 1 then 'bronze'
    else 'open' end line_tier,
  case when minimum_hit_count >= 1 then bronze_achieved_at end bronze_achieved_at,
  case when minimum_hit_count >= 2 then silver_achieved_at end silver_achieved_at,
  case when minimum_hit_count >= 3 then gold_achieved_at end gold_achieved_at
from evaluated;

create or replace view public.player_bingo_statistics
with (security_invoker = true)
as
with field_totals as (
  select
    player_id,
    count(*) filter (where hit_count >= 1)::integer collected_endings,
    count(*) filter (where hit_count >= 1)::integer bronze_fields,
    count(*) filter (where hit_count >= 2)::integer silver_fields,
    count(*) filter (where hit_count >= 3)::integer gold_fields
  from public.player_bingo_fields
  group by player_id
), line_totals as (
  select
    player_id,
    count(*) filter (where qualifies_bronze)::integer bronze_lines,
    count(*) filter (where qualifies_silver)::integer silver_lines,
    count(*) filter (where qualifies_gold)::integer gold_lines,
    min(bronze_achieved_at) filter (where qualifies_bronze) bronze_badge_achieved_at,
    min(silver_achieved_at) filter (where qualifies_silver) silver_badge_achieved_at,
    min(gold_achieved_at) filter (where qualifies_gold) gold_badge_achieved_at
  from public.player_bingo_lines
  group by player_id
)
select
  f.player_id,
  f.collected_endings,
  f.bronze_fields,
  f.silver_fields,
  f.gold_fields,
  coalesce(l.bronze_lines, 0)::integer bronze_lines,
  coalesce(l.silver_lines, 0)::integer silver_lines,
  coalesce(l.gold_lines, 0)::integer gold_lines,
  case when coalesce(l.gold_lines, 0) > 0 then 'gold'
    when coalesce(l.silver_lines, 0) > 0 then 'silver'
    when coalesce(l.bronze_lines, 0) > 0 then 'bronze'
    else null end highest_badge_tier,
  l.bronze_badge_achieved_at,
  l.silver_badge_achieved_at,
  l.gold_badge_achieved_at
from field_totals f
left join line_totals l on l.player_id = f.player_id;

create or replace view public.league_time_threshold_statistics
with (security_invoker = true)
as
with thresholds as (
  select * from (values (2, 200), (3, 300), (4, 400), (5, 500))
    values_table(threshold_seconds, threshold_hundredths)
), totals as (
  select count(*)::integer total_count from public.qualified_official_times
)
select
  t.threshold_seconds,
  t.threshold_hundredths,
  count(q.source_id)::integer attempt_count,
  totals.total_count,
  case when totals.total_count = 0 then 0::numeric
    else round(count(q.source_id) * 100.0 / totals.total_count, 1) end percentage
from thresholds t
cross join totals
left join public.qualified_official_times q
  on q.time_hundredths < t.threshold_hundredths
group by t.threshold_seconds, t.threshold_hundredths, totals.total_count
order by t.threshold_seconds;

create or replace view public.league_time_statistics
with (security_invoker = true)
as
with time_counts as (
  select
    time_hundredths,
    count(*)::integer hit_count,
    count(distinct case when is_guest then concat('guest:', display_name)
      else concat('player:', player_id) end)::integer participant_count,
    min(occurred_at) first_occurred_at
  from public.qualified_official_times
  group by time_hundredths
), common_time as (
  select * from time_counts
  order by hit_count desc, first_occurred_at, time_hundredths
  limit 1
), smooth_counts as (
  select * from time_counts where mod(time_hundredths, 100) = 0
), common_smooth as (
  select * from smooth_counts
  order by hit_count desc, first_occurred_at, time_hundredths
  limit 1
), smooth_players as (
  select
    q.player_id,
    q.display_name,
    q.avatar_url,
    q.avatar_path,
    count(*)::integer hit_count,
    min(q.occurred_at) first_occurred_at
  from public.qualified_official_times q
  where mod(q.time_hundredths, 100) = 0 and q.player_id is not null and not q.is_guest
  group by q.player_id, q.display_name, q.avatar_url, q.avatar_path
), top_smooth_player as (
  select * from smooth_players
  order by hit_count desc, first_occurred_at, player_id
  limit 1
), latest_smooth as (
  select * from public.qualified_official_times
  where mod(time_hundredths, 100) = 0
  order by occurred_at desc, source_priority desc, source_order desc, source_id desc
  limit 1
)
select
  (select count(*) from public.qualified_official_times)::integer total_valid_times,
  ct.time_hundredths most_common_time_hundredths,
  coalesce(ct.hit_count, 0)::integer most_common_time_hits,
  coalesce(ct.participant_count, 0)::integer most_common_time_participants,
  (select coalesce(sum(hit_count), 0) from smooth_counts)::integer smooth_time_count,
  cs.time_hundredths most_common_smooth_time_hundredths,
  coalesce(cs.hit_count, 0)::integer most_common_smooth_time_hits,
  tsp.player_id top_smooth_player_id,
  tsp.display_name top_smooth_player_name,
  tsp.avatar_url top_smooth_player_avatar_url,
  tsp.avatar_path top_smooth_player_avatar_path,
  coalesce(tsp.hit_count, 0)::integer top_smooth_player_hits,
  ls.source_id latest_smooth_source_id,
  ls.player_id latest_smooth_player_id,
  ls.display_name latest_smooth_player_name,
  ls.time_hundredths latest_smooth_time_hundredths,
  ls.occurred_at latest_smooth_occurred_at,
  ls.occurred_date latest_smooth_occurred_date,
  ls.has_exact_time latest_smooth_has_exact_time
from (select 1) seed
left join common_time ct on true
left join common_smooth cs on true
left join top_smooth_player tsp on true
left join latest_smooth ls on true;

create or replace view public.player_trophies
with (security_invoker = true)
as
select
  concat('event-trophy:', ep.event_id, ':',
    coalesce(ep.player_id::text, concat('guest:', ep.guest_id::text)), ':', ep.rank) trophy_key,
  'event'::text competition_type,
  'event'::text scope_type,
  ep.event_id competition_id,
  null::text season_key,
  coalesce(nullif(trim(e.name), ''), concat('Event ', e.start_date::text)) competition_name,
  extract(year from e.start_date)::integer competition_year,
  e.start_date event_date,
  ep.rank::integer placement,
  case ep.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end trophy_tier,
  ep.player_id,
  ep.guest_id,
  ep.display_name,
  p.avatar_url,
  p.avatar_path,
  ep.is_guest,
  ep.best_time_hundredths,
  coalesce(e.closed_at, e.ends_at) awarded_at
from public.event_podium ep
join public.events e on e.id = ep.event_id
left join public.players p on p.id = ep.player_id
where e.status = 'closed'
  and e.deleted_at is null
  and e.awards_trophies
  and ep.rank between 1 and 3;

create or replace view public.player_badge_awards
with (security_invoker = true)
as
with recursive
valid_player_times as (
  select * from public.qualified_official_times
  where player_id is not null and not is_guest
), numbered_valid as (
  select v.*,
    row_number() over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    )::integer valid_sequence
  from valid_player_times v
), qualified_player_attempts as (
  select
    a.id source_id,
    a.player_id,
    a.event_id,
    a.time_hundredths,
    a.is_dnf,
    a.submitted_at occurred_at,
    row_number() over (
      partition by a.player_id
      order by a.submitted_at, a.id
    )::integer player_sequence
  from public.attempts a
  left join public.events e on e.id = a.event_id
  join public.players p on p.id = a.player_id
  where a.status = 'approved'
    and a.deleted_at is null
    and not a.is_ak
    and not p.is_ak
    and not p.is_archived
    and (a.event_id is null or e.deleted_at is null)
), qualified_event_attempts as (
  select q.*,
    row_number() over (
      partition by q.player_id, q.event_id
      order by q.occurred_at, q.source_id
    )::integer event_sequence
  from qualified_player_attempts q
  where q.event_id is not null
), participated_events as (
  select
    ep.player_id,
    ep.event_id,
    e.start_date,
    coalesce(e.closed_at, e.ends_at) occurred_at,
    exists (
      select 1 from public.event_winners ew
      where ew.event_id = ep.event_id and ew.player_id = ep.player_id
    ) did_win
  from public.event_participants ep
  join public.events e on e.id = ep.event_id
  join public.players p on p.id = ep.player_id
  where e.status = 'closed' and e.deleted_at is null
    and not p.is_ak and not p.is_archived
), ranked_participations as (
  select pe.*,
    row_number() over (
      partition by player_id order by occurred_at, event_id
    )::integer participation_sequence
  from participated_events pe
), ranked_wins as (
  select pe.*,
    row_number() over (
      partition by player_id order by occurred_at, event_id
    )::integer win_sequence
  from participated_events pe where did_win
), win_streak_grouped as (
  select pe.*,
    sum(case when did_win then 0 else 1 end) over (
      partition by player_id order by occurred_at, event_id
      rows between unbounded preceding and current row
    ) streak_group
  from participated_events pe
), win_streaks as (
  select w.*,
    row_number() over (
      partition by player_id, streak_group order by occurred_at, event_id
    )::integer streak_length
  from win_streak_grouped w where did_win
), sub3_groups as (
  select q.*,
    sum(case when is_dnf or time_hundredths is null or time_hundredths >= 300
      then 1 else 0 end) over (
      partition by player_id, event_id order by occurred_at, source_id
      rows between unbounded preceding and current row
    ) streak_group
  from qualified_player_attempts q
), sub3_streaks as (
  select s.*,
    row_number() over (
      partition by player_id, event_id, streak_group order by occurred_at, source_id
    )::integer streak_length
  from sub3_groups s
  where not is_dnf and time_hundredths is not null and time_hundredths < 300
), flawless_groups as (
  select q.*,
    sum(case when is_dnf then 1 else 0 end) over (
      partition by player_id order by occurred_at, source_id
      rows between unbounded preceding and current row
    ) streak_group
  from qualified_event_attempts q
), flawless_streaks as (
  select f.*,
    row_number() over (
      partition by player_id, streak_group order by occurred_at, source_id
    )::integer streak_length
  from flawless_groups f where not is_dnf
), favorite_occurrences as (
  select v.*,
    row_number() over (
      partition by player_id, time_hundredths
      order by occurred_at, source_priority, source_order, source_id
    )::integer occurrence_sequence,
    count(*) over (
      partition by player_id, time_hundredths
    )::integer total_occurrences
  from valid_player_times v
), favorite_candidates as (
  select
    f.*,
    bd.badge_key,
    bd.threshold,
    row_number() over (
      partition by f.player_id, bd.badge_key
      order by f.total_occurrences desc, f.occurred_at,
        f.source_priority, f.source_order, f.source_id, f.time_hundredths
    ) favorite_position
  from favorite_occurrences f
  join public.badge_definitions bd
    on bd.category = 'favorite_time'
    and bd.is_active
    and f.occurrence_sequence = bd.threshold
    and f.total_occurrences >= bd.threshold
), active_year_first as (
  select distinct on (player_id, extract(year from start_date))
    player_id,
    extract(year from start_date)::integer active_year,
    event_id,
    occurred_at
  from participated_events
  order by player_id, extract(year from start_date), occurred_at, event_id
), active_years as (
  select a.*,
    row_number() over (
      partition by player_id order by active_year, occurred_at, event_id
    )::integer active_year_count
  from active_year_first a
), event_people as (
  select ep.event_id, concat('player:', ep.player_id) person_key,
    ep.player_id, null::uuid guest_id
  from public.event_participants ep
  join public.events e on e.id = ep.event_id
  join public.players p on p.id = ep.player_id
  where e.status = 'closed' and e.deleted_at is null
    and not p.is_ak and not p.is_archived
  union all
  select eg.event_id, concat('guest:', eg.normalized_name), null::uuid, eg.id
  from public.event_guests eg
  join public.events e on e.id = eg.event_id
  where e.status = 'closed' and e.deleted_at is null
), first_encounters as (
  select distinct on (owner.player_id, other.person_key)
    owner.player_id,
    other.person_key,
    owner.event_id,
    pe.occurred_at
  from event_people owner
  join event_people other on other.event_id = owner.event_id
    and other.person_key <> owner.person_key
  join participated_events pe
    on pe.event_id = owner.event_id and pe.player_id = owner.player_id
  where owner.player_id is not null
  order by owner.player_id, other.person_key, pe.occurred_at, owner.event_id
), community_progress as (
  select f.*,
    row_number() over (
      partition by player_id order by occurred_at, event_id, person_key
    )::integer person_count
  from first_encounters f
), podium_entries as (
  select
    ep.player_id,
    ep.event_id,
    ep.rank,
    coalesce(e.closed_at, e.ends_at) occurred_at,
    row_number() over (
      partition by ep.player_id
      order by coalesce(e.closed_at, e.ends_at), ep.event_id, ep.rank
    )::integer podium_count
  from public.event_podium ep
  join public.events e on e.id = ep.event_id
  join public.players p on p.id = ep.player_id
  where ep.player_id is not null and ep.rank between 1 and 3
    and e.status = 'closed' and e.deleted_at is null
    and not p.is_ak and not p.is_archived
), precision_ranked as (
  select pe.*,
    row_number() over (
      partition by player_id order by qualified_at, event_id
    )::integer precision_count
  from public.precision_events pe where qualifies
), sequence_sources as (
  select
    q.source_id,
    q.player_id,
    q.event_id,
    q.time_hundredths,
    q.is_dnf,
    q.occurred_at,
    2::integer source_priority,
    q.player_sequence source_order,
    'attempt'::text source_type
  from qualified_player_attempts q
  union all
  select
    h.id,
    h.player_id,
    null::uuid,
    h.time_hundredths,
    false,
    h.attempt_date::timestamp at time zone 'Europe/Berlin',
    1::integer,
    h.sort_order,
    'historical_attempt'::text
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
), sequenced_history as (
  select s.*,
    lag(time_hundredths) over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    ) previous_time_hundredths,
    lag(is_dnf) over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    ) previous_is_dnf
  from sequence_sources s
), attempt_awards as (
  select
    concat(n.player_id, ':', bd.badge_key) award_key,
    n.player_id,
    bd.badge_key,
    n.source_type,
    case when n.source_type = 'attempt' then n.source_id else null::uuid end source_attempt_id,
    case when n.source_type = 'historical_attempt' then n.source_id else null::uuid end source_historical_attempt_id,
    n.event_id source_event_id,
    n.occurred_at awarded_at,
    jsonb_build_object('progress', n.valid_sequence) metadata
  from numbered_valid n
  join public.badge_definitions bd
    on bd.category = 'attempts' and bd.is_active and bd.threshold = n.valid_sequence
), performance_candidates as (
  select n.*, bd.badge_key,
    row_number() over (
      partition by n.player_id, bd.badge_key
      order by n.occurred_at, n.source_priority, n.source_order, n.source_id
    ) match_sequence
  from numbered_valid n
  join public.badge_definitions bd
    on bd.category = 'performance' and bd.badge_kind = 'tiered'
    and bd.is_active and n.time_hundredths < bd.threshold
), performance_awards as (
  select
    concat(player_id, ':', badge_key), player_id, badge_key, source_type,
    case when source_type = 'attempt' then source_id else null::uuid end,
    case when source_type = 'historical_attempt' then source_id else null::uuid end,
    event_id, occurred_at,
    jsonb_build_object('timeHundredths', time_hundredths,
      'progress', time_hundredths)
  from performance_candidates where match_sequence = 1
), win_awards as (
  select
    concat(r.player_id, ':', bd.badge_key), r.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, r.event_id, r.occurred_at,
    jsonb_build_object('progress', r.win_sequence)
  from ranked_wins r
  join public.badge_definitions bd
    on bd.category = 'wins' and bd.badge_kind = 'tiered'
    and bd.is_active and bd.threshold = r.win_sequence
), win_streak_awards as (
  select
    concat(w.player_id, ':', bd.badge_key), w.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, w.event_id, w.occurred_at,
    jsonb_build_object('progress', w.streak_length)
  from win_streaks w
  join public.badge_definitions bd
    on bd.category = 'win_streak' and bd.is_active
    and bd.threshold = w.streak_length
), sub3_awards as (
  select
    concat(s.player_id, ':', bd.badge_key), s.player_id, bd.badge_key,
    'attempt'::text, s.source_id, null::uuid, s.event_id, s.occurred_at,
    jsonb_build_object('progress', s.streak_length, 'scope', 'event')
  from sub3_streaks s
  join public.badge_definitions bd
    on bd.category = 'sub3_streak' and bd.is_active
    and bd.threshold = s.streak_length
), flawless_awards as (
  select
    concat(f.player_id, ':', bd.badge_key), f.player_id, bd.badge_key,
    'attempt'::text, f.source_id, null::uuid, f.event_id, f.occurred_at,
    jsonb_build_object('progress', f.streak_length)
  from flawless_streaks f
  join public.badge_definitions bd
    on bd.category = 'flawless' and bd.is_active
    and bd.threshold = f.streak_length
), favorite_awards as (
  select
    concat(f.player_id, ':', f.badge_key), f.player_id, f.badge_key,
    f.source_type,
    case when f.source_type = 'attempt' then f.source_id else null::uuid end,
    case when f.source_type = 'historical_attempt' then f.source_id else null::uuid end,
    f.event_id, f.occurred_at,
    jsonb_build_object('timeHundredths', f.time_hundredths,
      'progress', f.total_occurrences)
  from favorite_candidates f where favorite_position = 1
), activity_awards as (
  select
    concat(a.player_id, ':', bd.badge_key), a.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, a.event_id, a.occurred_at,
    jsonb_build_object('progress', a.active_year_count, 'year', a.active_year)
  from active_years a
  join public.badge_definitions bd
    on bd.category = 'activity' and bd.is_active
    and bd.threshold = a.active_year_count
), community_awards as (
  select
    concat(c.player_id, ':', bd.badge_key), c.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, c.event_id, c.occurred_at,
    jsonb_build_object('progress', c.person_count)
  from community_progress c
  join public.badge_definitions bd
    on bd.category = 'community' and bd.is_active
    and bd.threshold = c.person_count
), participation_awards as (
  select
    concat(r.player_id, ':', bd.badge_key), r.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, r.event_id, r.occurred_at,
    jsonb_build_object('progress', r.participation_sequence)
  from ranked_participations r
  join public.badge_definitions bd
    on bd.category = 'events' and bd.is_active
    and bd.threshold = r.participation_sequence
), podium_awards as (
  select
    concat(p.player_id, ':', bd.badge_key), p.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, p.event_id, p.occurred_at,
    jsonb_build_object('progress', p.podium_count, 'rank', p.rank)
  from podium_entries p
  join public.badge_definitions bd
    on bd.category = 'podiums' and bd.is_active
    and bd.threshold = p.podium_count
), precision_awards as (
  select
    concat(p.player_id, ':', bd.badge_key), p.player_id, bd.badge_key,
    'event'::text, null::uuid, null::uuid, p.event_id, p.qualified_at,
    jsonb_build_object('progress', p.precision_count,
      'standardDeviationHundredths', p.standard_deviation_hundredths,
      'validAttempts', p.valid_attempts)
  from precision_ranked p
  join public.badge_definitions bd
    on bd.category = 'precision' and bd.is_active
    and bd.threshold = p.precision_count
), bingo_awards as (
  select
    concat(b.player_id, ':', bd.badge_key), b.player_id, bd.badge_key,
    'bingo'::text, null::uuid, null::uuid, null::uuid,
    case bd.tier
      when 'gold' then b.gold_badge_achieved_at
      when 'silver' then b.silver_badge_achieved_at
      else b.bronze_badge_achieved_at
    end,
    jsonb_build_object(
      'progress', case bd.tier
        when 'gold' then b.gold_lines
        when 'silver' then b.silver_lines
        else b.bronze_lines end,
      'bronzeLines', b.bronze_lines,
      'silverLines', b.silver_lines,
      'goldLines', b.gold_lines,
      'lineCountsAreCumulative', true
    )
  from public.player_bingo_statistics b
  join public.badge_definitions bd
    on bd.category = 'bingo' and bd.is_active
    and ((bd.tier = 'bronze' and b.bronze_lines > 0)
      or (bd.tier = 'silver' and b.silver_lines > 0)
      or (bd.tier = 'gold' and b.gold_lines > 0))
), first_valid_awards as (
  select
    concat(n.player_id, ':first-official-attempt'), n.player_id,
    'first-official-attempt'::text, n.source_type,
    case when n.source_type = 'attempt' then n.source_id else null::uuid end,
    case when n.source_type = 'historical_attempt' then n.source_id else null::uuid end,
    n.event_id, n.occurred_at,
    jsonb_build_object('progress', 1, 'timeHundredths', n.time_hundredths)
  from numbered_valid n where n.valid_sequence = 1
), time_stopper_ranked as (
  select v.*,
    row_number() over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    ) match_sequence
  from valid_player_times v where mod(time_hundredths, 100) = 0
), time_stopper_awards as (
  select
    concat(player_id, ':time-stopper'), player_id, 'time-stopper'::text,
    source_type,
    case when source_type = 'attempt' then source_id else null::uuid end,
    case when source_type = 'historical_attempt' then source_id else null::uuid end,
    event_id, occurred_at, jsonb_build_object('timeHundredths', time_hundredths)
  from time_stopper_ranked where match_sequence = 1
), false_starter_ranked as (
  select q.*,
    row_number() over (
      partition by player_id order by occurred_at, source_id
    ) dnf_sequence
  from qualified_player_attempts q where is_dnf
), false_starter_awards as (
  select
    concat(player_id, ':false-starter'), player_id, 'false-starter'::text,
    'attempt'::text, source_id, null::uuid, event_id, occurred_at,
    jsonb_build_object('progress', dnf_sequence)
  from false_starter_ranked where dnf_sequence = 10
), first_win_awards as (
  select
    concat(player_id, ':first-win'), player_id, 'first-win'::text,
    'event'::text, null::uuid, null::uuid, event_id, occurred_at,
    jsonb_build_object('progress', 1)
  from ranked_wins where win_sequence = 1
), glitch_ranked as (
  select s.*,
    row_number() over (
      partition by player_id order by occurred_at, source_priority, source_order, source_id
    ) glitch_sequence
  from sequenced_history s
  where not is_dnf and time_hundredths is not null
    and not coalesce(previous_is_dnf, false)
    and previous_time_hundredths = time_hundredths
), glitch_awards as (
  select
    concat(player_id, ':matrix-glitch'), player_id, 'matrix-glitch'::text,
    source_type,
    case when source_type = 'attempt' then source_id else null::uuid end,
    case when source_type = 'historical_attempt' then source_id else null::uuid end,
    event_id, occurred_at, jsonb_build_object('timeHundredths', time_hundredths)
  from glitch_ranked where glitch_sequence = 1
), almost_ranked as (
  select v.*,
    row_number() over (
      partition by player_id
      order by occurred_at, source_priority, source_order, source_id
    ) match_sequence
  from valid_player_times v where mod(time_hundredths, 100) = 1
), almost_awards as (
  select
    concat(player_id, ':almost'), player_id, 'almost'::text, source_type,
    case when source_type = 'attempt' then source_id else null::uuid end,
    case when source_type = 'historical_attempt' then source_id else null::uuid end,
    event_id, occurred_at, jsonb_build_object('timeHundredths', time_hundredths)
  from almost_ranked where match_sequence = 1
), first_world_records as (
  select wr.*,
    row_number() over (
      partition by player_id
      order by achieved_at, source_priority, source_order, attempt_id
    ) record_sequence
  from public.world_record_progression wr
), world_record_awards as (
  select
    concat(player_id, ':official-world-record'), player_id,
    'official-world-record'::text, source_type,
    case when source_type = 'attempt' then attempt_id else null::uuid end,
    case when source_type = 'historical_attempt' then attempt_id else null::uuid end,
    event_id, achieved_at, jsonb_build_object('timeHundredths', time_hundredths)
  from first_world_records where record_sequence = 1
), all_awards as (
  select * from attempt_awards
  union all select * from performance_awards
  union all select * from win_awards
  union all select * from win_streak_awards
  union all select * from sub3_awards
  union all select * from flawless_awards
  union all select * from favorite_awards
  union all select * from activity_awards
  union all select * from community_awards
  union all select * from participation_awards
  union all select * from podium_awards
  union all select * from precision_awards
  union all select * from bingo_awards
  union all select * from first_valid_awards
  union all select * from time_stopper_awards
  union all select * from false_starter_awards
  union all select * from first_win_awards
  union all select * from glitch_awards
  union all select * from almost_awards
  union all select * from world_record_awards
)
select
  award_key,
  player_id,
  badge_key,
  source_type,
  source_attempt_id,
  source_historical_attempt_id,
  source_event_id,
  awarded_at,
  metadata
from all_awards;

create or replace view public.public_player_badges
with (security_invoker = true)
as
select
  pba.award_key,
  pba.player_id,
  p.display_name,
  p.avatar_url,
  pba.badge_key,
  bd.category,
  bd.tier,
  bd.name,
  bd.description,
  pba.source_type,
  pba.source_attempt_id,
  pba.source_historical_attempt_id,
  pba.source_event_id,
  pba.awarded_at,
  pba.metadata,
  bd.badge_kind,
  bd.design_variant,
  bd.scope_type
from public.player_badge_awards pba
join public.badge_definitions bd on bd.badge_key = pba.badge_key and bd.is_active
join public.players p on p.id = pba.player_id
where not p.is_ak and not p.is_archived;

create or replace view public.visible_player_badges
with (security_invoker = true)
as
with enriched as (
  select
    ppb.*,
    p.avatar_path,
    bd.family_key,
    bd.requirement,
    bd.threshold,
    bd.sort_order,
    bd.is_secret,
    e.name source_event_name,
    e.start_date source_event_date,
    ead.attempt_number source_attempt_number,
    ead.time_hundredths source_time_hundredths,
    case when ppb.source_historical_attempt_id is not null
      then h.attempt_date::timestamp at time zone 'Europe/Berlin'
      else ppb.awarded_at end canonical_awarded_at,
    case ppb.tier
      when 'special' then 6 when 'diamond' then 5 when 'gold' then 4
      when 'silver' then 3 when 'bronze' then 2 end tier_rank
  from public.public_player_badges ppb
  join public.badge_definitions bd on bd.badge_key = ppb.badge_key and bd.is_active
  join public.players p on p.id = ppb.player_id
  left join public.events e on e.id = ppb.source_event_id and e.deleted_at is null
  left join public.historical_attempts h
    on h.id = ppb.source_historical_attempt_id and h.deleted_at is null
  left join public.event_attempt_details ead on ead.attempt_id = ppb.source_attempt_id
), ranked as (
  select *, row_number() over (
    partition by player_id, coalesce(family_key, award_key)
    order by tier_rank desc, threshold desc nulls last, awarded_at, award_key
  ) family_position
  from enriched
), rarity as (
  select badge_key, count(distinct player_id)::integer recipient_count
  from public.public_player_badges group by badge_key
), population as (
  select count(*)::integer regular_player_count
  from public.players where not is_ak and not is_archived
)
select
  r.award_key, r.player_id, r.display_name, r.avatar_url, r.avatar_path,
  r.badge_key, r.category, r.tier, r.name, r.description, r.family_key,
  r.requirement, r.threshold, r.sort_order, r.is_secret, r.source_type,
  r.source_attempt_id, r.source_historical_attempt_id, r.source_event_id,
  r.source_event_name, r.source_event_date, r.canonical_awarded_at awarded_at,
  r.metadata, r.tier_rank, rarity.recipient_count,
  population.regular_player_count,
  case when population.regular_player_count = 0 then null
    else round(rarity.recipient_count * 100.0 / population.regular_player_count)::integer
    end rarity_percent,
  r.source_attempt_number, r.source_time_hundredths,
  next_badge.badge_key next_badge_key, next_badge.name next_badge_name,
  next_badge.requirement next_requirement, next_badge.tier next_tier,
  next_badge.threshold next_threshold,
  coalesce((r.metadata->>'progress')::integer,
    case r.category
      when 'attempts' then ps.valid_attempts
      when 'wins' then ps.event_wins
      when 'performance' then ps.personal_best_hundredths
      else null end) current_progress,
  false is_special_event_badge,
  r.badge_kind,
  r.design_variant,
  r.scope_type
from ranked r
join rarity on rarity.badge_key = r.badge_key
cross join population
left join public.player_statistics ps on ps.player_id = r.player_id
left join lateral (
  select bd.badge_key, bd.name, bd.requirement, bd.tier, bd.threshold,
    case bd.tier when 'special' then 6 when 'diamond' then 5
      when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end next_rank
  from public.badge_definitions bd
  where bd.family_key = r.family_key and bd.is_active
    and case bd.tier when 'special' then 6 when 'diamond' then 5
      when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end > r.tier_rank
  order by next_rank, bd.threshold nulls last, bd.sort_order
  limit 1
) next_badge on true
where r.family_position = 1;

-- Preserve every PR-7C event_badge_unlocks column and append PR-8A metadata.
create or replace view public.event_badge_unlocks
with (security_invoker = true)
as
select
  ppb.award_key, ppb.player_id, ppb.display_name, ppb.avatar_url,
  p.avatar_path, ppb.badge_key, ppb.category, ppb.tier, ppb.name,
  ppb.description, bd.family_key, bd.requirement, bd.threshold,
  bd.sort_order, bd.is_secret, ppb.source_type, ppb.source_attempt_id,
  ppb.source_historical_attempt_id, ppb.source_event_id,
  e.name source_event_name, e.start_date source_event_date, ppb.awarded_at,
  ppb.metadata, brs.tier_rank, brs.recipient_count,
  brs.regular_player_count, brs.rarity_percent,
  ead.attempt_number source_attempt_number,
  coalesce(ead.time_hundredths,
    (ppb.metadata->>'timeHundredths')::integer) source_time_hundredths,
  null::text next_badge_key, null::text next_badge_name,
  null::text next_requirement, null::public.badge_tier next_tier,
  null::integer next_threshold,
  (ppb.metadata->>'progress')::integer current_progress,
  ppb.category = 'podium' is_special_event_badge,
  bd.badge_kind, bd.design_variant, bd.scope_type
from public.public_player_badges ppb
join public.players p on p.id = ppb.player_id
join public.badge_definitions bd on bd.badge_key = ppb.badge_key and bd.is_active
join public.badge_rarity_statistics brs on brs.badge_key = ppb.badge_key
join public.events e on e.id = ppb.source_event_id and e.deleted_at is null
left join public.event_attempt_details ead on ead.attempt_id = ppb.source_attempt_id;

create or replace view public.most_wanted_activity_feed
with (security_invoker = true)
as
select
  concat('most-wanted:', mw.ending) activity_id,
  'most_wanted_first'::text activity_type,
  mw.first_occurred_at occurred_at,
  mw.first_player_id player_id,
  mw.first_display_name display_name,
  mw.first_avatar_url avatar_url,
  mw.first_avatar_path avatar_path,
  mw.first_event_id event_id,
  mw.source_label event_name,
  concat('Most Wanted ,', mw.ending_label) title,
  concat(mw.first_display_name, ' traf die Hundertstel-Endung ,',
    mw.ending_label, ' mit ', to_char(mw.first_time_hundredths / 100.0,
    'FM990D00'), ' s historisch zuerst.') description,
  mw.first_time_hundredths time_hundredths,
  null::text badge_key,
  null::public.badge_tier tier,
  85::integer priority
from public.most_wanted_endings mw
where mw.achieved
union all
select
  concat('most-wanted-milestone:', m.threshold),
  'group_milestone'::text,
  m.achieved_at,
  null::uuid,
  null::text,
  null::text,
  null::text,
  null::uuid,
  'Most Wanted'::text,
  concat(m.threshold, ' von 100 Endungen gefunden'),
  case when m.threshold = 100
    then 'Die Liga hat die Most-Wanted-Liste vollständig abgeschlossen.'
    else concat('Die Liga hat gemeinsam ', m.threshold,
      ' unterschiedliche Hundertstel-Endungen getroffen.') end,
  null::integer,
  null::text,
  null::public.badge_tier,
  case when m.threshold = 100 then 100 else 75 end::integer
from public.most_wanted_milestones m
where m.achieved;

create or replace function public.sync_start_event_v3(
  p_name text,
  p_start_date date,
  p_participants jsonb,
  p_started_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_legacy_source_id text default null,
  p_awards_trophies boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  result := public.sync_start_event_v2(
    p_name, p_start_date, p_participants, p_started_at, p_ends_at,
    p_legacy_source_id
  );
  update public.events
  set awards_trophies = coalesce(p_awards_trophies, false)
  where id = (result->>'eventId')::uuid;
  return result;
end;
$$;

create or replace function public.sync_update_event_v2(
  p_event_id uuid,
  p_name text,
  p_start_date date,
  p_awards_trophies boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_update_event(p_event_id, p_name, p_start_date);
  update public.events
  set awards_trophies = coalesce(p_awards_trophies, false)
  where id = p_event_id and deleted_at is null;
  if not found then raise exception 'Event nicht gefunden.'; end if;
end;
$$;

revoke all on function public.sync_start_event_v3(
  text, date, jsonb, timestamptz, timestamptz, text, boolean
) from public;
revoke all on function public.sync_update_event_v2(uuid, text, date, boolean)
  from public;
grant execute on function public.sync_start_event_v3(
  text, date, jsonb, timestamptz, timestamptz, text, boolean
) to anon, authenticated;
grant execute on function public.sync_update_event_v2(uuid, text, date, boolean)
  to anon, authenticated;

grant select on public.qualified_official_times, public.precision_events,
  public.most_wanted_endings, public.most_wanted_progress,
  public.most_wanted_milestones,
  public.player_bingo_hits, public.player_bingo_fields,
  public.player_bingo_lines, public.player_bingo_statistics,
  public.league_time_threshold_statistics, public.league_time_statistics,
  public.player_trophies, public.most_wanted_activity_feed
  to anon, authenticated;
