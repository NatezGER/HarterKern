import { AnimatedCard } from "@/components/common/AnimatedCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProgressionTimeline } from "@/components/progression/ProgressionTimeline";
import { getPlayerById } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";

export function WRProgression({ compact = false }: { compact?: boolean }) {
  const { data } = useEffectivePublicData();
  const points = data.worldRecordHistory.map((record) => {
    const player = getPlayerById(data.players, record.playerId);
    return {
      id: record.id,
      playerId: record.playerId,
      playerName: player?.name ?? "Unbekannter Spieler",
      avatarUrl: player?.avatarUrl ?? null,
      timeHundredths: Math.round(record.time * 100),
      achievedAt: record.achievedAt,
      achievedDate: record.date,
      eventId: record.eventId,
      sourceLabel: record.location,
      improvementHundredths: record.improvementHundredths,
      durationDays: record.durationDays,
      isCurrent: record.isCurrent,
      hasExactTime: record.sourceType === "attempt",
    };
  });
  return (
    <section>
      <SectionHeading eyebrow="Rekordgeschichte" title="WR Progression" />
      <AnimatedCard className="overflow-hidden p-5 sm:p-8" hover={false}>
        <ProgressionTimeline points={compact ? points.slice(0, 6) : points} emptyLabel="Noch kein offizieller Weltrekord." />
      </AnimatedCard>
    </section>
  );
}
