-- Run BEFORE 073: exact candidate rows by event; safe on the existing 071/072 schema.
select e.id,e.name,e.start_date,e.beer_brand,count(*) empty_attempts,
  count(*) filter(where a.guest_id is not null) guest_attempts,
  count(*) filter(where a.is_dnf) dnf_attempts
from public.events e join public.attempts a on a.event_id=e.id
where e.status='closed' and e.deleted_at is null
  and a.deleted_at is null
  and nullif(btrim(e.beer_brand),'') is not null
  and nullif(btrim(a.beer_brand),'') is null
group by e.id,e.name,e.start_date,e.beer_brand order by e.start_date,e.id;
-- AFTER 073 the same query must return no rows (unless new empty data was added).
-- Read-only runtime smoke: inspect brands, fastest, unlucky and nested players/eventDetails.
select public.get_beer_statistics_dashboard(null);
