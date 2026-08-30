import { Edit3, Medal, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { AttemptEditDialog } from "@/components/management/AttemptEditDialog";
import { Button } from "@/components/ui/button";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { useManagementMode } from "@/hooks/useManagementMode";
import { getAttemptMilestones } from "@/lib/liveEventCalculations";
import { formatTime } from "@/utils/format";
import type { LiveAttempt, LiveEvent } from "@/types/liveEvent";

export function AttemptHistory({
  event,
  attempts,
}: {
  event: LiveEvent;
  attempts: LiveAttempt[];
}) {
  const { state } = useLiveEvent();
  const { unlocked } = useManagementMode();
  const [editing, setEditing] = useState<LiveAttempt | null>(null);
  const milestones = useMemo(
    () => getAttemptMilestones(state.players, state.attempts),
    [state.attempts, state.players],
  );
  const ordered = [...attempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-white/[0.07] px-5 py-5 sm:px-7">
        <h2 className="display-title text-2xl">Alle Versuche</h2>
        <p className="mt-1 text-xs text-white/35">{event.name || "Spieleabend"} · chronologisch</p>
      </div>
      {ordered.length === 0 && <p className="py-12 text-center text-sm text-white/35">Noch keine Versuche.</p>}
      {ordered.map((attempt) => {
        const player = state.players.find(({ id }) => id === attempt.playerId);
        const milestone = milestones.get(attempt.id);
        if (!player) return null;
        return (
          <article key={attempt.id} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-white/[0.06] px-4 py-4 last:border-0 sm:grid-cols-[1fr_7rem_8rem_auto] sm:px-7">
            {player.kind === "permanent" ? <Link to={`/player/${player.id}`} className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
              <LiveAvatar player={player} className="size-10" />
              <div className="min-w-0">
                <p className="truncate font-bold">{player.name}</p>
                <p className="text-[10px] text-white/35">
                  {new Date(attempt.submittedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </Link> : (
              <div className="flex min-w-0 items-center gap-3">
                <LiveAvatar player={player} className="size-10" />
                <div className="min-w-0">
                  <p className="truncate font-bold">{player.name}</p>
                  <p className="text-[10px] text-gold-300">
                    {new Date(attempt.submittedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · Gast
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {milestone?.isPersonalBest && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300"><Medal className="size-3" /> PB</span>}
              {milestone?.isWorldRecord && <span className="flex items-center gap-1 text-[10px] font-bold text-gold-300"><Trophy className="size-3" /> WR</span>}
            </div>
            <p className="text-right font-display text-xl font-black">{attempt.result === "dns" ? "DNF" : formatTime(attempt.timeSeconds ?? 0)}</p>
            {unlocked && (
              <Button className="hidden lg:inline-flex" size="sm" variant="outline" onClick={() => setEditing(attempt)}>
                <Edit3 className="size-4" /> Bearbeiten
              </Button>
            )}
          </article>
        );
      })}
      <AttemptEditDialog attempt={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
