import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useDataPlatform } from "@/hooks/useDataPlatform";
import { getErrorMessage } from "@/lib/errors";
import {
  createLiveAttempt,
  getActiveLiveEvent,
  getOfficialWorldRecord,
} from "@/lib/liveEventCalculations";
import {
  addEventGuest,
  addExistingEventPlayer,
  closeRemoteEvent,
  createEventPlayer,
  createRemoteAttempt,
  deleteRemoteAttempt,
  startRemoteEvent,
  updateRemoteAttempt,
  updateRemoteEvent,
  updateRemotePlayer,
  upsertCanonicalPlayer,
} from "@/services/dataPlatformRepository";
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

interface LiveEventContextValue {
  state: LiveEventState;
  activeEvent?: LiveEvent;
  celebration: RecordCelebration | null;
  mutationError: string | null;
  startEvent: (input: StartLiveEventInput) => Promise<string | null>;
  addAttempt: (input: AttemptInput) => Promise<boolean>;
  submitAttempt: (
    playerId: string,
    result: "time" | "dns",
    time?: number,
  ) => Promise<boolean>;
  updateAttempt: (id: string, changes: AttemptUpdate) => Promise<boolean>;
  deleteAttempt: (id: string) => Promise<boolean>;
  updatePlayer: (id: string, changes: Partial<LiveParticipant>) => Promise<boolean>;
  registerPlayer: (player: LiveParticipant) => Promise<string | null>;
  addExistingParticipant: (playerId: string) => Promise<boolean>;
  createAndAddPlayer: (name: string) => Promise<boolean>;
  addGuest: (name: string) => Promise<boolean>;
  updateEvent: (id: string, changes: Partial<LiveEvent>) => Promise<boolean>;
  endEvent: () => Promise<string | null>;
  refresh: () => Promise<void>;
  dismissCelebration: () => void;
  clearMutationError: () => void;
}

const LiveEventContext = createContext<LiveEventContextValue | null>(null);

export function LiveEventProvider({ children }: { children: ReactNode }) {
  const { snapshot, refresh } = useDataPlatform();
  const state = snapshot.liveState;
  const activeEvent = getActiveLiveEvent(state.events);
  const [celebration, setCelebration] = useState<RecordCelebration | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const recentSubmissions = useRef(new Map<string, number>());

  const fail = useCallback((error: unknown) => {
    setMutationError(getErrorMessage(error));
    return false;
  }, []);
  const refreshAfterMutation = useCallback(async () => {
    await refresh().catch(() => undefined);
  }, [refresh]);

  const detectRecord = useCallback((attempt: LiveAttempt) => {
    if (attempt.result !== "time" || attempt.timeSeconds == null || attempt.outOfCompetition) return;
    const player = state.players.find(({ id }) => id === attempt.playerId);
    if (!player) return;
    const previousWr = getOfficialWorldRecord(state.players, state.attempts);
    const previousPb = Math.min(
      player.personalBest > 0 ? player.personalBest : Infinity,
      ...state.attempts.flatMap((item) =>
        item.playerId === player.id && !item.outOfCompetition &&
        item.result === "time" && item.timeSeconds != null ? [item.timeSeconds] : [],
      ),
    );
    if (previousWr == null || attempt.timeSeconds < previousWr) {
      setCelebration({
        kind: "wr",
        playerName: player.name,
        time: attempt.timeSeconds,
        previousTime: previousWr ?? undefined,
      });
    } else if (attempt.timeSeconds < previousPb) {
      setCelebration({
        kind: "pb",
        playerName: player.name,
        time: attempt.timeSeconds,
        previousTime: previousPb === Infinity ? undefined : previousPb,
      });
    }
  }, [state.attempts, state.players]);

  const startEvent = useCallback(async (input: StartLiveEventInput) => {
    if (activeEvent || input.participants.length === 0) return null;
    try {
      setMutationError(null);
      const { eventId } = await startRemoteEvent(input);
      await refreshAfterMutation();
      return eventId;
    } catch (error) {
      fail(error);
      return null;
    }
  }, [activeEvent, fail, refreshAfterMutation]);

  const addAttempt = useCallback(async (input: AttemptInput) => {
    if (input.result === "time" &&
      (input.timeSeconds == null || input.timeSeconds <= 0 || input.timeSeconds > 300)) {
      return false;
    }
    if (!state.players.some(({ id }) => id === input.playerId)) return false;
    const key = [
      input.playerId,
      input.eventId ?? "standalone",
      input.result,
      input.timeSeconds ?? "dns",
    ].join(":");
    const previous = recentSubmissions.current.get(key) ?? 0;
    if (Date.now() - previous < 1_500) return false;
    recentSubmissions.current.set(key, Date.now());
    try {
      setMutationError(null);
      const id = await createRemoteAttempt(input);
      detectRecord(createLiveAttempt(input, id, new Date().toISOString()));
      await refreshAfterMutation();
      return true;
    } catch (error) {
      recentSubmissions.current.delete(key);
      return fail(error);
    }
  }, [detectRecord, fail, refreshAfterMutation, state.players]);

  const submitAttempt = useCallback(async (
    playerId: string,
    result: "time" | "dns",
    time?: number,
  ) => {
    if (!activeEvent || !activeEvent.participantIds.includes(playerId)) return false;
    const player = state.players.find(({ id }) => id === playerId);
    if (!player) return false;
    return addAttempt({
      playerId,
      participantKind: player.kind,
      eventId: activeEvent.id,
      result,
      timeSeconds: time,
      date: activeEvent.date,
      outOfCompetition: false,
    });
  }, [activeEvent, addAttempt, state.players]);

  const updateAttempt = useCallback(async (id: string, changes: AttemptUpdate) => {
    const current = state.attempts.find((attempt) => attempt.id === id);
    if (!current) return false;
    try {
      setMutationError(null);
      const participant = state.players.find(({ id: playerId }) =>
        playerId === (changes.playerId ?? current.playerId),
      );
      await updateRemoteAttempt(id, current, changes, participant);
      await refreshAfterMutation();
      return true;
    } catch (error) {
      return fail(error);
    }
  }, [fail, refreshAfterMutation, state.attempts, state.players]);

  const deleteAttempt = useCallback(async (id: string) => {
    try {
      setMutationError(null);
      await deleteRemoteAttempt(id);
      await refreshAfterMutation();
      return true;
    } catch (error) {
      return fail(error);
    }
  }, [fail, refreshAfterMutation]);

  const updatePlayer = useCallback(async (
    id: string,
    changes: Partial<LiveParticipant>,
  ) => {
    const current = state.players.find((player) => player.id === id);
    if (!current) return false;
    try {
      setMutationError(null);
      await updateRemotePlayer(id, { ...current, ...changes, id });
      await refreshAfterMutation();
      return true;
    } catch (error) {
      return fail(error);
    }
  }, [fail, refreshAfterMutation, state.players]);

  const registerPlayer = useCallback(async (player: LiveParticipant) => {
    try {
      setMutationError(null);
      const id = await upsertCanonicalPlayer(player);
      await refreshAfterMutation();
      return id;
    } catch (error) {
      fail(error);
      return null;
    }
  }, [fail, refreshAfterMutation]);

  const addExistingParticipant = useCallback(async (playerId: string) => {
    if (!activeEvent) return false;
    try {
      setMutationError(null);
      await addExistingEventPlayer(activeEvent.id, playerId);
      await refreshAfterMutation();
      return true;
    } catch (error) {
      return fail(error);
    }
  }, [activeEvent, fail, refreshAfterMutation]);

  const createAndAddPlayer = useCallback(async (name: string) => {
    if (!activeEvent) return false;
    try {
      setMutationError(null);
      await createEventPlayer(activeEvent.id, name.trim());
      await refreshAfterMutation();
      return true;
    } catch (error) {
      return fail(error);
    }
  }, [activeEvent, fail, refreshAfterMutation]);

  const addGuest = useCallback(async (name: string) => {
    if (!activeEvent) return false;
    try {
      setMutationError(null);
      await addEventGuest(activeEvent.id, name.trim());
      await refreshAfterMutation();
      return true;
    } catch (error) {
      return fail(error);
    }
  }, [activeEvent, fail, refreshAfterMutation]);

  const updateEvent = useCallback(async (id: string, changes: Partial<LiveEvent>) => {
    const current = state.events.find((event) => event.id === id);
    if (!current) return false;
    try {
      setMutationError(null);
      await updateRemoteEvent(id, changes.name ?? current.name ?? "", changes.date ?? current.date);
      await refreshAfterMutation();
      return true;
    } catch (error) {
      return fail(error);
    }
  }, [fail, refreshAfterMutation, state.events]);

  const endEvent = useCallback(async () => {
    if (!activeEvent) return null;
    try {
      setMutationError(null);
      const id = await closeRemoteEvent(activeEvent.id, "manual");
      await refreshAfterMutation();
      return id;
    } catch (error) {
      fail(error);
      return null;
    }
  }, [activeEvent, fail, refreshAfterMutation]);

  const value = useMemo(() => ({
    state,
    activeEvent,
    celebration,
    mutationError,
    startEvent,
    addAttempt,
    submitAttempt,
    updateAttempt,
    deleteAttempt,
    updatePlayer,
    registerPlayer,
    addExistingParticipant,
    createAndAddPlayer,
    addGuest,
    updateEvent,
    endEvent,
    refresh,
    dismissCelebration: () => setCelebration(null),
    clearMutationError: () => setMutationError(null),
  }), [
    activeEvent,
    addExistingParticipant,
    addGuest,
    addAttempt,
    celebration,
    deleteAttempt,
    endEvent,
    mutationError,
    refresh,
    createAndAddPlayer,
    registerPlayer,
    startEvent,
    state,
    submitAttempt,
    updateAttempt,
    updateEvent,
    updatePlayer,
  ]);
  return <LiveEventContext.Provider value={value}>{children}</LiveEventContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLiveEvent() {
  const context = useContext(LiveEventContext);
  if (!context) throw new Error("useLiveEvent muss innerhalb des LiveEventProvider verwendet werden.");
  return context;
}
