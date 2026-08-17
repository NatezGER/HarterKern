import { ArrowLeft, Crown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EndEventDialog } from "@/components/events/EndEventDialog";
import { AttemptHistory } from "@/components/events/AttemptHistory";
import { LiveEventHeader } from "@/components/events/LiveEventHeader";
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
  getOfficialWorldRecord,
  sortStandingsForEntry,
} from "@/lib/liveEventCalculations";
import { formatTime } from "@/utils/format";
import type {
  LiveStanding,
  StartLiveEventParticipant,
} from "@/types/liveEvent";

export function LiveEventPage() {
  const navigate = useNavigate();
  const { data, status } = usePublicData();
  const { activeEvent, state, endEvent, endingEvent, refresh } = useLiveEvent();
  const [selected, setSelected] = useState<LiveStanding | null>(null);
  const [saved, setSaved] = useState<{ id: string; result: "time" | "dns" } | null>(null);
  const [endOpen, setEndOpen] = useState(false);
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
  const entryStandings = sortStandingsForEntry(standings);
  const worldRecord = getOfficialWorldRecord(state.players, state.attempts);
  const confirmEnd = async () => {
    const id = await endEvent();
    if (id) navigate(`/events/${id}/results`);
  };

  return (
    <div className="space-y-7 lg:space-y-10">
      <LiveEventHeader event={activeEvent} attempts={attempts.length} onEnd={() => setEndOpen(true)} />
      <section className="panel flex items-center gap-4 border-gold-400/20 p-5 sm:p-6">
        <Crown className="size-7 text-gold-400" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300">Offizieller Weltrekord</p>
          <p className="font-display text-3xl font-black">{formatTime(worldRecord ?? 0)}</p>
        </div>
      </section>
      <LiveLeaderboard standings={standings} />
      <section>
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
      </section>
      <LiveParticipantManager />
      <AttemptHistory event={activeEvent} attempts={attempts} />
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
