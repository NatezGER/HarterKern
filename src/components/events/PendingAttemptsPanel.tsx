import { Check, Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { formatTime } from "@/utils/format";
import type { LiveAttempt, LiveEvent } from "@/types/liveEvent";

export function PendingAttemptsPanel({
  event,
  attempts,
}: {
  event: LiveEvent;
  attempts: LiveAttempt[];
}) {
  const { state, approveAttempt, rejectAttempt } = useLiveEvent();
  if (state.role !== "admin") return null;
  return (
    <section id="pending-attempts" className="panel p-5 sm:p-7">
      <h2 className="display-title flex items-center gap-2 text-2xl">
        <Clock3 className="size-5 text-amber-300" /> Offene Freigaben
      </h2>
      <p className="mt-1 text-xs text-white/35">{attempts.length} warten auf Prüfung</p>
      <div className="mt-5 space-y-3">
        {attempts.length === 0 && (
          <p className="py-8 text-center text-sm text-white/35">Keine offenen Eventversuche.</p>
        )}
        {attempts.map((attempt) => {
          const player = event.participants.find(({ id }) => id === attempt.playerId);
          if (!player) return null;
          return (
            <article key={attempt.id} className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:flex-row sm:items-center">
              <LiveAvatar player={player} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{player.name}{player.isAk ? " · AK" : ""}</p>
                <p className="text-sm text-amber-200">
                  {attempt.result === "dns" ? "DNS" : formatTime(attempt.timeSeconds ?? 0)}
                </p>
                <p className="mt-1 text-[10px] text-white/30">
                  {attempt.submittedBy} · {new Date(attempt.submittedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={() => approveAttempt(attempt.id)}>
                  <Check className="size-4" /> Freigeben
                </Button>
                <Button size="sm" variant="outline" onClick={() => rejectAttempt(attempt.id)}>
                  <X className="size-4" /> Ablehnen
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
