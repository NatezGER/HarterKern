import { Edit3, Trash2 } from "lucide-react";
import { useState } from "react";
import { HistoricalAttemptForm } from "@/components/management/HistoricalAttemptForm";
import { Button } from "@/components/ui/button";
import { useHistoricalAttempts } from "@/hooks/useHistoricalAttempts";
import { formatDate, formatTime } from "@/utils/format";
import type { HistoricalAttempt } from "@/types/liveEvent";

export function HistoricalAttemptManagement() {
  const {
    attempts,
    players,
    createHistorical,
    updateHistorical,
    deleteHistorical,
  } = useHistoricalAttempts();
  const [editing, setEditing] = useState<HistoricalAttempt>();
  const [message, setMessage] = useState("");
  const ordered = [...attempts].sort(
    (a, b) => b.date.localeCompare(a.date) || b.sortOrder - a.sortOrder,
  );
  return (
    <div className="space-y-5">
      <HistoricalAttemptForm
        key={editing?.id ?? "new"}
        players={players}
        initial={editing}
        onCancel={editing ? () => setEditing(undefined) : undefined}
        onSave={async (input) => {
          const saved = editing
            ? await updateHistorical(editing.id, input)
            : await createHistorical(input);
          if (saved) setEditing(undefined);
          return saved;
        }}
      />
      <section className="rounded-2xl border border-white/10 p-5">
        <h3 className="display-title text-2xl">Historische Versuche verwalten</h3>
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {ordered.map((attempt) => (
            <div key={attempt.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{attempt.displayName}</p>
                <p className="text-xs text-white/35">
                  {formatDate(attempt.date)} · {formatTime(attempt.timeSeconds)}
                  {attempt.isGuest ? " · Gast" : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing(attempt)}>
                <Edit3 className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => {
                void deleteHistorical(attempt.id).then((deleted) =>
                  setMessage(deleted ? "Historischer Versuch gelöscht." : "Löschen fehlgeschlagen."),
                );
              }}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <p aria-live="polite" className="mt-3 text-sm text-white/45">{message}</p>
      </section>
    </div>
  );
}
