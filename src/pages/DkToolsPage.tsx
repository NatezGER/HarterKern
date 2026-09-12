import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Dices, ListOrdered, Play, RefreshCw, Swords, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DkTeamGrid } from "@/components/dk/DkTeamGrid";
import { LeagueView, TournamentView } from "@/components/dk/DkGameViews";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  createTournament,
  DK_CREW,
  drawOrder,
  getTeamRevealOrder,
  resetForNewLeagueMatches,
  resetForNewTeams,
  setTournamentScore,
  type DkTeam,
  type LeagueMatch,
  type MatchScore,
  type TeamStructure,
  type TournamentBracket,
} from "@/lib/dkTools";

type MainMode = "order" | "teams";
type Phase = "config" | "drawing-order" | "order-result" | "drawing-teams" | "teams-result" | "game-choice" | "league" | "tournament";
type ResetIntent = "teams" | "matches" | "configuration" | null;

const STRUCTURES: Array<{ value: TeamStructure; label: string }> = [
  { value: 2, label: "2 Teams" },
  { value: 3, label: "3 Teams" },
  { value: 4, label: "4 Teams" },
  { value: "pairs", label: "2er-Teams" },
];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasEnteredLeagueResults(scores: Record<string, MatchScore>) {
  return Object.values(scores).some((score) => score.scoreA !== null || score.scoreB !== null);
}

function hasEnteredTournamentResults(bracket: TournamentBracket | null) {
  return bracket?.rounds.some((round) => round.matches.some((match) => match.scoreA !== null || match.scoreB !== null)) ?? false;
}

function ConfirmDialog({ intent, onCancel, onConfirm }: { intent: ResetIntent; onCancel: () => void; onConfirm: () => void }) {
  if (!intent) return null;
  const isConfiguration = intent === "configuration";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-5 backdrop-blur-sm" role="presentation" onMouseDown={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dk-confirm-title"
        aria-describedby="dk-confirm-description"
        className="panel w-full max-w-md border-white/15 bg-[#101210] p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="dk-confirm-title" className="display-title text-3xl">{isConfiguration ? "Auslosung bearbeiten?" : "Wirklich neu auslosen?"}</h2>
        <p id="dk-confirm-description" className="mt-3 text-sm leading-relaxed text-white/55">
          {intent === "teams"
            ? "Die aktuellen Teams, Begegnungen und bereits eingetragenen Ergebnisse werden verworfen."
            : intent === "matches"
              ? "Die Teams bleiben erhalten. Aktuelle Paarungen und Ergebnisse werden verworfen."
              : "Die aktuelle Auslosung und bereits eingetragene Ergebnisse werden verworfen."}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Abbrechen</Button>
          <Button type="button" onClick={onConfirm}>{isConfiguration ? "Bearbeiten" : "Neu auslosen"}</Button>
        </div>
      </div>
    </div>
  );
}

export function DkToolsPage() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(DK_CREW));
  const [mode, setMode] = useState<MainMode>("order");
  const [structure, setStructure] = useState<TeamStructure>(2);
  const [phase, setPhase] = useState<Phase>("config");
  const [configOpen, setConfigOpen] = useState(true);
  const [order, setOrder] = useState<string[]>([]);
  const [orderRevealCount, setOrderRevealCount] = useState(0);
  const [teams, setTeams] = useState<DkTeam[]>([]);
  const [teamRevealCount, setTeamRevealCount] = useState(0);
  const [leagueMatches, setLeagueMatches] = useState<LeagueMatch[]>([]);
  const [leagueScores, setLeagueScores] = useState<Record<string, MatchScore>>({});
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [resetIntent, setResetIntent] = useState<ResetIntent>(null);

  const selectedParticipants = DK_CREW.filter((name) => selected.has(name));
  const teamRevealOrder = useMemo(() => getTeamRevealOrder(teams), [teams]);
  const displayedTeams = useMemo(() => {
    if (phase !== "drawing-teams") return teams;
    const visible = new Set(teamRevealOrder.slice(0, teamRevealCount).map(({ teamId, member }) => `${teamId}:${member}`));
    return teams.map((team) => ({
      ...team,
      members: team.members.filter((member) => visible.has(`${team.id}:${member}`)),
    }));
  }, [phase, teamRevealCount, teamRevealOrder, teams]);

  const resultsExist = hasEnteredLeagueResults(leagueScores) || hasEnteredTournamentResults(bracket);
  const minimumParticipants = mode === "order" ? 1 : structure === "pairs" ? 2 : structure;

  useEffect(() => {
    if (phase !== "drawing-order") return;
    if (prefersReducedMotion()) {
      setOrderRevealCount(order.length);
      setPhase("order-result");
      return;
    }
    if (orderRevealCount >= order.length) {
      setPhase("order-result");
      return;
    }
    const timer = window.setTimeout(() => setOrderRevealCount((count) => count + 1), 1200);
    return () => window.clearTimeout(timer);
  }, [order.length, orderRevealCount, phase]);

  useEffect(() => {
    if (phase !== "drawing-teams") return;
    if (prefersReducedMotion()) {
      setTeamRevealCount(teamRevealOrder.length);
      setPhase("teams-result");
      return;
    }
    if (teamRevealCount >= teamRevealOrder.length) {
      setPhase("teams-result");
      return;
    }
    const timer = window.setTimeout(() => setTeamRevealCount((count) => count + 1), 1200);
    return () => window.clearTimeout(timer);
  }, [phase, teamRevealCount, teamRevealOrder.length]);

  const toggleParticipant = (name: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const clearGame = () => {
    setLeagueMatches([]);
    setLeagueScores({});
    setBracket(null);
  };

  const startOrderDraw = () => {
    setOrder(drawOrder(selectedParticipants));
    setOrderRevealCount(0);
    setConfigOpen(false);
    setPhase("drawing-order");
  };

  const startTeamDraw = () => {
    const next = resetForNewTeams(selectedParticipants, structure);
    setTeams(next.teams);
    setLeagueMatches(next.leagueMatches);
    setLeagueScores(next.leagueScores);
    setBracket(next.bracket);
    setTeamRevealCount(0);
    setConfigOpen(false);
    setPhase("drawing-teams");
  };

  const startLeague = () => {
    const next = resetForNewLeagueMatches(teams);
    setTeams(next.teams);
    setLeagueMatches(next.leagueMatches);
    setLeagueScores(next.leagueScores);
    setBracket(next.bracket);
    setPhase("league");
  };

  const startTournament = () => {
    setBracket(createTournament(teams));
    setLeagueMatches([]);
    setLeagueScores({});
    setPhase("tournament");
  };

  const confirmReset = () => {
    if (resetIntent === "teams") startTeamDraw();
    if (resetIntent === "matches") {
      if (phase === "league") startLeague();
      if (phase === "tournament") startTournament();
    }
    if (resetIntent === "configuration") {
      clearGame();
      setPhase("config");
      setConfigOpen(true);
    }
    setResetIntent(null);
  };

  const editConfiguration = () => {
    if (resultsExist) setResetIntent("configuration");
    else {
      setPhase("config");
      setConfigOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Harter Kern unterwegs"
        title="Dänemark Tools"
        description="Reihenfolgen & Teams auslosen – spontan, lokal und ohne Speicherung."
        action={phase !== "config" ? (
          <Button type="button" variant="outline" onClick={editConfiguration} className="w-full sm:w-auto">
            <ChevronDown className="size-4" /> Auslosung bearbeiten
          </Button>
        ) : undefined}
      />

      {(phase === "config" || configOpen) && (
        <section className="panel p-4 sm:p-6" aria-labelledby="draw-config-heading">
          <button
            type="button"
            onClick={() => setConfigOpen((open) => !open)}
            className="flex min-h-12 w-full items-center justify-between text-left"
            aria-expanded={configOpen}
          >
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-gold-400">Auslosung</span>
              <span id="draw-config-heading" className="display-title mt-1 block text-3xl">Konfiguration</span>
            </span>
            {configOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </button>

          {configOpen && (
            <div className="mt-6 space-y-7 border-t border-white/[0.07] pt-6">
              <fieldset>
                <legend className="text-sm font-black uppercase tracking-[0.12em] text-white/65">1. Modus wählen</legend>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {([
                    ["order", "Reihenfolge", ListOrdered],
                    ["teams", "Teams", Users],
                  ] as const).map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={mode === value}
                      onClick={() => setMode(value)}
                      className={cn(
                        "flex min-h-16 items-center justify-center gap-2 rounded-2xl border px-3 font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                        mode === value ? "border-gold-400/55 bg-gold-400/12 text-gold-300" : "border-white/10 bg-white/[0.025] text-white/55 hover:bg-white/[0.06]",
                      )}
                    >
                      <Icon className="size-5" /> {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <div className="flex items-end justify-between gap-3">
                  <legend className="text-sm font-black uppercase tracking-[0.12em] text-white/65">2. Teilnehmer</legend>
                  <span className="text-xs font-bold text-gold-300">{selected.size} von {DK_CREW.length}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 min-[430px]:grid-cols-3 sm:grid-cols-4">
                  {DK_CREW.map((name) => {
                    const active = selected.has(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleParticipant(name)}
                        className={cn(
                          "min-h-12 rounded-2xl border px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                          active ? "border-gold-400/35 bg-gold-400/10 text-white" : "border-white/[0.07] bg-black/15 text-white/30 line-through",
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {mode === "teams" && (
                <fieldset>
                  <legend className="text-sm font-black uppercase tracking-[0.12em] text-white/65">3. Teamstruktur</legend>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {STRUCTURES.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={structure === option.value}
                        onClick={() => setStructure(option.value)}
                        className={cn(
                          "min-h-14 rounded-2xl border px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                          structure === option.value ? "border-gold-400/55 bg-gold-400/12 text-gold-300" : "border-white/10 bg-white/[0.025] text-white/55",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <Button
                type="button"
                size="lg"
                disabled={selectedParticipants.length < minimumParticipants}
                onClick={mode === "order" ? startOrderDraw : startTeamDraw}
                className="w-full"
              >
                <Dices className="size-5" /> Auslosung starten
              </Button>
              {selectedParticipants.length < minimumParticipants && (
                <p role="status" className="text-center text-xs text-amber-300">Für diese Auslosung werden mindestens {minimumParticipants} Teilnehmer benötigt.</p>
              )}
            </div>
          )}
        </section>
      )}

      {(phase === "drawing-order" || phase === "order-result") && (
        <section aria-labelledby="order-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">Die Reihenfolge steht</p>
              <h2 id="order-heading" className="display-title mt-1 text-3xl">Auslosung</h2>
            </div>
            <span className="text-sm font-bold text-white/35">{orderRevealCount}/{order.length}</span>
          </div>
          <ol className="space-y-2" aria-live="polite">
            {order.slice(0, orderRevealCount).map((name, index) => (
              <li key={name} className="panel flex animate-[dk-reveal_.4s_ease-out] items-center gap-4 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold-400/12 font-display text-2xl font-black text-gold-300">{index + 1}</span>
                <span className="text-lg font-bold">{name}</span>
              </li>
            ))}
          </ol>
          {phase === "order-result" && (
            <Button type="button" variant="outline" onClick={startOrderDraw} className="mt-5 w-full sm:w-auto">
              <RefreshCw className="size-4" /> Reihenfolge neu auslosen
            </Button>
          )}
        </section>
      )}

      {["drawing-teams", "teams-result", "game-choice", "league", "tournament"].includes(phase) && (
        <section aria-labelledby="teams-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">{phase === "drawing-teams" ? "Auslosung läuft" : "Eure Teams"}</p>
              <h2 id="teams-heading" className="display-title mt-1 text-3xl">Teamaufstellung</h2>
            </div>
            {phase === "drawing-teams" && <span className="text-sm font-bold text-white/35">{teamRevealCount}/{teamRevealOrder.length}</span>}
          </div>
          <DkTeamGrid teams={displayedTeams} />
          {phase !== "drawing-teams" && (
            <Button type="button" variant="ghost" onClick={() => setResetIntent("teams")} className="mt-4 w-full sm:w-auto">
              <RefreshCw className="size-4" /> Teams neu auslosen
            </Button>
          )}
        </section>
      )}

      {phase === "teams-result" && (
        <Button type="button" size="lg" onClick={() => setPhase("game-choice")} className="w-full">
          <Play className="size-5" /> Spiel starten
        </Button>
      )}

      {phase === "game-choice" && (
        <section className="panel p-5 sm:p-7" aria-labelledby="game-mode-heading">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">Nächster Schritt</p>
          <h2 id="game-mode-heading" className="display-title mt-1 text-3xl">Spielmodus wählen</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={startLeague} className="min-h-28 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-gold-400/40 hover:bg-gold-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
              <Trophy className="size-6 text-gold-400" />
              <span className="mt-3 block font-display text-2xl font-black uppercase">Liga</span>
              <span className="mt-1 block text-sm text-white/45">Jeder gegen jeden</span>
            </button>
            <button type="button" onClick={startTournament} className="min-h-28 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-gold-400/40 hover:bg-gold-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
              <Swords className="size-6 text-gold-400" />
              <span className="mt-3 block font-display text-2xl font-black uppercase">Turnier</span>
              <span className="mt-1 block text-sm text-white/45">KO-Modus mit Turnierbaum</span>
            </button>
          </div>
        </section>
      )}

      {phase === "league" && (
        <LeagueView
          teams={teams}
          matches={leagueMatches}
          scores={leagueScores}
          onScoreChange={(matchId, score) => setLeagueScores((current) => ({ ...current, [matchId]: score }))}
          onRedraw={() => setResetIntent("matches")}
        />
      )}

      {phase === "tournament" && bracket && (
        <TournamentView
          teams={teams}
          bracket={bracket}
          onScoreChange={(matchId, score) => setBracket((current) => current ? setTournamentScore(current, matchId, score) : current)}
          onRedraw={() => setResetIntent("matches")}
        />
      )}

      <ConfirmDialog intent={resetIntent} onCancel={() => setResetIntent(null)} onConfirm={confirmReset} />
    </div>
  );
}
