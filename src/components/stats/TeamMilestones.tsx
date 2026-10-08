import type { ReactNode } from "react";
import { beerMilestones, teamTimeMilestones, type TeamMilestoneDefinition, type TeamMilestoneKind } from "@/constants/teamMilestones";
import type { TeamMilestonesSnapshot, MilestoneCrossing } from "@/services/teamMilestonesService";
import type { MilestoneContentMap } from "@/services/milestoneContentService";
import { resolveTeamMilestones } from "@/lib/teamMilestones";
import { resolveMilestoneProgress } from "@/lib/teamMilestoneProgress";
import { MilestoneArtwork } from "./MilestoneArtwork";
import { formatDate } from "@/utils/format";

const labels = { "beer-volume": "Gemeinsam getrunken", "team-time": "Top-10-Teamzeit" };
const format = (n: number, kind: TeamMilestoneKind) => n.toLocaleString("de-DE", {
  minimumFractionDigits: kind === "team-time" ? 2 : 1, maximumFractionDigits: 2,
}) + (kind === "team-time" ? " s" : " L");
function Info({ text }: { text?: string | null }) {
  if (!text?.trim()) return null;
  const paragraph = <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/60">{text}</p>;
  return text.length > 200 ? <details className="mt-3 text-sm text-white/60"><summary className="cursor-pointer">Mehr zum Meilenstein</summary>{paragraph}</details> : paragraph;
}
type Progress = ReturnType<typeof resolveMilestoneProgress<TeamMilestoneDefinition>>;
function ProgressCard({ kind, value, progress: p, scope, artwork, content }: {
  kind: TeamMilestoneKind; value: number | null; progress: Progress; scope: string;
  artwork?: ReactNode; content: MilestoneContentMap;
}) {
  const current = p.achievedMilestone, next = p.nextMilestone;
  const percent = Math.round(p.progress*100);
  return <article className="panel flex min-w-0 flex-col overflow-hidden p-5 sm:p-7" data-team-kind={kind}>
    <p className="text-xs text-white/40">{scope}</p>
    <h3 className="mt-1 text-sm font-bold uppercase tracking-wider text-gold-200">{labels[kind]}</h3>
    <p className="my-4 break-words font-display text-4xl font-black tabular-nums sm:text-5xl">{value == null ? "—" : format(value,kind)}</p>
    {artwork ?? <MilestoneArtwork assetKey={current?.assetKey} kind={kind} title={current?.title ?? labels[kind]} imageUrl={current ? content[current.id]?.imageUrl : null} />}
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
    <div className="mt-5">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-white/60"><span>Fortschritt in dieser Stufe</span><span>{percent} %</span></div>
      <div className="mt-2 h-3 overflow-hidden rounded-full border border-white/20 bg-black/60" role="progressbar" aria-label={labels[kind]+" – Stufenfortschritt"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-full bg-gold-300 transition-[width]" style={{ width: `${p.progress*100}%` }} />
      </div>
      {next && p.remaining != null && <p className="mt-2 text-sm text-gold-200">Noch {format(p.remaining,kind)}{kind === "team-time" ? " schneller" : ""}</p>}
    </div>
    {current && <Info text={content[current.id]?.infoText} />}
  </article>;
}
export function TeamMilestones({ snapshot, beerArtwork, timeArtwork, content = {} }: {
  snapshot: TeamMilestonesSnapshot; beerArtwork?: ReactNode; timeArtwork?: ReactNode; content?: MilestoneContentMap;
}) {
  const m = resolveTeamMilestones(snapshot);
  const scope = snapshot.season === "all-time" ? "Ewig" : `Saison ${snapshot.season}`;
  return <div className="grid min-w-0 gap-4 lg:grid-cols-2">
    <ProgressCard kind="beer-volume" value={m.liters} progress={m.beer} scope={scope} artwork={beerArtwork} content={content} />
    <ProgressCard kind="team-time" value={m.seconds} progress={m.time} scope={scope} artwork={timeArtwork} content={content} />
  </div>;
}
function Crossing({ proof }: { proof?: MilestoneCrossing }) {
  if (!proof) return null;
  return <div className="mt-3 space-y-1 text-xs leading-5 text-white/55">
    {proof.occurredDate && <p>Erreicht am {formatDate(proof.occurredDate)}</p>}
    {proof.sourceType === "historical_attempt" && <p>Historischer Eintrag</p>}
    {proof.sourceType === "baseline" && <p>Ausgangswert mit Platzhaltern</p>}
    {proof.eventName && <p className="break-words">Event: {proof.eventName}</p>}
    {proof.playerName && <p className="break-words">{proof.playerName}{proof.timeHundredths != null && ` · ${format(proof.timeHundredths/100,"team-time")}`}</p>}
    {proof.improvementHundredths != null && <p>Teamzeit verbessert um {format(proof.improvementHundredths/100,"team-time")}</p>}
  </div>;
}
export function TeamMilestoneHistory({ snapshot, content = {} }: { snapshot: TeamMilestonesSnapshot; content?: MilestoneContentMap }) {
  const m = resolveTeamMilestones(snapshot);
  const proofs = new Map((snapshot.crossings ?? []).map(p => [p.milestoneId,p]));
  return <div className="grid min-w-0 gap-5 lg:grid-cols-2">{(["beer-volume","team-time"] as const).map(kind => {
    const current = kind === "beer-volume" ? m.beer.achievedMilestones : m.time.achievedMilestones;
    const catalogue = kind === "beer-volume" ? beerMilestones : teamTimeMilestones;
    const achieved = catalogue.filter(item => proofs.has(item.id) || current.some(m => m.id === item.id));
    return <section key={kind} className="min-w-0 space-y-3" data-history-kind={kind}>
      <h3 className="font-display text-xl font-bold text-gold-200">{labels[kind]}</h3>
      {!achieved.length && <p className="panel p-5 text-sm text-white/45">Noch keine Team-Meilensteine in diesem Scope erreicht.</p>}
      {achieved.map(item => <article key={item.id} className="panel min-w-0 overflow-hidden p-4" data-achieved-milestone={item.id}>
        <MilestoneArtwork kind={kind} assetKey={item.assetKey} title={item.title} imageUrl={content[item.id]?.imageUrl} />
        <h4 className="mt-3 break-words font-semibold">{item.title}</h4>
        <p className="mt-2 text-sm tabular-nums text-white/60">{format(item.threshold,kind)}</p>
        <Crossing proof={proofs.get(item.id)} /><Info text={content[item.id]?.infoText} />
      </article>)}
    </section>;
  })}</div>;
}
