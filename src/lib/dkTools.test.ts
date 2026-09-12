import { describe, expect, it } from "vitest";
import {
  calculateStandings,
  createLeagueMatches,
  createTeams,
  createTournament,
  DK_CREW,
  drawOrder,
  generateTeamNames,
  resetForNewLeagueMatches,
  resetForNewTeams,
  setTournamentScore,
  type DkTeam,
  type MatchScore,
} from "@/lib/dkTools";

const deterministicRandom = () => 0.42;

function makeTeams(count: number): DkTeam[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    members: [`Spieler ${index + 1}`],
  }));
}

function allMembers(teams: DkTeam[]) {
  return teams.flatMap((team) => team.members);
}

function playFirstOpenMatch(bracket: ReturnType<typeof createTournament>) {
  const match = bracket.rounds.flatMap((round) => round.matches)
    .find((candidate) => candidate.teamAId && candidate.teamBId && candidate.winnerId === null);
  if (!match) return bracket;
  return setTournamentScore(bracket, match.id, { scoreA: 2, scoreB: 1 });
}

describe("DK draw helpers", () => {
  it("draws only selected participants exactly once", () => {
    const selected = DK_CREW.filter((name) => name !== "Leif" && name !== "Paul");
    const result = drawOrder(selected, deterministicRandom);
    expect(result).toHaveLength(selected.length);
    expect(new Set(result)).toEqual(new Set(selected));
  });

  it.each([
    [2, [6, 5]],
    [3, [4, 4, 3]],
    [4, [3, 3, 3, 2]],
    ["pairs", [3, 2, 2, 2, 2]],
  ] as const)("distributes 11 participants with %s", (structure, expectedSizes) => {
    const teams = createTeams(DK_CREW, structure, deterministicRandom);
    expect(teams.map((team) => team.members.length)).toEqual(expectedSizes);
    expect(new Set(allMembers(teams))).toEqual(new Set(DK_CREW));
  });

  it("omits deselected participants without duplicating or losing selected people", () => {
    const selected = DK_CREW.filter((name) => !["Fipsi", "Mischa"].includes(name));
    const teams = createTeams(selected, 4, deterministicRandom);
    expect(allMembers(teams)).toHaveLength(selected.length);
    expect(new Set(allMembers(teams))).toEqual(new Set(selected));
  });

  it("generates the requested number of unique team names", () => {
    const names = generateTeamNames(8, deterministicRandom);
    expect(names).toHaveLength(8);
    expect(new Set(names)).toHaveLength(8);
  });
});

describe("DK league", () => {
  it.each([2, 3, 4, 5])("creates every pairing exactly once for %i teams", (count) => {
    const matches = createLeagueMatches(makeTeams(count), deterministicRandom);
    const pairings = matches.map((match) => [match.teamAId, match.teamBId].sort().join("/"));
    expect(matches).toHaveLength(count * (count - 1) / 2);
    expect(new Set(pairings)).toHaveLength(matches.length);
  });

  it("calculates results, points and sorting correctly", () => {
    const teams = makeTeams(3);
    const matches = createLeagueMatches(teams, deterministicRandom);
    const findMatch = (a: string, b: string) => matches.find((match) =>
      [match.teamAId, match.teamBId].includes(a) && [match.teamAId, match.teamBId].includes(b),
    )!;
    const scores: Record<string, MatchScore> = {};
    const setResult = (a: string, b: string, goalsA: number, goalsB: number) => {
      const match = findMatch(a, b);
      scores[match.id] = match.teamAId === a
        ? { scoreA: goalsA, scoreB: goalsB }
        : { scoreA: goalsB, scoreB: goalsA };
    };
    setResult("team-1", "team-2", 3, 1);
    setResult("team-1", "team-3", 1, 1);
    setResult("team-2", "team-3", 2, 0);

    const table = calculateStandings(teams, matches, scores);
    expect(table.map((row) => [row.teamId, row.points])).toEqual([
      ["team-1", 4], ["team-2", 3], ["team-3", 1],
    ]);
    expect(table[0]).toMatchObject({ wins: 1, draws: 1, losses: 0, difference: 2 });
  });

  it("uses stable shared ranks for complete ties", () => {
    const teams = makeTeams(2);
    const table = calculateStandings(teams, createLeagueMatches(teams), {});
    expect(table.map((row) => row.rank)).toEqual([1, 1]);
  });
});

describe("DK tournament", () => {
  it.each([
    [3, 1, 2],
    [4, 0, 2],
    [5, 3, 3],
  ])("creates a valid bracket for %i teams", (count, expectedByes, expectedRounds) => {
    let bracket = createTournament(makeTeams(count), deterministicRandom);
    const firstRound = bracket.rounds[0];
    expect(firstRound.matches.filter((match) => !match.teamAId || !match.teamBId)).toHaveLength(expectedByes);
    expect(bracket.rounds).toHaveLength(expectedRounds);

    for (let guard = 0; guard < count + 2 && !bracket.championId; guard += 1) {
      bracket = playFirstOpenMatch(bracket);
    }
    expect(bracket.championId).not.toBeNull();
  });

  it("advances the correct winner into the next round", () => {
    const bracket = createTournament(makeTeams(4), deterministicRandom);
    const openingMatch = bracket.rounds[0].matches[0];
    const updated = setTournamentScore(bracket, openingMatch.id, { scoreA: 1, scoreB: 3 });
    expect(updated.rounds[1].matches[0].teamAId).toBe(openingMatch.teamBId);
  });
});

describe("DK resets", () => {
  it("redraws league matches without changing teams and clears scores", () => {
    const teams = makeTeams(4);
    const reset = resetForNewLeagueMatches(teams, deterministicRandom);
    expect(reset.teams).toBe(teams);
    expect(reset.leagueMatches).toHaveLength(6);
    expect(reset.leagueScores).toEqual({});
  });

  it("redraws teams and discards dependent game state", () => {
    const reset = resetForNewTeams(DK_CREW, 3, deterministicRandom);
    expect(reset.teams).toHaveLength(3);
    expect(reset.leagueMatches).toEqual([]);
    expect(reset.leagueScores).toEqual({});
    expect(reset.bracket).toBeNull();
  });
});
