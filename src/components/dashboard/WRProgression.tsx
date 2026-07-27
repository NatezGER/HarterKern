import { worldRecordHistory } from "@/data/mockData";
import { getPlayerById } from "@/data/selectors";
import { formatDate, formatTime } from "@/utils/format";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { SectionHeading } from "@/components/common/SectionHeading";

export function WRProgression() {
  return (
    <section>
      <SectionHeading eyebrow="Rekordgeschichte" title="WR Progression" />
      <AnimatedCard className="overflow-hidden p-6 sm:p-8" hover={false}>
        <div className="relative">
          <div className="absolute bottom-2 left-[5px] top-2 w-px bg-gradient-to-b from-gold-400 via-gold-400/30 to-transparent" />
          <div className="space-y-7">
            {worldRecordHistory.map((record, index) => {
              const player = getPlayerById(record.playerId);
              if (!player) return null;
              return (
                <div key={record.id} className="relative grid grid-cols-[1rem_1fr_auto] items-center gap-4">
                  <span className={`relative z-10 size-3 rounded-full border-2 ${index === 0 ? "border-gold-300 bg-gold-400 shadow-gold-sm" : "border-white/25 bg-[#111312]"}`} />
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    <p className="mt-1 text-xs text-white/35">{formatDate(record.date)} · {record.location}</p>
                  </div>
                  <p className={`font-display text-2xl font-black ${index === 0 ? "text-gold-300" : "text-white/60"}`}>{formatTime(record.time)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </AnimatedCard>
    </section>
  );
}
