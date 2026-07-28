import { CalendarPlus, LoaderCircle, Plus, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { getAvatarGradient, getInitials } from "@/utils/avatar";
import type {
  StartLiveEventParticipant,
} from "@/types/liveEvent";

export function StartEventPanel({
  candidates,
  onStarted,
}: {
  candidates: StartLiveEventParticipant[];
  onStarted: () => void;
}) {
  const { startEvent, startingEvent } = useLiveEvent();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<string[]>([]);
  const [temporary, setTemporary] = useState<StartLiveEventParticipant[]>([]);
  const [temporaryName, setTemporaryName] = useState("");
  const [temporaryKind, setTemporaryKind] = useState<"permanent" | "guest">("permanent");
  const [error, setError] = useState("");
  const allCandidates = useMemo(() => [...candidates, ...temporary], [candidates, temporary]);

  const addTemporary = () => {
    const trimmed = temporaryName.trim();
    if (!trimmed) return setError("Bitte gib einen Namen ein.");
    const normalized = trimmed.toLocaleLowerCase("de-DE");
    if (allCandidates.some(({ name: candidateName }) =>
      candidateName.trim().toLocaleLowerCase("de-DE") === normalized)) {
      return setError("Dieser Name ist bereits vorhanden.");
    }
    const id = `temporary-${crypto.randomUUID()}`;
    const player: StartLiveEventParticipant = temporaryKind === "permanent" ? {
      id,
      name: trimmed,
      kind: "permanent",
      source: "new-player",
      initials: getInitials(trimmed),
      avatarGradient: getAvatarGradient(id),
      avatarUrl: null,
      personalBest: 0,
      isAk: false,
    } : {
      id,
      name: trimmed,
      kind: "guest",
      source: "new-guest",
      initials: getInitials(trimmed),
      avatarGradient: getAvatarGradient(id),
      avatarUrl: null,
      personalBest: 0,
      isAk: false,
    };
    setTemporary((current) => [...current, player]);
    setSelected((current) => [...current, id]);
    setTemporaryName("");
    setTemporaryKind("permanent");
    setError("");
  };

  const submit = async () => {
    if (startingEvent) return;
    const participants = allCandidates.filter(({ id }) => selected.includes(id));
    if (!participants.length) {
      setError("Wähle mindestens einen Teilnehmer.");
      return;
    }
    setError("");
    const result = await startEvent({ name, date, participants });
    if (!result.eventId) {
      setError(result.error ?? "Event konnte nicht gestartet werden.");
      return;
    }
    onStarted();
  };

  return (
    <section className="panel mx-auto max-w-3xl p-5 sm:p-8">
      <Radio className="size-7 text-red-400" />
      <h1 className="display-title mt-5 text-4xl">Live-Event starten</h1>
      <p className="mt-2 text-sm text-white/40">Ein Event läuft exakt 24 Stunden. Parallelstarts sind gesperrt.</p>
      <>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-white/45">
              Eventname
              <Input className="mt-2 rounded-xl" value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" />
            </label>
            <label className="text-xs font-semibold text-white/45">
              Datum
              <Input className="mt-2 rounded-xl" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>
          <fieldset className="mt-7">
            <legend className="text-xs font-bold uppercase tracking-[0.16em] text-gold-300">Teilnehmer</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allCandidates.map((player) => (
                <label key={player.id} className={`flex min-h-24 cursor-pointer items-center gap-4 rounded-2xl border p-4 text-sm transition ${selected.includes(player.id) ? "border-gold-400/45 bg-gold-400/[0.09]" : "border-white/10 bg-white/[0.025] hover:border-white/20"}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected.includes(player.id)}
                    onChange={() => setSelected((current) =>
                      current.includes(player.id)
                        ? current.filter((id) => id !== player.id)
                        : [...current, player.id],
                    )}
                  />
                  <span className={`grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${player.avatarGradient} font-display font-black text-black`}>
                    {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="size-full rounded-full object-cover" /> : player.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold">{player.name}</span>
                  {player.kind === "guest" && <span className="text-[10px] text-gold-300">Gast</span>}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-6 rounded-2xl bg-white/[0.025] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Neuer Teilnehmer</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input className="rounded-xl" value={temporaryName} onChange={(event) => setTemporaryName(event.target.value)} placeholder="Name" />
              <select
                value={temporaryKind}
                onChange={(event) => setTemporaryKind(event.target.value as "permanent" | "guest")}
                className="h-11 rounded-xl border border-white/10 bg-black/30 px-4 text-xs"
                aria-label="Spielertyp"
              >
                <option value="permanent">Permanenter Spieler</option>
                <option value="guest">Gast für dieses Event</option>
              </select>
              <Button variant="outline" onClick={addTemporary}><Plus className="size-4" /> Hinzufügen</Button>
            </div>
          </div>
          <Button
            size="lg"
            className="mt-7 h-14 w-full"
            disabled={startingEvent}
            onClick={() => void submit()}
          >
            {startingEvent
              ? <LoaderCircle className="size-5 animate-spin" />
              : <CalendarPlus className="size-5" />}
            {startingEvent ? "Event wird gestartet …" : "Event starten"}
          </Button>
          <p aria-live="assertive" className="mt-3 text-center text-sm text-red-300">{error}</p>
      </>
    </section>
  );
}
