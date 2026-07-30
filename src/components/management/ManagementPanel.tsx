import { Edit3, Lock, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AttemptEditDialog } from "@/components/management/AttemptEditDialog";
import { EventManagement } from "@/components/management/EventManagement";
import { HistoricalAttemptManagement } from "@/components/management/HistoricalAttemptManagement";
import { PlayerManagement } from "@/components/management/PlayerManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { useManagementMode } from "@/hooks/useManagementMode";
import { formatTime } from "@/utils/format";
import type { LiveAttempt } from "@/types/liveEvent";

export function ManagementPanel() {
  const { unlocked, unlock, lock } = useManagementMode();
  const { state } = useLiveEvent();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<LiveAttempt | null>(null);
  return (
    <section>
      <div className="panel p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">
              Administration
            </p>
            <h2 className="display-title mt-1 text-3xl">Verwaltungsmodus</h2>
          </div>
          {unlocked && (
            <Button variant="ghost" onClick={lock}>
              <LogOut className="size-4" /> Sperren
            </Button>
          )}
        </div>
        {!unlocked ? (
          <form
            className="mt-6 flex max-w-lg flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!unlock(code)) {
                setError("Code ist nicht korrekt.");
                return;
              }
              setError("");
              setCode("");
            }}
          >
            <Input
              type="password"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Code eingeben"
              autoComplete="off"
              aria-label="Admin-Code"
            />
            <Button type="submit"><Lock className="size-4" /> Öffnen</Button>
            {error && (
              <p aria-live="assertive" className="self-center text-sm text-red-300">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="mt-7 space-y-5">
            <p className="flex items-center gap-2 text-sm text-emerald-300">
              <ShieldCheck className="size-4" /> Verwaltungsmodus aktiv
            </p>
            <HistoricalAttemptManagement />
            <section className="rounded-2xl border border-white/10 p-5">
              <h3 className="display-title text-2xl">Versuche verwalten</h3>
              <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                {state.attempts.map((attempt) => {
                  const player = state.players.find(({ id }) => id === attempt.playerId);
                  return (
                    <button
                      key={attempt.id}
                      type="button"
                      onClick={() => setEditing(attempt)}
                      className="flex w-full items-center gap-4 rounded-xl bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {player?.name ?? "Unbekannt"}
                      </span>
                      <span className="text-sm text-white/50">
                        {attempt.result === "dns"
                          ? "DNF"
                          : formatTime(attempt.timeSeconds ?? 0)}
                      </span>
                      <Edit3 className="size-4 text-gold-300" />
                    </button>
                  );
                })}
              </div>
            </section>
            <div className="grid gap-5 xl:grid-cols-2">
              <PlayerManagement />
              <EventManagement />
            </div>
          </div>
        )}
      </div>
      <AttemptEditDialog attempt={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
