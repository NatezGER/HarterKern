import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { Attempt, Event, Player } from "@/types";
import { createAdminAttempt } from "@/services/attemptService";
import { getErrorMessage } from "@/lib/errors";
import { parseTimeToHundredths } from "@/utils/time";
import { AttemptEditor } from "@/components/admin/AttemptEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AttemptManagerProps {
  attempts: Attempt[];
  players: Player[];
  events: Event[];
  onChanged: () => Promise<void>;
}

export function AttemptManager({ attempts, players, events, onChanged }: AttemptManagerProps) {
  const activeEvent = events.find((event) => event.status === "active");
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [eventId, setEventId] = useState(activeEvent?.id ?? events[0]?.id ?? "");
  const [time, setTime] = useState("");
  const [isDnf, setIsDnf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const managedAttempts = useMemo(() => attempts.filter((attempt) => attempt.status !== "pending"), [attempts]);

  const addAttempt = async () => {
    const parsed = isDnf ? null : parseTimeToHundredths(time);
    if (!isDnf && parsed == null) {
      setError("Ungültige Zeit.");
      return;
    }
    try {
      setError(null);
      await createAdminAttempt({ playerId, eventId, timeHundredths: parsed, isDnf });
      setTime("");
      await onChanged();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  return (
    <section className="panel p-5 sm:p-7">
      <h3 className="display-title text-2xl">Versuche verwalten</h3>
      <div className="mt-5 rounded-2xl border border-gold-400/15 bg-gold-400/[0.04] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gold-300">Admin-Versuch hinzufügen</p>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_8rem_auto_auto]">
          <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#111312] px-3 text-sm">
            {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
          <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-[#111312] px-3 text-sm">
            {events.map((event) => <option key={event.id} value={event.id}>{event.date} · {event.title}</option>)}
          </select>
          <Input value={time} onChange={(event) => setTime(event.target.value)} disabled={isDnf} placeholder="2,06" className="h-10 rounded-xl" />
          <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs"><input type="checkbox" checked={isDnf} onChange={(event) => setIsDnf(event.target.checked)} /> DNF</label>
          <Button size="sm" disabled={!playerId || !eventId} onClick={() => void addAttempt()}><Plus className="size-3.5" /> Eintragen</Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </div>
      <div className="mt-5 space-y-2">
        {managedAttempts.length === 0 && <p className="py-10 text-center text-sm text-white/35">Keine bestätigten oder abgelehnten Versuche.</p>}
        {managedAttempts.map((attempt) => (
          <AttemptEditor key={attempt.id} attempt={attempt} players={players} events={events} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}
