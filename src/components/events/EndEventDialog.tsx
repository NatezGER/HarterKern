import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventModal } from "@/components/events/EventModal";

export function EndEventDialog({
  open,
  onClose,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <EventModal open={open} title="Event beenden" onClose={onClose}>
      <div className="rounded-2xl border border-gold-400/20 bg-gold-400/[0.06] p-5">
        <p className="font-bold">Event jetzt abschließen?</p>
        <p className="mt-2 text-sm leading-relaxed text-white/45">
          Die aktuelle Rangliste wird finalisiert und die Ergebnisansicht geöffnet.
        </p>
      </div>
      <div className="mt-5 grid gap-2">
        <Button disabled={busy} onClick={onConfirm}>
          <CheckCircle2 className="size-4" /> {busy ? "Event wird beendet …" : "Event beenden"}
        </Button>
        <Button disabled={busy} variant="ghost" onClick={onClose}>Abbrechen</Button>
      </div>
    </EventModal>
  );
}
