import { Edit3, LoaderCircle, LogIn, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AttemptEditDialog } from "@/components/management/AttemptEditDialog";
import { EventManagement } from "@/components/management/EventManagement";
import { HistoricalAttemptManagement } from "@/components/management/HistoricalAttemptManagement";
import { PlayerManagement } from "@/components/management/PlayerManagement";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { formatTime } from "@/utils/format";
import type { LiveAttempt } from "@/types/liveEvent";

export function ManagementPanel() {
  const { email, isAdmin, loading, message, requestLogin, signOut } = useAdminSession();
  const { state } = useLiveEvent();
  const [editing, setEditing] = useState<LiveAttempt | null>(null);
  return (
    <section>
      <div className="panel p-7">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Administration</p><h2 className="display-title mt-1 text-3xl">Verwaltungsmodus</h2></div>
          {email && <Button variant="ghost" disabled={loading} onClick={() => void signOut()}><LogOut className="size-4" /> Abmelden</Button>}
        </div>
        {!isAdmin ? (
          <div className="mt-6 max-w-xl">
            <p className="flex items-center gap-2 text-sm text-white/55">{email ? <ShieldAlert className="size-4 text-red-300" /> : <LogIn className="size-4 text-gold-300" />}{email ? `${email} besitzt keine Adminrolle.` : "Adminaktionen benötigen eine bestätigte Supabase-Anmeldung."}</p>
            {!email && <Button className="mt-4" disabled={loading} onClick={() => void requestLogin()}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />} Anmeldelink senden</Button>}
            <p aria-live="polite" className="mt-3 text-sm text-white/45">{message}</p>
          </div>
        ) : (
          <div className="mt-7 space-y-5">
            <p className="flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck className="size-4" /> Adminsession aktiv · {email}</p>
            <HistoricalAttemptManagement />
            <section className="rounded-2xl border border-white/10 p-5">
              <h3 className="display-title text-2xl">Versuche verwalten</h3>
              <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                {state.attempts.map((attempt) => {
                  const player = state.players.find(({ id }) => id === attempt.playerId);
                  return <button key={attempt.id} type="button" onClick={() => setEditing(attempt)} className="flex w-full items-center gap-4 rounded-xl bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"><span className="min-w-0 flex-1 truncate font-semibold">{player?.name ?? "Unbekannt"}</span><span className="text-sm text-white/50">{attempt.result === "dns" ? "DNF" : formatTime(attempt.timeSeconds ?? 0)}</span><Edit3 className="size-4 text-gold-300" /></button>;
                })}
              </div>
            </section>
            <div className="grid gap-5 xl:grid-cols-2"><PlayerManagement /><EventManagement /></div>
          </div>
        )}
      </div>
      <AttemptEditDialog attempt={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
