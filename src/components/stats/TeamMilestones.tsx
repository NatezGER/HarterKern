import { Timer } from "lucide-react";
import type { ReactNode } from "react";
import { BeerVolumeCard } from "@/components/stats/BeerVolumeCard";
import type { TeamMilestonesSnapshot } from "@/services/teamMilestonesService";

export function TeamMilestones({ snapshot, beerArtwork, timeArtwork }: {
  snapshot: TeamMilestonesSnapshot;
  beerArtwork?: ReactNode;
  timeArtwork?: ReactNode;
}) {
  const scope = snapshot.season === "all-time" ? "Ewig" : `Saison ${snapshot.season}`;
  return <div className="grid min-w-0 gap-4 lg:grid-cols-2">
    <BeerVolumeCard validAttempts={snapshot.validAttempts} contextLabel={`Gemeinsam getrunken · ${scope}`} artwork={beerArtwork} />
    <article className="panel min-w-0 overflow-hidden p-5 sm:p-7">
      <div className="mb-4 grid size-11 place-items-center rounded-2xl border border-gold-300/20 bg-gold-300/10 text-gold-200" data-team-artwork="time" aria-hidden="true">{timeArtwork ?? <Timer className="size-5" />}</div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gold-200">Top-10-Teamzeit</h3>
      <p className="mt-3 break-words font-display text-3xl font-black sm:text-4xl">{snapshot.teamTimeHundredths == null ? "—" : `${(snapshot.teamTimeHundredths / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s`}</p>
      <p className="mt-2 text-sm text-white/60">{snapshot.playerCount}/10 Spieler · {scope}</p>
      <p className="mt-3 text-xs leading-5 text-white/40">{snapshot.playerCount === 0 ? "Noch keine qualifizierten Bestzeiten." : "Summe der persönlichen Bestzeiten der bis zu zehn schnellsten unterschiedlichen regulären Spieler. Kleinere Summe = besser."}</p>
      {snapshot.playerCount > 0 && snapshot.playerCount < 10 && <p className="mt-2 text-xs text-amber-200/70">Unvollständiges Team: Summe der verfügbaren Spieler.</p>}
    </article>
  </div>;
}
