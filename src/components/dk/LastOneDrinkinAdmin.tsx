import { AlertTriangle, ChevronDown, Dices, Flag, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLastOneDrinkin } from "@/hooks/useLastOneDrinkin";
import {
  calculateCoasterPoints,
  calculateGolfPoints,
  calculateImpactPoints,
  calculateMiniGolfPoints,
  calculateOverallStandings,
  calculateRageCagePoints,
  calculateTimeLegPoints,
  calculateTimeTrialPoints,
  evaluateDisciplines,
  fillEmptyTeamSlots,
  fillEmptyTireSeeds,
  flipFlopMatches,
  golfProgress,
  HOLES,
  LOD_PLAYERS,
  normalizeGolfEntry,
  resolveTireBracket,
  teamSlices,
  timeDeviation,
  validateTeamConfig,
  type HoleDefinition,
  type LastOneDrinkinState,
  type LodPlayerId,
  type TeamConfig,
  type TimeLeg,
} from "@/lib/lastOneDrinkin";

const inputClass = "h-11 w-full rounded-xl border border-white/12 bg-black/25 px-3 text-sm text-white outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 disabled:opacity-40";

function NumberInput({ value, min, max, step = 1, label, onChange, disabled = false }: { value: number | null; min: number; max?: number; step?: number; label: string; onChange: (value: number | null) => void; disabled?: boolean }) {
  return <input className={inputClass} type="number" inputMode="decimal" min={min} max={max} step={step} aria-label={label} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} />;
}

function PlayerSelect({ value, label, onChange, disabledIds = [] }: { value: LodPlayerId | null; label: string; onChange: (value: LodPlayerId | null) => void; disabledIds?: LodPlayerId[] }) {
  return (
    <select className={inputClass} aria-label={label} value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}>
      <option value="">– offen –</option>
      {LOD_PLAYERS.map((player) => <option key={player.id} value={player.id} disabled={disabledIds.includes(player.id) && player.id !== value}>{player.name}</option>)}
    </select>
  );
}

function TeamEditor({ config, onChange, labels }: { config: TeamConfig; onChange: (config: TeamConfig) => void; labels?: string[] }) {
  const teams = teamSlices(config);
  const validation = validateTeamConfig(config);
  let slotOffset = 0;
  return (
    <div className="space-y-3">
      {teams.map((team, teamIndex) => {
        const start = slotOffset;
        slotOffset += team.length;
        return (
          <div key={teamIndex} className="rounded-2xl border border-white/[0.08] bg-black/15 p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-white/45">{labels?.[teamIndex] ?? `Team ${teamIndex + 1}`} · {team.length}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {team.map((playerId, memberIndex) => {
                const slotIndex = start + memberIndex;
                return <PlayerSelect key={slotIndex} value={playerId} label={`${labels?.[teamIndex] ?? `Team ${teamIndex + 1}`} Platz ${memberIndex + 1}`} disabledIds={config.slots.filter((id): id is string => id !== null)} onChange={(id) => onChange({ ...config, slots: config.slots.map((current, index) => index === slotIndex ? id : current) })} />;
              })}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs ${validation.duplicateIds.length ? "text-red-300" : "text-white/35"}`}>
          {validation.duplicateIds.length ? "Ein Spieler ist mehrfach gesetzt." : `${config.slots.length - validation.missing}/${config.slots.length} Plätze gesetzt`}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange(fillEmptyTeamSlots(config))}><Dices className="size-4" /> Leere zufällig füllen</Button>
      </div>
    </div>
  );
}

function PlayerRow({ playerId, children, points }: { playerId: LodPlayerId; children: React.ReactNode; points?: number | null }) {
  return (
    <div className="grid grid-cols-[minmax(5.5rem,.8fr)_minmax(0,1.5fr)_2.5rem] items-center gap-2 border-t border-white/[0.06] py-2 first:border-0">
      <span className="truncate text-sm font-semibold">{LOD_PLAYERS.find(({ id }) => id === playerId)?.name}</span>
      <div className="min-w-0">{children}</div>
      <span className="text-right text-sm font-black text-gold-300">{points === null || points === undefined ? "–" : points}</span>
    </div>
  );
}

function GolfEditor({ hole, state, update }: { hole: HoleDefinition; state: LastOneDrinkinState; update: (recipe: (next: LastOneDrinkinState) => void) => void }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-gold-400">Beer Golf</h4>
      <div className="rounded-2xl border border-white/[0.08] px-3">
        {LOD_PLAYERS.map(({ id, name }) => {
          const entry = state.golf[hole.id][id];
          return (
            <div key={id} className="grid grid-cols-[minmax(4.5rem,.8fr)_4rem_3.2rem_4.3rem_2rem] items-center gap-1 border-t border-white/[0.06] py-2 first:border-0">
              <span className="truncate text-xs font-semibold">{name}</span>
              <NumberInput value={entry.strokes} min={1} max={hole.par} label={`${name} Schläge Bahn ${hole.id}`} onChange={(strokes) => update((next) => { next.golf[hole.id][id] = normalizeGolfEntry(hole.par, { ...entry, strokes, failed: false }); })} />
              <label className="flex min-h-11 cursor-pointer flex-col items-center justify-center text-[9px] font-bold uppercase text-white/45"><input type="checkbox" className="size-5 accent-amber-400" checked={entry.holed} disabled={entry.failed} onChange={(event) => update((next) => { next.golf[hole.id][id] = normalizeGolfEntry(hole.par, { ...entry, holed: event.target.checked }); })} />Loch</label>
              <button type="button" aria-pressed={entry.failed} onClick={() => update((next) => { next.golf[hole.id][id] = normalizeGolfEntry(hole.par, { ...entry, failed: !entry.failed }); })} className={`min-h-11 rounded-xl px-1 text-[9px] font-black uppercase ${entry.failed ? "bg-red-400/15 text-red-200" : "bg-white/[0.05] text-white/35"}`}>Nicht geschafft</button>
              <span className="text-right text-sm font-black text-gold-300">{calculateGolfPoints(hole.par, entry) ?? "–"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FlipFlopEditor({ state, update }: EditorProps) {
  const teams = teamSlices(state.flipFlop.teams);
  return <div className="space-y-5"><TeamEditor config={state.flipFlop.teams} onChange={(teams) => update((next) => { next.flipFlop.teams = teams; })} />
    <div className="space-y-2">{flipFlopMatches().map(([a, b], index) => <label key={index} className="grid grid-cols-[1fr_1.2fr] items-center gap-2 text-xs"><span>Team {a + 1} vs. Team {b + 1}</span><select className={inputClass} value={state.flipFlop.winners[`match-${index}`] ?? ""} onChange={(event) => update((next) => { next.flipFlop.winners[`match-${index}`] = event.target.value === "" ? null : Number(event.target.value); })}><option value="">Sieger offen</option><option value={a}>Team {a + 1} · {teams[a].filter(Boolean).length}</option><option value={b}>Team {b + 1} · {teams[b].filter(Boolean).length}</option></select></label>)}</div>
  </div>;
}

interface EditorProps { state: LastOneDrinkinState; update: (recipe: (next: LastOneDrinkinState) => void) => void }

function CoasterEditor({ state, update }: EditorProps) {
  const points = calculateCoasterPoints(state.coaster);
  const finalists = LOD_PLAYERS.filter(({ id }) => state.coaster.stages[id] === "final");
  const limits = { first: 2, second: 2, third: 2, fourth: 2, final: 3 } as const;
  const counts = Object.fromEntries(Object.keys(limits).map((stage) => [stage, Object.values(state.coaster.stages).filter((value) => value === stage).length]));
  return <div>{LOD_PLAYERS.map(({ id }) => {
    const current = state.coaster.stages[id];
    return <PlayerRow key={id} playerId={id} points={points[id]}><select className={inputClass} value={current ?? ""} onChange={(event) => update((next) => { next.coaster.stages[id] = (event.target.value || null) as LastOneDrinkinState["coaster"]["stages"][string]; })}><option value="">Stufe offen</option><option value="first" disabled={counts.first >= 2 && current !== "first"}>Erste 2 · 0</option><option value="second" disabled={counts.second >= 2 && current !== "second"}>Nächste 2 · 1</option><option value="third" disabled={counts.third >= 2 && current !== "third"}>Nächste 2 · 2</option><option value="fourth" disabled={counts.fourth >= 2 && current !== "fourth"}>Nächste 2 · 3</option><option value="final" disabled={counts.final >= 3 && current !== "final"}>Finale · 4/5</option></select></PlayerRow>;
  })}<p className="mt-2 text-[10px] text-white/35">Gruppen: {counts.first}/2 · {counts.second}/2 · {counts.third}/2 · {counts.fourth}/2 · Finale {counts.final}/3</p><div className="mt-3"><PlayerSelect value={state.coaster.finalWinner} label="Finalsieger Untersetzer" disabledIds={LOD_PLAYERS.filter(({ id }) => !finalists.some((player) => player.id === id)).map(({ id }) => id)} onChange={(id) => update((next) => { next.coaster.finalWinner = id; })} /></div></div>;
}

function FlunkyEditor({ state, update }: EditorProps) {
  return <div className="space-y-5">{state.flunky.rounds.map((round, index) => <section key={index} className="rounded-2xl border border-white/[0.08] p-3"><h5 className="mb-3 font-bold">Runde {index + 1}</h5><TeamEditor config={round.teams} labels={["Team A", "Team B"]} onChange={(teams) => update((next) => { next.flunky.rounds[index].teams = teams; })} /><select className={`${inputClass} mt-3`} aria-label={`Sieger Flunkyball Runde ${index + 1}`} value={round.winner ?? ""} onChange={(event) => update((next) => { next.flunky.rounds[index].winner = (event.target.value || null) as "A" | "B" | null; })}><option value="">Sieger offen</option><option value="A">Team A</option><option value="B">Team B</option></select></section>)}</div>;
}

function MiniGolfEditor({ state, update }: EditorProps) {
  const points = calculateMiniGolfPoints(state.miniGolf);
  return <div>{LOD_PLAYERS.map(({ id }) => <PlayerRow key={id} playerId={id} points={points[id]}><div className="grid grid-cols-3 gap-1">{state.miniGolf[id].map((value, index) => <NumberInput key={index} value={value} min={1} label={`${LOD_PLAYERS.find((p) => p.id === id)?.name} Mini-Golf Bahn ${String.fromCharCode(65 + index)}`} onChange={(nextValue) => update((next) => { next.miniGolf[id][index] = nextValue; })} />)}</div></PlayerRow>)}</div>;
}

function BeerPongEditor({ state, update }: EditorProps) {
  return <div>{LOD_PLAYERS.map(({ id }) => <PlayerRow key={id} playerId={id} points={state.beerPong[id]}><NumberInput value={state.beerPong[id]} min={0} max={10} label={`${LOD_PLAYERS.find((p) => p.id === id)?.name} Bierpong-Treffer`} onChange={(value) => update((next) => { next.beerPong[id] = value === null ? null : Math.min(10, Math.max(0, Math.floor(value))); })} /></PlayerRow>)}</div>;
}

function TireEditor({ state, update }: EditorProps) {
  const rounds = resolveTireBracket(state.tire);
  const selected = state.tire.seeds.filter((id): id is string => id !== null);
  return <div className="space-y-5"><div><div className="grid grid-cols-2 gap-2">{state.tire.seeds.map((id, index) => <PlayerSelect key={index} value={id} label={`Startposition ${index + 1}`} disabledIds={selected} onChange={(value) => update((next) => { next.tire.seeds[index] = value; })} />)}</div><Button type="button" size="sm" variant="outline" className="mt-3 w-full" onClick={() => update((next) => { next.tire = fillEmptyTireSeeds(next.tire); })}><Dices className="size-4" /> Leere Positionen zufällig füllen</Button></div>
    {rounds.map((matches, round) => <section key={round}><h5 className="mb-2 text-xs font-black uppercase text-white/45">{round === rounds.length - 1 ? "Finale" : `Runde ${round + 1}`}</h5><div className="space-y-2">{matches.map((match) => <label key={match.id} className="grid grid-cols-[1fr_1.15fr] items-center gap-2 text-xs"><span>{playerName(match.playerA)} vs. {playerName(match.playerB)}</span>{match.playerA && match.playerB ? <PlayerSelect value={match.winner} label={`Sieger ${match.id}`} disabledIds={LOD_PLAYERS.filter(({ id }) => id !== match.playerA && id !== match.playerB).map(({ id }) => id)} onChange={(winner) => update((next) => { next.tire.winners[match.id] = winner; })} /> : <span className="text-white/35">{match.winner ? `${playerName(match.winner)} · Freilos` : "offen"}</span>}</label>)}</div></section>)}
  </div>;
}

function playerName(id: LodPlayerId | null) { return id ? LOD_PLAYERS.find((player) => player.id === id)?.name ?? id : "Freilos"; }

function RageEditor({ state, update }: EditorProps) {
  const evaluation = calculateRageCagePoints(state.rageCage);
  return <div>{LOD_PLAYERS.map(({ id }) => <PlayerRow key={id} playerId={id} points={evaluation.points[id]}><div className="grid grid-cols-2 gap-1"><NumberInput value={state.rageCage.results[id].round} min={0} max={4} label={`${playerName(id)} höchste Runde`} onChange={(round) => update((next) => { next.rageCage.results[id].round = round === null ? null : Math.min(4, Math.max(0, Math.floor(round))); if (round !== 4) next.rageCage.results[id].lives = null; })} /><NumberInput value={state.rageCage.results[id].lives} min={0} max={10} disabled={state.rageCage.results[id].round !== 4} label={`${playerName(id)} übrige Leben`} onChange={(lives) => update((next) => { next.rageCage.results[id].lives = lives === null ? null : Math.min(10, Math.max(0, Math.floor(lives))); })} /></div></PlayerRow>)}{evaluation.tiedLeaders.length > 1 && <div className="mt-3 rounded-xl bg-amber-400/10 p-3"><p className="mb-2 text-xs text-amber-200">Gleichstand bei den meisten Leben – 5-Punkte-Spieler auswählen.</p><PlayerSelect value={state.rageCage.bonusWinner} label="5-Punkte-Spieler Rage Cage" disabledIds={LOD_PLAYERS.filter(({ id }) => !evaluation.tiedLeaders.includes(id)).map(({ id }) => id)} onChange={(id) => update((next) => { next.rageCage.bonusWinner = id; })} /></div>}</div>;
}

function KnifeEditor({ state, update }: EditorProps) {
  return <div><p className="mb-3 text-xs text-white/45">Punkte gemäß Turnierverlauf manuell eintragen.</p>{LOD_PLAYERS.map(({ id }) => <PlayerRow key={id} playerId={id} points={state.knife[id]}><NumberInput value={state.knife[id]} min={0} max={5} label={`${playerName(id)} manuelle Punkte`} onChange={(value) => update((next) => { next.knife[id] = value === null ? null : Math.min(5, Math.max(0, Math.floor(value))); })} /></PlayerRow>)}</div>;
}

const TIME_LEGS: Array<{ id: TimeLeg; label: string }> = [{ id: "fast", label: "2 Fast 2 Drink" }, { id: "blind", label: "Blind 10 Sekunden" }, { id: "visible", label: "Sichtbar 5 Sekunden" }];

function TimeTrialEditor({ state, update }: EditorProps) {
  const overall = calculateTimeTrialPoints(state.timeTrial);
  return <div className="space-y-5">{TIME_LEGS.map(({ id: leg, label }) => {
    const values = Object.fromEntries(LOD_PLAYERS.map(({ id }) => [id, state.timeTrial.values[id][leg]]));
    const evaluation = calculateTimeLegPoints(values, leg, state.timeTrial.manualLegPoints[leg]);
    return <section key={leg}><h5 className="mb-2 text-xs font-black uppercase text-white/55">{label}</h5>{LOD_PLAYERS.map(({ id }) => <PlayerRow key={id} playerId={id} points={evaluation.points[id]}><div className="grid grid-cols-[1fr_auto] items-center gap-2"><NumberInput value={state.timeTrial.values[id][leg]} min={0} step={0.01} label={`${playerName(id)} ${label}`} onChange={(value) => update((next) => { next.timeTrial.values[id][leg] = value === null ? null : Math.max(0, value); })} /><span className="w-12 text-right text-[10px] text-white/35">{state.timeTrial.values[id][leg] === null ? "–" : timeDeviation(leg, state.timeTrial.values[id][leg]!).toFixed(2)}</span></div>{evaluation.ties.includes(id) && <NumberInput value={state.timeTrial.manualLegPoints[leg][id]} min={0} max={10} label={`${playerName(id)} manuelle Teilpunkte bei Gleichstand`} onChange={(value) => update((next) => { next.timeTrial.manualLegPoints[leg][id] = value === null ? null : Math.min(10, Math.max(0, Math.floor(value))); })} />}</PlayerRow>)}</section>;
  })}{overall.totalTies.length > 0 && <section className="rounded-xl bg-amber-400/10 p-3"><p className="mb-2 text-xs text-amber-200">Gleichstand in der Gesamtwertung: Spielpunkte 0–5 manuell auflösen.</p>{overall.totalTies.map((id) => <PlayerRow key={id} playerId={id}><NumberInput value={state.timeTrial.manualFinalPoints[id]} min={0} max={5} label={`${playerName(id)} manuelle Gesamtpunkte Zeit-Dreikampf`} onChange={(value) => update((next) => { next.timeTrial.manualFinalPoints[id] = value === null ? null : Math.min(5, Math.max(0, Math.floor(value))); })} /></PlayerRow>)}</section>}</div>;
}

function ImpactEditor({ state, update }: EditorProps) {
  const points = calculateImpactPoints(state.impact);
  return <div>{LOD_PLAYERS.map(({ id }) => <PlayerRow key={id} playerId={id} points={points[id]}><div className="grid grid-cols-[1fr_auto] items-center gap-2"><NumberInput value={state.impact.rounds[id]} min={0} label={`${playerName(id)} Ausscheidungsrunde`} onChange={(value) => update((next) => { next.impact.rounds[id] = value === null ? null : Math.max(0, Math.floor(value)); })} /><label className="flex min-h-11 items-center gap-1 text-[10px] text-white/45"><input type="radio" name="impact-winner" className="size-5 accent-amber-400" checked={state.impact.winner === id} onChange={() => update((next) => { next.impact.winner = id; })} />Sieger</label></div></PlayerRow>)}</div>;
}

function CurlingEditor({ state, update }: EditorProps) {
  const teams = teamSlices(state.curling.teams);
  const winnerSelect = (key: keyof LastOneDrinkinState["curling"]["winners"], options: number[], label: string) => <label className="grid grid-cols-[1fr_1.2fr] items-center gap-2 text-xs"><span>{label}</span><select className={inputClass} value={state.curling.winners[key] ?? ""} onChange={(event) => update((next) => { next.curling.winners[key] = event.target.value === "" ? null : Number(event.target.value); })}><option value="">Sieger offen</option>{options.map((team) => <option key={team} value={team}>Team {team + 1} · {teams[team].filter(Boolean).length}</option>)}</select></label>;
  const semi1 = state.curling.winners.semi1; const semi2 = state.curling.winners.semi2;
  const finalists = semi1 !== null && semi2 !== null ? [semi1, semi2] : [];
  const third = semi1 !== null && semi2 !== null ? [semi1 === 0 ? 1 : 0, semi2 === 2 ? 3 : 2] : [];
  return <div className="space-y-5"><TeamEditor config={state.curling.teams} onChange={(teams) => update((next) => { next.curling.teams = teams; })} /><div className="space-y-2">{winnerSelect("semi1", [0, 1], "Halbfinale 1")} {winnerSelect("semi2", [2, 3], "Halbfinale 2")} {winnerSelect("third", third, "Spiel um Platz 3")} {winnerSelect("final", finalists, "Finale")}</div></div>;
}

function DisciplineEditor({ holeId, state, update }: EditorProps & { holeId: number }) {
  if (holeId === 1) return <FlipFlopEditor state={state} update={update} />;
  if (holeId === 2) return <CoasterEditor state={state} update={update} />;
  if (holeId === 3) return <FlunkyEditor state={state} update={update} />;
  if (holeId === 4) return <MiniGolfEditor state={state} update={update} />;
  if (holeId === 5) return <BeerPongEditor state={state} update={update} />;
  if (holeId === 6) return <TireEditor state={state} update={update} />;
  if (holeId === 7) return <RageEditor state={state} update={update} />;
  if (holeId === 8) return <KnifeEditor state={state} update={update} />;
  if (holeId === 9) return <TimeTrialEditor state={state} update={update} />;
  if (holeId === 10) return <ImpactEditor state={state} update={update} />;
  return <CurlingEditor state={state} update={update} />;
}

function HoleCard({ hole, state, update }: { hole: HoleDefinition; state: LastOneDrinkinState; update: EditorProps["update"] }) {
  const discipline = evaluateDisciplines(state)[hole.id];
  return (
    <details id={`lod-hole-${hole.id}`} className="panel scroll-mt-40 overflow-hidden" open={hole.id === 1}>
      <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold-400/12 font-display text-2xl font-black text-gold-300">{hole.id}</span>
        <span className="min-w-0 flex-1"><span className="display-title block truncate text-xl">{hole.title}</span><span className="block truncate text-xs text-white/40">PAR {hole.par} · {hole.discipline} · {hole.summary}</span><span className="mt-1 block text-[10px] text-white/30">Golf {golfProgress(state, hole.id)}/11 · Spiel {discipline.completed}/{discipline.total}</span></span>
        <ChevronDown className="size-5 shrink-0 text-white/35" />
      </summary>
      <div className="space-y-7 border-t border-white/[0.07] p-3 sm:p-5"><GolfEditor hole={hole} state={state} update={update} /><section><h4 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-gold-400">Disziplin · {hole.discipline}</h4><DisciplineEditor holeId={hole.id} state={state} update={update} /></section></div>
    </details>
  );
}

function FinalEditor({ state, update }: EditorProps) {
  return <details id="lod-finale" className="panel scroll-mt-40 overflow-hidden"><summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4"><span className="grid size-11 place-items-center rounded-2xl bg-gold-400/12 text-gold-300"><Flag className="size-5" /></span><span className="min-w-0 flex-1"><span className="display-title block text-xl">Alles oder Nichts</span><span className="text-xs text-white/40">Finalpunkte 0–10</span></span><ChevronDown className="size-5 text-white/35" /></summary><div className="border-t border-white/[0.07] p-3 sm:p-5">{LOD_PLAYERS.map(({ id }) => <PlayerRow key={id} playerId={id} points={state.finalPoints[id]}><NumberInput value={state.finalPoints[id]} min={0} max={10} label={`${playerName(id)} Finalpunkte`} onChange={(value) => update((next) => { next.finalPoints[id] = value === null ? null : Math.min(10, Math.max(0, Math.floor(value))); })} /></PlayerRow>)}</div></details>;
}

function Standings({ state }: { state: LastOneDrinkinState }) {
  return <section id="lod-ranking" className="scroll-mt-40"><div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-gold-400">Live</p><h3 className="display-title mt-1 text-3xl">Aktueller Gesamtstand</h3></div><div className="space-y-2">{calculateOverallStandings(state).map((row) => <article key={row.playerId} className="panel p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-gold-400/12 font-display text-xl font-black text-gold-300">{row.rank}</span><span className="min-w-0 flex-1 font-bold">{row.name}</span><span className="font-display text-2xl font-black text-gold-300">{row.total}</span></div><div className="mt-3 grid grid-cols-4 gap-1 border-t border-white/[0.07] pt-3 text-center text-xs"><div><span className="block text-white/35">Golf</span><b>{row.golf}{row.openGolf ? "*" : ""}</b></div><div><span className="block text-white/35">Spiele</span><b>{row.disciplines}{row.openDisciplines ? "*" : ""}</b></div><div><span className="block text-white/35">Finale</span><b>{row.final}{row.finalOpen ? "*" : ""}</b></div><div><span className="block text-white/35">Gesamt</span><b>{row.total}</b></div></div>{(row.openGolf > 0 || row.openDisciplines > 0 || row.finalOpen) && <p className="mt-2 text-[10px] text-white/30">* noch offene Eingaben werden aktuell als 0 gerechnet</p>}</article>)}</div></section>;
}

export function LastOneDrinkinAdmin() {
  const { state, error, setState } = useLastOneDrinkin();
  const update = (recipe: (next: LastOneDrinkinState) => void) => setState((current) => { const next = structuredClone(current); recipe(next); return next; });
  if (error || !state) return <section className="panel border-red-400/25 p-6"><AlertTriangle className="size-7 text-red-300" /><h2 className="display-title mt-3 text-2xl">Lokaler Eventstand nicht verfügbar</h2><p className="mt-2 text-sm text-red-200/75">{error}</p><p className="mt-2 text-xs text-white/40">Der vorhandene Speicher wurde weder überschrieben noch gelöscht.</p></section>;
  return (
    <section className="mt-16 space-y-6 border-t border-white/[0.1] pt-10" aria-labelledby="lod-heading">
      <div><p className="text-xs font-black uppercase tracking-[0.22em] text-gold-400">Nur im Verwaltungsmodus</p><h2 id="lod-heading" className="display-title mt-2 text-4xl sm:text-5xl">Last One Drinkin’ 2026</h2><p className="mt-2 flex items-center gap-2 text-sm text-white/50"><Trophy className="size-4 text-gold-400" /> Spielleitung · automatisch lokal gespeichert</p></div>
      <nav aria-label="Last One Drinkin Schnellnavigation" className="sticky top-20 z-30 -mx-2 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#0b0c0b]/95 p-2 backdrop-blur-xl">{HOLES.map(({ id }) => <a key={id} href={`#lod-hole-${id}`} className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-xs font-black hover:bg-gold-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">{id}</a>)}<a href="#lod-finale" className="grid h-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] px-3 text-xs font-black">Finale</a><a href="#lod-ranking" className="grid h-10 shrink-0 place-items-center rounded-xl bg-gold-400/15 px-3 text-xs font-black text-gold-300">Rangliste</a></nav>
      <div className="space-y-3">{HOLES.map((hole) => <HoleCard key={hole.id} hole={hole} state={state} update={update} />)}<FinalEditor state={state} update={update} /></div>
      <Standings state={state} />
    </section>
  );
}
