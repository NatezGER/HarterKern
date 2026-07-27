import { CheckCircle2, Clock3, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getClientIdentifier } from "@/hooks/useClientIdentifier";
import { usePublicData } from "@/hooks/usePublicData";
import { getErrorMessage } from "@/lib/errors";
import { submitPublicAttempt } from "@/services/attemptService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseTimeToHundredths } from "@/utils/time";

interface SubmitAttemptDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SubmitAttemptDialog({ open, onClose }: SubmitAttemptDialogProps) {
  const { data, status, refresh } = usePublicData();
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [time, setTime] = useState("");
  const [isDnf, setIsDnf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const similarNames = useMemo(() => {
    const normalized = playerName.trim().toLocaleLowerCase("de-DE");
    if (normalized.length < 2) return [];
    return data.players
      .filter((player) => player.name.toLocaleLowerCase("de-DE").includes(normalized))
      .slice(0, 3);
  }, [data.players, playerName]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const hundredths = isDnf ? null : parseTimeToHundredths(time);
    if (!isDnf && hundredths == null) {
      setError("Bitte gib eine gültige Zeit zwischen 0,01 und 300,00 Sekunden ein.");
      return;
    }
    if (playerId === "__new__" && !playerName.trim()) {
      setError("Bitte gib den Namen des neuen Spielers ein.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicAttempt({
        playerId: playerId && playerId !== "__new__" ? playerId : undefined,
        playerName: playerId === "__new__" ? playerName.trim() : undefined,
        timeHundredths: hundredths,
        isDnf,
        clientIdentifier: getClientIdentifier(),
      });
      setSubmitted(true);
      await refresh();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <div className="w-full max-w-lg rounded-t-[2rem] border border-white/10 bg-[#111312] p-6 shadow-2xl sm:rounded-[2rem] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-400">Öffentliche Einreichung</p>
            <h2 className="display-title mt-2 text-4xl">Zeit eintragen</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border border-white/10 text-white/50">
            <X className="size-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
            <h3 className="display-title mt-5 text-3xl">Einreichung erhalten</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/45">
              Der Versuch wartet auf die Freigabe durch den Admin und zählt erst danach.
            </p>
            <Button className="mt-7" onClick={onClose}>Fertig</Button>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/45">Spieler</span>
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger className="w-full rounded-xl"><SelectValue placeholder="Spieler auswählen" /></SelectTrigger>
                <SelectContent>
                  {data.players.map((player) => <SelectItem key={player.id} value={player.id}>{player.name}{player.isAk ? " (AK)" : ""}</SelectItem>)}
                  <SelectItem value="__new__">+ Neuen Spieler anlegen</SelectItem>
                </SelectContent>
              </Select>
            </label>

            {playerId === "__new__" && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/45">Neuer Spielername</span>
                <Input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Name" className="rounded-xl" />
                {similarNames.length > 0 && (
                  <p className="mt-2 text-xs text-amber-300/80">
                    Ähnliche Spieler vorhanden: {similarNames.map((player) => player.name).join(", ")}
                  </p>
                )}
              </label>
            )}

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/45">Zeit in Sekunden</span>
                <Input value={time} onChange={(event) => setTime(event.target.value)} placeholder="2,06 oder 2.06" disabled={isDnf} className="rounded-xl" />
              </label>
              <label className="flex min-w-24 cursor-pointer flex-col">
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/45">Ergebnis</span>
                <span className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 text-sm">
                  <input type="checkbox" checked={isDnf} onChange={(event) => setIsDnf(event.target.checked)} className="accent-gold-400" />
                  DNF
                </span>
              </label>
            </div>

            {error && <p className="rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-sm text-red-300">{error}</p>}
            <p className="flex gap-2 text-xs leading-relaxed text-white/35">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-gold-400" />
              Ohne aktives Event wird automatisch ein neues 30-Stunden-Event gestartet.
            </p>
            <Button type="submit" className="w-full" disabled={submitting || status !== "ready" || !playerId}>
              {submitting ? "Wird gesendet …" : "Zur Freigabe einreichen"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
