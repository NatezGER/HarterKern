import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { SectionHeading } from "@/components/common/SectionHeading";
import { buildCompareUrl } from "@/lib/playerCompare";
import type { PlayerRivalrySummary } from "@/types/historyProfiles";

export function PlayerRivalries({ playerId, data, loading, error }: { playerId: string; data: PlayerRivalrySummary[] | null; loading: boolean; error: string }) {
  return <section className="panel p-5 sm:p-8"><SectionHeading eyebrow="Direkte Duelle · All-Time" title="Rivalries" />
    {loading && <p className="text-sm text-white/35">Rivalries werden geladen …</p>}
    {error && <p className="text-sm text-amber-100/55">{error}</p>}
    {!loading && !error && (data?.length ?? 0) === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-white/40">Noch kein abgeschlossenes Rivalitäts-Event.</p>}
    {(data?.length ?? 0) > 0 && <div className="grid gap-2 sm:grid-cols-2">{data!.map((rivalry) => <Link key={rivalry.rivalPlayerId} to={buildCompareUrl(playerId, rivalry.rivalPlayerId)} aria-label={`${rivalry.rivalName} im Player Compare vergleichen`} className="flex min-w-0 items-center gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.025] p-3 transition hover:border-red-300/25 hover:bg-red-400/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50">
      <ProfileAvatar id={rivalry.rivalPlayerId} name={rivalry.rivalName} url={rivalry.rivalAvatarUrl} className="size-11 shrink-0" />
      <div className="min-w-0 flex-1"><p className="truncate font-display text-lg font-black uppercase">{rivalry.rivalName}</p><p className="text-xs text-white/45">{rivalry.rivalryEvents} Rivalitäts-{rivalry.rivalryEvents === 1 ? "Event" : "Events"} · {rivalry.directTakeovers} direkte Wechsel</p></div><Flame className="size-4 shrink-0 text-red-300/65" />
    </Link>)}</div>}
  </section>;
}
