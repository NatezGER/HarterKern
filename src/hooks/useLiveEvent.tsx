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
} from "@/lib/liveEventCalculations";
import { parseLiveEventState } from "@/lib/liveEventPersistence";
import type {
  AttemptInput,
  AttemptUpdate,
  LiveAttempt,
  LiveEvent,
  LiveEventState,
  LiveParticipant,
  RecordCelebration,
  StartLiveEventInput,
} from "@/types/liveEvent";

const storageKey = "harter-kern-live-event-v1";
const readState = () => parseLiveEventState(
  localStorage.getItem(storageKey),
  createDemoLiveState,
);

interface LiveEventContextValue {
  state: LiveEventState;
  activeEvent?: LiveEvent;
  celebration: RecordCelebration | null;
  startEvent: (input: StartLiveEventInput) => string | null;
  addAttempt: (input: AttemptInput) => boolean;
  submitAttempt: (playerId: string, result: "time" | "dns", time?: number) => boolean;
  updateAttempt: (id: string, changes: AttemptUpdate) => void;
  deleteAttempt: (id: string) => void;
  updatePlayer: (id: string, changes: Partial<LiveParticipant>) => void;
  registerPlayer: (player: LiveParticipant) => void;
  updateEvent: (id: string, changes: Partial<LiveEvent>) => void;
  endEvent: () => string | null;
  dismissCelebration: () => void;
}

const LiveEventContext = createContext<LiveEventContextValue | null>(null);

const recalculateCompletedEvents = (
  events: LiveEvent[],
  attempts: LiveAttempt[],
  players: LiveParticipant[],
) => events.map((event) => {
  if (event.status !== "completed") return event;
  return finalizeLiveEvent(
    { ...event, status: "active" },
    attempts,
    players,
    event.endReason ?? "manual",
    event.endedAt ?? event.endsAt,
  );
});

export function LiveEventProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveEventState>(readState);
  const [celebration, setCelebration] = useState<RecordCelebration | null>(null);
  const { data: publicData } = usePublicData();
  const activeEvent = getActiveLiveEvent(state.events);

  useEffect(() => {
    if (!publicData.players.length) return;
    setState((current) => {
      const known = new Set(current.players.map(({ id }) => id));
      const additions = publicData.players.filter(({ id }) => !known.has(id)).map((player) => ({
        id: player.id,
        name: player.name,
        initials: player.initials,
        avatarGradient: player.avatarGradient,
        avatarUrl: player.avatarUrl,
        personalBest: player.personalBest,
        isAk: player.isAk,
      }));
      return additions.length
        ? { ...current, players: [...current.players, ...additions] }
        : current;
    });
  }, [publicData.players]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const expireEvents = useCallback(() => {
    const now = new Date();
    setState((current) => {
      let changed = false;
      const events = current.events.map((event) => {
        if (event.status !== "active" || now.getTime() < new Date(event.endsAt).getTime()) {
          return event;
        }
        changed = true;
        return finalizeLiveEvent(
          event,
          current.attempts,
          current.players,
          "automatic",
          event.endsAt,
        );
      });
      return changed ? { ...current, events } : current;
    });
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

  const startEvent = useCallback((input: StartLiveEventInput) => {
    if (activeEvent || input.participants.length === 0) return null;
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
      createdBy: "Live-Modus",
    };
    setState((current) => {
      const players = new Map(current.players.map((player) => [player.id, player]));
      input.participants.forEach((player) => players.set(player.id, player));
      return { ...current, players: [...players.values()], events: [event, ...current.events] };
    });
    return id;
  }, [activeEvent]);

  const detectRecord = useCallback((attempt: LiveAttempt, current: LiveEventState) => {
    if (attempt.result !== "time" || attempt.timeSeconds == null || attempt.outOfCompetition) return;
    const player = current.players.find(({ id }) => id === attempt.playerId);
    if (!player) return;
    const previousAttempts = current.attempts.filter(({ id }) => id !== attempt.id);
    const previousWr = getOfficialWorldRecord(current.players, previousAttempts);
    const previousPb = Math.min(
      player.personalBest > 0 ? player.personalBest : Infinity,
      ...previousAttempts.flatMap((item) =>
        item.playerId === player.id && !item.outOfCompetition &&
        item.result === "time" && item.timeSeconds != null ? [item.timeSeconds] : [],
      ),
    );
    if (previousWr == null || attempt.timeSeconds < previousWr) {
      setCelebration({ kind: "wr", playerName: player.name, time: attempt.timeSeconds, previousTime: previousWr ?? undefined });
    } else if (attempt.timeSeconds < previousPb) {
      setCelebration({ kind: "pb", playerName: player.name, time: attempt.timeSeconds, previousTime: previousPb === Infinity ? undefined : previousPb });
    }
  }, []);

  const addAttempt = useCallback((input: AttemptInput) => {
    if (input.result === "time" && (input.timeSeconds == null || input.timeSeconds <= 0 || input.timeSeconds > 300)) return false;
    if (!state.players.some(({ id }) => id === input.playerId)) return false;
    const now = new Date().toISOString();
    const attempt = createLiveAttempt(input, crypto.randomUUID(), now);
    const duplicate = state.attempts.some((candidate) =>
      candidate.playerId === input.playerId && candidate.eventId === input.eventId &&
      candidate.result === input.result && candidate.timeSeconds === input.timeSeconds &&
      Date.now() - new Date(candidate.submittedAt).getTime() < 1_500,
    );
    if (duplicate) return false;
    const next = { ...state, attempts: [attempt, ...state.attempts] };
    setState(next);
    detectRecord(attempt, next);
    return true;
  }, [detectRecord, state]);

  const submitAttempt = useCallback((playerId: string, result: "time" | "dns", time?: number) => {
    if (!activeEvent || !activeEvent.participantIds.includes(playerId)) return false;
    const player = state.players.find(({ id }) => id === playerId);
    if (!player) return false;
    return addAttempt({
      playerId,
      eventId: activeEvent.id,
      result,
      timeSeconds: time,
      date: activeEvent.date,
      outOfCompetition: player.isAk,
    });
  }, [activeEvent, addAttempt, state.players]);

  const updateAttempt = useCallback((id: string, changes: AttemptUpdate) => {
    setState((current) => {
      const attempts = current.attempts.map((attempt) => {
        if (attempt.id !== id) return attempt;
        const result = changes.result ?? attempt.result;
        return {
          ...attempt,
          ...changes,
          result,
          timeSeconds: result === "dns" ? undefined : changes.timeSeconds ?? attempt.timeSeconds,
        };
      });
      return { ...current, attempts, events: recalculateCompletedEvents(current.events, attempts, current.players) };
    });
  }, []);

  const deleteAttempt = useCallback((id: string) => {
    setState((current) => {
      const attempts = current.attempts.filter((attempt) => attempt.id !== id);
      return { ...current, attempts, events: recalculateCompletedEvents(current.events, attempts, current.players) };
    });
  }, []);

  const updatePlayer = useCallback((id: string, changes: Partial<LiveParticipant>) => {
    setState((current) => {
      const players = current.players.map((player) =>
        player.id === id ? { ...player, ...changes, id } : player,
      );
      return {
        ...current,
        players,
        events: recalculateCompletedEvents(current.events, current.attempts, players),
      };
    });
  }, []);

  const registerPlayer = useCallback((player: LiveParticipant) => {
    setState((current) => current.players.some(({ id }) => id === player.id)
      ? current
      : { ...current, players: [...current.players, player] });
  }, []);

  const updateEvent = useCallback((id: string, changes: Partial<LiveEvent>) => {
    setState((current) => ({
      ...current,
      events: current.events.map((event) => event.id === id ? { ...event, ...changes, id } : event),
    }));
  }, []);

  const endEvent = useCallback(() => {
    if (!activeEvent) return null;
    setState((current) => ({
      ...current,
      events: current.events.map((event) => event.id === activeEvent.id
        ? finalizeLiveEvent(event, current.attempts, current.players, "manual", new Date().toISOString())
        : event),
    }));
    return activeEvent.id;
  }, [activeEvent]);

  const value = useMemo(() => ({
    state,
    activeEvent,
    celebration,
    startEvent,
    addAttempt,
    submitAttempt,
    updateAttempt,
    deleteAttempt,
    updatePlayer,
    registerPlayer,
    updateEvent,
    endEvent,
    dismissCelebration: () => setCelebration(null),
  }), [activeEvent, addAttempt, celebration, deleteAttempt, endEvent, registerPlayer, startEvent, state, submitAttempt, updateAttempt, updateEvent, updatePlayer]);

  return <LiveEventContext.Provider value={value}>{children}</LiveEventContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLiveEvent() {
  const context = useContext(LiveEventContext);
  if (!context) throw new Error("useLiveEvent muss innerhalb des LiveEventProvider verwendet werden.");
  return context;
}
