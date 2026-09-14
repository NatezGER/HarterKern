import { DK_CREW, shuffle } from "@/lib/dkTools";

export const LAST_ONE_DRINKIN_STORAGE_KEY = "harter-kern:last-one-drinkin:2026:v1";

export const LOD_PLAYERS = DK_CREW.map((name) => ({
  id: name.toLocaleLowerCase("de-DE").replace("ä", "ae"),
  name,
}));

export type LodPlayerId = string;
export type HoleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type TimeLeg = "fast" | "blind" | "visible";

export interface HoleDefinition {
  id: HoleId;
  title: string;
  par: number;
  discipline: string;
  summary: string;
}

export const HOLES: HoleDefinition[] = [
  { id: 1, title: "Flip-Flop", par: 2, discipline: "Bottle Flip + Flip Cup", summary: "5 Teams · Liga" },
  { id: 2, title: "Die letzte Kante", par: 2, discipline: "Untersetzer", summary: "Einzel · Ausscheidung" },
  { id: 3, title: "Durststrecke", par: 3, discipline: "Flunkyball", summary: "3 Runden · 5 vs. 6" },
  { id: 4, title: "Das kleine Grün", par: 3, discipline: "Mini Golf", summary: "3 Bahnen" },
  { id: 5, title: "Becherjagd", par: 3, discipline: "Bierpong", summary: "Trefferwertung" },
  { id: 6, title: "Auf der Rolle", par: 4, discipline: "Reifenrollen", summary: "16er-K.-o. · 5 Freilose" },
  { id: 7, title: "Im Kreis", par: 4, discipline: "Rage Cage", summary: "4 Runden · 10 Leben" },
  { id: 8, title: "Messers Schneide", par: 5, discipline: "Obst halbieren", summary: "Punkte manuell" },
  { id: 9, title: "Gegen die Uhr", par: 4, discipline: "Zeit-Dreikampf", summary: "3 Teilwertungen" },
  { id: 10, title: "Der Aufprall", par: 4, discipline: "Fußball – Last Man Standing", summary: "Ausscheidungsrunden" },
  { id: 11, title: "Glatteis", par: 5, discipline: "Mini-Curling / Shuffleboard", summary: "4 Teams · Turnier" },
];

export interface GolfEntry {
  strokes: number | null;
  holed: boolean;
  failed: boolean;
}

export interface TeamConfig {
  sizes: number[];
  slots: Array<LodPlayerId | null>;
}

export interface FlunkyRound {
  teams: TeamConfig;
  winner: "A" | "B" | null;
}

export interface TireBracketState {
  seeds: Array<LodPlayerId | null>;
  winners: Record<string, LodPlayerId | null>;
}

export interface LastOneDrinkinState {
  version: 1;
  golf: Record<HoleId, Record<LodPlayerId, GolfEntry>>;
  flipFlop: { teams: TeamConfig; winners: Record<string, number | null> };
  coaster: { stages: Record<LodPlayerId, "first" | "second" | "third" | "fourth" | "final" | null>; finalWinner: LodPlayerId | null };
  flunky: { rounds: FlunkyRound[] };
  miniGolf: Record<LodPlayerId, [number | null, number | null, number | null]>;
  beerPong: Record<LodPlayerId, number | null>;
  tire: TireBracketState;
  rageCage: { results: Record<LodPlayerId, { round: number | null; lives: number | null }>; bonusWinner: LodPlayerId | null };
  knife: Record<LodPlayerId, number | null>;
  timeTrial: {
    values: Record<LodPlayerId, Record<TimeLeg, number | null>>;
    manualLegPoints: Record<TimeLeg, Record<LodPlayerId, number | null>>;
    manualFinalPoints: Record<LodPlayerId, number | null>;
  };
  impact: { rounds: Record<LodPlayerId, number | null>; winner: LodPlayerId | null };
  curling: { teams: TeamConfig; winners: Record<"semi1" | "semi2" | "third" | "final", number | null> };
  finalPoints: Record<LodPlayerId, number | null>;
}

function playerRecord<T>(create: () => T): Record<LodPlayerId, T> {
  return Object.fromEntries(LOD_PLAYERS.map(({ id }) => [id, create()]));
}

export function createInitialLastOneDrinkinState(): LastOneDrinkinState {
  const golf = Object.fromEntries(HOLES.map(({ id }) => [id, playerRecord(() => ({ strokes: null, holed: false, failed: false }))])) as LastOneDrinkinState["golf"];
  return {
    version: 1,
    golf,
    flipFlop: { teams: { sizes: [2, 2, 2, 2, 3], slots: Array(11).fill(null) }, winners: {} },
    coaster: { stages: playerRecord(() => null), finalWinner: null },
    flunky: { rounds: Array.from({ length: 3 }, () => ({ teams: { sizes: [5, 6], slots: Array(11).fill(null) }, winner: null })) },
    miniGolf: playerRecord(() => [null, null, null]),
    beerPong: playerRecord(() => null),
    tire: { seeds: Array(16).fill(null), winners: {} },
    rageCage: { results: playerRecord(() => ({ round: null, lives: null })), bonusWinner: null },
    knife: playerRecord(() => null),
    timeTrial: {
      values: playerRecord(() => ({ fast: null, blind: null, visible: null })),
      manualLegPoints: {
        fast: playerRecord(() => null), blind: playerRecord(() => null), visible: playerRecord(() => null),
      },
      manualFinalPoints: playerRecord(() => null),
    },
    impact: { rounds: playerRecord(() => null), winner: null },
    curling: { teams: { sizes: [3, 3, 3, 2], slots: Array(11).fill(null) }, winners: { semi1: null, semi2: null, third: null, final: null } },
    finalPoints: playerRecord(() => null),
  };
}

export function serializeLastOneDrinkinState(state: LastOneDrinkinState): string {
  return JSON.stringify(state);
}

function isCompatibleState(value: unknown): value is LastOneDrinkinState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<LastOneDrinkinState>;
  const requiredObjects = [
    state.golf, state.flipFlop, state.coaster, state.flunky, state.miniGolf, state.beerPong,
    state.tire, state.rageCage, state.knife, state.timeTrial, state.impact, state.curling,
    state.finalPoints,
  ];
  if (state.version !== 1 || requiredObjects.some((entry) => !entry || typeof entry !== "object")) return false;
  if (!Array.isArray(state.flunky?.rounds) || state.flunky.rounds.length !== 3) return false;
  if (!Array.isArray(state.tire?.seeds) || state.tire.seeds.length !== 16) return false;
  if (!Array.isArray(state.flipFlop?.teams?.slots) || state.flipFlop.teams.slots.length !== 11) return false;
  if (!Array.isArray(state.curling?.teams?.slots) || state.curling.teams.slots.length !== 11) return false;
  return HOLES.every(({ id }) => state.golf?.[id] && LOD_PLAYERS.every(({ id: playerId }) => state.golf?.[id]?.[playerId]))
    && LOD_PLAYERS.every(({ id }) => id in state.finalPoints! && Array.isArray(state.miniGolf?.[id]) && state.miniGolf![id].length === 3);
}

export function restoreLastOneDrinkinState(raw: string): { state: LastOneDrinkinState | null; error: string | null } {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isCompatibleState(parsed)) {
      return { state: null, error: "Die gespeicherten Eventdaten sind unvollständig oder stammen aus einer inkompatiblen Version." };
    }
    return { state: parsed, error: null };
  } catch {
    return { state: null, error: "Die gespeicherten Eventdaten konnten nicht gelesen werden. Sie wurden nicht verändert." };
  }
}

export function calculateGolfPoints(par: number, entry: GolfEntry): number | null {
  if (entry.failed) return 0;
  if (entry.strokes === null) return null;
  const strokes = Math.min(par, Math.max(1, Math.floor(entry.strokes)));
  return Math.max(0, par - strokes + 1) + (entry.holed ? 1 : 0);
}

export function normalizeGolfEntry(par: number, entry: GolfEntry): GolfEntry {
  if (entry.failed) return { strokes: null, holed: false, failed: true };
  return {
    strokes: entry.strokes === null ? null : Math.min(par, Math.max(1, Math.floor(entry.strokes))),
    holed: entry.holed,
    failed: false,
  };
}

export function teamSlices(config: TeamConfig): Array<Array<LodPlayerId | null>> {
  let cursor = 0;
  return config.sizes.map((size) => {
    const team = config.slots.slice(cursor, cursor + size);
    cursor += size;
    return team;
  });
}

export function validateTeamConfig(config: TeamConfig): { valid: boolean; duplicateIds: LodPlayerId[]; missing: number } {
  const selected = config.slots.filter((id): id is string => id !== null);
  const duplicateIds = [...new Set(selected.filter((id, index) => selected.indexOf(id) !== index))];
  return { valid: duplicateIds.length === 0 && selected.length === config.slots.length, duplicateIds, missing: config.slots.length - selected.length };
}

export function fillEmptyTeamSlots(config: TeamConfig, random: () => number = Math.random): TeamConfig {
  const used = new Set(config.slots.filter((id): id is string => id !== null));
  const available = shuffle(LOD_PLAYERS.map(({ id }) => id).filter((id) => !used.has(id)), random);
  let cursor = 0;
  return { ...config, slots: config.slots.map((id) => id ?? available[cursor++] ?? null) };
}

export function flipFlopMatches(): Array<[number, number]> {
  const matches: Array<[number, number]> = [];
  for (let first = 0; first < 5; first += 1) for (let second = first + 1; second < 5; second += 1) matches.push([first, second]);
  return matches;
}

export function calculateFlipFlopPoints(state: LastOneDrinkinState["flipFlop"]): Record<LodPlayerId, number> {
  const points = playerRecord(() => 0);
  if (!validateTeamConfig(state.teams).valid) return points;
  const teams = teamSlices(state.teams);
  flipFlopMatches().forEach((_, index) => {
    const winner = state.winners[`match-${index}`];
    if (winner === null || winner === undefined) return;
    teams[winner]?.forEach((id) => { if (id) points[id] += 1; });
  });
  return points;
}

export function calculateCoasterPoints(state: LastOneDrinkinState["coaster"]): Record<LodPlayerId, number | null> {
  const values = { first: 0, second: 1, third: 2, fourth: 3 } as const;
  return Object.fromEntries(LOD_PLAYERS.map(({ id }) => {
    const stage = state.stages[id];
    if (!stage) return [id, null];
    if (stage === "final") return [id, state.finalWinner === id ? 5 : 4];
    return [id, values[stage]];
  }));
}

export function calculateFlunkyPoints(state: LastOneDrinkinState["flunky"]): Record<LodPlayerId, number> {
  const points = playerRecord(() => 0);
  state.rounds.forEach((round) => {
    if (!round.winner || !validateTeamConfig(round.teams).valid) return;
    const teams = teamSlices(round.teams);
    const winningTeam = round.winner === "A" ? teams[0] : teams[1];
    winningTeam.forEach((id) => { if (id) points[id] += 2; });
  });
  return points;
}

export function calculateMiniGolfPoints(values: LastOneDrinkinState["miniGolf"]): Record<LodPlayerId, number | null> {
  const totals = Object.fromEntries(LOD_PLAYERS.map(({ id }) => [id, values[id].every((value) => value !== null) ? values[id].reduce<number>((sum, value) => sum + (value ?? 0), 0) : null]));
  const completed = Object.values(totals).filter((total): total is number => total !== null);
  const best = completed.length ? Math.min(...completed) : null;
  return Object.fromEntries(LOD_PLAYERS.map(({ id }) => [id, totals[id] === null || best === null ? null : Math.max(0, 5 - (totals[id] - best))]));
}

export function calculateBeerPongPoints(hits: number | null): number | null {
  return hits === null ? null : Math.min(10, Math.max(0, Math.floor(hits)));
}

export interface ResolvedTireMatch { id: string; round: number; playerA: LodPlayerId | null; playerB: LodPlayerId | null; winner: LodPlayerId | null; played: boolean }

export function resolveTireBracket(state: TireBracketState): ResolvedTireMatch[][] {
  let entrants = [...state.seeds];
  const rounds: ResolvedTireMatch[][] = [];
  for (let round = 0; entrants.length >= 2; round += 1) {
    const matches: ResolvedTireMatch[] = [];
    const next: Array<LodPlayerId | null> = [];
    for (let index = 0; index < entrants.length; index += 2) {
      const playerA = entrants[index] ?? null;
      const playerB = entrants[index + 1] ?? null;
      const id = `r${round}-m${index / 2}`;
      const selected = state.winners[id];
      const automatic = round === 0
        ? playerA && !playerB ? playerA : playerB && !playerA ? playerB : null
        : null;
      const winner = automatic ?? (selected && (selected === playerA || selected === playerB) ? selected : null);
      matches.push({ id, round, playerA, playerB, winner, played: Boolean(playerA && playerB && winner) });
      next.push(winner);
    }
    rounds.push(matches);
    entrants = next;
  }
  return rounds;
}

export function calculateTirePoints(state: TireBracketState): Record<LodPlayerId, number> {
  const points = playerRecord(() => 0);
  resolveTireBracket(state).flat().forEach((match) => { if (match.played && match.winner) points[match.winner] += 1; });
  return points;
}

export function fillEmptyTireSeeds(state: TireBracketState, random: () => number = Math.random): TireBracketState {
  const used = new Set(state.seeds.filter((id): id is string => id !== null));
  const players = shuffle(LOD_PLAYERS.map(({ id }) => id).filter((id) => !used.has(id)), random);
  const emptyPairsFirst = shuffle(Array.from({ length: 8 }, (_, pair) => pair)
    .filter((pair) => state.seeds[pair * 2] === null && state.seeds[pair * 2 + 1] === null), random)
    .map((pair) => pair * 2 + (random() < 0.5 ? 0 : 1));
  const remainingEmpty = shuffle(state.seeds.map((id, index) => id === null ? index : -1)
    .filter((index) => index >= 0 && !emptyPairsFirst.includes(index)), random);
  const targetPositions = [...emptyPairsFirst, ...remainingEmpty];
  const seeds = [...state.seeds];
  players.forEach((id, index) => { if (targetPositions[index] !== undefined) seeds[targetPositions[index]] = id; });
  return { ...state, seeds };
}

export function calculateRageCagePoints(state: LastOneDrinkinState["rageCage"]): { points: Record<LodPlayerId, number | null>; tiedLeaders: LodPlayerId[] } {
  const survivors = LOD_PLAYERS.map(({ id }) => ({ id, result: state.results[id] }))
    .filter(({ result }) => result.round === 4 && result.lives !== null);
  const maxLives = survivors.length ? Math.max(...survivors.map(({ result }) => result.lives ?? 0)) : null;
  const tiedLeaders = maxLives === null ? [] : survivors.filter(({ result }) => result.lives === maxLives).map(({ id }) => id);
  const automaticWinner = tiedLeaders.length === 1 ? tiedLeaders[0] : null;
  const validManualWinner = tiedLeaders.includes(state.bonusWinner ?? "") ? state.bonusWinner : null;
  const winner = automaticWinner ?? validManualWinner;
  return {
    points: Object.fromEntries(LOD_PLAYERS.map(({ id }) => {
      const round = state.results[id].round;
      return [id, round === null ? null : winner === id ? 5 : Math.min(4, Math.max(0, round))];
    })),
    tiedLeaders,
  };
}

export function calculateKnifePoints(value: number | null): number | null {
  return value === null ? null : Math.min(5, Math.max(0, Math.floor(value)));
}

export function calculateFinalPoints(value: number | null): number | null {
  return value === null ? null : Math.min(10, Math.max(0, Math.floor(value)));
}

export function timeDeviation(leg: TimeLeg, value: number): number {
  if (leg === "blind") return Math.abs(value - 10);
  if (leg === "visible") return Math.abs(value - 5);
  return value;
}

export function calculateTimeLegPoints(
  values: Record<LodPlayerId, number | null>,
  leg: TimeLeg,
  manual: Record<LodPlayerId, number | null>,
): { points: Record<LodPlayerId, number | null>; ties: LodPlayerId[] } {
  const completed = LOD_PLAYERS.map(({ id }) => ({ id, score: values[id] === null ? null : timeDeviation(leg, values[id]!) }))
    .filter((entry): entry is { id: string; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score);
  const ties = completed.filter((entry, index, all) => all.some((other, otherIndex) => otherIndex !== index && other.score === entry.score)).map(({ id }) => id);
  const points = playerRecord<number | null>(() => null);
  completed.forEach((entry, index) => { points[entry.id] = ties.includes(entry.id) ? manual[entry.id] : Math.max(0, 10 - index); });
  return { points, ties };
}

export function calculateTimeTrialPoints(state: LastOneDrinkinState["timeTrial"]): { points: Record<LodPlayerId, number | null>; totalTies: LodPlayerId[] } {
  const legs = (["fast", "blind", "visible"] as TimeLeg[]).map((leg) => calculateTimeLegPoints(
    Object.fromEntries(LOD_PLAYERS.map(({ id }) => [id, state.values[id][leg]])), leg, state.manualLegPoints[leg],
  ));
  const totals = playerRecord<number | null>(() => null);
  LOD_PLAYERS.forEach(({ id }) => {
    const values = legs.map(({ points }) => points[id]);
    if (values.every((value) => value !== null)) totals[id] = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  });
  const completed = LOD_PLAYERS.map(({ id }) => ({ id, total: totals[id] })).filter((entry): entry is { id: string; total: number } => entry.total !== null).sort((a, b) => b.total - a.total);
  const totalTies = completed.filter((entry, index, all) => all.some((other, otherIndex) => otherIndex !== index && other.total === entry.total)).map(({ id }) => id);
  const points = playerRecord<number | null>(() => null);
  completed.forEach((entry, index) => { points[entry.id] = totalTies.includes(entry.id) ? state.manualFinalPoints[entry.id] : Math.max(0, 5 - index); });
  return { points, totalTies };
}

export interface TimeTrialTableRow {
  rank: number | null;
  playerId: LodPlayerId;
  name: string;
  raw: Record<TimeLeg, number | null>;
  placements: Record<TimeLeg, number | null>;
  internalTotal: number | null;
  disciplinePoints: number | null;
}

export function createTimeTrialTableRows(state: LastOneDrinkinState["timeTrial"]): TimeTrialTableRow[] {
  const legEvaluations = Object.fromEntries((["fast", "blind", "visible"] as TimeLeg[]).map((leg) => [leg, calculateTimeLegPoints(
    Object.fromEntries(LOD_PLAYERS.map(({ id }) => [id, state.values[id][leg]])), leg, state.manualLegPoints[leg],
  )])) as Record<TimeLeg, ReturnType<typeof calculateTimeLegPoints>>;
  const discipline = calculateTimeTrialPoints(state);
  const rows = LOD_PLAYERS.map(({ id, name }) => {
    const legPoints = (["fast", "blind", "visible"] as TimeLeg[]).map((leg) => legEvaluations[leg].points[id]);
    const internalTotal = legPoints.every((value) => value !== null)
      ? legPoints.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
    return {
      rank: null,
      playerId: id,
      name,
      raw: { ...state.values[id] },
      placements: Object.fromEntries((["fast", "blind", "visible"] as TimeLeg[]).map((leg) => {
        const points = legEvaluations[leg].points[id];
        return [leg, points === null ? null : 11 - points];
      })) as Record<TimeLeg, number | null>,
      internalTotal,
      disciplinePoints: discipline.points[id],
    };
  }).sort((a, b) => (b.internalTotal ?? -1) - (a.internalTotal ?? -1));

  let rank = 0;
  return rows.map((row, index) => {
    if (row.internalTotal === null) return row;
    if (index === 0 || row.internalTotal !== rows[index - 1].internalTotal) rank = index + 1;
    return { ...row, rank };
  });
}

export function calculateImpactPoints(state: LastOneDrinkinState["impact"]): Record<LodPlayerId, number | null> {
  const rounds = [...new Set(LOD_PLAYERS
    .filter(({ id }) => id !== state.winner)
    .map(({ id }) => state.rounds[id])
    .filter((round): round is number => round !== null))].sort((a, b) => b - a);
  return Object.fromEntries(LOD_PLAYERS.map(({ id }) => {
    if (state.winner === id) return [id, 5];
    const round = state.rounds[id];
    if (round === null || !state.winner) return [id, null];
    return [id, Math.max(0, 4 - rounds.indexOf(round))];
  }));
}

export function calculateCurlingPoints(state: LastOneDrinkinState["curling"]): Record<LodPlayerId, number | null> {
  const teams = teamSlices(state.teams);
  const { semi1, semi2, third, final } = state.winners;
  const points = playerRecord<number | null>(() => null);
  if (!validateTeamConfig(state.teams).valid || semi1 === null || semi2 === null || third === null || final === null) return points;
  const finalists = [semi1, semi2];
  const thirdCandidates = [semi1 === 0 ? 1 : 0, semi2 === 2 ? 3 : 2];
  if (!finalists.includes(final) || !thirdCandidates.includes(third)) return points;
  const placements = [final, finalists.find((team) => team !== final)!, third, thirdCandidates.find((team) => team !== third)!];
  const awards = [4, 3, 2, 0];
  placements.forEach((teamIndex, place) => teams[teamIndex].forEach((id) => { if (id) points[id] = awards[place]; }));
  return points;
}

export interface DisciplineEvaluation { points: Record<LodPlayerId, number | null>; completed: number; total: number }

export function evaluateDisciplines(state: LastOneDrinkinState): Record<HoleId, DisciplineEvaluation> {
  const wrap = (points: Record<LodPlayerId, number | null>, completed: number, total: number): DisciplineEvaluation => ({ points, completed, total });
  const tireMatches = resolveTireBracket(state.tire).flat();
  const rage = calculateRageCagePoints(state.rageCage);
  const time = calculateTimeTrialPoints(state.timeTrial);
  return {
    1: wrap(calculateFlipFlopPoints(state.flipFlop), Object.values(state.flipFlop.winners).filter((winner) => winner !== null).length, 10),
    2: wrap(calculateCoasterPoints(state.coaster), Object.values(state.coaster.stages).filter(Boolean).length + (state.coaster.finalWinner ? 1 : 0), 12),
    3: wrap(calculateFlunkyPoints(state.flunky), state.flunky.rounds.filter(({ winner }) => winner !== null).length, 3),
    4: wrap(calculateMiniGolfPoints(state.miniGolf), Object.values(state.miniGolf).filter((values) => values.every((value) => value !== null)).length, 11),
    5: wrap(Object.fromEntries(LOD_PLAYERS.map(({ id }) => [id, calculateBeerPongPoints(state.beerPong[id])])), Object.values(state.beerPong).filter((value) => value !== null).length, 11),
    6: wrap(calculateTirePoints(state.tire), tireMatches.filter(({ played }) => played).length, 10),
    7: wrap(rage.points, Object.values(state.rageCage.results).filter(({ round }) => round !== null).length, 11),
    8: wrap(Object.fromEntries(LOD_PLAYERS.map(({ id }) => [id, calculateKnifePoints(state.knife[id])])), Object.values(state.knife).filter((value) => value !== null).length, 11),
    9: wrap(time.points, LOD_PLAYERS.filter(({ id }) => Object.values(state.timeTrial.values[id]).every((value) => value !== null) && time.points[id] !== null).length, 11),
    10: wrap(calculateImpactPoints(state.impact), Object.values(state.impact.rounds).filter((value) => value !== null).length + (state.impact.winner ? 1 : 0), 12),
    11: wrap(calculateCurlingPoints(state.curling), Object.values(state.curling.winners).filter((value) => value !== null).length, 4),
  };
}

export interface LodStanding { rank: number; playerId: LodPlayerId; name: string; golf: number; disciplines: number; final: number; total: number; openGolf: number; openDisciplines: number; finalOpen: boolean }

export interface ScoreboardCell { points: number; open: boolean }
export interface ScoreboardRow { playerId: LodPlayerId; name: string; cells: ScoreboardCell[]; sum: number }

export function createDisciplineScoreboard(state: LastOneDrinkinState): ScoreboardRow[] {
  const evaluations = evaluateDisciplines(state);
  return LOD_PLAYERS.map(({ id, name }) => {
    const cells = HOLES.map(({ id: holeId }) => ({
      points: evaluations[holeId].points[id] ?? 0,
      open: evaluations[holeId].points[id] === null || evaluations[holeId].completed < evaluations[holeId].total,
    }));
    return { playerId: id, name, cells, sum: cells.reduce((sum, cell) => sum + cell.points, 0) };
  });
}

export function createGolfScoreboard(state: LastOneDrinkinState): ScoreboardRow[] {
  return LOD_PLAYERS.map(({ id, name }) => {
    const cells = HOLES.map(({ id: holeId, par }) => {
      const value = calculateGolfPoints(par, state.golf[holeId][id]);
      return { points: value ?? 0, open: value === null };
    });
    return { playerId: id, name, cells, sum: cells.reduce((sum, cell) => sum + cell.points, 0) };
  });
}

export function calculateOverallStandings(state: LastOneDrinkinState): LodStanding[] {
  const disciplines = evaluateDisciplines(state);
  const rows = LOD_PLAYERS.map(({ id, name }) => {
    const golfValues = HOLES.map(({ id: holeId, par }) => calculateGolfPoints(par, state.golf[holeId][id]));
    const disciplineValues = HOLES.map(({ id: holeId }) => disciplines[holeId].points[id]);
    const golf = golfValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const disciplinePoints = disciplineValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const final = calculateFinalPoints(state.finalPoints[id]) ?? 0;
    return { rank: 0, playerId: id, name, golf, disciplines: disciplinePoints, final, total: golf + disciplinePoints + final, openGolf: golfValues.filter((value) => value === null).length, openDisciplines: HOLES.filter(({ id: holeId }) => disciplines[holeId].completed < disciplines[holeId].total).length, finalOpen: state.finalPoints[id] === null };
  }).sort((a, b) => b.total - a.total);
  let rank = 1;
  return rows.map((row, index) => {
    if (index > 0 && row.total !== rows[index - 1].total) rank = index + 1;
    return { ...row, rank };
  });
}

export function golfProgress(state: LastOneDrinkinState, holeId: HoleId): number {
  const par = HOLES.find(({ id }) => id === holeId)!.par;
  return LOD_PLAYERS.filter(({ id }) => calculateGolfPoints(par, state.golf[holeId][id]) !== null).length;
}
