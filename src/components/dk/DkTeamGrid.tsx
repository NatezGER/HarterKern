import { Users } from "lucide-react";
import type { DkTeam } from "@/lib/dkTools";

export function DkTeamGrid({ teams }: { teams: DkTeam[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
      {teams.map((team, index) => (
        <article key={team.id} className="panel min-w-0 overflow-hidden p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Team {index + 1}</p>
              <h3 className="display-title mt-1 text-2xl leading-tight text-gold-300">{team.name}</h3>
              {team.members.length > 0 && (
                <p key={team.members.join("|")} className="mt-1 animate-[dk-reveal_.4s_ease-out] text-xs leading-relaxed text-white/50">
                  {team.members.join(" · ")}
                </p>
              )}
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gold-400/10 text-gold-300">
              <Users className="size-5" />
            </span>
          </div>
          {team.members.length === 0 && <p className="mt-3 text-xs text-white/30">Wird gleich gefüllt …</p>}
        </article>
      ))}
    </div>
  );
}
