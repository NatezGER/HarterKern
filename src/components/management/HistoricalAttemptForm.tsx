import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseTimeToHundredths } from "@/utils/time";
import type {
  HistoricalAttempt,
  HistoricalAttemptInput,
  LiveParticipant,
} from "@/types/liveEvent";

export function HistoricalAttemptForm({
  players,
  initial,
  onSave,
  onCancel,
}: {
  players: LiveParticipant[];
  initial?: HistoricalAttempt;
  onSave: (input: HistoricalAttemptInput) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const permanent = players.filter(({ kind }) => kind === "permanent");
  const [guest, setGuest] = useState(initial?.isGuest ?? false);
  const [playerId, setPlayerId] = useState(initial?.playerId ?? permanent[0]?.id ?? "");
  const [guestName, setGuestName] = useState(initial?.isGuest ? initial.displayName : "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(
    initial?.timeSeconds.toLocaleString("de-DE", { minimumFractionDigits: 2 }) ?? "",
  );
  const [label, setLabel] = useState(initial?.historicalLabel ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!playerId && permanent[0]) setPlayerId(permanent[0].id);
  }, [permanent, playerId]);

  const save = async () => {
    const parsed = parseTimeToHundredths(time);
    if (parsed == null) return setMessage("Bitte gib eine gültige Zeit ein.");
    if (guest && !guestName.trim()) return setMessage("Bitte gib einen Gastnamen ein.");
    if (!guest && !playerId) return setMessage("Bitte wähle einen Spieler.");
    const saved = await onSave({
      playerId: guest ? null : playerId,
      guestName: guest ? guestName : undefined,
      date,
      timeSeconds: parsed / 100,
      historicalLabel: label,
    });
    setMessage(saved ? "Historischer Versuch gespeichert." : "Speichern fehlgeschlagen.");
    if (saved && !initial) {
      setTime("");
      setLabel("");
      setGuestName("");
    }
  };

  return (
    <section className="rounded-2xl border border-gold-400/15 bg-gold-400/[0.04] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="display-title text-2xl">
          {initial ? "Historischen Versuch bearbeiten" : "Historischen Versuch eintragen"}
        </h3>
        {onCancel && <Button variant="ghost" size="icon" onClick={onCancel}><X /></Button>}
      </div>
      <label className="mt-4 flex items-center gap-2 text-xs text-white/60">
        <input type="checkbox" checked={guest} onChange={(event) => setGuest(event.target.checked)} />
        Gast / außer Konkurrenz
      </label>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {guest ? (
          <Input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Gastname" />
        ) : (
          <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm">
            {permanent.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
        )}
        <Input value={time} onChange={(event) => setTime(event.target.value)} placeholder="Zeit, z. B. 2,41" />
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Historische Bezeichnung optional" />
      </div>
      <Button className="mt-4" onClick={() => void save()}><Save className="size-4" /> Speichern</Button>
      <p aria-live="polite" className="mt-3 text-sm text-white/45">{message}</p>
    </section>
  );
}
