import { AnimatedCard } from "@/components/common/AnimatedCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProgressionTimeline } from "@/components/progression/ProgressionTimeline";
import { getPlayerById } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSeason } from "@/hooks/useSeason";

export function WRProgression({ compact = false, collapsibleHistory = false }: { compact?: boolean; collapsibleHistory?: boolean }) {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  const [historyExpanded, setHistoryExpanded] = useState(false);
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
      <SectionHeading eyebrow={isAllTime ? "Rekordgeschichte" : `Rekordgeschichte · Saison ${season}`} title="WR Progression" />
      <AnimatedCard className="overflow-hidden p-5 sm:p-8" hover={false}>
        <ProgressionTimeline points={compact ? points.slice(0, 6) : points} showHistory={!collapsibleHistory || historyExpanded} emptyLabel="Noch kein offizieller Weltrekord." />
        {collapsibleHistory && points.length > 0 && <Button type="button" variant="outline" className="mt-5 w-full sm:w-auto" aria-expanded={historyExpanded} onClick={() => setHistoryExpanded((value) => !value)}>{historyExpanded ? "Weltrekorde einklappen" : "Alle Weltrekorde anzeigen"}</Button>}
      </AnimatedCard>
    </section>
  );
}
