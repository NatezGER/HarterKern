import { useMemo } from "react";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { usePublicData } from "@/hooks/usePublicData";
import { isApproved } from "@/lib/liveEventCalculations";
import type { Attempt, DailyWinner, Event, LeaderboardEntry, Player, WorldRecord } from "@/types";
import { formatTime } from "@/utils/format";

const addToStat = (value: string, amount: number) => {
  const parsed = Number(value.replace(/[^\d-]/g, ""));
  return String((Number.isFinite(parsed) ? parsed : 0) + amount);
};

const updatePlayer = (
  player: Player,
  attempts: ReturnType<typeof useLiveEvent>["state"]["attempts"],
) => {
  const approved = attempts.filter(
    (attempt) => attempt.playerId === player.id && isApproved(attempt),
  );
  const times = approved.flatMap((attempt) =>
    attempt.result === "time" && attempt.timeSeconds != null ? [attempt.timeSeconds] : [],
  );
  if (approved.length === 0) return player;
  const total = player.average * player.validAttempts + times.reduce((sum, time) => sum + time, 0);
  return {
    ...player,
    personalBest: times.length
      ? Math.min(player.personalBest > 0 ? player.personalBest : Infinity, ...times)
      : player.personalBest,
    average: times.length ? total / (player.validAttempts + times.length) : player.average,
    attempts: player.attempts + approved.length,
    validAttempts: player.validAttempts + times.length,
    dnfCount: player.dnfCount + approved.filter(({ result }) => result === "dns").length,
  };
};

const rankPlayers = (players: Player[]): LeaderboardEntry[] => {
  const eligible = players
    .filter((player) => !player.isAk && !player.isArchived && player.personalBest > 0)
    .sort((a, b) => a.personalBest - b.personalBest || a.name.localeCompare(b.name, "de"));
  let rank = 0;
  let previous = -1;
  return eligible.map((player, index) => {
    if (player.personalBest !== previous) rank = index + 1;
    previous = player.personalBest;
    return {
      playerId: player.id,
      rank,
      previousRank: rank,
      recordDate: new Date().toISOString().slice(0, 10),
    };
  });
};

export function useEffectivePublicData() {
  const publicData = usePublicData();
  const { state } = useLiveEvent();
  const data = useMemo(() => {
    const approved = state.attempts.filter(isApproved);
    const players = publicData.data.players.map((player) => updatePlayer(player, approved));
    const liveEvents: Event[] = state.events.map((event) => {
      const attempts = approved.filter((attempt) => attempt.eventId === event.id);
      const times = attempts.flatMap((attempt) =>
        attempt.result === "time" && attempt.timeSeconds != null ? [attempt.timeSeconds] : [],
      );
      const winner = event.participants.find(({ id }) => id === event.winnerPlayerId);
      return {
        id: event.id,
        title: event.name || "Spieleabend",
        date: event.date,
        startedAt: event.startedAt,
        endsAt: event.endsAt,
        participantIds: event.participantIds,
        attempts: attempts.length,
        validAttempts: times.length,
        dnfCount: attempts.filter(({ result }) => result === "dns").length,
        fastest: times.length ? Math.min(...times) : 0,
        average: times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
        winnerNames: winner ? [winner.name] : [],
        status: event.status === "active" ? "active" : "closed",
      };
    });
    const recentAttempts: Attempt[] = approved.map((attempt) => ({
      id: attempt.id,
      playerId: attempt.playerId,
      eventId: attempt.eventId,
      status: "approved",
      timeHundredths: attempt.timeSeconds == null ? null : Math.round(attempt.timeSeconds * 100),
      isDnf: attempt.result === "dns",
      submittedAt: attempt.submittedAt,
      editedAt: null,
      approvedAt: attempt.approvedAt ?? attempt.submittedAt,
      rejectedAt: null,
      deletedAt: null,
      source: attempt.submittedByRole === "admin" ? "admin" : "public",
    }));
    const baseRecord = Math.min(
      ...publicData.data.players.flatMap((player) =>
        !player.isAk && player.personalBest > 0 ? [player.personalBest] : [],
      ),
    );
    const localRecordAttempt = approved
      .filter((attempt) =>
        attempt.result === "time" &&
        attempt.timeSeconds != null &&
        !attempt.outOfCompetition &&
        players.some(({ id }) => id === attempt.playerId),
      )
      .sort((a, b) => (a.timeSeconds ?? Infinity) - (b.timeSeconds ?? Infinity))[0];
    const localRecords: WorldRecord[] = localRecordAttempt?.timeSeconds != null &&
      localRecordAttempt.timeSeconds < baseRecord
      ? [{
        id: localRecordAttempt.id,
        playerId: localRecordAttempt.playerId,
        time: localRecordAttempt.timeSeconds,
        date: localRecordAttempt.submittedAt.slice(0, 10),
        location: state.events.find(({ id }) => id === localRecordAttempt.eventId)?.name || "Live-Event",
      }]
      : [];
    const localWinners: DailyWinner[] = state.events.flatMap((event) => {
      if (event.status !== "completed" || !event.winnerPlayerId) return [];
      const winnerTimes = approved.flatMap((attempt) =>
        attempt.eventId === event.id &&
        attempt.playerId === event.winnerPlayerId &&
        attempt.result === "time" &&
        attempt.timeSeconds != null
          ? [attempt.timeSeconds]
          : [],
      );
      return winnerTimes.length ? [{
        id: `local-${event.id}`,
        date: event.date,
        playerId: event.winnerPlayerId,
        time: Math.min(...winnerTimes),
        attempts: approved.filter(({ eventId }) => eventId === event.id).length,
      }] : [];
    });
    const localValid = approved.filter(({ result }) => result === "time").length;
    const localDns = approved.filter(({ result }) => result === "dns").length;
    const statistics = publicData.data.statistics.map((statistic) => {
      if (statistic.id === "attempts") return { ...statistic, value: addToStat(statistic.value, approved.length) };
      if (statistic.id === "valid") return { ...statistic, value: addToStat(statistic.value, localValid) };
      if (statistic.id === "dnf") return { ...statistic, value: addToStat(statistic.value, localDns) };
      if (statistic.id === "events") return { ...statistic, value: addToStat(statistic.value, state.events.length) };
      if (statistic.id === "fastest" && localRecordAttempt?.timeSeconds != null) {
        return { ...statistic, value: formatTime(Math.min(baseRecord, localRecordAttempt.timeSeconds)) };
      }
      return statistic;
    });
    return {
      ...publicData.data,
      players,
      leaderboard: rankPlayers(players),
      statistics,
      recentAttempts: [...recentAttempts, ...publicData.data.recentAttempts],
      worldRecordHistory: [...localRecords, ...publicData.data.worldRecordHistory],
      dailyWinners: [...localWinners, ...publicData.data.dailyWinners],
      events: [...liveEvents, ...publicData.data.events.filter(
        (event) => !liveEvents.some(({ id }) => id === event.id),
      )],
    };
  }, [publicData.data, state]);
  return { ...publicData, data };
}
