-- Read-only production-safe diagnostics; no fixture or migration execution.
begin read only;
-- Scope populations and canonical CV qualification. No player identities needed.
with scoped as (
 select null::integer season_year,q.* from public.qualified_official_times q where not q.is_guest and q.player_id is not null
 union all
 select q.* from public.season_qualified_official_times q where not q.is_guest and q.player_id is not null
), samples as (
 select season_year,player_id,count(*) samples,
 round(stddev_pop(time_hundredths)/nullif(round(avg(time_hundredths)),0)*100,3) cv
 from scoped group by season_year,player_id
), eligible as (
 select *,row_number() over(partition by season_year order by cv,player_id) position,
 count(*) over(partition by season_year) population from samples where samples>=10
), cutoffs as (
 select * from eligible where position=ceil(population::numeric/3)
)
select c.season_year,c.population,ceil(c.population::numeric/3) target,c.cv cutoff,
 count(*) qualified_including_ties from cutoffs c join eligible e
 on e.season_year is not distinct from c.season_year and e.cv<=c.cv
 group by c.season_year,c.population,c.cv order by c.season_year nulls first;
-- Historical order ambiguity: date-only plus exact-time rows or duplicate import order.
select occurred_date,count(*) ambiguous_player_days from (
 select player_id,occurred_date from public.qualified_official_times
 where player_id is not null and not is_guest group by player_id,occurred_date
 having (bool_or(not has_exact_time) and bool_or(has_exact_time))
 or count(*) filter(where not has_exact_time)>count(distinct source_order) filter(where not has_exact_time)
) d group by occurred_date order by occurred_date;
rollback;
-- After 078, on an ISOLATED representative database: EXPLAIN (ANALYZE, BUFFERS)
-- the helper CTE query, measure cold/warm RPC duration and octet_length(payload::text).
-- SQL function EXPLAIN alone may conceal the nested plan; inspect the helper body too.
