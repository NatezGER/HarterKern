import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveEvent } from "@/hooks/useLiveEvent";

export function EventManagement() {
  const { state, updateEvent } = useLiveEvent();
  const [selectedId, setSelectedId] = useState(state.events[0]?.id ?? "");
  const selected = state.events.find(({ id }) => id === selectedId);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    setName(selected?.name ?? "");
    setDate(selected?.date ?? "");
  }, [selected]);
  if (!selected) return null;
  return (
    <section className="rounded-2xl border border-white/10 p-5">
      <h3 className="display-title text-2xl">Event bearbeiten</h3>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm">
          {state.events.map((event) => <option key={event.id} value={event.id}>{event.name || "Spieleabend"} · {event.date}</option>)}
        </select>
        <Input className="rounded-xl" value={name} onChange={(event) => setName(event.target.value)} placeholder="Eventname" />
        <Input className="rounded-xl" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <Button className="mt-4" onClick={() => updateEvent(selected.id, { name: name.trim() || undefined, date })}><Save className="size-4" /> Event speichern</Button>
    </section>
  );
}
