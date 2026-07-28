import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { parseTimeToHundredths } from "@/utils/time";

export function StandaloneAttemptForm() {
  const { state, addAttempt } = useLiveEvent();
  const [playerId, setPlayerId] = useState(state.players[0]?.id ?? "");
  const [time, setTime] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventName, setEventName] = useState("");
  const [isAk, setIsAk] = useState(false);
  const [dns, setDns] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!playerId && state.players[0]) setPlayerId(state.players[0].id);
  }, [playerId, state.players]);

  const save = () => {
    const parsed = dns ? null : parseTimeToHundredths(time);
    if (!playerId) return setMessage("Bitte einen Spieler auswählen.");
    if (!dns && parsed == null) return setMessage("Ungültige Zeit.");
    const saved = addAttempt({
      playerId,
      result: dns ? "dns" : "time",
      timeSeconds: parsed == null ? undefined : parsed / 100,
      date,
      eventName,
      outOfCompetition: isAk,
    });
    setMessage(saved ? "Zeit offiziell gespeichert." : "Zeit konnte nicht gespeichert werden.");
    if (saved) setTime("");
  };
  return (
    <section className="rounded-2xl border border-gold-400/15 bg-gold-400/[0.04] p-5">
      <h3 className="display-title text-2xl">Einzelzeit eintragen</h3>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm">
          {state.players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
        </select>
        <Input className="rounded-xl" value={time} disabled={dns} onChange={(event) => setTime(event.target.value)} placeholder="Zeit, z. B. 2,41" />
        <Input className="rounded-xl" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input className="rounded-xl" value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Eventname optional" />
        <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs"><input type="checkbox" checked={dns} onChange={(event) => setDns(event.target.checked)} /> DNS</label>
        <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs"><input type="checkbox" checked={isAk} onChange={(event) => setIsAk(event.target.checked)} /> AK</label>
      </div>
      <Button className="mt-4" onClick={save}><Save className="size-4" /> Direkt speichern</Button>
      <p aria-live="polite" className="mt-3 text-sm text-white/45">{message}</p>
    </section>
  );
}
