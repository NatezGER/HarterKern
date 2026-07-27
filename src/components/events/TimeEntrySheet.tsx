import { useEffect, useRef, useState } from "react";
import { Check, Flag, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventModal } from "@/components/events/EventModal";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { NumericTimePad } from "@/components/events/NumericTimePad";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { appendTimeKey } from "@/lib/numericTimeInput";
import { formatTime } from "@/utils/format";
import { parseTimeToHundredths } from "@/utils/time";
import type { LiveStanding } from "@/types/liveEvent";

export function TimeEntrySheet({
  standing,
  onClose,
  onSaved,
}: {
  standing: LiveStanding | null;
  onClose: () => void;
  onSaved: (playerId: string) => void;
}) {
  const { state, submitAttempt } = useLiveEvent();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const savingRef = useRef(false);
  const parsed = parseTimeToHundredths(value);

  useEffect(() => {
    if (!standing) return;
    setValue("");
    setMessage("");
    savingRef.current = false;
    const onKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key) || [",", ".", "Backspace"].includes(event.key)) {
        event.preventDefault();
        setValue((current) => appendTimeKey(
          current,
          event.key === "Backspace" ? "back" : event.key,
        ));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [standing]);

  if (!standing) return null;
  const save = (result: "time" | "dns") => {
    if (savingRef.current) return;
    savingRef.current = true;
    const seconds = result === "time" && parsed != null ? parsed / 100 : undefined;
    const saved = submitAttempt(standing.player.id, result, seconds);
    if (!saved) {
      savingRef.current = false;
      setMessage("Eingabe ungültig oder bereits gespeichert.");
      return;
    }
    onSaved(standing.player.id);
    onClose();
  };

  return (
    <EventModal open title="Neue Zeit" onClose={onClose}>
      <div className="mb-5 flex items-center gap-4 rounded-2xl bg-white/[0.035] p-4">
        <LiveAvatar player={standing.player} />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{standing.player.name}</p>
          <p className="text-xs text-white/40">
            PB {formatTime(standing.player.personalBest)} · Event {formatTime(standing.bestTime ?? 0)}
          </p>
        </div>
      </div>
      <div
        className="mb-4 grid min-h-20 place-items-center rounded-2xl border border-gold-400/20 bg-gold-400/[0.06]"
        aria-live="polite"
      >
        <span className="font-display text-4xl font-black text-gold-300">
          {value || "0,00"} <small className="text-lg">s</small>
        </span>
      </div>
      <NumericTimePad value={value} onChange={setValue} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button
          size="lg"
          disabled={parsed == null}
          onClick={() => save("time")}
          className="h-14"
        >
          <Check className="size-5" /> Zeit speichern
        </Button>
        <Button size="lg" variant="outline" onClick={() => save("dns")} className="h-14">
          <Flag className="size-5" /> DNS
        </Button>
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-white/40">
        <Timer className="size-3.5" />
        {state.role === "admin"
          ? "Admin-Eingaben werden sofort bestätigt."
          : "Wird vorläufig gespeichert und wartet auf Freigabe."}
      </p>
      <p aria-live="assertive" className="mt-2 text-center text-sm text-red-300">{message}</p>
    </EventModal>
  );
}
