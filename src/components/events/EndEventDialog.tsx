import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventModal } from "@/components/events/EventModal";

export function EndEventDialog({
  open,
  pending,
  onClose,
  onReview,
  onConfirm,
}: {
  open: boolean;
  pending: number;
  onClose: () => void;
  onReview: () => void;
  onConfirm: () => void;
}) {
  return (
    <EventModal open={open} title="Event beenden" onClose={onClose}>
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5">
        <AlertTriangle className="size-6 text-amber-300" />
        <p className="mt-4 font-bold">
          {pending > 0
            ? `Es sind noch ${pending} Zeiten nicht freigegeben.`
            : "Alle eingereichten Zeiten wurden geprüft."}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/45">
          Offene Zeiten bleiben auch nach dem Ende prüfbar und zählen erst nach ihrer Freigabe global.
        </p>
      </div>
      <div className="mt-5 grid gap-2">
        {pending > 0 && (
          <Button variant="outline" onClick={onReview}>Zur Freigabe</Button>
        )}
        <Button onClick={onConfirm}>
          <CheckCircle2 className="size-4" /> Event trotzdem beenden
        </Button>
        <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
      </div>
    </EventModal>
  );
}
