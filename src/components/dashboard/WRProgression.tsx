import { AnimatedCard } from "@/components/common/AnimatedCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProgressionTimeline } from "@/components/progression/ProgressionTimeline";
import { getRankedPlayers } from "@/data/selectors";
import type { Player } from "@/types";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { EventModal } from "@/components/events/EventModal";
import { Button } from "@/components/ui/button";
import { useSeason } from "@/hooks/useSeason";
import { PlayerOverlaySelector } from "@/components/progression/PlayerOverlaySelector";
import { usePlayerProgressionOverlays } from "@/hooks/usePlayerProgressionOverlays";
import { regularPlayerOptions } from "@/services/playerProgressionOverlayService";

export function WRProgression({ compact = false, collapsibleHistory = false, roster }: { compact?: boolean; collapsibleHistory?: boolean; roster?: Pick<Player, "id" | "name" | "avatarUrl">[] }) {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const closeExpanded = useCallback(() => setExpanded(false), []);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const overlays = usePlayerProgressionOverlays(selectedPlayers, isAllTime ? undefined : Number(season));
  const playerOptions = regularPlayerOptions(roster ?? getRankedPlayers(data.players, data.leaderboard)
    .map(({ player }) => player));
  const playersWithoutData = !overlays.loading ? selectedPlayers.filter((id) =>
    !overlays.data.some((series) => series.id === id && series.points.length > 0)) : [];
  const points = data.worldRecordHistory.map((record) => {
    const player = (roster ?? data.players).find(({ id }) => id === record.playerId);
    return {
      id: record.id,
      playerId: record.playerId,
      playerName: player?.name ?? record.playerName ?? "Unbekannter Spieler",
      avatarUrl: player?.avatarUrl ?? record.playerAvatarUrl ?? null,
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
        <Button type="button" variant="outline" className="mb-4" onClick={() => setExpanded(true)}>Grafik vergrößern</Button>
        {expanded && createPortal(<EventModal open title={isAllTime ? "WR Progression" : "Saisonrekord-Progression"} onClose={closeExpanded} className="h-[92dvh] sm:max-w-[96vw]">
          <p className="mb-4 text-sm text-white/55">Horizontal verschieben und mit den Zeitraum-Tasten zoomen. Auch im Querformat nutzbar.</p>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Vergrößerte Rekordgrafik">
            <div className="min-w-[900px] [&_[data-progression-chart]>div]:h-[55dvh]">
              <ProgressionTimeline points={points} overlaySeries={overlays.data} primaryLabel={isAllTime ? "Weltrekord" : "Saisonrekord"} showHistory={false} />
            </div>
          </div>
        </EventModal>, document.body)}
        <PlayerOverlaySelector options={playerOptions} selectedIds={selectedPlayers} onChange={setSelectedPlayers} loading={overlays.loading} error={overlays.error} />
        {playersWithoutData.length > 0 && <p className="mb-4 text-xs text-white/40" role="status">Keine Verlaufsdaten für {playersWithoutData.map((id) => playerOptions.find((option) => option.id === id)?.name ?? id).join(", ")} in diesem Zeitraum.</p>}
        <ProgressionTimeline points={compact ? points.slice(0, 6) : points} overlaySeries={overlays.data} primaryLabel={isAllTime ? "Weltrekord" : "Saisonrekord"} primaryToggleable showHistory={!collapsibleHistory || historyExpanded} emptyLabel={isAllTime ? "Noch kein offizieller Weltrekord." : `Noch kein Saisonrekord ${season}.`} />
        {collapsibleHistory && points.length > 0 && <Button type="button" variant="outline" className="mt-5 w-full sm:w-auto" aria-expanded={historyExpanded} onClick={() => setHistoryExpanded((value) => !value)}>{historyExpanded ? (isAllTime ? "Weltrekorde einklappen" : "Saisonrekorde einklappen") : (isAllTime ? "Alle Weltrekorde anzeigen" : "Alle Saisonrekorde anzeigen")}</Button>}
      </AnimatedCard>
    </section>
  );
}
