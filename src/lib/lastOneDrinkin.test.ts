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
  calculateKnifePoints,
  calculateMiniGolfPoints,
  calculateOverallStandings,
  calculateRageCagePoints,
  calculateTimeLegPoints,
  calculateTimeTrialPoints,
  calculateTirePoints,
  createInitialLastOneDrinkinState,
  fillEmptyTeamSlots,
  fillEmptyTireSeeds,
  flipFlopMatches,
  LOD_PLAYERS,
  normalizeGolfEntry,
  restoreLastOneDrinkinState,
  serializeLastOneDrinkinState,
  timeDeviation,
  validateTeamConfig,
} from "@/lib/lastOneDrinkin";

const ids = LOD_PLAYERS.map(({ id }) => id);

describe("Last One Drinkin persistence", () => {
  it("serializes and restores the complete event state including open values", () => {
    const state = createInitialLastOneDrinkinState();
    state.golf[1][ids[0]].strokes = 2;
    const raw = serializeLastOneDrinkinState(state);
    const restored = restoreLastOneDrinkinState(raw);
    expect(restored.error).toBeNull();
    expect(restored.state?.golf[1][ids[0]].strokes).toBe(2);
    expect(restored.state?.golf[1][ids[1]].strokes).toBeNull();
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

  it("uses Bierpong hits as points and clamps manual knife and final points", () => {
    expect(calculateBeerPongPoints(7)).toBe(7);
    expect(calculateKnifePoints(8)).toBe(5);
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
});
