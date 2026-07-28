import { useMemo } from "react";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { usePublicData } from "@/hooks/usePublicData";
import { getAttemptMilestones } from "@/lib/liveEventCalculations";
import type { Attempt, DailyWinner, Event, LeaderboardEntry, Player, WorldRecord } from "@/types";
import { formatTime } from "@/utils/format";

const addToStat = (value: string, amount: number) => {
  const parsed = Number(value.replace(/[^\d-]/g, ""));
  return String((Number.isFinite(parsed) ? parsed : 0) + amount);
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
    return { playerId: player.id, rank, previousRank: rank, recordDate: new Date().toISOString().slice(0, 10) };
  });
};

export function useEffectivePublicData() {
  const publicData = usePublicData();
  const { state } = useLiveEvent();
  const data = useMemo(() => {
    const playersById = new Map(publicData.data.players.map((player) => [player.id, player]));
    state.players.forEach((snapshot) => {
      const base = playersById.get(snapshot.id);
      playersById.set(snapshot.id, base ? {
        ...base,
        name: snapshot.name,
        initials: snapshot.initials,
        avatarGradient: snapshot.avatarGradient,
        avatarUrl: snapshot.avatarUrl,
        isAk: snapshot.isAk,
      } : {
        id: snapshot.id,
        name: snapshot.name,
        initials: snapshot.initials,
        avatarGradient: snapshot.avatarGradient,
        avatarUrl: snapshot.avatarUrl,
        personalBest: snapshot.personalBest,
        average: 0,
        attempts: 0,
        validAttempts: 0,
        dnfCount: 0,
        dailyWins: 0,
        trend: "same",
        isAk: snapshot.isAk,
        isArchived: false,
      });
    });
    const players = [...playersById.values()].map((player) => {
      const attempts = state.attempts.filter((attempt) =>
        attempt.playerId === player.id && !attempt.outOfCompetition,
      );
      const times = attempts.flatMap((attempt) =>
        attempt.result === "time" && attempt.timeSeconds != null ? [attempt.timeSeconds] : [],
      );
      const total = player.average * player.validAttempts + times.reduce((sum, time) => sum + time, 0);
      return {
        ...player,
        personalBest: times.length
          ? Math.min(player.personalBest > 0 ? player.personalBest : Infinity, ...times)
          : player.personalBest,
        average: times.length ? total / (player.validAttempts + times.length) : player.average,
        attempts: player.attempts + attempts.length,
        validAttempts: player.validAttempts + times.length,
        dnfCount: player.dnfCount + attempts.filter(({ result }) => result === "dns").length,
      };
    });
    const liveEvents: Event[] = state.events.map((event) => {
      const attempts = state.attempts.filter(({ eventId }) => eventId === event.id);
      const counted = attempts.filter((attempt) => !attempt.outOfCompetition);
      const times = counted.flatMap((attempt) =>
        attempt.result === "time" && attempt.timeSeconds != null ? [attempt.timeSeconds] : [],
      );
      const winner = playersById.get(event.winnerPlayerId ?? "");
      return {
        id: event.id,
        title: event.name || "Spieleabend",
        date: event.date,
        startedAt: event.startedAt,
        endsAt: event.endsAt,
        participantIds: event.participantIds,
        attempts: attempts.length,
        validAttempts: times.length,
        dnfCount: counted.filter(({ result }) => result === "dns").length,
        fastest: times.length ? Math.min(...times) : 0,
        average: times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
        winnerNames: winner ? [winner.name] : [],
        status: event.status === "active" ? "active" : "closed",
      };
    });
    const recentAttempts: Attempt[] = state.attempts.map((attempt) => ({
      id: attempt.id,
      playerId: attempt.playerId,
      eventId: attempt.eventId ?? `standalone-${attempt.id}`,
      timeHundredths: attempt.timeSeconds == null ? null : Math.round(attempt.timeSeconds * 100),
      isDnf: attempt.result === "dns",
      submittedAt: attempt.submittedAt,
    }));
    const milestones = getAttemptMilestones(state.players, state.attempts);
    const localRecords: WorldRecord[] = state.attempts.flatMap((attempt) =>
      milestones.get(attempt.id)?.isWorldRecord && attempt.timeSeconds != null
        ? [{
          id: attempt.id,
          playerId: attempt.playerId,
          time: attempt.timeSeconds,
          date: attempt.date,
          location: state.events.find(({ id }) => id === attempt.eventId)?.name || attempt.eventName || "Einzelzeit",
        }]
        : [],
    ).sort((a, b) => b.date.localeCompare(a.date));
    const localWinners: DailyWinner[] = state.events.flatMap((event) => {
      if (event.status !== "completed" || !event.winnerPlayerId) return [];
      const times = state.attempts.flatMap((attempt) =>
        attempt.eventId === event.id && attempt.playerId === event.winnerPlayerId &&
        !attempt.outOfCompetition && attempt.result === "time" && attempt.timeSeconds != null
          ? [attempt.timeSeconds]
          : [],
      );
      return times.length ? [{
        id: `local-${event.id}`,
        date: event.date,
        playerId: event.winnerPlayerId,
        time: Math.min(...times),
        attempts: state.attempts.filter(({ eventId }) => eventId === event.id).length,
      }] : [];
    });
    const counted = state.attempts.filter((attempt) => !attempt.outOfCompetition);
    const localBest = Math.min(...counted.flatMap((attempt) =>
      attempt.result === "time" && attempt.timeSeconds != null ? [attempt.timeSeconds] : [],
    ));
    const existingBest = Math.min(...publicData.data.players.flatMap((player) =>
      !player.isAk && !player.isArchived && player.personalBest > 0 ? [player.personalBest] : [],
    ));
    const effectiveBest = Math.min(localBest, existingBest);
    const statistics = publicData.data.statistics.map((statistic) => {
      if (statistic.id === "attempts") return { ...statistic, value: addToStat(statistic.value, counted.length) };
      if (statistic.id === "valid") return { ...statistic, value: addToStat(statistic.value, counted.filter(({ result }) => result === "time").length) };
      if (statistic.id === "dnf") return { ...statistic, value: addToStat(statistic.value, counted.filter(({ result }) => result === "dns").length) };
      if (statistic.id === "events") return { ...statistic, value: addToStat(statistic.value, state.events.length) };
      if (statistic.id === "fastest" && Number.isFinite(effectiveBest)) {
        return { ...statistic, value: formatTime(effectiveBest) };
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
