import { ArrowLeft, CircleX, Target, Timer, Trophy, Zap } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { Avatar } from "@/components/common/Avatar";
import { SectionHeading } from "@/components/common/SectionHeading";
import { DataState } from "@/components/common/DataState";
import { Button } from "@/components/ui/button";
import { getPlayerById, getRankedPlayers } from "@/data/selectors";
import { usePublicData } from "@/hooks/usePublicData";
import { hundredthsToSeconds } from "@/utils/time";
import { formatTime } from "@/utils/format";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function PlayerProfilePage() {
  const { id = "" } = useParams();
  const { data, status } = usePublicData();
  if (status !== "ready") return <DataState><div /></DataState>;
  const player = getPlayerById(data.players, id);
  if (!player) return <NotFoundPage />;
  const rank = getRankedPlayers(data.players, data.leaderboard).find((entry) => entry.playerId === player.id)?.rank ?? 0;
  const recentAttempts = data.recentAttempts.filter((attempt) => attempt.playerId === player.id).slice(0, 8);
  const metrics = [
    { label: "Persönliche Bestzeit", value: formatTime(player.personalBest), icon: Zap },
    { label: "Durchschnitt", value: formatTime(player.average), icon: Timer },
    { label: "Versuche", value: String(player.attempts), icon: Target },
    { label: "Gültige Zeiten", value: String(player.validAttempts), icon: Timer },
    { label: "DNF", value: String(player.dnfCount), icon: CircleX },
    { label: "Tagessiege", value: String(player.dailyWins), icon: Trophy },
  ];

  return (
    <div className="space-y-10">
      <Button asChild variant="ghost" size="sm"><Link to="/players"><ArrowLeft className="size-4" /> Zurück zu Spielern</Link></Button>
      <section className="panel relative overflow-hidden p-6 sm:p-10">
        <div className={`absolute -right-24 -top-36 size-96 rounded-full bg-gradient-to-br ${player.avatarGradient} opacity-10 blur-[100px]`} />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar player={player} size="xl" className="ring-gold-400/35" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-400">Weltrang #{rank}</p>
              <h1 className="display-title mt-2 text-6xl sm:text-7xl">{player.name}</h1>
              <p className="mt-2 text-sm text-white/40">Harter Kern · Aktiver Athlet</p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Personal Best</p>
            <p className="gold-text font-display text-6xl font-black">{formatTime(player.personalBest)}</p>
          </div>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }, index) => (
          <AnimatedCard key={label} delay={index * 0.06} className="p-5">
            <Icon className="size-5 text-gold-400" />
            <p className="mt-6 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p>
            <p className="mt-1 font-display text-3xl font-black">{value}</p>
          </AnimatedCard>
        ))}
      </div>
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="xl:col-span-2">
          <SectionHeading eyebrow="Bestätigte Ergebnisse" title="Letzte Versuche" />
          <AnimatedCard className="overflow-hidden" hover={false}>
            {recentAttempts.length === 0 && <p className="py-16 text-center text-sm text-white/35">Noch keine bestätigten Versuche.</p>}
            {recentAttempts.map((attempt) => (
              <div key={attempt.id} className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 last:border-0">
                <div>
                  <p className="font-display text-xl font-black">{attempt.isDnf ? "DNF" : formatTime(hundredthsToSeconds(attempt.timeHundredths))}</p>
                  <p className="mt-1 text-xs text-white/35">{new Intl.DateTimeFormat("de-DE").format(new Date(attempt.submittedAt))}</p>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-300">Bestätigt</span>
              </div>
            ))}
          </AnimatedCard>
        </section>
      </div>
    </div>
  );
}
