import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createDemoLiveState } from "@/data/liveDemoData";
import { usePublicData } from "@/hooks/usePublicData";
import {
  createLiveAttempt,
  finalizeLiveEvent,
  getActiveLiveEvent,
  getOfficialWorldRecord,
  moderateLiveAttempt,
} from "@/lib/liveEventCalculations";
import { parseLiveEventState } from "@/lib/liveEventPersistence";
import type {
  LiveAttempt,
  LiveAttemptResult,
  LiveEvent,
  LiveEventState,
  LiveRole,
  RecordCelebration,
  StartLiveEventInput,
} from "@/types/liveEvent";

const storageKey = "harter-kern-live-event-v1";

const readState = (): LiveEventState => {
  return parseLiveEventState(localStorage.getItem(storageKey), createDemoLiveState);
};

interface LiveEventContextValue {
  state: LiveEventState;
  activeEvent?: LiveEvent;
  celebration: RecordCelebration | null;
  setRole: (role: LiveRole) => void;
  startEvent: (input: StartLiveEventInput) => string | null;
  submitAttempt: (playerId: string, result: LiveAttemptResult, time?: number) => boolean;
  approveAttempt: (attemptId: string) => void;
  rejectAttempt: (attemptId: string) => void;
  endEvent: () => string | null;
  dismissCelebration: () => void;
}

const LiveEventContext = createContext<LiveEventContextValue | null>(null);

export function LiveEventProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveEventState>(readState);
  const [celebration, setCelebration] = useState<RecordCelebration | null>(null);
  const { data: publicData } = usePublicData();
  const activeEvent = getActiveLiveEvent(state.events);
  const knownParticipants = useMemo(() => {
    const participants = new Map<string, LiveEvent["participants"][number]>();
    publicData.players.forEach((player) => participants.set(player.id, {
      id: player.id,
      name: player.name,
      initials: player.initials,
      avatarGradient: player.avatarGradient,
      avatarUrl: player.avatarUrl,
      personalBest: player.personalBest,
      isAk: player.isAk,
    }));
    state.events.flatMap(({ participants: eventPlayers }) => eventPlayers)
      .forEach((player) => participants.set(player.id, player));
    return [...participants.values()];
  }, [publicData.players, state.events]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const expireEvents = useCallback(() => {
    const now = new Date();
    setState((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.status === "active" && now.getTime() >= new Date(event.endsAt).getTime()
          ? finalizeLiveEvent(event, current.attempts, "automatic", event.endsAt)
          : event,
      ),
    }));
  }, []);

  useEffect(() => {
    expireEvents();
    const interval = window.setInterval(expireEvents, 30_000);
    const onVisibility = () => document.visibilityState === "visible" && expireEvents();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [expireEvents]);

  const setRole = useCallback((role: LiveRole) => {
    setState((current) => ({ ...current, role }));
  }, []);

  const startEvent = useCallback((input: StartLiveEventInput) => {
    if (state.role !== "admin" || activeEvent || input.participants.length === 0) return null;
    const startedAt = new Date();
    const id = crypto.randomUUID();
    const event: LiveEvent = {
      id,
      name: input.name?.trim() || undefined,
      date: input.date,
      startedAt: startedAt.toISOString(),
      endsAt: new Date(startedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      participantIds: input.participants.map(({ id: playerId }) => playerId),
      participants: input.participants,
      createdBy: "Demo-Admin",
    };
    setState((current) => ({ ...current, events: [event, ...current.events] }));
    return id;
  }, [activeEvent, state.role]);

  const showRecord = useCallback((attempt: LiveAttempt, event: LiveEvent, attempts: LiveAttempt[]) => {
    if (attempt.result !== "time" || attempt.timeSeconds == null || attempt.outOfCompetition) return;
    const player = event.participants.find(({ id }) => id === attempt.playerId);
    if (!player) return;
    const previousWorldRecord = getOfficialWorldRecord(
      knownParticipants,
      attempts.filter(({ id }) => id !== attempt.id),
    );
    if (previousWorldRecord == null || attempt.timeSeconds < previousWorldRecord) {
      setCelebration({
        kind: "wr",
        playerName: player.name,
        time: attempt.timeSeconds,
        previousTime: previousWorldRecord ?? undefined,
      });
    } else if (player.personalBest <= 0 || attempt.timeSeconds < player.personalBest) {
      setCelebration({ kind: "pb", playerName: player.name, time: attempt.timeSeconds });
    }
  }, [knownParticipants]);

  const submitAttempt = useCallback((
    playerId: string,
    result: LiveAttemptResult,
    time?: number,
  ) => {
    if (!activeEvent || !activeEvent.participantIds.includes(playerId)) return false;
    if (result === "time" && (time == null || time <= 0 || time > 300)) return false;
    const now = new Date().toISOString();
    const player = activeEvent.participants.find(({ id }) => id === playerId);
    if (!player) return false;
    const attempt = createLiveAttempt({
      id: crypto.randomUUID(),
      eventId: activeEvent.id,
      player,
      result,
      timeSeconds: time,
      role: state.role,
      now,
    });
    const duplicate = state.attempts.some((candidate) =>
      candidate.playerId === playerId &&
      candidate.eventId === activeEvent.id &&
      candidate.result === result &&
      candidate.timeSeconds === attempt.timeSeconds &&
      Date.now() - new Date(candidate.submittedAt).getTime() < 1_500,
    );
    if (duplicate) return false;
    setState((current) => ({ ...current, attempts: [attempt, ...current.attempts] }));
    if (attempt.status === "approved") showRecord(attempt, activeEvent, [attempt, ...state.attempts]);
    return true;
  }, [activeEvent, showRecord, state.attempts, state.role]);

  const moderateAttempt = useCallback((attemptId: string, status: "approved" | "rejected") => {
    if (state.role !== "admin") return;
    const attempt = state.attempts.find(({ id }) => id === attemptId);
    const event = state.events.find(({ id }) => id === attempt?.eventId);
    if (!attempt || attempt.status !== "pending" || !event) return;
    const now = new Date().toISOString();
    const updated = moderateLiveAttempt(attempt, status, now);
    setState((current) => {
      const attempts = current.attempts.map((item) => item.id === attemptId ? updated : item);
      return {
        ...current,
        attempts,
        events: current.events.map((currentEvent) =>
          currentEvent.id === event.id && currentEvent.status === "completed"
            ? {
              ...currentEvent,
              winnerPlayerId: finalizeLiveEvent(
                { ...currentEvent, status: "active" },
                attempts,
                currentEvent.endReason ?? "manual",
                currentEvent.endedAt ?? now,
              ).winnerPlayerId,
            }
            : currentEvent,
        ),
      };
    });
    if (status === "approved") showRecord(updated, event, state.attempts);
  }, [showRecord, state]);

  const endEvent = useCallback(() => {
    if (!activeEvent || state.role !== "admin") return null;
    setState((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === activeEvent.id
          ? finalizeLiveEvent(event, current.attempts, "manual", new Date().toISOString())
          : event,
      ),
    }));
    return activeEvent.id;
  }, [activeEvent, state.role]);

  const value = useMemo(() => ({
    state,
    activeEvent,
    celebration,
    setRole,
    startEvent,
    submitAttempt,
    approveAttempt: (id: string) => moderateAttempt(id, "approved"),
    rejectAttempt: (id: string) => moderateAttempt(id, "rejected"),
    endEvent,
    dismissCelebration: () => setCelebration(null),
  }), [activeEvent, celebration, endEvent, moderateAttempt, setRole, startEvent, state, submitAttempt]);

  return <LiveEventContext.Provider value={value}>{children}</LiveEventContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLiveEvent() {
  const context = useContext(LiveEventContext);
  if (!context) throw new Error("useLiveEvent muss innerhalb des LiveEventProvider verwendet werden.");
  return context;
}
