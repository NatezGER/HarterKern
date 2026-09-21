import { AlertTriangle, LoaderCircle, Swords } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ComparePlayerHeader } from "@/components/compare/ComparePlayerHeader";
import {
  CompareAttemptNumbersSection,
  CompareProgressionSection,
} from "@/components/compare/DeepCompareSections";
import { StickyCompareIdentity } from "@/components/compare/StickyCompareIdentity";
import { HeadToHeadSection } from "@/components/compare/HeadToHeadSection";
import { CompareThemeBlocks } from "@/components/compare/CompareThemeBlocks";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { getRosterPlayers } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { usePlayerCompare } from "@/hooks/usePlayerCompare";
import { usePlayerDeepCompare } from "@/hooks/usePlayerDeepCompare";
import { usePlayerMostWantedStatistics } from "@/hooks/usePlayerMostWantedStatistics";
import { useSeason } from "@/hooks/useSeason";
import {
  getComparePlayerOptions,
  replaceComparePlayer,
} from "@/lib/playerCompare";
import type { PlayerProfileCore, PlayerSeasonProfile } from "@/types/historyProfiles";
import type { CompareBundleMetric, ComparePairContext, PlayerCompareMetricBundle } from "@/types/playerCompare";

type ActiveStatistics = PlayerProfileCore | PlayerSeasonProfile | null;

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
  const { core, headToHead, metricBundle } = usePlayerCompare(playerA?.id ?? null, playerB?.id ?? null);
  const deep = usePlayerDeepCompare(
    playerA && playerB ? playerA.id : null,
    playerA && playerB ? playerB.id : null,
  );
  const seasonYear = typeof season === "number" ? season : undefined;
  const mostWanted = usePlayerMostWantedStatistics([playerA?.id ?? null, playerB?.id ?? null], seasonYear);
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

  const integratedBundle = playerA && playerB ? integrateCompareBundle(
    metricBundle.data,
    playerA.id,
    playerB.id,
    detailA?.statistics ?? null,
    detailB?.statistics ?? null,
    deep.sequence.data,
    mostWanted.data,
    seasonYear,
  ) : null;

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

      {playerA && playerB && (
        <HeadToHeadSection
          playerAName={playerA.name}
          playerBName={playerB.name}
          data={headToHead.data}
          loading={headToHead.loading}
          error={headToHead.error}
          rivalry={{ data: deep.sequence.data?.rivalry ?? null, loading: deep.sequence.loading, error: deep.sequence.error }}
        />
      )}

      {playerA && playerB && <CompareProgressionSection playerA={playerA} playerB={playerB} state={deep.progression} />}

      {playerA && playerB && <CompareAttemptNumbersSection playerA={playerA} playerB={playerB} state={deep.sequence} />}

      {playerA && playerB && metricBundle.loading && <div className="panel grid min-h-28 place-items-center"><LoaderCircle className="context-accent-text size-5 animate-spin" aria-label="Hauptstatistiken werden geladen" /></div>}
      {playerA && playerB && metricBundle.error && <div className="panel p-5 text-center text-sm text-amber-100/70">{metricBundle.error} Bereits geladene Vergleichswerte bleiben sichtbar.</div>}
      {playerA && playerB && integratedBundle && <CompareThemeBlocks playerA={playerA} playerB={playerB} bundle={integratedBundle} />}
    </div>
  );
}

function podiums(stats: ActiveStatistics) {
  return stats == null ? null : stats.wins + stats.secondPlaces + stats.thirdPlaces;
}

function integrateCompareBundle(
  bundle: PlayerCompareMetricBundle | null,
  playerAId: string,
  playerBId: string,
  statsA: ActiveStatistics,
  statsB: ActiveStatistics,
  sequence: import("@/types/playerCompare").PlayerCompareSequencePair | null,
  mostWanted: Record<string, import("@/types/playerCompare").PlayerMostWantedStatistics> | null,
  seasonYear?: number,
): PlayerCompareMetricBundle {
  const basePair = bundle?.pair ?? emptyPairContext();
  const players = [
    { id: playerAId, stats: statsA, sequence: sequence?.playerA },
    { id: playerBId, stats: statsB, sequence: sequence?.playerB },
  ].map(({ id, stats, sequence: playerSequence }) => {
    const metrics = new Map(bundle?.players.find(({ playerId }) => playerId === id)?.metrics.map((metric) => [metric.key, metric]) ?? []);
    const add = (key: string, value: number | null | undefined, total = 1) => metrics.set(key, compareMetric(key, value, total));
    add("wins", stats?.wins);
    add("podiums", podiums(stats));
    add("no-dnf-streak", playerSequence?.longestNoDnfStreak);
    add("lead-time", stats?.eventLeadSeconds);
    add("most-wanted", mostWanted?.[id]?.allTimeHits);
    if (seasonYear != null) add("season-most-wanted", mostWanted?.[id]?.seasonFirstHits);
    return { playerId: id, metrics: [...metrics.values()] };
  });
  return { players, pair: basePair };
}

function compareMetric(key: string, value: number | null | undefined, total: number): CompareBundleMetric {
  return { key, value: value ?? null, count: null, total, detail: null, qualified: value != null };
}

function emptyPairContext(): ComparePairContext {
  return {
    commonEvents: 0, decidedEvents: 0, playerAWins: 0, playerBWins: 0,
    ties: 0, directTakeovers: 0, playerATakeovers: 0, playerBTakeovers: 0,
    rivalryEvents: 0, rivalrySpanDays: null, intensityPercent: null,
    balancePercent: null, playerANemesisLosses: 0, playerBNemesisLosses: 0,
    playerAFavoriteWins: 0, playerBFavoriteWins: 0,
  };
}
