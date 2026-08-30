import { AnimatedCard } from "@/components/common/AnimatedCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProgressionTimeline } from "@/components/progression/ProgressionTimeline";
import { getPlayerById, getRankedPlayers } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSeason } from "@/hooks/useSeason";
import { PlayerOverlaySelector } from "@/components/progression/PlayerOverlaySelector";
import { usePlayerProgressionOverlays } from "@/hooks/usePlayerProgressionOverlays";
import { regularPlayerOptions } from "@/services/playerProgressionOverlayService";

export function WRProgression({ compact = false, collapsibleHistory = false }: { compact?: boolean; collapsibleHistory?: boolean }) {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const overlays = usePlayerProgressionOverlays(selectedPlayers, isAllTime ? undefined : Number(season));
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
      <SectionHeading
        eyebrow={isAllTime ? "Rekordgeschichte" : `Saison ${season}`}
        title={isAllTime ? "WR Progression" : "Saisonrekord-Progression"}
      />
      <AnimatedCard className="overflow-hidden p-5 sm:p-8" hover={false}>
        <PlayerOverlaySelector options={regularPlayerOptions(getRankedPlayers(data.players, data.leaderboard).map(({ player }) => player))} selectedIds={selectedPlayers} onChange={setSelectedPlayers} loading={overlays.loading} error={overlays.error} />
        <ProgressionTimeline points={compact ? points.slice(0, 6) : points} overlaySeries={overlays.data} primaryLabel={isAllTime ? "Weltrekord" : "Saisonrekord"} primaryToggleable showHistory={!collapsibleHistory || historyExpanded} emptyLabel={isAllTime ? "Noch kein offizieller Weltrekord." : `Noch kein Saisonrekord ${season}.`} />
        {collapsibleHistory && points.length > 0 && <Button type="button" variant="outline" className="mt-5 w-full sm:w-auto" aria-expanded={historyExpanded} onClick={() => setHistoryExpanded((value) => !value)}>{historyExpanded ? (isAllTime ? "Weltrekorde einklappen" : "Saisonrekorde einklappen") : (isAllTime ? "Alle Weltrekorde anzeigen" : "Alle Saisonrekorde anzeigen")}</Button>}
      </AnimatedCard>
    </section>
  );
}
