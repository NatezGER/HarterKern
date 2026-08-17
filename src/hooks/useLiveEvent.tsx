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
import { takeUnseenUnlocks } from "@/lib/badgeUnlocks";
import { createLiveAttempt, getActiveLiveEvent } from "@/lib/liveEventCalculations";
import {
  derivePostAttemptResult,
  recordCelebrationFor,
} from "@/lib/postAttemptExperience";
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
import { getAttemptBadgeUnlocks } from "@/services/historyProfileService";
import type {
  AttemptInput,
  AttemptUpdate,
  LiveEvent,
  LiveEventState,
  LiveParticipant,
  RecordCelebration,
  PostAttemptResult,
  BadgeUnlockCelebration,
  StartLiveEventInput,
  StartLiveEventResult,
} from "@/types/liveEvent";

interface LiveEventContextValue {
  state: LiveEventState;
  activeEvent?: LiveEvent;
  celebration: RecordCelebration | null;
  badgeUnlock: BadgeUnlockCelebration | null;
  postAttempt: PostAttemptResult | null;
  mutationError: string | null;
  startingEvent: boolean;
  endingEvent: boolean;
  startEvent: (input: StartLiveEventInput) => Promise<StartLiveEventResult>;
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
  dismissPostAttempt: () => void;
  dismissBadgeUnlock: () => void;
  clearMutationError: () => void;
}

const LiveEventContext = createContext<LiveEventContextValue | null>(null);

export function LiveEventProvider({ children }: { children: ReactNode }) {
  const { snapshot, refresh } = useDataPlatform();
  const state = snapshot.liveState;
  const activeEvent = getActiveLiveEvent(state.events);
  const [celebration, setCelebration] = useState<RecordCelebration | null>(null);
  const [postAttempt, setPostAttempt] = useState<PostAttemptResult | null>(null);
  const [badgeUnlocks, setBadgeUnlocks] = useState<BadgeUnlockCelebration[]>([]);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [startingEvent, setStartingEvent] = useState(false);
  const [endingEvent, setEndingEvent] = useState(false);
  const eventMutation = useRef<"starting" | "ending" | null>(null);
  const recentSubmissions = useRef(new Map<string, number>());
  const presentedBadgeAwards = useRef(new Set<string>());

  const fail = useCallback((error: unknown) => {
    setMutationError(getErrorMessage(error));
    return false;
  }, []);
  const refreshAfterMutation = useCallback(async () => {
    try {
      await refresh();
    } catch {
      await refresh();
    }
  }, [refresh]);

  const startEvent = useCallback(async (input: StartLiveEventInput) => {
    if (input.participants.length === 0) {
      const message = "Wähle mindestens einen Teilnehmer.";
      setMutationError(message);
      return { eventId: null, error: message };
    }
    if (eventMutation.current) {
      const message = eventMutation.current === "starting"
        ? "Der Eventstart wird bereits verarbeitet."
        : "Das vorherige Event wird noch abgeschlossen.";
      setMutationError(message);
      return { eventId: null, error: message };
    }
    eventMutation.current = "starting";
    setStartingEvent(true);
    try {
      setMutationError(null);
      const { eventId } = await startRemoteEvent(input);
      await refreshAfterMutation();
      return { eventId, error: null };
    } catch (error) {
      const message = getErrorMessage(error);
      setMutationError(message);
      return { eventId: null, error: message };
    } finally {
      eventMutation.current = null;
      setStartingEvent(false);
    }
  }, [refreshAfterMutation]);

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
      const attempt = createLiveAttempt(input, id, new Date().toISOString());
      const player = state.players.find(({ id: playerId }) => playerId === input.playerId);
      const event = input.eventId
        ? state.events.find(({ id: eventId }) => eventId === input.eventId)
        : undefined;
      if (player && event) {
        try {
          const result = derivePostAttemptResult({ before: state, event, player, attempt });
          setPostAttempt(result);
          setCelebration(recordCelebrationFor(result));
        } catch {
          // The attempt is already persisted. Presentation analysis must never
          // turn a successful save into a failed submission.
        }
      }
      if (player && input.participantKind !== "guest" && !input.outOfCompetition) {
        void getAttemptBadgeUnlocks(id, player.name).then((unlocks) => {
          const unseen = takeUnseenUnlocks(unlocks, presentedBadgeAwards.current);
          if (unseen.length) setBadgeUnlocks((current) => [...current, ...unseen]);
        }).catch(() => undefined);
      }
      void refreshAfterMutation().catch(() => undefined);
      return true;
    } catch (error) {
      recentSubmissions.current.delete(key);
      return fail(error);
    }
  }, [fail, refreshAfterMutation, state]);

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
      await updateRemoteEvent(
        id,
        changes.name ?? current.name ?? "",
        changes.date ?? current.date,
        changes.awardsTrophies ?? current.awardsTrophies ?? false,
      );
      await refreshAfterMutation();
      return true;
    } catch (error) {
      return fail(error);
    }
  }, [fail, refreshAfterMutation, state.events]);

  const endEvent = useCallback(async () => {
    if (!activeEvent) {
      setMutationError("Es läuft kein Event, das beendet werden kann.");
      return null;
    }
    if (eventMutation.current) {
      setMutationError("Eine Eventaktion wird bereits verarbeitet.");
      return null;
    }
    eventMutation.current = "ending";
    setEndingEvent(true);
    try {
      setMutationError(null);
      const id = await closeRemoteEvent(activeEvent.id, "manual");
      await refreshAfterMutation();
      return id;
    } catch (error) {
      fail(error);
      return null;
    } finally {
      eventMutation.current = null;
      setEndingEvent(false);
    }
  }, [activeEvent, fail, refreshAfterMutation]);

  const value = useMemo(() => ({
    state,
    activeEvent,
    celebration,
    postAttempt,
    badgeUnlock: badgeUnlocks[0] ?? null,
    mutationError,
    startingEvent,
    endingEvent,
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
    dismissPostAttempt: () => setPostAttempt(null),
    dismissBadgeUnlock: () => setBadgeUnlocks((current) => current.slice(1)),
    clearMutationError: () => setMutationError(null),
  }), [
    activeEvent,
    addExistingParticipant,
    addGuest,
    addAttempt,
    celebration,
    postAttempt,
    badgeUnlocks,
    deleteAttempt,
    endEvent,
    endingEvent,
    mutationError,
    refresh,
    createAndAddPlayer,
    registerPlayer,
    startEvent,
    startingEvent,
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
