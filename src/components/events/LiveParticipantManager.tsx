import { UserPlus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveEvent } from "@/hooks/useLiveEvent";

const normalize = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");

export function LiveParticipantManager() {
  const {
    activeEvent,
    state,
    addExistingParticipant,
    createAndAddPlayer,
    addGuest,
    mutationError,
  } = useLiveEvent();
  const [existingId, setExistingId] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const available = useMemo(() => state.players.filter((player) =>
    player.kind === "permanent" && !activeEvent?.participantIds.includes(player.id),
  ), [activeEvent?.participantIds, state.players]);

  if (!activeEvent) return null;
  const eventNames = new Set(activeEvent.participantIds.flatMap((id) => {
    const participant = state.players.find((player) => player.id === id);
    return participant ? [normalize(participant.name)] : [];
  }));

  const addExisting = async () => {
    if (!existingId) return setMessage("Bitte wähle einen bestehenden Spieler.");
    setSaving(true);
    const saved = await addExistingParticipant(existingId);
    setSaving(false);
    setMessage(saved
      ? "Spieler ist sofort spielbereit."
      : mutationError ?? "Spieler konnte nicht hinzugefügt werden.");
    if (saved) setExistingId("");
  };

  const addNamed = async (kind: "permanent" | "guest") => {
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (!cleanName) return setMessage("Bitte gib einen Namen ein.");
    if (eventNames.has(normalize(cleanName))) {
      return setMessage("Dieser Teilnehmer ist bereits im Event.");
    }
    const profileExists = state.players.some((player) =>
      player.kind === "permanent" && normalize(player.name) === normalize(cleanName),
    );
    if (profileExists) {
      return setMessage(kind === "guest"
        ? "Für diesen Namen existiert bereits ein Spielerprofil."
        : "Dieses Profil existiert bereits. Füge es oben als bestehenden Spieler hinzu.");
    }
    setSaving(true);
    const saved = kind === "guest"
      ? await addGuest(cleanName)
      : await createAndAddPlayer(cleanName);
    setSaving(false);
    setMessage(saved
      ? kind === "guest"
        ? "Gast ist sofort spielbereit."
        : "Spieler wurde angelegt und hinzugefügt."
      : mutationError ?? "Teilnehmer konnte nicht hinzugefügt werden.");
    if (saved) setName("");
  };

  return (
    <section className="panel border-gold-400/15 p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <UsersRound className="size-6 text-gold-400" />
        <div>
          <h2 className="display-title text-2xl">Teilnehmer hinzufügen</h2>
          <p className="text-xs text-white/40">Ohne Unterbrechung des laufenden Events.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white/[0.025] p-4">
          <label className="text-xs font-semibold text-white/45">
            Bestehender Spieler
            <select
              value={existingId}
              onChange={(event) => setExistingId(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
            >
              <option value="">Spieler auswählen</option>
              {available.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
          </label>
          <Button
            size="lg"
            variant="outline"
            disabled={saving || available.length === 0}
            onClick={() => void addExisting()}
            className="mt-3 h-12 w-full"
          >
            <UserPlus className="size-5" /> Bestehenden Spieler hinzufügen
          </Button>
        </div>
        <div className="rounded-2xl bg-white/[0.025] p-4">
          <label className="text-xs font-semibold text-white/45">
            Neuer Name
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-12 rounded-xl"
              placeholder="Name"
            />
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button size="lg" disabled={saving} onClick={() => void addNamed("permanent")} className="h-12">
              Spieler anlegen
            </Button>
            <Button size="lg" variant="outline" disabled={saving} onClick={() => void addNamed("guest")} className="h-12">
              Gast hinzufügen
            </Button>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-sm text-white/55">{message}</p>
    </section>
  );
}
