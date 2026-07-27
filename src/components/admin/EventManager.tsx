import { CalendarPlus, Save, Square } from "lucide-react";
import { useEffect, useState } from "react";
import type { Event } from "@/types";
import { closeEvent, startEvent, updateEvent } from "@/services/eventService";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EventManagerProps {
  events: Event[];
  onChanged: () => Promise<void>;
}

const toLocalInput = (value: string) => {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export function EventManager({ events, onChanged }: EventManagerProps) {
  const activeEvent = events.find((event) => event.status === "active");
  const [selectedId, setSelectedId] = useState(activeEvent?.id ?? events[0]?.id ?? "");
  const selected = events.find((event) => event.id === selectedId);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && events[0]) {
      setSelectedId(events[0].id);
      return;
    }
    if (!selected) return;
    setName(selected.title === new Intl.DateTimeFormat("de-DE").format(new Date(`${selected.date}T12:00:00`)) ? "" : selected.title);
    setDate(selected.date);
    setStartedAt(toLocalInput(selected.startedAt));
    setEndsAt(toLocalInput(selected.endsAt));
  }, [events, selected]);

  const run = async (action: () => Promise<unknown>) => {
    try {
      setError(null);
      await action();
      await onChanged();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  return (
    <section className="panel p-5 sm:p-7">
      <h3 className="display-title text-2xl">Eventverwaltung</h3>
      {!activeEvent && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optionaler Eventname" className="rounded-xl" />
          <Button onClick={() => void run(() => startEvent(name))}><CalendarPlus className="size-4" /> Event starten</Button>
        </div>
      )}
      {events.length > 0 && (
        <div className="mt-5 space-y-4">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm">
            {events.map((event) => <option key={event.id} value={event.id}>{event.date} · {event.title} · {event.status}</option>)}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Eventname (optional)" className="rounded-xl" />
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-xl" />
            <Input type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} className="rounded-xl" />
            <Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="rounded-xl" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => selected && void run(() => updateEvent(selected.id, {
              name: name.trim() || null,
              start_date: date,
              started_at: new Date(startedAt).toISOString(),
              ends_at: new Date(endsAt).toISOString(),
            }))}><Save className="size-4" /> Speichern</Button>
            {selected?.status === "active" && <Button variant="outline" onClick={() => void run(() => closeEvent(selected.id))}><Square className="size-4" /> Event schließen</Button>}
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}
