create or replace view public.public_hall_of_fame
with (security_invoker = true)
as
with valid_attempts as (
  select
    p.id as player_id,
    p.display_name,
    p.avatar_url,
    a.time_hundredths,
    a.submitted_at
  from public.players p
  join public.attempts a on a.player_id = p.id
  where not p.is_ak
    and not p.is_archived
    and a.status = 'approved'
    and not a.is_dnf
    and a.time_hundredths is not null
    and a.deleted_at is null
),
personal_bests as (
  select
    player_id,
    display_name,
    avatar_url,
    min(time_hundredths) as personal_best_hundredths
  from valid_attempts
  group by player_id, display_name, avatar_url
),
ranked_players as (
  select
    *,
    dense_rank() over (order by personal_best_hundredths)::integer as rank
  from personal_bests
)
select
  rp.player_id,
  rp.display_name,
  rp.avatar_url,
  rp.personal_best_hundredths,
  min(va.submitted_at::date) as record_date,
  rp.rank
from ranked_players rp
join valid_attempts va
  on va.player_id = rp.player_id
  and va.time_hundredths = rp.personal_best_hundredths
group by
  rp.player_id,
  rp.display_name,
  rp.avatar_url,
  rp.personal_best_hundredths,
  rp.rank;

grant select on public.public_hall_of_fame to anon, authenticated;
