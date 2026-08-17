import { ArrowLeft } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EndEventDialog } from "@/components/events/EndEventDialog";
import { AttemptHistory } from "@/components/events/AttemptHistory";
import { LiveEventHeader } from "@/components/events/LiveEventHeader";
import { LiveEventContentOrder } from "@/components/events/LiveEventContentOrder";
import { LiveLeadProgression } from "@/components/events/LiveLeadProgression";
import { LiveLeaderboard } from "@/components/events/LiveLeaderboard";
import { LiveParticipantManager } from "@/components/events/LiveParticipantManager";
import { ParticipantCard } from "@/components/events/ParticipantCard";
import { StartEventPanel } from "@/components/events/StartEventPanel";
import { TimeEntrySheet } from "@/components/events/TimeEntrySheet";
import { Button } from "@/components/ui/button";
import { DataState } from "@/components/common/DataState";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { usePublicData } from "@/hooks/usePublicData";
import {
  getLiveStandings,
  isEventEligibleLiveAttempt,
  sortStandingsForEntry,
} from "@/lib/liveEventCalculations";
import {
  advanceLeaderboardPresentation,
  startLeaderboardScroll,
  isLeaderboardAnimationReady,
  type LeaderboardPresentationStage,
} from "@/lib/liveLeaderboardTransition";
import type {
  LiveStanding,
  StartLiveEventParticipant,
} from "@/types/liveEvent";
import type { EventLeadAttempt } from "@/lib/eventLeadProgression";

export function LiveEventPage() {
  const navigate = useNavigate();
  const { data, status } = usePublicData();
  const {
    activeEvent,
    state,
    endEvent,
    endingEvent,
    refresh,
    leaderboardTransition,
    leaderboardTransitionReady,
    completeLeaderboardTransition,
  } = useLiveEvent();
  const [selected, setSelected] = useState<LiveStanding | null>(null);
  const [saved, setSaved] = useState<{ id: string; result: "time" | "dns" } | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const reducedMotion = Boolean(useReducedMotion());
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const [leaderboardPresentation, setLeaderboardPresentation] = useState<{
    attemptId: string | null;
    stage: LeaderboardPresentationStage;
  }>({ attemptId: null, stage: "waiting" });
  const candidates = useMemo<StartLiveEventParticipant[]>(() => data.players.map((player) => ({
      id: player.id,
      name: player.name,
      kind: "permanent",
      source: "existing-player",
      initials: player.initials,
      avatarGradient: player.avatarGradient,
      avatarUrl: player.avatarUrl,
      personalBest: player.personalBest,
      isAk: player.isAk,
    })), [data.players]);

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(null), 1_800);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const transitionAttemptId = leaderboardTransition?.attempt.id ?? null;
  useEffect(() => {
    if (!transitionAttemptId) {
      setLeaderboardPresentation((current) => current.attemptId == null &&
        current.stage === "waiting" ? current : { attemptId: null, stage: "waiting" });
      return;
    }
    if (!leaderboardTransitionReady) return;
    setLeaderboardPresentation((current) => current.attemptId === transitionAttemptId
      ? current
      : {
          attemptId: transitionAttemptId,
          stage: advanceLeaderboardPresentation("waiting", "p10c-complete"),
        });
    return startLeaderboardScroll(leaderboardRef.current, reducedMotion, () => {
      setLeaderboardPresentation((current) => current.attemptId === transitionAttemptId
        ? { ...current, stage: advanceLeaderboardPresentation(current.stage, "scroll-complete") }
        : current);
    });
  }, [leaderboardTransitionReady, reducedMotion, transitionAttemptId]);

  const leaderboardAnimationReady = isLeaderboardAnimationReady({
    transitionReady: leaderboardTransitionReady,
    transitionAttemptId,
    presentationAttemptId: leaderboardPresentation.attemptId,
    stage: leaderboardPresentation.stage,
  });

  if (status !== "ready") return <DataState><div /></DataState>;

  if (!activeEvent) {
    const latest = state.events.find(({ status }) => status === "completed");
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost"><Link to="/"><ArrowLeft className="size-4" /> Übersicht</Link></Button>
        </div>
        <p className="text-center text-sm text-white/45">Aktuell läuft kein Event.</p>
        <StartEventPanel candidates={candidates} onStarted={() => navigate("/events/live")} />
        {latest && (
          <p className="text-center text-sm text-white/40">
            Aktuell läuft kein weiteres Event.{" "}
            <Link className="text-gold-300 hover:underline" to={`/events/${latest.id}/results`}>
              Letztes Ergebnis ansehen
            </Link>
          </p>
        )}
      </div>
    );
  }

  const attempts = state.attempts.filter(({ eventId }) => eventId === activeEvent.id);
  const standings = getLiveStandings(activeEvent, attempts, state.players);
  const displayedStandings = leaderboardTransition
    ? leaderboardAnimationReady
      ? leaderboardTransition.afterStandings
      : leaderboardTransition.beforeStandings
    : standings;
  const timelineAttempts = leaderboardTransition
    ? leaderboardAnimationReady
      ? [
          ...attempts.filter(({ id }) => id !== leaderboardTransition.attempt.id),
          leaderboardTransition.attempt,
        ]
      : attempts.filter(({ id }) => id !== leaderboardTransition.attempt.id)
    : attempts;
  const attemptNumbers = new Map<string, number>();
  const leadAttempts: EventLeadAttempt[] = [...timelineAttempts]
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt) || left.id.localeCompare(right.id))
    .map((attempt) => {
      const player = state.players.find(({ id }) => id === attempt.playerId);
      const attemptNumber = (attemptNumbers.get(attempt.playerId) ?? 0) + 1;
      attemptNumbers.set(attempt.playerId, attemptNumber);
      return {
        id: attempt.id,
        playerId: player?.kind === "permanent" ? attempt.playerId : null,
        guestId: player?.kind === "guest" ? attempt.playerId : null,
        name: player?.name ?? "Unbekannt",
        avatarUrl: player?.avatarUrl ?? null,
        timeHundredths: attempt.result === "time" && attempt.timeSeconds != null
          ? Math.round(attempt.timeSeconds * 100) : null,
        isDnf: attempt.result === "dns",
        isAk: !isEventEligibleLiveAttempt(attempt, player),
        submittedAt: attempt.submittedAt,
        attemptNumber,
      };
    });
  const entryStandings = sortStandingsForEntry(displayedStandings);
  const confirmEnd = async () => {
    const id = await endEvent();
    if (id) navigate(`/events/${id}/results`);
  };

  return (
    <div className="space-y-7 lg:space-y-10">
      <LiveEventHeader event={activeEvent} attempts={attempts.length} onEnd={() => setEndOpen(true)} />
      <LiveEventContentOrder
        leaderboard={<div ref={leaderboardRef} className="scroll-mt-28">
          <LiveLeaderboard
            standings={displayedStandings}
            transition={leaderboardAnimationReady ? leaderboardTransition : null}
            onTransitionComplete={() => {
              setLeaderboardPresentation((current) => ({
                ...current,
                stage: advanceLeaderboardPresentation(current.stage, "animation-complete"),
              }));
              completeLeaderboardTransition();
            }}
          />
        </div>}
        attemptEntry={<section>
          <h2 className="display-title mb-4 text-3xl sm:mb-5">Versuch hinzufügen</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {entryStandings.map((standing) => (
              <ParticipantCard
                key={standing.player.id}
                standing={standing}
                saved={saved?.id === standing.player.id}
                onAdd={() => setSelected(standing)}
              />
            ))}
          </div>
        </section>}
        leadStory={<LiveLeadProgression
          attempts={leadAttempts}
          highlightAttemptId={leaderboardAnimationReady && leaderboardTransition?.tookLead
            ? leaderboardTransition.attempt.id : undefined}
        />}
        participantManagement={<LiveParticipantManager />}
        attemptHistory={<AttemptHistory event={activeEvent} attempts={attempts} />}
      />
      <TimeEntrySheet standing={selected} onClose={() => setSelected(null)} onSaved={(id, result) => setSaved({ id, result })} />
      <EndEventDialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onConfirm={() => void confirmEnd()}
        busy={endingEvent}
      />
    </div>
  );
}
