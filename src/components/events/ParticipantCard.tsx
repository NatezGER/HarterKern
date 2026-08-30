import { CheckCircle2, Flag, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LiveAvatar } from "@/components/events/LiveAvatar";
import { cn } from "@/lib/cn";
import { formatTime } from "@/utils/format";
import type { LiveStanding } from "@/types/liveEvent";
import { MOBILE_CONTEXT_AVATAR_FRAME } from "@/constants/avatar";

const lastStatus = (standing: LiveStanding) => {
  const attempt = standing.lastAttempt;
  if (!attempt) return { icon: Sparkles, label: "Noch kein Versuch", color: "text-white/35" };
  if (attempt.result === "dns") return { icon: Flag, label: "DNF", color: "text-white/45" };
  return { icon: CheckCircle2, label: "Offiziell", color: "text-emerald-300" };
};

function Identity({ standing, onAdd }: { standing: LiveStanding; onAdd: () => void }) {
  const status = lastStatus(standing);
  const StatusIcon = status.icon;
  const name = standing.player.kind === "permanent" ? (
    <Link to={`/player/${standing.player.id}`} className="truncate font-display text-2xl font-black uppercase hover:text-gold-200">
      {standing.player.name}
    </Link>
  ) : <h3 className="truncate font-display text-2xl font-black uppercase">{standing.player.name}</h3>;
  return (
    <div className="flex w-full items-center gap-4">
      <button type="button" onClick={onAdd} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400" aria-label={`Zeit für ${standing.player.name} erfassen`}>
      <LiveAvatar player={standing.player} className="size-14" />
      </button>
      <div className="min-w-0">
        {name}
        <p className={cn("mt-1 flex items-center gap-1.5 text-xs font-semibold", status.color)}>
          <StatusIcon className="size-3.5" />
          {standing.player.kind === "guest" ? `Gast · ${status.label}` : status.label}
        </p>
      </div>
    </div>
  );
}

export function ParticipantCard({
  standing,
  saved,
  onAdd,
}: {
  standing: LiveStanding;
  saved: boolean;
  onAdd: () => void;
}) {
  return (
    <article className={cn(
      "panel flex min-h-36 flex-col p-3 transition md:min-h-72 md:p-6",
      saved && "border-emerald-400/40 shadow-[0_0_32px_rgba(52,211,153,.15)]",
    )}>
      <button type="button" onClick={onAdd} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 md:hidden" aria-label={`Zeit für ${standing.player.name} erfassen`}>
        <LiveAvatar player={standing.player} className={`size-16 ${MOBILE_CONTEXT_AVATAR_FRAME}`} />
        <span className="w-full truncate font-display text-lg font-black uppercase">{standing.player.name}</span>
      </button>
      <div className="hidden md:block"><Identity standing={standing} onAdd={onAdd} /></div>
      <div className="my-6 hidden grid-cols-2 gap-3 md:grid">
        <Metric
          label={standing.player.kind === "guest" ? "Gast im Event" : "Persönliche Bestzeit"}
          value={standing.player.kind === "guest"
            ? "Nur heute"
            : formatTime(standing.player.personalBest)}
        />
        <Metric label="Eventbestzeit" value={formatTime(standing.bestTime ?? 0)} />
        <Metric label="Event-Durchschnitt" value={formatTime(standing.averageTime ?? 0)} />
        <Metric label="Versuche" value={String(standing.attempts)} />
      </div>
      <Button size="lg" onClick={onAdd} className="mt-auto hidden h-14 w-full md:flex">
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
