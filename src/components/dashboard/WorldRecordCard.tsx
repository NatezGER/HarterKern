import { Crown, MapPin, Sparkles } from "lucide-react";
import { getPlayerById } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { formatDate, formatTime } from "@/utils/format";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { Avatar } from "@/components/common/Avatar";

export function WorldRecordCard() {
  const { data } = useEffectivePublicData();
  const record = data.worldRecordHistory[0];
  const player = record ? getPlayerById(data.players, record.playerId) : null;
  if (!record || !player) {
    return <AnimatedCard className="grid min-h-72 place-items-center p-8 text-center text-sm text-white/40" hover={false}>Noch kein offizieller Weltrekord.</AnimatedCard>;
  }

  return (
    <AnimatedCard className="relative overflow-hidden bg-gradient-to-br from-[#251e0c] via-[#15140f] to-[#0e100e] p-6 shadow-gold sm:p-8" hover={false}>
      <div className="absolute -right-16 -top-20 size-56 rounded-full bg-gold-400/15 blur-3xl" />
      <Sparkles className="absolute right-8 top-8 size-6 text-gold-400/30" />
      <div className="relative flex h-full min-h-72 flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-gold-400 text-black shadow-gold-sm">
              <Crown className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-300">Aktueller Weltrekord</p>
              <p className="mt-0.5 text-xs text-white/35">Unangefochtene Bestmarke</p>
            </div>
          </div>
          <span className="rounded-full border border-gold-400/20 px-3 py-1 text-[9px] font-bold tracking-widest text-gold-300">WR</span>
        </div>

        <div className="my-8">
          <p className="display-title gold-text text-7xl leading-none sm:text-8xl">{formatTime(record.time)}</p>
          <div className="mt-6 flex items-center gap-4">
            <Avatar player={player} size="md" />
            <div>
              <p className="font-display text-2xl font-black uppercase">{player.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                <MapPin className="size-3" /> {record.location}
              </p>
            </div>
          </div>
        </div>

        <p className="border-t border-gold-400/15 pt-4 text-xs font-semibold uppercase tracking-widest text-white/40">
          Aufgestellt am <span className="text-white/70">{formatDate(record.date)}</span>
        </p>
      </div>
    </AnimatedCard>
  );
}
