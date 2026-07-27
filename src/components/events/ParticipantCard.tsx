import { CheckCircle2, Clock3, Flag, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { cn } from "@/lib/cn";
import { formatTime } from "@/utils/format";
import type { LiveStanding } from "@/types/liveEvent";

const lastStatus = (standing: LiveStanding) => {
  const attempt = standing.lastAttempt;
  if (!attempt) return { icon: Sparkles, label: "Noch kein Versuch", color: "text-white/35" };
  if (attempt.result === "dns") return { icon: Flag, label: "DNS", color: "text-white/45" };
  if (attempt.status === "pending") {
    return { icon: Clock3, label: "Wartet auf Freigabe", color: "text-amber-300" };
  }
  return { icon: CheckCircle2, label: "Bestätigt", color: "text-emerald-300" };
};

export function ParticipantCard({
  standing,
  saved,
  onAdd,
}: {
  standing: LiveStanding;
  saved: boolean;
  onAdd: () => void;
}) {
  const status = lastStatus(standing);
  const StatusIcon = status.icon;
  return (
    <article className={cn(
      "panel flex min-h-72 flex-col p-5 transition sm:p-6",
      saved && "border-emerald-400/40 shadow-[0_0_32px_rgba(52,211,153,.15)]",
    )}>
      <div className="flex items-center gap-4">
        <LiveAvatar player={standing.player} className="size-14" />
        <div className="min-w-0">
          <h3 className="truncate font-display text-2xl font-black uppercase">
            {standing.player.name}
          </h3>
          <p className={cn("mt-1 flex items-center gap-1.5 text-xs font-semibold", status.color)}>
            <StatusIcon className="size-3.5" /> {status.label}
          </p>
        </div>
      </div>
      <div className="my-6 grid grid-cols-2 gap-3">
        <Metric label="Persönliche Bestzeit" value={formatTime(standing.player.personalBest)} />
        <Metric label="Eventbestzeit" value={formatTime(standing.approvedBest ?? 0)} />
        <Metric label="Vorläufig" value={formatTime(standing.pendingBest ?? 0)} />
        <Metric label="Versuche" value={String(standing.attempts)} />
      </div>
      <Button size="lg" onClick={onAdd} className="mt-auto h-14 w-full">
        <Plus className="size-5" /> Neue Zeit
      </Button>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.035] p-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">{label}</p>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
    </div>
  );
}
