import { CalendarPlus, LoaderCircle, Plus, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { getAvatarGradient, getInitials } from "@/utils/avatar";
import { cn } from "@/lib/cn";
import { MOBILE_CONTEXT_AVATAR_FRAME } from "@/constants/avatar";
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
  const [search, setSearch] = useState("");
  const [awardsTrophies, setAwardsTrophies] = useState(false);
  const allCandidates = useMemo(() => [...candidates, ...temporary], [candidates, temporary]);
  const visibleCandidates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("de-DE");
    return query
      ? allCandidates.filter(({ name: playerName }) =>
        playerName.toLocaleLowerCase("de-DE").includes(query))
      : allCandidates;
  }, [allCandidates, search]);

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
    const result = await startEvent({ name, date, participants, awardsTrophies });
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
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-gold-400/15 bg-gold-400/[0.04] p-4">
            <input
              type="checkbox"
              checked={awardsTrophies}
              onChange={(event) => setAwardsTrophies(event.target.checked)}
              className="mt-0.5 size-4 accent-amber-400"
            />
            <span>
              <span className="block text-sm font-bold text-white/85">Trophäen-Event</span>
              <span className="mt-1 block text-xs leading-5 text-white/40">
                Vergibt nach dem Abschluss Gold, Silber und Bronze an das Podium.
              </span>
            </span>
          </label>
          <fieldset className="mt-7">
            <legend className="text-xs font-bold uppercase tracking-[0.16em] text-gold-300">Teilnehmer</legend>
            <Input className="mt-3 rounded-xl" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Spieler suchen" aria-label="Spieler suchen" />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleCandidates.map((player) => (
                <label key={player.id} className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border p-3 text-center text-sm transition ${selected.includes(player.id) ? "border-gold-400/55 bg-gold-400/[0.12] ring-2 ring-gold-400/15" : "border-white/10 bg-white/[0.025] hover:border-white/20"}`}>
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
                  <span className={cn("grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-display font-black text-black ring-2", player.avatarGradient, MOBILE_CONTEXT_AVATAR_FRAME, selected.includes(player.id) ? "ring-gold-300" : "ring-white/10")}>
                    {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="size-full rounded-full object-cover" /> : player.initials}
                  </span>
                  <span className="w-full truncate font-bold">{player.name}</span>
                  {(player.kind === "guest" || player.isAk) && <span className="text-[10px] text-gold-300">{player.kind === "guest" ? "Gast" : "AK"}</span>}
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
