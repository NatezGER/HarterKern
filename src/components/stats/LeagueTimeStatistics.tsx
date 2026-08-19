import { Crosshair, Gauge, Target, TimerReset } from "lucide-react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import type { LeagueTimeStatistics as LeagueTimeStatisticsData } from "@/types";
import { formatDate, formatTime } from "@/utils/format";

const time = (value: number | null) => value == null ? "—" : formatTime(value / 100);

export function LeagueTimeStatistics({ data }: { data: LeagueTimeStatisticsData }) {
  const cards = [
    { label: "Häufigste Zeit", value: time(data.mostCommonTimeHundredths), detail: `${data.mostCommonTimeHits} Treffer · ${data.mostCommonTimeParticipants} Teilnehmer`, icon: Target },
    { label: "Glatte Zeiten", value: String(data.smoothTimeCount), detail: `Häufigste: ${time(data.mostCommonSmoothHundredths)} (${data.mostCommonSmoothHits}×)`, icon: Crosshair },
    { label: "Top bei glatten Zeiten", value: data.topSmoothPlayerName ?? "—", detail: `${data.topSmoothPlayerHits} Treffer`, icon: Gauge },
    { label: "Letzte glatte Zeit", value: time(data.latestSmoothHundredths), detail: data.latestSmoothDate ? `${data.latestSmoothPlayerName ?? "Unbekannt"} · ${formatDate(data.latestSmoothDate)}` : "Noch kein Treffer", icon: TimerReset },
  ];
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon }, index) => <article key={label} className="panel p-5"><div className="flex items-center justify-between"><Icon className="size-5 text-gold-400" />{index === 2 && data.topSmoothPlayerName && <ProfileAvatar id={data.topSmoothPlayerId ?? data.topSmoothPlayerName} name={data.topSmoothPlayerName} url={data.topSmoothPlayerAvatarUrl} className="size-8" />}</div><p className="mt-6 text-[9px] font-black uppercase tracking-[0.18em] text-white/30">{label}</p><p className="mt-1 break-words font-display text-2xl font-black">{value}</p><p className="mt-2 text-xs text-white/35">{detail}</p></article>)}
      </div>
    </div>
  );
}
