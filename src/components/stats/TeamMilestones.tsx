import type { ReactNode } from "react";
import type { TeamMilestoneDefinition, TeamMilestoneKind } from "@/constants/teamMilestones";
import type { TeamMilestonesSnapshot } from "@/services/teamMilestonesService";
import { resolveTeamMilestones } from "@/lib/teamMilestones";
import { resolveMilestoneProgress } from "@/lib/teamMilestoneProgress";
import { MilestoneArtwork } from "./MilestoneArtwork";

const labels = { "beer-volume": "Gemeinsam getrunken", "team-time": "Top-10-Teamzeit" };
const format = (n: number, kind: TeamMilestoneKind) => n.toLocaleString("de-DE", {
  minimumFractionDigits: kind === "team-time" ? 2 : 1, maximumFractionDigits: 2,
}) + (kind === "team-time" ? " s" : " L");

function MilestoneNote({ milestone }: { milestone: TeamMilestoneDefinition }) {
  const source = milestone.source;
  const safeSource = source && /^https:\/\//.test(source.url) && source.title.trim();
  return <div className="space-y-2 text-xs leading-5 text-white/50">
    <p>{milestone.description}</p>
    {milestone.interestingFact && safeSource && <p data-interesting-fact>{milestone.interestingFact}</p>}
    {safeSource && <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-block break-words text-gold-200 underline underline-offset-4">Quelle: {source.publisher ?? source.title}</a>}
  </div>;
}
type Progress = ReturnType<typeof resolveMilestoneProgress<TeamMilestoneDefinition>>;
function ProgressCard({ kind, value, progress: p, scope, qualified = true, playerCount, artwork }: {
  kind: TeamMilestoneKind; value: number | null; progress: Progress; scope: string;
  qualified?: boolean; playerCount?: number; artwork?: ReactNode;
}) {
  const current = p.achievedMilestone, next = p.nextMilestone;
  const percent = Math.round(p.progress*100);
  return <article className="panel flex min-w-0 flex-col overflow-hidden p-5 sm:p-7" data-team-kind={kind}>
    <p className="text-xs text-white/40">{scope}</p>
    <h3 className="mt-1 text-sm font-bold uppercase tracking-wider text-gold-200">{labels[kind]}</h3>
    <p className="my-4 break-words font-display text-4xl font-black tabular-nums sm:text-5xl">{value == null ? "—" : format(value,kind)}</p>
    {kind === "team-time" && <p className="mb-4 text-sm text-white/60">{playerCount}/10 Spieler{!qualified && playerCount !== 0 ? " · Teilteamsumme" : ""}</p>}
    {artwork ?? <MilestoneArtwork assetKey={current?.assetKey} kind={kind} title={current?.title ?? labels[kind]} />}
    <div className="mt-5 grid min-w-0 grid-cols-2 gap-4">
      <div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-gold-200">Aktuell erreicht</p>
        <p className="mt-2 break-words font-semibold">{current?.title ?? "Noch kein Meilenstein"}</p>
        <p className="mt-1 text-sm tabular-nums text-white/50">{current ? format(current.threshold,kind) : "Start"}</p>
      </div>
      <div className="min-w-0 text-right"><p className="text-[10px] uppercase tracking-wider text-white/45">Nächstes Ziel</p>
        <p className="mt-2 break-words font-semibold">{next?.title ?? "Alle aktuellen Meilensteine erreicht"}</p>
        {next && <p className="mt-1 text-sm tabular-nums text-white/50">{format(next.threshold,kind)}</p>}
      </div>
    </div>
    {!qualified && <p className="mt-4 text-sm text-amber-200/80">{playerCount === 0 ? "Noch keine qualifizierten Bestzeiten." : "Unvollständiges Team: Summe der verfügbaren Spieler."} Meilensteine zählen erst mit zehn Spielern und gültiger Teamzeit.</p>}
    <div className="mt-5">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-white/60"><span>{qualified ? "Fortschritt in dieser Stufe" : "Wartet auf vollständiges Team"}</span><span>{percent} %</span></div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={labels[kind]+" – Stufenfortschritt"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-full rounded-full bg-gradient-to-r from-amber-700 to-gold-200 transition-[width]" style={{ width: `${p.progress*100}%` }} />
      </div>
      {qualified && next && p.remaining != null && <p className="mt-2 text-sm text-gold-200">Noch {format(p.remaining,kind)}{kind === "team-time" ? " schneller" : ""}</p>}
      {p.complete && <p className="mt-3 font-semibold text-gold-200">Alle aktuellen Meilensteine erreicht</p>}
    </div>
    {current && <div className="mt-5"><MilestoneNote milestone={current} /></div>}
    <details className="mt-auto pt-5 text-xs leading-5 text-white/45"><summary className="cursor-pointer font-semibold text-white/65">Was bedeutet das?</summary>
      <p className="mt-2">{kind === "beer-volume"
        ? "Gültige Eventversuche zählen mit je 0,2 L. Gäste, AK und DNF sind ausgeschlossen. Historische Einzelzeiten zählen nicht als getrunkenes Eventbier. Die Vergleiche beziehen sich auf eure gesamte Teammenge, nicht auf persönliche Trinkziele."
        : "Pro regulärem Spieler zählt die persönliche Bestzeit im gewählten Scope. Die zehn schnellsten unterschiedlichen Spieler bilden das Team; ihre zehn PBs werden addiert. Kleiner = besser. Historische qualifizierte Zeiten können für PBs mitzählen."}</p>
    </details>
  </article>;
}
export function TeamMilestones({ snapshot, beerArtwork, timeArtwork }: {
  snapshot: TeamMilestonesSnapshot; beerArtwork?: ReactNode; timeArtwork?: ReactNode;
}) {
  const m = resolveTeamMilestones(snapshot);
  const scope = snapshot.season === "all-time" ? "Ewig" : `Saison ${snapshot.season}`;
  return <div className="grid min-w-0 gap-4 lg:grid-cols-2">
    <ProgressCard kind="beer-volume" value={m.liters} progress={m.beer} scope={scope} artwork={beerArtwork} />
    <ProgressCard kind="team-time" value={m.seconds} progress={m.time} scope={scope} qualified={m.qualified} playerCount={snapshot.playerCount} artwork={timeArtwork} />
  </div>;
}
export function TeamMilestoneHistory({ snapshot }: { snapshot: TeamMilestonesSnapshot }) {
  const m = resolveTeamMilestones(snapshot);
  const achieved = [...m.beer.achievedMilestones].reverse().concat([...m.time.achievedMilestones].reverse());
  if (!achieved.length) return <p className="panel p-6 text-sm text-white/50">Noch keine Team-Meilensteine in diesem Scope erreicht.</p>;
  return <div className="space-y-4"><p className="text-sm text-white/45">{achieved.length} erreichte Stufen · {snapshot.season === "all-time" ? "Ewig" : `Saison ${snapshot.season}`}. Aktueller Stand, keine geschätzten Freischaltdaten.</p>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">{achieved.map(item => <article key={item.id} className="panel min-w-0 overflow-hidden p-4" data-achieved-milestone={item.id}>
      <MilestoneArtwork kind={item.kind} assetKey={item.assetKey} title={item.title} />
      <p className="mt-3 text-[10px] uppercase tracking-wider text-gold-200">{labels[item.kind]}</p>
      <h3 className="mt-1 break-words font-semibold">{item.title}</h3>
      <p className="mt-2 text-sm tabular-nums text-white/60">{format(item.threshold,item.kind)}</p>
      <details className="mt-3"><summary className="cursor-pointer text-xs text-white/50">Einordnung</summary><div className="mt-2"><MilestoneNote milestone={item} /></div></details>
    </article>)}</div>
  </div>;
}
