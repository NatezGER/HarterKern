import { describe, expect, it } from "vitest";
import {
  calculateBeerPongPoints,
  calculateCoasterPoints,
  calculateCurlingPoints,
  calculateFinalPoints,
  calculateFlipFlopPoints,
  calculateFlunkyPoints,
  calculateGolfPoints,
  calculateImpactPoints,
  calculateKnifeBracketPoints,
  calculateMiniGolfPoints,
  calculateOverallStandings,
  calculateRageCagePoints,
  calculateTimeLegPoints,
  calculateTimeTrialPoints,
  calculateTirePoints,
  createInitialLastOneDrinkinState,
  createDisciplineScoreboard,
  createGolfScoreboard,
  createKnifeBracketState,
  createTimeTrialTableRows,
  evaluateDisciplines,
  fillEmptyTeamSlots,
  fillEmptyTireSeeds,
  flipFlopMatches,
  LOD_PLAYERS,
  knifeBracketProgress,
  normalizeGolfEntry,
  resolveKnifeBracket,
  resolveTireBracket,
  restoreLastOneDrinkinState,
  serializeLastOneDrinkinState,
  setKnifeMatchWinner,
  timeDeviation,
  validateTeamConfig,
} from "@/lib/lastOneDrinkin";

const ids = LOD_PLAYERS.map(({ id }) => id);

function completeKnifeBracket(initial = createKnifeBracketState(() => 0.37)) {
  let state = initial;
  for (let step = 0; step < 40; step += 1) {
    const ready = resolveKnifeBracket(state).matches.find((match) => match.ready);
    if (!ready) return state;
    state = setKnifeMatchWinner(state, ready.id, ready.playerA);
  }
  throw new Error("Knife bracket did not settle within 40 decisions.");
}

describe("Last One Drinkin persistence", () => {
  it("serializes and restores the complete event state including open values", () => {
    const state = createInitialLastOneDrinkinState();
    state.golf[1][ids[0]].strokes = 2;
    const knifeMatch = resolveKnifeBracket(state.knife).matches.find((match) => match.ready)!;
    state.knife = setKnifeMatchWinner(state.knife, knifeMatch.id, knifeMatch.playerA);
    const raw = serializeLastOneDrinkinState(state);
    const restored = restoreLastOneDrinkinState(raw);
    expect(restored.error).toBeNull();
    expect(restored.state?.golf[1][ids[0]].strokes).toBe(2);
    expect(restored.state?.golf[1][ids[1]].strokes).toBeNull();
    expect(restored.state?.knife).toEqual(state.knife);
    expect(raw).toContain('"strokes":null');
  });

  it("reports incompatible data without replacing or deleting it", () => {
    const raw = '{"version":99,"important":"keep"}';
    const restored = restoreLastOneDrinkinState(raw);
    expect(restored.state).toBeNull();
    expect(restored.error).toContain("inkompatiblen Version");
    expect(raw).toContain("important");
  });

  it("rejects a superficially versioned but structurally incomplete state", () => {
    const restored = restoreLastOneDrinkinState('{"version":1,"golf":{},"flipFlop":{},"finalPoints":{},"timeTrial":{}}');
    expect(restored.state).toBeNull();
    expect(restored.error).toContain("unvollständig");
  });
});

describe("Beer Golf", () => {
  it.each([
    [1, false, 4], [1, true, 5], [2, false, 3], [2, true, 4], [4, false, 1],
  ])("scores PAR 4 with %i strokes and holed=%s", (strokes, holed, expected) => {
    expect(calculateGolfPoints(4, { strokes, holed, failed: false })).toBe(expected);
  });

  it("scores a failed hole as zero and prevents holed plus failed", () => {
    expect(calculateGolfPoints(4, { strokes: 2, holed: true, failed: true })).toBe(0);
    expect(normalizeGolfEntry(4, { strokes: 2, holed: true, failed: true })).toEqual({ strokes: null, holed: false, failed: true });
  });
});

describe("team disciplines", () => {
  it("creates five valid Flip-Flop teams and ten matches, awarding one point per real win", () => {
    const state = createInitialLastOneDrinkinState();
    state.flipFlop.teams.slots = [...ids];
    expect(state.flipFlop.teams.sizes).toEqual([2, 2, 2, 2, 3]);
    expect(flipFlopMatches()).toHaveLength(10);
    flipFlopMatches().forEach(([a], index) => { state.flipFlop.winners[`match-${index}`] = a; });
    const points = calculateFlipFlopPoints(state.flipFlop);
    expect(points[ids[0]]).toBe(4);
    expect(points[ids[1]]).toBe(4);
  });

  it("keeps three independent 5-vs-6 Flunkyball lineups and awards two per win", () => {
    const state = createInitialLastOneDrinkinState();
    state.flunky.rounds.forEach((round, index) => {
      round.teams.slots = [...ids.slice(index), ...ids.slice(0, index)];
      round.winner = "A";
      expect(round.teams.sizes).toEqual([5, 6]);
    });
    expect(state.flunky.rounds[0].teams.slots).not.toEqual(state.flunky.rounds[1].teams.slots);
    expect(calculateFlunkyPoints(state.flunky)[ids[2]]).toBe(6);
  });

  it("fills only empty slots and validates unique 3/3/3/2 curling teams", () => {
    const config = { sizes: [3, 3, 3, 2], slots: [ids[0], ...Array(10).fill(null)] };
    const filled = fillEmptyTeamSlots(config, () => 0.4);
    expect(filled.slots[0]).toBe(ids[0]);
    expect(validateTeamConfig(filled)).toEqual({ valid: true, duplicateIds: [], missing: 0 });
  });

  it("maps curling placements to 4/3/2/0 for every team member", () => {
    const state = createInitialLastOneDrinkinState();
    state.curling.teams.slots = [...ids];
    state.curling.winners = { semi1: 0, semi2: 2, third: 1, final: 0 };
    const points = calculateCurlingPoints(state.curling);
    expect(state.curling.teams.sizes).toEqual([3, 3, 3, 2]);
    expect([points[ids[0]], points[ids[3]], points[ids[6]], points[ids[9]]]).toEqual([4, 2, 3, 0]);
  });
});

describe("individual disciplines", () => {
  it("derives the fixed Untersetzer groups and final winner points", () => {
    const state = createInitialLastOneDrinkinState();
    const stages = ["first", "first", "second", "second", "third", "third", "fourth", "fourth", "final", "final", "final"] as const;
    ids.forEach((id, index) => { state.coaster.stages[id] = stages[index]; });
    state.coaster.finalWinner = ids[10];
    const points = calculateCoasterPoints(state.coaster);
    expect(ids.map((id) => points[id])).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  });

  it("uses the best complete Mini-Golf total as the five-point benchmark, including ties and zero floor", () => {
    const state = createInitialLastOneDrinkinState();
    state.miniGolf[ids[0]] = [2, 2, 1];
    state.miniGolf[ids[1]] = [1, 2, 2];
    state.miniGolf[ids[2]] = [4, 4, 4];
    const points = calculateMiniGolfPoints(state.miniGolf);
    expect([points[ids[0]], points[ids[1]], points[ids[2]]]).toEqual([5, 5, 0]);
  });

  it("uses Bierpong hits as points and clamps final points", () => {
    expect(calculateBeerPongPoints(7)).toBe(7);
    expect(calculateFinalPoints(12)).toBe(10);
    expect(calculateFinalPoints(-1)).toBe(0);
  });

  it("does not award Reifenrollen points for a bye, but awards a real match win", () => {
    const state = createInitialLastOneDrinkinState();
    state.tire.seeds[0] = ids[0];
    state.tire.seeds[2] = ids[1];
    state.tire.seeds[3] = ids[2];
    state.tire.winners["r0-m1"] = ids[1];
    const points = calculateTirePoints(state.tire);
    expect(points[ids[0]]).toBe(0);
    expect(points[ids[1]]).toBe(1);
  });

  it("fills an empty 16-position Reifenrollen bracket with 11 players and exactly five byes", () => {
    const state = createInitialLastOneDrinkinState();
    const filled = fillEmptyTireSeeds(state.tire, () => 0.4);
    expect(filled.seeds.filter(Boolean)).toHaveLength(11);
    expect(filled.seeds.filter((id) => id === null)).toHaveLength(5);
    for (let index = 0; index < 16; index += 2) {
      expect(filled.seeds[index] ?? filled.seeds[index + 1]).not.toBeNull();
    }
  });

  it("keeps a later Reifenrollen match open while its second feeder is unresolved", () => {
    const state = createInitialLastOneDrinkinState();
    state.tire.seeds.splice(0, 4, ids[0], null, ids[1], ids[2]);
    let rounds = resolveTireBracket(state.tire);
    expect(rounds[0][0]).toMatchObject({ playerA: ids[0], playerB: null, winner: ids[0], played: false });
    expect(rounds[0][1].winner).toBeNull();
    expect(rounds[1][0]).toMatchObject({ playerA: ids[0], playerB: null, winner: null, played: false });

    state.tire.winners["r0-m1"] = ids[1];
    rounds = resolveTireBracket(state.tire);
    expect(rounds[1][0]).toMatchObject({ playerA: ids[0], playerB: ids[1], winner: null });
    state.tire.winners["r1-m0"] = ids[0];
    rounds = resolveTireBracket(state.tire);
    expect(rounds[1][0]).toMatchObject({ winner: ids[0], played: true });
  });

  it("scores Rage Cage rounds 0–4, gives a unique leader five, and leaves ties unresolved", () => {
    const state = createInitialLastOneDrinkinState();
    state.rageCage.results[ids[0]] = { round: 4, lives: 7 };
    state.rageCage.results[ids[1]] = { round: 4, lives: 5 };
    state.rageCage.results[ids[2]] = { round: 2, lives: null };
    expect(calculateRageCagePoints(state.rageCage).points[ids[0]]).toBe(5);
    expect(calculateRageCagePoints(state.rageCage).points[ids[2]]).toBe(2);
    state.rageCage.results[ids[1]].lives = 7;
    const tied = calculateRageCagePoints(state.rageCage);
    expect(tied.tiedLeaders).toEqual([ids[0], ids[1]]);
    expect(tied.points[ids[0]]).toBe(4);
  });

  it("calculates time deviations, internal points and final discipline points without inventing tie order", () => {
    expect(timeDeviation("blind", 9.25)).toBeCloseTo(0.75);
    expect(timeDeviation("visible", 5.4)).toBeCloseTo(0.4);
    const tiedValues = Object.fromEntries(ids.map((id, index) => [id, index < 2 ? 1 : index + 1]));
    const manual = Object.fromEntries(ids.map((id) => [id, null]));
    const tied = calculateTimeLegPoints(tiedValues, "fast", manual);
    expect(tied.ties).toEqual([ids[0], ids[1]]);
    expect(tied.points[ids[0]]).toBeNull();

    const state = createInitialLastOneDrinkinState();
    ids.forEach((id, index) => {
      state.timeTrial.values[id] = { fast: index + 1, blind: 10 + (index + 1) / 10, visible: 5 + (index + 1) / 10 };
    });
    expect(calculateTimeTrialPoints(state.timeTrial).points[ids[0]]).toBe(5);
  });

  it("derives relative Last-Man-Standing points from elimination rounds", () => {
    const state = createInitialLastOneDrinkinState();
    state.impact.winner = ids[0];
    ids.forEach((id, index) => { state.impact.rounds[id] = 10 - index; });
    const points = calculateImpactPoints(state.impact);
    expect(points[ids[0]]).toBe(5);
    expect(points[ids[1]]).toBe(4);
    expect(points[ids[5]]).toBe(0);
  });
});

describe("Messers Schneide double elimination", () => {
  it("draws every player exactly once into 16 seeds with five first-round byes", () => {
    const state = createKnifeBracketState(() => 0.37);
    const selected = state.seeds.filter((id): id is string => id !== null);
    expect(state.seeds).toHaveLength(16);
    expect(selected).toHaveLength(11);
    expect(new Set(selected).size).toBe(11);
    expect(state.seeds.filter((id) => id === null)).toHaveLength(5);
    for (let index = 0; index < 16; index += 2) {
      expect(state.seeds[index] ?? state.seeds[index + 1]).not.toBeNull();
    }
  });

  it("advances Winner-Bracket byes automatically without persisting a winner", () => {
    const state = createKnifeBracketState(() => 0.37);
    const bye = resolveKnifeBracket(state).winnerRounds[0].find((match) => match.automatic)!;
    expect(bye.winner).toBe(bye.playerA ?? bye.playerB);
    expect(bye.played).toBe(false);
    expect(state.winners[bye.id]).toBeUndefined();
  });

  it("routes a first loss into the Lower Bracket and eliminates on the next loss", () => {
    let state = createKnifeBracketState(() => 0.37);
    const opening = resolveKnifeBracket(state).winnerRounds[0].find((match) => match.ready)!;
    const firstLoser = opening.playerB!;
    state = setKnifeMatchWinner(state, opening.id, opening.playerA);
    expect(resolveKnifeBracket(state).lowerRounds.flat().some((match) => (
      match.playerA === firstLoser || match.playerB === firstLoser
    ))).toBe(true);

    for (let step = 0; step < 30; step += 1) {
      const bracket = resolveKnifeBracket(state);
      const lowerMatch = bracket.lowerRounds.flat().find((match) => match.ready
        && (match.playerA === firstLoser || match.playerB === firstLoser));
      if (lowerMatch) {
        const opponent = lowerMatch.playerA === firstLoser ? lowerMatch.playerB : lowerMatch.playerA;
        state = setKnifeMatchWinner(state, lowerMatch.id, opponent);
        const laterRounds = resolveKnifeBracket(state).lowerRounds.slice(lowerMatch.round + 1).flat();
        expect(laterRounds.every((match) => match.playerA !== firstLoser && match.playerB !== firstLoser)).toBe(true);
        return;
      }
      const ready = bracket.matches.find((match) => match.ready);
      expect(ready).toBeDefined();
      state = setKnifeMatchWinner(state, ready!.id, ready!.playerA);
    }
    throw new Error("The first loser never reached a playable Lower-Bracket match.");
  });

  it("keeps every player in at most one active match", () => {
    let state = createKnifeBracketState(() => 0.37);
    for (let step = 0; step < 20; step += 1) {
      const bracket = resolveKnifeBracket(state);
      const activePlayers = bracket.matches.filter((match) => match.ready)
        .flatMap((match) => [match.playerA!, match.playerB!]);
      expect(new Set(activePlayers).size).toBe(activePlayers.length);
      const ready = bracket.matches.find((match) => match.ready);
      if (!ready) break;
      state = setKnifeMatchWinner(state, ready.id, ready.playerA);
    }
  });

  it("plays one Grand Final without reset and derives places one through six", () => {
    const state = completeKnifeBracket();
    const bracket = resolveKnifeBracket(state);
    const points = calculateKnifeBracketPoints(state);
    expect(bracket.matches.filter(({ bracket: type }) => type === "grand-final")).toHaveLength(1);
    expect(bracket.matches.some(({ id }) => id.includes("reset"))).toBe(false);
    expect(bracket.grandFinal.played).toBe(true);
    expect(points[bracket.grandFinal.winner!]).toBe(5);
    expect(points[bracket.grandFinal.loser!]).toBe(4);
    expect(points[bracket.lowerRounds[5][0].loser!]).toBe(3);
    expect(points[bracket.lowerRounds[4][0].loser!]).toBe(2);
    expect(bracket.lowerRounds[3].map((match) => points[match.loser!])).toEqual([1, 1]);
    expect(Object.values(points).sort((a, b) => (b ?? -1) - (a ?? -1))).toEqual([5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0]);
    expect(knifeBracketProgress(state)).toEqual({ completed: 20, total: 20 });
  });

  it("settles to exactly twenty played matches across varied bye draws", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      let value = seed;
      const random = () => {
        value = (value * 48271) % 2147483647;
        return value / 2147483647;
      };
      const state = completeKnifeBracket(createKnifeBracketState(random));
      expect(resolveKnifeBracket(state).grandFinal.played).toBe(true);
      expect(knifeBracketProgress(state)).toEqual({ completed: 20, total: 20 });
    }
  });

  it("makes the single Grand-Final winner champion even when the Lower-Bracket player wins", () => {
    let state = completeKnifeBracket();
    const firstFinal = resolveKnifeBracket(state).grandFinal;
    state = setKnifeMatchWinner(state, firstFinal.id, firstFinal.playerB);
    const final = resolveKnifeBracket(state).grandFinal;
    expect(final.winner).toBe(firstFinal.playerB);
    expect(calculateKnifeBracketPoints(state)[firstFinal.playerB!]).toBe(5);
    expect(resolveKnifeBracket(state).matches.filter(({ bracket }) => bracket === "grand-final")).toHaveLength(1);
  });

  it("invalidates every dependent result when an early winner changes", () => {
    let state = completeKnifeBracket();
    const opening = resolveKnifeBracket(state).winnerRounds[0].find((match) => match.played)!;
    const changedWinner = opening.winner === opening.playerA ? opening.playerB : opening.playerA;
    state = setKnifeMatchWinner(state, opening.id, changedWinner);
    const bracket = resolveKnifeBracket(state);
    expect(bracket.grandFinal.winner).toBeNull();
    expect(knifeBracketProgress(state).completed).toBeLessThan(20);
    expect(Object.keys(state.winners).length).toBeLessThan(20);
  });

  it("publishes bracket points only after the Grand Final and feeds every scoreboard", () => {
    const state = createInitialLastOneDrinkinState(() => 0.37);
    expect(Object.values(calculateKnifeBracketPoints(state.knife)).every((value) => value === null)).toBe(true);
    state.knife = completeKnifeBracket(state.knife);
    const points = calculateKnifeBracketPoints(state.knife);
    const evaluation = evaluateDisciplines(state)[8];
    expect(evaluation).toMatchObject({ completed: 20, total: 20, points });
    const disciplineRows = createDisciplineScoreboard(state);
    const overallRows = calculateOverallStandings(state);
    ids.forEach((id) => {
      expect(disciplineRows.find((row) => row.playerId === id)!.cells[7].points).toBe(points[id]);
      expect(overallRows.find((row) => row.playerId === id)!.disciplines).toBe(points[id]);
    });
  });

  it("redraws only the Knife bracket", () => {
    const state = createInitialLastOneDrinkinState(() => 0.37);
    state.golf[1][ids[0]].strokes = 2;
    const oldSeeds = [...state.knife.seeds];
    state.knife = createKnifeBracketState(() => 0.73);
    expect(state.golf[1][ids[0]].strokes).toBe(2);
    expect(state.knife.winners).toEqual({});
    expect(state.knife.seeds).not.toEqual(oldSeeds);
  });

  it("migrates a complete v1 save without preserving obsolete manual Knife points", () => {
    const current = createInitialLastOneDrinkinState(() => 0.37);
    current.golf[1][ids[0]].strokes = 2;
    const legacy = {
      ...current,
      version: 1,
      knife: Object.fromEntries(ids.map((id, index) => [id, index % 6])),
    };
    const restored = restoreLastOneDrinkinState(JSON.stringify(legacy));
    expect(restored.error).toBeNull();
    expect(restored.state?.version).toBe(2);
    expect(restored.state?.golf[1][ids[0]].strokes).toBe(2);
    expect(restored.state?.knife.seeds.filter(Boolean)).toHaveLength(11);
    expect(restored.state?.knife.winners).toEqual({});
  });
});

describe("overall standings", () => {
  it("adds Golf, disciplines and finale, sorts descending and shares ranks on exact ties", () => {
    const state = createInitialLastOneDrinkinState();
    expect(calculateOverallStandings(state).every(({ rank }) => rank === 1)).toBe(true);
    state.golf[1][ids[0]] = { strokes: 1, holed: true, failed: false };
    state.beerPong[ids[0]] = 10;
    state.finalPoints[ids[0]] = 8;
    const rows = calculateOverallStandings(state);
    expect(rows[0]).toMatchObject({ playerId: ids[0], golf: 3, disciplines: 10, final: 8, total: 21, rank: 1 });
    expect(rows[1].rank).toBe(2);
    expect(rows[2].rank).toBe(2);
  });

  it("builds complete discipline and golf scoreboards while preserving open cells", () => {
    const state = createInitialLastOneDrinkinState();
    state.golf[1][ids[0]] = { strokes: 1, holed: true, failed: false };
    state.beerPong[ids[0]] = 7;
    const disciplines = createDisciplineScoreboard(state);
    const golf = createGolfScoreboard(state);
    expect(disciplines).toHaveLength(11);
    expect(golf).toHaveLength(11);
    expect(disciplines.every(({ cells }) => cells.length === 11)).toBe(true);
    expect(golf.every(({ cells }) => cells.length === 11)).toBe(true);
    expect(disciplines[0].cells[4]).toEqual({ points: 7, open: true });
    expect(disciplines[0].sum).toBe(disciplines[0].cells.reduce((sum, cell) => sum + cell.points, 0));
    expect(golf[0].cells[0]).toEqual({ points: 3, open: false });
    expect(golf[0].cells[1]).toEqual({ points: 0, open: true });
    expect(golf[0].sum).toBe(3);
  });
});

describe("time trial table", () => {
  it("contains all raw values, placements, internal totals and final discipline points", () => {
    const state = createInitialLastOneDrinkinState();
    ids.forEach((id, index) => {
      state.timeTrial.values[id] = {
        fast: index + 1,
        blind: 10 + (index + 1) / 10,
        visible: 5 + (index + 1) / 10,
      };
    });
    const rows = createTimeTrialTableRows(state.timeTrial);
    expect(rows).toHaveLength(11);
    expect(rows[0]).toMatchObject({
      playerId: ids[0],
      rank: 1,
      raw: { fast: 1, blind: 10.1, visible: 5.1 },
      placements: { fast: 1, blind: 1, visible: 1 },
      internalTotal: 30,
      disciplinePoints: 5,
    });
    expect(rows[10]).toMatchObject({ rank: 11, internalTotal: 0, disciplinePoints: 0 });
    expect(rows.map(({ internalTotal }) => internalTotal)).toEqual([...rows.map(({ internalTotal }) => internalTotal)].sort((a, b) => (b ?? -1) - (a ?? -1)));
  });

  it("keeps unresolved tied placements and totals visibly open", () => {
    const state = createInitialLastOneDrinkinState();
    state.timeTrial.values[ids[0]].fast = 1;
    state.timeTrial.values[ids[1]].fast = 1;
    const rows = createTimeTrialTableRows(state.timeTrial);
    const tied = rows.filter(({ playerId }) => [ids[0], ids[1]].includes(playerId));
    expect(tied.every(({ placements }) => placements.fast === null)).toBe(true);
    expect(tied.every(({ internalTotal, disciplinePoints }) => internalTotal === null && disciplinePoints === null)).toBe(true);
  });
});
