// Isolated in-memory PostgreSQL (PGlite). Never connects to Supabase or a persistent DB.
// Pass the absolute path to a separately installed @electric-sql/pglite/dist/index.js.
// Canonical lead/pair/sequence definitions are loaded verbatim from the repository.
// Qualified-time/global/record input relations below are fixture contracts, not production views.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
export async function checkPerformancePrF(pglitePath, afterChecks) {
const { PGlite } = await import(pathToFileURL(pglitePath).href);
const db = new PGlite();
const read = name => readFileSync(`supabase/migrations/${name}`, "utf8");
const m60 = read("202610040060_event_timing_pairwise_rivalries.sql");
const m68 = read("202610110068_guest_event_eligibility.sql");
const m77 = read("202611100077_performance_pr_b.sql");
const m78 = read("202611100078_performance_pr_c.sql");
const view = (sql, name) => sql.match(new RegExp(`create (?:or replace )?view public\\.${name}\\b[^;]*;`, "i"))[0];
const fn = (sql, name) => sql.slice(sql.indexOf(`function public.${name}`) - (sql.slice(0,sql.indexOf(`function public.${name}`)).endsWith("or replace ") ? 18 : 7)).match(/^create[\s\S]*?\$\$;/)[0];
const uuid = n => `80000000-0000-0000-0000-${String(n).padStart(12,"0")}`;
const rows = async sql => (await db.query(sql)).rows;
let checks = 0;
function check(value, expected, label) { assert.deepEqual(value, expected, label); checks++; }
try {
 await db.exec(`create role anon; create role authenticated;
 create table players(id uuid primary key,display_name text,avatar_url text,avatar_path text,is_ak boolean default false,is_archived boolean default false);
 create table events(id uuid primary key,name text,start_date date,status text default 'closed',deleted_at timestamptz,closed_at timestamptz,ends_at timestamptz,awards_trophies boolean default false);
 create table attempts(id uuid primary key,event_id uuid,player_id uuid,guest_id uuid,submitted_at timestamptz,time_hundredths integer,is_dnf boolean default false,is_ak boolean default false,status text default 'approved',deleted_at timestamptz);
 create table event_guests(id uuid primary key,event_id uuid);
 create table event_statistical_pauses(event_id uuid,paused_at timestamptz,resumed_at timestamptz);
 create table global_statistics(valid_attempts integer,dnf_count integer,average_hundredths integer,regular_players integer,event_count integer);
 insert into global_statistics values(0,0,null,3,1);
 create table season_global_statistics(season_year integer,valid_attempts integer,dnf_count integer,average_hundredths integer,regular_players integer,event_count integer);
 create table most_wanted_endings(first_player_id uuid,ending integer,achieved boolean,first_is_guest boolean);
 create table season_most_wanted_endings(season_year integer,first_player_id uuid,ending integer,achieved boolean,first_is_guest boolean);
 create table world_record_history(player_id uuid,duration_days numeric,improvement_hundredths integer);
 create table season_world_record_history(player_id uuid,season_year integer,period_end_date date,achieved_date date,improvement_hundredths integer);`);
 await db.exec(fn(m60,"event_active_elapsed_seconds"));
 for (const name of ["official_event_attempts"]) await db.exec(view(m60,name));
 for (const name of ["event_eligible_attempts","event_statistical_windows","event_lead_windows","event_participant_lead_segments_all","event_participant_lead_segments","event_lead_segments_all","event_best_breaks","event_lead_participant_statistics","event_lead_player_statistics"]) await db.exec(view(m68,name));
 for (const name of ["event_pair_attempt_states","event_pair_lead_segments","event_direct_lead_takeovers","event_pair_summaries","rivalry_pair_events"]) await db.exec(view(m60,name));
 await db.exec(fn(m68,"get_qualified_leadership_metrics"));
 await db.exec(`create view qualified_official_times as select a.attempt_id::text source_id,a.player_id,p.display_name,p.avatar_url,p.avatar_path,
 a.guest_id is not null is_guest,a.time_hundredths,a.event_id,a.submitted_at occurred_at,a.submitted_at::date occurred_date,
 'attempt'::text source_type,row_number() over(partition by a.event_id,a.participant_id order by submitted_at,attempt_id)::integer source_order,
 true has_exact_time,1 source_priority from event_eligible_attempts a left join players p on p.id=a.player_id where a.is_valid_time;
 create view season_qualified_official_times as select q.*,extract(year from e.start_date)::integer season_year from qualified_official_times q join events e on e.id=q.event_id;`);
 await db.exec(fn(read("202609210059_compare_scoring_two_in_sixty_fix.sql"),"get_statistics_sequence_metrics"));
 await db.exec(fn(m77,"get_performance_event_metrics"));
 await db.exec(m78);
 for(let i=1;i<=10;i++) await db.query("insert into players(id,display_name) values($1,$2)",[uuid(i),`Fixture ${i}`]);
 for(let i=1;i<=10;i++) await db.query("insert into events(id,name,start_date,status) values($1,$2,'2026-01-01',$3)",[uuid(100+i),`Event ${i}`,i===7?"active":"closed"]);
 let next=1000;
 const attempt=async(e,p,t,minute,extra={})=>{
  const id=uuid(next++);
  await db.query("insert into attempts(id,event_id,player_id,guest_id,time_hundredths,is_dnf,submitted_at,is_ak,status,deleted_at) values($1,$2,$3,$4,$5,$6,'2026-01-01 18:00Z'::timestamptz+$7*interval '1 minute',$8,$9,$10)",
   [id,uuid(100+e),extra.guest?null:uuid(p),extra.guest?uuid(p):null,t,extra.dnf??t===null,minute,extra.ak??false,extra.status??"approved",extra.deleted?"2026-01-02":null]);return id;
 };
 await attempt(1,1,400,0); // single valid
 await attempt(2,1,400,0); await attempt(2,1,450,5); await attempt(2,2,null,10); // same player, DNF ends
 await attempt(3,1,400,0); await attempt(3,2,350,5); await attempt(3,1,300,10); // initial is second
 await db.query("insert into event_guests values($1,$2)",[uuid(50),uuid(104)]);
 await attempt(4,1,400,0); await attempt(4,50,400,5,{guest:true}); await attempt(4,50,300,10,{guest:true});
 const sequence=[[1,400],[2,390],[3,380],[1,370],[2,360],[1,350],[3,340],[1,330],[2,320],[1,310]];
 for(let i=0;i<sequence.length;i++) await attempt(5,...sequence[i],i);
 await attempt(6,1,null,0); await attempt(6,2,200,1,{ak:true}); await attempt(6,2,200,2,{status:"pending"}); await attempt(6,2,200,3,{deleted:true}); await attempt(6,1,400,4); await attempt(6,2,400,4); await attempt(6,1,300,4);
 await attempt(7,1,400,0); await attempt(7,2,350,5);
 await db.query("insert into event_statistical_pauses values($1,'2026-01-01 18:06Z','2026-01-01 18:08Z')",[uuid(102)]);
 // Six opponents overtaken in one attempt: total must survive a five-opponent proof cap.
 await attempt(8,1,400,0);for(let p=5;p<=10;p++)await attempt(8,p,350,p);
 await attempt(8,1,100,40);
 for(let i=0;i<14;i++)await attempt(9,i%2===0?1:2,500-i*10,i);
 // Matrix: direct equality counts; DNF breaks adjacency.
 await attempt(10,4,300,0);await attempt(10,4,300,1);await attempt(10,4,null,2);await attempt(10,4,300,3);
 const before=new Map();
 for (const season of [null,2026]) before.set(season,(await db.query("select get_statistics_performance_dashboard($1) p",[season])).rows[0].p);
 const oldSeq=await rows("select * from get_statistics_sequence_metrics(null,2026,null) where metric_key in ('fast-starter','matrix-glitch','two-in-sixty-total','two-in-sixty-best') order by metric_key,player_id");
 const canonicalPairs=await rows("select * from rivalry_pair_events order by event_id,player_low_id,player_high_id");
 await db.exec(read("202611110080_performance_pr_f.sql"));
 check((await rows(`select * from event_lead_windows where event_id='${uuid(101)}'`)).length,0,"single time has no lead");
 const lead=await rows(`select player_id,duration_seconds,sequence,prior_event_best from event_participant_lead_segments_all where event_id='${uuid(102)}'`);
 check(lead.map(x=>[x.player_id,Number(x.duration_seconds),x.sequence,x.prior_event_best]),[[uuid(1),180,1,null]],"second slower same-player attempt starts lead; pauses removed; DNF ends");
 check((await rows(`select player_id,sequence,prior_event_best from event_participant_lead_segments_all where event_id='${uuid(103)}' order by sequence`)).map(x=>[x.player_id,x.sequence,x.prior_event_best]),[[uuid(2),1,null],[uuid(1),2,350]],"second faster is baseline, later is true record");
 check((await rows(`select player_id,guest_id,sequence from event_participant_lead_segments_all where event_id='${uuid(104)}' order by sequence`)).map(x=>[x.player_id,x.guest_id,x.sequence]),[[uuid(1),null,1],[null,uuid(50),2]],"guest qualifies; tie retains first; guest takeover retained");
 check((await rows(`select sequence from event_participant_lead_segments_all where event_id='${uuid(106)}' order by sequence`)).map(x=>x.sequence),[1,2],"same timestamp ordered by UUID; invalid attempts excluded");
 check((await rows(`select * from event_participant_lead_segments where event_id='${uuid(107)}'`)).length,0,"active event excluded from closed projection");
 check(await rows("select * from rivalry_pair_events order by event_id,player_low_id,player_high_id"),canonicalPairs,"pair qualification unchanged");
 check(await rows("select * from get_performance_sequence_metrics(null,2026,null) order by metric_key,player_id"),oldSeq,"retained sequence formulas identical");
 const rivalry=(await db.query("select * from get_performance_event_metrics_v2(2026,null) where metric_key='performance-rivalry-events' and player_id=$1",[uuid(1)])).rows[0];
 check(Number(rivalry.value),3,"A-B and A-C same event count twice");check(rivalry.evidence,null,"base rankings omit evidence");
 const proof=(await db.query("select get_performance_metric_details(2026,'performance-rivalry-events',$1) p",[uuid(1)])).rows[0].p;
 check(proof.rivalryEvidence.find(e=>e.eventId===uuid(105)).opponents.length,2,"both rivalry pair proofs retained");
 const chaosProof=(await db.query("select get_performance_metric_details(2026,'performance-chaos-takeovers',$1) p",[uuid(1)])).rows[0].p.chaosEvidence;
 check(chaosProof.length,5,"five-attempt proof cap");
 const multi=chaosProof.find(a=>a.eventId===uuid(108));
 check([multi.takeovers,multi.opponents.length],[6,5],"six takeovers with five shown opponents");
 const glitch=(await db.query("select value from get_performance_sequence_metrics(null,2026,null) where metric_key='matrix-glitch' and player_id=$1",[uuid(4)])).rows[0];
 check(Number(glitch.value),1,"Matrix equality counts once; DNF interrupts");
 const sizes=[];
 for(const season of [null,2026]) {
  const payload=(await db.query("select get_statistics_performance_dashboard($1) p",[season])).rows[0].p;
  sizes.push({season,beforeBytes:Buffer.byteLength(JSON.stringify(before.get(season))),afterBytes:Buffer.byteLength(JSON.stringify(payload))});
  const retired=new Set(['performance-endspurt','performance-fastest-consistent','performance-form-rise','performance-form-decay','late-bloomer','clutch','one-shot','event-breaks','chaos-magnet']);
  check(payload.metrics.filter(m=>retired.has(m.key)).length,0,"retired metrics absent from SQL");
  const changed=new Set([...retired,'lead-time','takeovers','performance-rivalry-events','performance-chaos-takeovers']);
  const clean=m=>({...m,rankings:m.rankings.map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!["developmentEvidence","endspurtEvidence"].includes(k))))});
  for (const m of before.get(season).metrics.filter(m=>!changed.has(m.key))) check(clean(payload.metrics.find(x=>x.key===m.key)),clean(m),`unchanged values/ranks: ${season}/${m.key}`);
 }
 await db.exec("grant usage on schema public to anon; grant select on all tables in schema public to anon; set role anon;");
 check((await rows("select get_statistics_performance_dashboard(2026) p"))[0].p.metrics.length>0,true,"anon ranking execution");
 check((await db.query("select get_performance_metric_details(2026,'performance-record-hunter',$1) p",[uuid(1)])).rows[0].p.developmentEvidence.kind,"hunt","anon detail execution");
 console.log(`PR F PostgreSQL fixture checks passed: ${checks}`);
 console.log("Fixture payload sizes (not production timings):",JSON.stringify(sizes));
 await afterChecks?.(db);
} finally { await db.close(); }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
 await checkPerformancePrF(process.argv[2]);
}
