import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EventModal } from "@/components/events/EventModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { parseTimeToHundredths } from "@/utils/time";
import type { LiveAttempt } from "@/types/liveEvent";

export function AttemptEditDialog({
  attempt,
  onClose,
}: {
  attempt: LiveAttempt | null;
  onClose: () => void;
}) {
  const { state, updateAttempt, deleteAttempt } = useLiveEvent();
  const [playerId, setPlayerId] = useState("");
  const [result, setResult] = useState<"time" | "dns">("time");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!attempt) return;
    setPlayerId(attempt.playerId);
    setResult(attempt.result);
    setTime(attempt.timeSeconds?.toLocaleString("de-DE", { minimumFractionDigits: 2 }) ?? "");
    setDate(attempt.date);
    setEventName(attempt.eventName ?? "");
    setConfirmDelete(false);
    setError("");
  }, [attempt]);
  if (!attempt) return null;

  const save = async () => {
    const parsed = result === "time" ? parseTimeToHundredths(time) : null;
    if (result === "time" && parsed == null) {
      setError("Bitte gib eine gültige Zeit ein.");
      return;
    }
    const saved = await updateAttempt(attempt.id, {
      playerId,
      result,
      timeSeconds: parsed == null ? undefined : parsed / 100,
      date,
      eventName,
      outOfCompetition: false,
    });
    if (saved) onClose();
    else setError("Versuch konnte nicht gespeichert werden.");
  };

  return (
    <EventModal open title="Versuch bearbeiten" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/45">Spieler
          <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm">
            {state.players.filter((player) =>
              attempt.eventId
                ? state.events.find(({ id }) => id === attempt.eventId)?.participantIds.includes(player.id)
                : player.kind === "permanent"
            ).map((player) => <option key={player.id} value={player.id}>{player.name}{player.kind === "guest" ? " (Gast)" : ""}</option>)}
          </select>
        </label>
        <label className="text-xs text-white/45">Ergebnis
          <select value={result} onChange={(event) => setResult(event.target.value as "time" | "dns")} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm">
            <option value="time">Zeit</option><option value="dns">DNS</option>
          </select>
        </label>
        <label className="text-xs text-white/45">Zeit
          <Input className="mt-2 rounded-xl" value={time} disabled={result === "dns"} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label className="text-xs text-white/45">Datum
          <Input className="mt-2 rounded-xl" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="text-xs text-white/45 sm:col-span-2">Eventname
          <Input className="mt-2 rounded-xl" value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Optional" />
        </label>
      </div>
      <p aria-live="assertive" className="mt-3 text-sm text-red-300">{error}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => void save()}><Save className="size-4" /> Speichern</Button>
        <Button variant="outline" onClick={() => {
          if (!confirmDelete) return setConfirmDelete(true);
          void deleteAttempt(attempt.id).then((deleted) => {
            if (deleted) onClose();
            else setError("Versuch konnte nicht gelöscht werden.");
          });
        }}>
          <Trash2 className="size-4" /> {confirmDelete ? "Wirklich löschen" : "Löschen"}
        </Button>
      </div>
    </EventModal>
  );
}
