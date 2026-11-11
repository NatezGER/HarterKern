import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { StatisticsMedal } from "@/components/common/StatisticsMedal";
import type { PerformanceMedals } from "@/lib/performanceMedals";
export function MedalPodium({ rows }: { rows: PerformanceMedals["rows"] }) {
  const podium = rows.filter(row => row.total > 0).slice(0, 3);
  const tied = podium.length === 3 && rows[3]?.rank === podium[2].rank;
  return <section className="panel dk-frame dk-hof-podium mb-8 px-2 pt-8 sm:px-10" aria-label="Medaillenpodium">
    <div className="flex items-end justify-center gap-2 sm:gap-6">
      {podium.map((row, index) => <div key={row.playerId} data-medal-podium-rank={row.rank} className={`flex min-w-0 max-w-56 flex-1 flex-col items-center text-center ${index === 0 ? "order-2" : index === 1 ? "order-1" : "order-3"}`}>
        <ProfileAvatar id={row.playerId} name={row.name} url={row.avatarUrl} className="mb-3 size-14 sm:size-24" />
        <a href={`/player/${row.playerId}`} className="mb-3 w-full break-words font-display text-sm font-black hover:text-gold-200 focus-visible:outline focus-visible:outline-gold-300 sm:text-xl [overflow-wrap:anywhere]">{row.name}</a>
        <div className="mb-4 flex w-full flex-wrap justify-center gap-1 text-xs tabular-nums sm:gap-3 sm:text-lg">{(["gold", "silver", "bronze"] as const).map((color, i) => <span key={color} aria-label={`${row[color]} ${["Gold", "Silber", "Bronze"][i]}`} className="flex items-center gap-0.5"><StatisticsMedal rank={(i + 1) as 1 | 2 | 3} /><span>{row[color]}</span></span>)}</div>
        <div className={`w-full rounded-t-2xl border-x border-t border-gold-300/25 bg-gradient-to-t from-gold-300/5 to-gold-300/20 pt-4 font-display text-4xl font-black text-gold-200 ${row.rank === 1 ? "h-36 sm:h-52" : row.rank === 2 ? "h-28 sm:h-40" : "h-20 sm:h-32"}`} aria-label={`Rang ${row.rank}`}>{row.rank}</div>
      </div>)}
    </div>
    {tied && <p className="py-3 text-center text-xs text-white/55">Weitere gleichplatzierte Spieler in der Rangliste</p>}
    {podium.length === 0 && <p className="pb-8 text-center text-sm text-white/50">Noch keine Statistikmedaillen auf dem Podium.</p>}
  </section>;
}
