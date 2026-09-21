import { shuffle } from "@/lib/dkTools";

export type KnifePlayerId = string;

export interface KnifeBracketState {
  seeds: Array<KnifePlayerId | null>;
  winners: Record<string, KnifePlayerId | null>;
}

type MatchSource =
  | { type: "seed"; index: number }
  | { type: "winner" | "loser"; matchId: string };

interface KnifeMatchDefinition {
  id: string;
  bracket: "winner" | "lower" | "grand-final";
  round: number;
  sourceA: MatchSource;
  sourceB: MatchSource;
}

export interface ResolvedKnifeMatch {
  id: string;
  bracket: KnifeMatchDefinition["bracket"];
  round: number;
  playerA: KnifePlayerId | null;
  playerB: KnifePlayerId | null;
  winner: KnifePlayerId | null;
  loser: KnifePlayerId | null;
  automatic: boolean;
  played: boolean;
  ready: boolean;
  settled: boolean;
}

export interface ResolvedKnifeBracket {
  winnerRounds: ResolvedKnifeMatch[][];
  lowerRounds: ResolvedKnifeMatch[][];
  grandFinal: ResolvedKnifeMatch;
  matches: ResolvedKnifeMatch[];
}

const seed = (index: number): MatchSource => ({ type: "seed", index });
const winner = (matchId: string): MatchSource => ({ type: "winner", matchId });
const loser = (matchId: string): MatchSource => ({ type: "loser", matchId });
const match = (
  id: string,
  bracket: KnifeMatchDefinition["bracket"],
  round: number,
  sourceA: MatchSource,
  sourceB: MatchSource,
): KnifeMatchDefinition => ({ id, bracket, round, sourceA, sourceB });

const WINNER_ROUND_IDS = [
  Array.from({ length: 8 }, (_, index) => `wb-r1-m${index + 1}`),
  Array.from({ length: 4 }, (_, index) => `wb-r2-m${index + 1}`),
  Array.from({ length: 2 }, (_, index) => `wb-r3-m${index + 1}`),
  ["wb-r4-m1"],
] as const;

const LOWER_ROUND_IDS = [
  Array.from({ length: 4 }, (_, index) => `lb-r1-m${index + 1}`),
  Array.from({ length: 4 }, (_, index) => `lb-r2-m${index + 1}`),
  Array.from({ length: 2 }, (_, index) => `lb-r3-m${index + 1}`),
  Array.from({ length: 2 }, (_, index) => `lb-r4-m${index + 1}`),
  ["lb-r5-m1"],
  ["lb-r6-m1"],
] as const;

const MATCH_DEFINITIONS: KnifeMatchDefinition[] = [
  ...WINNER_ROUND_IDS[0].map((id, index) => match(id, "winner", 0, seed(index * 2), seed(index * 2 + 1))),
  ...WINNER_ROUND_IDS[1].map((id, index) => match(id, "winner", 1,
    winner(WINNER_ROUND_IDS[0][index * 2]), winner(WINNER_ROUND_IDS[0][index * 2 + 1]))),
  ...WINNER_ROUND_IDS[2].map((id, index) => match(id, "winner", 2,
    winner(WINNER_ROUND_IDS[1][index * 2]), winner(WINNER_ROUND_IDS[1][index * 2 + 1]))),
  match(WINNER_ROUND_IDS[3][0], "winner", 3,
    winner(WINNER_ROUND_IDS[2][0]), winner(WINNER_ROUND_IDS[2][1])),

  ...LOWER_ROUND_IDS[0].map((id, index) => match(id, "lower", 0,
    loser(WINNER_ROUND_IDS[0][index * 2]), loser(WINNER_ROUND_IDS[0][index * 2 + 1]))),
  match(LOWER_ROUND_IDS[1][0], "lower", 1, winner(LOWER_ROUND_IDS[0][0]), loser(WINNER_ROUND_IDS[1][1])),
  match(LOWER_ROUND_IDS[1][1], "lower", 1, winner(LOWER_ROUND_IDS[0][1]), loser(WINNER_ROUND_IDS[1][0])),
  match(LOWER_ROUND_IDS[1][2], "lower", 1, winner(LOWER_ROUND_IDS[0][2]), loser(WINNER_ROUND_IDS[1][3])),
  match(LOWER_ROUND_IDS[1][3], "lower", 1, winner(LOWER_ROUND_IDS[0][3]), loser(WINNER_ROUND_IDS[1][2])),
  ...LOWER_ROUND_IDS[2].map((id, index) => match(id, "lower", 2,
    winner(LOWER_ROUND_IDS[1][index * 2]), winner(LOWER_ROUND_IDS[1][index * 2 + 1]))),
  match(LOWER_ROUND_IDS[3][0], "lower", 3, winner(LOWER_ROUND_IDS[2][0]), loser(WINNER_ROUND_IDS[2][1])),
  match(LOWER_ROUND_IDS[3][1], "lower", 3, winner(LOWER_ROUND_IDS[2][1]), loser(WINNER_ROUND_IDS[2][0])),
  match(LOWER_ROUND_IDS[4][0], "lower", 4,
    winner(LOWER_ROUND_IDS[3][0]), winner(LOWER_ROUND_IDS[3][1])),
  match(LOWER_ROUND_IDS[5][0], "lower", 5,
    winner(LOWER_ROUND_IDS[4][0]), loser(WINNER_ROUND_IDS[3][0])),
  match("grand-final", "grand-final", 0,
    winner(WINNER_ROUND_IDS[3][0]), winner(LOWER_ROUND_IDS[5][0])),
];

const DEFINITION_BY_ID = new Map(MATCH_DEFINITIONS.map((definition) => [definition.id, definition]));

export function drawKnifeBracket(
  playerIds: KnifePlayerId[],
  random: () => number = Math.random,
): KnifeBracketState {
  if (playerIds.length > 16) throw new Error("Messers Schneide unterstützt höchstens 16 Spieler.");
  const unique = [...new Set(playerIds)];
  if (unique.length !== playerIds.length) throw new Error("Spieler dürfen nicht doppelt gesetzt werden.");

  const seeds: Array<KnifePlayerId | null> = Array(16).fill(null);
  const shuffledPlayers = shuffle(unique, random);
  const shuffledPairs = shuffle(Array.from({ length: 8 }, (_, index) => index), random);
  shuffledPlayers.slice(0, 8).forEach((playerId, index) => {
    const pair = shuffledPairs[index];
    seeds[pair * 2 + (random() < 0.5 ? 0 : 1)] = playerId;
  });
  shuffledPlayers.slice(8).forEach((playerId, index) => {
    const pair = shuffledPairs[index];
    const first = pair * 2;
    seeds[seeds[first] === null ? first : first + 1] = playerId;
  });
  return { seeds, winners: {} };
}

export function isValidKnifeBracketState(
  state: unknown,
  playerIds: KnifePlayerId[],
): state is KnifeBracketState {
  if (!state || typeof state !== "object") return false;
  const candidate = state as Partial<KnifeBracketState>;
  if (!Array.isArray(candidate.seeds) || candidate.seeds.length !== 16) return false;
  if (!candidate.winners || typeof candidate.winners !== "object" || Array.isArray(candidate.winners)) return false;
  const selected = candidate.seeds.filter((value): value is string => typeof value === "string");
  const expected = new Set(playerIds);
  if (selected.length !== expected.size || new Set(selected).size !== selected.length) return false;
  if (selected.some((playerId) => !expected.has(playerId))) return false;
  return Object.entries(candidate.winners).every(([matchId, playerId]) => (
    DEFINITION_BY_ID.has(matchId) && (playerId === null || expected.has(playerId))
  ));
}

export function resolveKnifeBracket(state: KnifeBracketState): ResolvedKnifeBracket {
  const resolved = new Map<string, ResolvedKnifeMatch>();
  const sourceValue = (source: MatchSource): { player: KnifePlayerId | null; settled: boolean } => {
    if (source.type === "seed") return { player: state.seeds[source.index] ?? null, settled: true };
    const feeder = resolved.get(source.matchId);
    if (!feeder?.settled) return { player: null, settled: false };
    return { player: source.type === "winner" ? feeder.winner : feeder.loser, settled: true };
  };

  MATCH_DEFINITIONS.forEach((definition) => {
    const left = sourceValue(definition.sourceA);
    const right = sourceValue(definition.sourceB);
    const sourcesSettled = left.settled && right.settled;
    const duplicate = left.player !== null && left.player === right.player;
    const automatic = sourcesSettled && !duplicate && Boolean(left.player) !== Boolean(right.player);
    const empty = sourcesSettled && !left.player && !right.player;
    const selected = state.winners[definition.id] ?? null;
    const manualWinner = sourcesSettled && left.player && right.player && !duplicate
      && (selected === left.player || selected === right.player) ? selected : null;
    const resolvedWinner = automatic ? left.player ?? right.player : manualWinner;
    const played = Boolean(left.player && right.player && manualWinner);
    const settled = empty || automatic || played;
    const resolvedLoser = played
      ? (manualWinner === left.player ? right.player : left.player)
      : null;
    resolved.set(definition.id, {
      id: definition.id,
      bracket: definition.bracket,
      round: definition.round,
      playerA: left.player,
      playerB: right.player,
      winner: resolvedWinner,
      loser: resolvedLoser,
      automatic,
      played,
      ready: sourcesSettled && Boolean(left.player && right.player) && !duplicate && !played,
      settled,
    });
  });

  const round = (ids: readonly string[]) => ids.map((id) => resolved.get(id)!);
  const matches = MATCH_DEFINITIONS.map(({ id }) => resolved.get(id)!);
  return {
    winnerRounds: WINNER_ROUND_IDS.map(round),
    lowerRounds: LOWER_ROUND_IDS.map(round),
    grandFinal: resolved.get("grand-final")!,
    matches,
  };
}

function dependentMatchIds(matchId: string): Set<string> {
  const dependents = new Set<string>();
  const pending = [matchId];
  while (pending.length > 0) {
    const sourceId = pending.shift()!;
    MATCH_DEFINITIONS.forEach((definition) => {
      if (dependents.has(definition.id)) return;
      const sources = [definition.sourceA, definition.sourceB];
      if (sources.some((source) => source.type !== "seed" && source.matchId === sourceId)) {
        dependents.add(definition.id);
        pending.push(definition.id);
      }
    });
  }
  return dependents;
}

export function setKnifeMatchWinner(
  state: KnifeBracketState,
  matchId: string,
  selectedWinner: KnifePlayerId | null,
): KnifeBracketState {
  const currentMatch = resolveKnifeBracket(state).matches.find(({ id }) => id === matchId);
  if (!currentMatch || currentMatch.automatic || (!currentMatch.ready && !currentMatch.played)) return state;
  if (selectedWinner !== null
    && selectedWinner !== currentMatch.playerA
    && selectedWinner !== currentMatch.playerB) return state;
  if ((state.winners[matchId] ?? null) === selectedWinner) return state;

  const winners = { ...state.winners };
  dependentMatchIds(matchId).forEach((dependentId) => { delete winners[dependentId]; });
  if (selectedWinner === null) delete winners[matchId];
  else winners[matchId] = selectedWinner;
  return { ...state, winners };
}

export function calculateKnifeBracketPoints(
  state: KnifeBracketState,
  playerIds: KnifePlayerId[],
): Record<KnifePlayerId, number | null> {
  const bracket = resolveKnifeBracket(state);
  if (!bracket.grandFinal.played || !bracket.grandFinal.winner || !bracket.grandFinal.loser) {
    return Object.fromEntries(playerIds.map((playerId) => [playerId, null]));
  }
  const points = Object.fromEntries(playerIds.map((playerId) => [playerId, 0])) as Record<KnifePlayerId, number | null>;
  points[bracket.grandFinal.winner] = 5;
  points[bracket.grandFinal.loser] = 4;
  const third = bracket.lowerRounds[5][0].loser;
  const fourth = bracket.lowerRounds[4][0].loser;
  if (third) points[third] = 3;
  if (fourth) points[fourth] = 2;
  bracket.lowerRounds[3].forEach(({ loser: fifth }) => { if (fifth) points[fifth] = 1; });
  return points;
}

export function knifeBracketProgress(state: KnifeBracketState): { completed: number; total: number } {
  const playerCount = state.seeds.filter(Boolean).length;
  return {
    completed: resolveKnifeBracket(state).matches.filter(({ played }) => played).length,
    total: playerCount > 1 ? playerCount * 2 - 2 : 0,
  };
}

