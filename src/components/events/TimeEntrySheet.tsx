import { useEffect, useRef, useState } from "react";
import { Check, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventModal } from "@/components/events/EventModal";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { NumericTimePad } from "@/components/events/NumericTimePad";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { appendTimeKey } from "@/lib/numericTimeInput";
import { claimAttemptSave } from "@/lib/attemptSaveGuard";
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
  onSaved: (playerId: string, result: "time" | "dns") => void;
}) {
  const { submitAttempt } = useLiveEvent();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingDnf, setConfirmingDnf] = useState(false);
  const savingRef = useRef(false);
  const parsed = parseTimeToHundredths(value);

  useEffect(() => {
    if (!standing) return;
    setValue("");
    setMessage("");
    setConfirmingDnf(false);
    savingRef.current = false;
    setSaving(false);
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
  const save = async (result: "time" | "dns") => {
    if (!claimAttemptSave(savingRef)) return;
    setSaving(true);
    const seconds = result === "time" && parsed != null ? parsed / 100 : undefined;
    const saved = await submitAttempt(standing.player.id, result, seconds);
    if (!saved) {
      savingRef.current = false;
      setSaving(false);
      if (result === "dns") setConfirmingDnf(false);
      setMessage("Eingabe ungültig oder bereits gespeichert.");
      return;
    }
    onSaved(standing.player.id, result);
    onClose();
  };

  return (
    <>
    <EventModal open title="Neue Zeit" onClose={onClose} className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-7">
      <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white/[0.035] p-3 sm:mb-5 sm:gap-4 sm:p-4">
        <LiveAvatar player={standing.player} />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{standing.player.name}</p>
          <p className="text-xs text-white/40">
            PB {formatTime(standing.player.personalBest)} · Event {formatTime(standing.bestTime ?? 0)}
          </p>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 sm:mb-4">
        <EntryMetric label="Event-Bestzeit" value={formatTime(standing.bestTime ?? 0)} />
        <EntryMetric label="Versuche" value={String(standing.attempts)} />
        <EntryMetric label="Event-Ø" value={formatTime(standing.averageTime ?? 0)} />
      </div>
      <div
        className="mb-3 grid min-h-16 place-items-center rounded-2xl border border-gold-400/20 bg-gold-400/[0.06] sm:mb-4 sm:min-h-20"
        aria-live="polite"
      >
        <span className="font-display text-3xl font-black text-gold-300 sm:text-4xl">
          {value || "0,00"} <small className="text-lg">s</small>
        </span>
      </div>
      <NumericTimePad value={value} onChange={setValue} />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
        <Button
          size="lg"
          disabled={parsed == null || saving}
          onClick={() => void save("time")}
          className="h-14"
        >
          <Check className="size-5" /> Zeit speichern
        </Button>
        <Button size="lg" variant="outline" disabled={saving} onClick={() => setConfirmingDnf(true)} className="h-14">
          <Flag className="size-5" /> DNF
        </Button>
      </div>
      {message && <p aria-live="assertive" className="mt-2 text-center text-sm text-red-300">{message}</p>}
    </EventModal>
    <DnfConfirmationDialog
      open={confirmingDnf}
      saving={saving}
      onCancel={() => setConfirmingDnf(false)}
      onConfirm={() => void save("dns")}
    />
    </>
  );
}

export function DnfConfirmationDialog({
  open,
  saving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <EventModal open={open} title="DNF eintragen" onClose={() => !saving && onCancel()}>
      <p className="text-sm text-white/65">Wirklich DNF eintragen?</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="ghost" disabled={saving} onClick={onCancel}>Abbrechen</Button>
        <Button disabled={saving} onClick={onConfirm}>
          <Flag className="size-4" /> {saving ? "Wird gespeichert …" : "DNF bestätigen"}
        </Button>
      </div>
    </EventModal>
  );
}

function EntryMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/[0.035] p-2 text-center"><p className="text-[8px] font-bold uppercase tracking-wider text-white/30">{label}</p><p className="mt-1 font-display text-sm font-black">{value}</p></div>;
}
