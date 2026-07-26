import { ArrowLeft, Target, Timer, Trophy, Zap } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { Avatar } from "@/components/common/Avatar";
import { SectionHeading } from "@/components/common/SectionHeading";
import { BadgeCollection } from "@/components/players/BadgeCollection";
import { FormChartPlaceholder } from "@/components/players/FormChartPlaceholder";
import { Button } from "@/components/ui/button";
import { getPlayerById, getRankedPlayers } from "@/data/selectors";
import { formatTime } from "@/utils/format";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function PlayerProfilePage() {
  const { id = "" } = useParams();
  const player = getPlayerById(id);
  if (!player) return <NotFoundPage />;
  const rank = getRankedPlayers().find((entry) => entry.playerId === player.id)?.rank ?? 0;
  const metrics = [
    { label: "Persönliche Bestzeit", value: formatTime(player.personalBest), icon: Zap },
    { label: "Durchschnitt", value: formatTime(player.average), icon: Timer },
    { label: "Versuche", value: String(player.attempts), icon: Target },
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
        <section>
          <SectionHeading eyebrow="Performance" title="Aktuelle Form" />
          <AnimatedCard className="p-5" hover={false}><FormChartPlaceholder player={player} /></AnimatedCard>
        </section>
        <section>
          <SectionHeading eyebrow="Erfolge" title="Badges" />
          <BadgeCollection player={player} />
        </section>
      </div>
    </div>
  );
}
