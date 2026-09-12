import { Crown, RefreshCw, Shield, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calculateStandings,
  type DkTeam,
  type LeagueMatch,
  type MatchScore,
  type TournamentBracket,
} from "@/lib/dkTools";

interface ScoreInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

function ScoreInput({ label, value, onChange, disabled }: ScoreInputProps) {
  return (
    <input
      type="number"
      min="0"
      step="1"
      inputMode="numeric"
      aria-label={label}
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value === "" ? null : Math.max(0, Math.floor(Number(event.target.value))))}
      className="h-14 w-16 rounded-2xl border border-white/15 bg-black/30 text-center text-xl font-black text-white outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/25 disabled:opacity-35"
    />
  );
}

function TeamName({ team }: { team: DkTeam | undefined }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-bold text-white">{team?.name ?? "Noch offen"}</span>
      {team && <span className="mt-0.5 block text-[11px] leading-snug text-white/40">{team.members.join(" · ")}</span>}
    </span>
  );
}

interface LeagueViewProps {
  teams: DkTeam[];
  matches: LeagueMatch[];
  scores: Record<string, MatchScore>;
  onScoreChange: (matchId: string, score: MatchScore) => void;
  onRedraw: () => void;
}

export function LeagueView({ teams, matches, scores, onScoreChange, onRedraw }: LeagueViewProps) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const standings = calculateStandings(teams, matches, scores);

  return (
    <div className="space-y-8">
      <section aria-labelledby="league-table-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">Jeder gegen jeden</p>
            <h2 id="league-table-heading" className="display-title mt-1 text-3xl">Ligatabelle</h2>
          </div>
        </div>
        <div className="space-y-2">
          {standings.map((row) => (
            <article key={row.teamId} className="panel p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-400/12 font-display text-xl font-black text-gold-300">{row.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{row.teamName}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-white/40">{teamById.get(row.teamId)?.members.join(" · ")}</p>
                </div>
                <p className="font-display text-2xl font-black text-gold-300">{row.points} <span className="text-xs text-white/40">Pkt.</span></p>
              </div>
              <dl className="mt-3 grid grid-cols-7 gap-1 border-t border-white/[0.07] pt-3 text-center">
                {[
                  ["Sp", row.played], ["S", row.wins], ["U", row.draws], ["N", row.losses],
                  ["+", row.scored], ["−", row.conceded], ["Diff", row.difference > 0 ? `+${row.difference}` : row.difference],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] font-bold uppercase text-white/35">{label}</dt>
                    <dd className="mt-1 text-sm font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="matches-heading">
        <h2 id="matches-heading" className="display-title mb-4 text-3xl">Begegnungen</h2>
        <div className="space-y-3">
          {matches.map((match, index) => {
            const score = scores[match.id] ?? { scoreA: null, scoreB: null };
            return (
              <article key={match.id} className="panel p-4 sm:p-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Spiel {index + 1}</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <div className="min-w-0 text-center">
                    <p className="truncate text-sm font-bold">{teamById.get(match.teamAId)?.name}</p>
                    <p className="mb-2 mt-0.5 text-[10px] leading-snug text-white/35">{teamById.get(match.teamAId)?.members.join(" · ")}</p>
                    <ScoreInput
                      label={`Ergebnis ${teamById.get(match.teamAId)?.name}`}
                      value={score.scoreA}
                      onChange={(scoreA) => onScoreChange(match.id, { ...score, scoreA })}
                    />
                  </div>
                  <span aria-hidden="true" className="mt-7 font-display text-2xl font-black text-white/35">:</span>
                  <div className="min-w-0 text-center">
                    <p className="truncate text-sm font-bold">{teamById.get(match.teamBId)?.name}</p>
                    <p className="mb-2 mt-0.5 text-[10px] leading-snug text-white/35">{teamById.get(match.teamBId)?.members.join(" · ")}</p>
                    <ScoreInput
                      label={`Ergebnis ${teamById.get(match.teamBId)?.name}`}
                      value={score.scoreB}
                      onChange={(scoreB) => onScoreChange(match.id, { ...score, scoreB })}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="border-t border-white/[0.08] pt-6">
        <Button type="button" variant="ghost" onClick={onRedraw} className="w-full sm:w-auto">
          <RefreshCw className="size-4" /> Begegnungen neu auslosen
        </Button>
      </div>
    </div>
  );
}

interface TournamentViewProps {
  teams: DkTeam[];
  bracket: TournamentBracket;
  onScoreChange: (matchId: string, score: MatchScore) => void;
  onRedraw: () => void;
}

export function TournamentView({ teams, bracket, onScoreChange, onRedraw }: TournamentViewProps) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const champion = bracket.championId ? teamById.get(bracket.championId) : undefined;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">KO-Modus</p>
        <h2 className="display-title mt-1 text-3xl">Turnierbaum</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {bracket.rounds.map((round) => (
          <section key={round.id} aria-labelledby={`${round.id}-heading`} className="min-w-0">
            <h3 id={`${round.id}-heading`} className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-white/55">
              <Swords className="size-4 text-gold-400" /> {round.label}
            </h3>
            <div className="space-y-3">
              {round.matches.map((match) => {
                const playable = Boolean(match.teamAId && match.teamBId);
                const tied = playable && match.scoreA !== null && match.scoreB !== null && match.scoreA === match.scoreB;
                return (
                  <article key={match.id} className="panel overflow-hidden p-4">
                    {(["A", "B"] as const).map((side) => {
                      const teamId = side === "A" ? match.teamAId : match.teamBId;
                      const score = side === "A" ? match.scoreA : match.scoreB;
                      const team = teamId ? teamById.get(teamId) : undefined;
                      return (
                        <div key={side} className={`flex items-center gap-3 ${side === "B" ? "mt-3 border-t border-white/[0.07] pt-3" : ""}`}>
                          <Shield className={`size-4 shrink-0 ${match.winnerId === teamId ? "text-gold-400" : "text-white/25"}`} />
                          <TeamName team={team} />
                          {playable ? (
                            <ScoreInput
                              label={`Ergebnis ${team?.name}`}
                              value={score}
                              onChange={(value) => onScoreChange(match.id, side === "A"
                                ? { scoreA: value, scoreB: match.scoreB }
                                : { scoreA: match.scoreA, scoreB: value })}
                            />
                          ) : team ? <span className="text-[10px] font-bold uppercase text-gold-300">Freilos</span> : null}
                        </div>
                      );
                    })}
                    {tied && <p role="status" className="mt-3 text-xs font-semibold text-amber-300">Im KO-Modus muss es einen Sieger geben.</p>}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {champion && (
        <section aria-live="polite" className="relative overflow-hidden rounded-3xl border border-gold-400/35 bg-gold-400/10 p-6 text-center shadow-gold">
          <Crown className="mx-auto size-10 text-gold-300" />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-gold-400">Turniersieger</p>
          <h2 className="display-title gold-text mt-2 text-4xl">{champion.name}</h2>
          <p className="mt-2 text-sm text-white/65">{champion.members.join(" · ")}</p>
        </section>
      )}

      <div className="border-t border-white/[0.08] pt-6">
        <Button type="button" variant="ghost" onClick={onRedraw} className="w-full sm:w-auto">
          <RefreshCw className="size-4" /> Begegnungen neu auslosen
        </Button>
      </div>
    </div>
  );
}
