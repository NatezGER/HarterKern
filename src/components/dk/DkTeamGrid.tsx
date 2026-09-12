import { Users } from "lucide-react";
import type { DkTeam } from "@/lib/dkTools";

export function DkTeamGrid({ teams }: { teams: DkTeam[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
      {teams.map((team, index) => (
        <article key={team.id} className="panel min-w-0 overflow-hidden p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Team {index + 1}</p>
              <h3 className="display-title mt-1 truncate text-2xl text-gold-300">{team.name}</h3>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gold-400/10 text-gold-300">
              <Users className="size-5" />
            </span>
          </div>
          <ul className="mt-4 space-y-2">
            {team.members.map((member) => (
              <li key={member} className="animate-[dk-reveal_.4s_ease-out] rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 font-semibold">
                {member}
              </li>
            ))}
            {team.members.length === 0 && <li className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-white/30">Wird gleich gefüllt …</li>}
          </ul>
        </article>
      ))}
    </div>
  );
}
