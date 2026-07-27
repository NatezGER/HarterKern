import { LogOut, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AttemptEditor } from "@/components/admin/AttemptEditor";
import { AttemptManager } from "@/components/admin/AttemptManager";
import { EventManager } from "@/components/admin/EventManager";
import { PlayerManager } from "@/components/admin/PlayerManager";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";
import { usePublicData } from "@/hooks/usePublicData";
import { getErrorMessage } from "@/lib/errors";
import { getAdminAttempts } from "@/services/attemptService";
import type { Attempt } from "@/types";

export function AdminDashboard() {
  const { isAdmin, loading, signOut } = useAdmin();
  const { data, refresh } = usePublicData();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [nextAttempts] = await Promise.all([getAdminAttempts(), refresh()]);
      setAttempts(nextAttempts);
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, [isAdmin, refresh]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) return <p className="text-sm text-white/40">Admin-Sitzung wird geprüft …</p>;
  if (!isAdmin) return <AdminLogin />;
  const pending = attempts.filter((attempt) => attempt.status === "pending");

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 sm:flex-row sm:items-center">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><ShieldCheck className="size-4" /> Admin-Sitzung aktiv</p>
        <Button size="sm" variant="outline" onClick={() => void signOut()}><LogOut className="size-4" /> Logout</Button>
      </div>
      {error && <p className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-300">{error}</p>}
      <EventManager events={data.events} onChanged={reload} />
      <section className="panel p-5 sm:p-7">
        <h3 className="display-title text-2xl">Offene Einreichungen</h3>
        <p className="mt-1 text-xs text-white/35">{pending.length} warten auf Prüfung</p>
        <div className="mt-5 space-y-2">
          {pending.length === 0 && <p className="py-10 text-center text-sm text-white/35">Keine offenen Einreichungen.</p>}
          {pending.map((attempt) => (
            <AttemptEditor key={attempt.id} attempt={attempt} players={data.players} events={data.events} approvalMode onChanged={reload} />
          ))}
        </div>
      </section>
      <AttemptManager attempts={attempts} players={data.players} events={data.events} onChanged={reload} />
      <PlayerManager players={data.players} onChanged={reload} />
    </div>
  );
}
