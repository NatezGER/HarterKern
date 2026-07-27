import { Check, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Attempt, Event, Player } from "@/types";
import {
  approveAttempt,
  deleteAttempt,
  rejectAttempt,
  updateAttempt,
} from "@/services/attemptService";
import { getErrorMessage } from "@/lib/errors";
import { parseTimeToHundredths } from "@/utils/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AttemptEditorProps {
  attempt: Attempt;
  players: Player[];
  events: Event[];
  approvalMode?: boolean;
  onChanged: () => Promise<void>;
}

export function AttemptEditor({ attempt, players, events, approvalMode = false, onChanged }: AttemptEditorProps) {
  const [playerId, setPlayerId] = useState(attempt.playerId);
  const [eventId, setEventId] = useState(attempt.eventId);
  const [isDnf, setIsDnf] = useState(attempt.isDnf);
  const [time, setTime] = useState(attempt.timeHundredths ? (attempt.timeHundredths / 100).toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    try {
      setError(null);
      await action();
      await onChanged();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const save = (approve: boolean) => {
    const parsedTime = isDnf ? null : parseTimeToHundredths(time);
    if (!isDnf && parsedTime == null) {
      setError("Ungültige Zeit.");
      return;
    }
    void run(() => updateAttempt(attempt.id, {
      player_id: playerId,
      event_id: eventId,
      is_dnf: isDnf,
      time_hundredths: parsedTime,
      status: approve ? "approved" : attempt.status,
    }));
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_8rem_auto]">
        <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#111312] px-3 text-sm">
          {players.map((player) => <option key={player.id} value={player.id}>{player.name}{player.isAk ? " (AK)" : ""}</option>)}
        </select>
        <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#111312] px-3 text-sm">
          {events.map((event) => <option key={event.id} value={event.id}>{event.date} · {event.title}</option>)}
        </select>
        <Input value={time} onChange={(event) => setTime(event.target.value)} disabled={isDnf} placeholder="2,06" className="h-10 rounded-xl" />
        <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs"><input type="checkbox" checked={isDnf} onChange={(event) => setIsDnf(event.target.checked)} /> DNF</label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {approvalMode ? (
          <>
            <Button size="sm" onClick={() => void run(() => approveAttempt(attempt.id))}><Check className="size-3.5" /> Annehmen</Button>
            <Button size="sm" variant="outline" onClick={() => save(true)}><Save className="size-3.5" /> Bearbeiten & annehmen</Button>
            <Button size="sm" variant="ghost" onClick={() => void run(() => rejectAttempt(attempt.id))}><X className="size-3.5" /> Ablehnen</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => save(false)}><Save className="size-3.5" /> Speichern</Button>
            <Button size="sm" variant="ghost" onClick={() => void run(() => deleteAttempt(attempt.id))}><Trash2 className="size-3.5" /> Löschen</Button>
          </>
        )}
        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-white/30">{attempt.status} · {attempt.source}</span>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
