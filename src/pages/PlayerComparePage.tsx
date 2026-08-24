import { AlertTriangle, LoaderCircle, Swords } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CompareMetricRow } from "@/components/compare/CompareMetricRow";
import { ComparePlayerHeader } from "@/components/compare/ComparePlayerHeader";
import { StickyCompareIdentity } from "@/components/compare/StickyCompareIdentity";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { SectionHeading } from "@/components/common/SectionHeading";
import { getRosterPlayers } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { usePlayerCompare } from "@/hooks/usePlayerCompare";
import { useSeason } from "@/hooks/useSeason";
import { DRINK_MILLILITERS_PER_VALID_ATTEMPT } from "@/constants/game";
import { formatDrinkVolume } from "@/lib/media";
import { dnfPercentage } from "@/lib/officialTimePerformance";
import {
  getComparePlayerOptions,
  replaceComparePlayer,
  type CompareDirection,
} from "@/lib/playerCompare";
import type { PlayerProfileCore, PlayerSeasonProfile } from "@/types/historyProfiles";
import { formatTime } from "@/utils/format";

type ActiveStatistics = PlayerProfileCore | PlayerSeasonProfile | null;

interface Metric {
  label: string;
  direction: CompareDirection;
  left: { raw: number | null; display: string };
  right: { raw: number | null; display: string };
}

export function PlayerComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  const headerRef = useRef<HTMLElement>(null);
  const [showStickyIdentity, setShowStickyIdentity] = useState(false);
  const players = getComparePlayerOptions(getRosterPlayers(data.players));
  const rawPlayerAId = searchParams.get("playerA");
  const rawPlayerBId = searchParams.get("playerB");
  const playerA = players.find(({ id }) => id === rawPlayerAId) ?? null;
  const playerB = rawPlayerBId !== rawPlayerAId
    ? players.find(({ id }) => id === rawPlayerBId) ?? null
    : null;
  const { core, speed } = usePlayerCompare(playerA?.id ?? null, playerB?.id ?? null);
  const detailA = core.data?.playerA ?? null;
  const detailB = core.data?.playerB ?? null;
  const hasInvalidSelection = Boolean(
    (rawPlayerAId && !playerA) ||
    (rawPlayerBId && !playerB) ||
    (rawPlayerAId && rawPlayerAId === rawPlayerBId),
  );

  useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyIdentity(!entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const replacePlayer = (side: "a" | "b", playerId: string) => {
    const otherId = side === "a" ? playerB?.id : playerA?.id;
    setSearchParams(replaceComparePlayer(searchParams, side, playerId, otherId ?? null));
  };

  const mainMetrics = createMainMetrics(
    detailA?.statistics ?? null,
    detailB?.statistics ?? null,
    isAllTime,
  );
  const speedMetrics = [5, 4, 3].map((seconds) => {
    const left = speed.data?.playerA?.thresholds.find((item) => item.seconds === seconds);
    const right = speed.data?.playerB?.thresholds.find((item) => item.seconds === seconds);
    return {
      label: `Unter ${seconds} s`,
      direction: "higher" as const,
      left: percentMetric(left?.total ? left.percent : null),
      right: percentMetric(right?.total ? right.percent : null),
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="context-accent-text text-xs font-black uppercase tracking-[0.22em]">Player vs Player</p>
          <h1 className="display-title mt-2 text-3xl sm:text-5xl">Spielervergleich</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">Zwei Karrieren, eine klare Gegenüberstellung.</p>
        </div>
        <SeasonContextBadge />
      </div>

      <section ref={headerRef} className="panel relative overflow-hidden p-4 sm:p-8">
        <div className="context-hero-glow absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full blur-[90px]" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] sm:gap-5">
          <ComparePlayerHeader
            side="A"
            player={playerA}
            detail={detailA}
            players={players}
            excludedPlayerId={playerB?.id ?? null}
            onChange={(playerId) => replacePlayer("a", playerId)}
            seasonLabel={isAllTime ? "Welt" : "Saison"}
          />
          <span className="context-accent-text text-center font-display text-sm font-black tracking-wider sm:text-xl">VS</span>
          <ComparePlayerHeader
            side="B"
            player={playerB}
            detail={detailB}
            players={players}
            excludedPlayerId={playerA?.id ?? null}
            onChange={(playerId) => replacePlayer("b", playerId)}
            seasonLabel={isAllTime ? "Welt" : "Saison"}
          />
        </div>
      </section>

      <StickyCompareIdentity playerA={playerA} playerB={playerB} visible={showStickyIdentity} />

      {hasInvalidSelection && (
        <div className="panel flex items-start gap-3 border-amber-300/15 p-4 text-sm text-amber-100/80">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Mindestens eine Auswahl ist ungültig oder doppelt. Wähle zwei verschiedene reguläre Spieler.
        </div>
      )}

      {!playerA && !playerB && (
        <div className="panel grid min-h-40 place-items-center p-6 text-center">
          <div><Swords className="context-accent-text mx-auto size-6" /><p className="mt-3 font-display text-xl font-black uppercase">Zwei Spieler auswählen</p><p className="mt-1 text-sm text-white/40">Der Vergleich erscheint direkt nach deiner Auswahl.</p></div>
        </div>
      )}
      {(playerA || playerB) && (!playerA || !playerB) && !hasInvalidSelection && (
        <div className="panel p-5 text-center text-sm text-white/45">Wähle jetzt den zweiten Spieler für den direkten Vergleich.</div>
      )}

      {(playerA || playerB) && core.loading && (
        <div className="panel grid min-h-40 place-items-center"><LoaderCircle className="context-accent-text size-6 animate-spin" aria-label="Vergleich wird geladen" /></div>
      )}
      {core.error && <div className="panel p-5 text-center text-red-200">{core.error}</div>}

      {!core.loading && !core.error && (playerA || playerB) && (
        <section className="panel overflow-hidden">
          <div className="p-5 pb-3 sm:p-7 sm:pb-4"><SectionHeading eyebrow={isAllTime ? "All-Time" : `Saison ${season}`} title="Hauptstatistiken" /></div>
          <div>{mainMetrics.map((metric) => <CompareMetricRow key={metric.label} {...metric} />)}</div>
        </section>
      )}

      {!core.loading && !core.error && playerA && playerB && (
        <section className="panel overflow-hidden">
          <div className="p-5 pb-3 sm:p-7 sm:pb-4"><SectionHeading eyebrow="Tempoverteilung" title="Speed" /></div>
          {speed.loading ? (
            <div className="grid min-h-28 place-items-center"><LoaderCircle className="context-accent-text size-5 animate-spin" aria-label="Speed-Werte werden geladen" /></div>
          ) : speed.error ? (
            <div className="border-t border-white/[0.06] p-5 text-center text-sm text-amber-100/70">{speed.error}</div>
          ) : (
            <div>{speedMetrics.map((metric) => <CompareMetricRow key={metric.label} {...metric} />)}</div>
          )}
        </section>
      )}
    </div>
  );
}

function createMainMetrics(
  left: ActiveStatistics,
  right: ActiveStatistics,
  isAllTime: boolean,
): Metric[] {
  const seasonHasLeftTime = isAllTime || left?.personalBestHundredths != null;
  const seasonHasRightTime = isAllTime || right?.personalBestHundredths != null;
  return [
    metric("Rang", left?.rank ?? null, right?.rank ?? null, "lower", integerMetric),
    metric(isAllTime ? "Personal Best" : "Saison-PB", left?.personalBestHundredths ?? null, right?.personalBestHundredths ?? null, "lower", timeMetric),
    metric(isAllTime ? "Durchschnitt" : "Saison-Durchschnitt", left?.averageHundredths ?? null, right?.averageHundredths ?? null, "lower", timeMetric),
    metric("Getrunken", seasonHasLeftTime ? left?.validAttempts ?? null : null, seasonHasRightTime ? right?.validAttempts ?? null : null, "higher", drinkMetric),
    metric("Eventteilnahmen", left?.eventParticipations ?? null, right?.eventParticipations ?? null, "higher", integerMetric),
    metric("Siege", left?.wins ?? null, right?.wins ?? null, "higher", integerMetric),
    metric("Podiumsplätze", podiums(left), podiums(right), "higher", integerMetric),
    metric("DNF-Quote", dnfRate(left), dnfRate(right), "lower", percentMetric),
  ];
}

function metric(
  label: string,
  left: number | null,
  right: number | null,
  direction: CompareDirection,
  format: (value: number | null) => { raw: number | null; display: string },
): Metric {
  return { label, direction, left: format(left), right: format(right) };
}

function integerMetric(value: number | null) {
  return { raw: value, display: value == null ? "—" : value.toLocaleString("de-DE") };
}

function timeMetric(value: number | null) {
  return { raw: value, display: value == null ? "—" : formatTime(value / 100) };
}

function drinkMetric(value: number | null) {
  return {
    raw: value,
    display: value == null ? "—" : formatDrinkVolume(value, DRINK_MILLILITERS_PER_VALID_ATTEMPT),
  };
}

function percentMetric(value: number | null) {
  return {
    raw: value,
    display: value == null ? "—" : `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`,
  };
}

function podiums(stats: ActiveStatistics) {
  return stats == null ? null : stats.wins + stats.secondPlaces + stats.thirdPlaces;
}

function dnfRate(stats: ActiveStatistics) {
  if (!stats || stats.validAttempts + stats.dnfCount === 0) return null;
  return dnfPercentage(stats.validAttempts, stats.dnfCount);
}
