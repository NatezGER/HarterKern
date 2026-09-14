import { describe, expect, it } from "vitest";
import {
  calculateStandings,
  createLeagueMatches,
  createTeams,
  createTournament,
  DK_CREW,
  drawOrder,
  generateTeamNames,
  generateNamesForTeams,
  resetForNewLeagueMatches,
  resetForNewTeams,
  setTournamentScore,
  type DkTeam,
  type MatchScore,
} from "@/lib/dkTools";

const deterministicRandom = () => 0.42;
const CAPTAIN_POSSESSIVES: Record<string, string> = {
  Leif: "Leifs", Fipsi: "Fipsis", Henni: "Hennis", Boyke: "Boykes", Käptn: "Käptns",
  Lars: "Lars'", Martin: "Martins", Paul: "Pauls", Lonzo: "Lonzos", Fred: "Freds", Mischa: "Mischas",
};

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
    const names = generateTeamNames(100, deterministicRandom);
    expect(names).toHaveLength(100);
    expect(new Set(names)).toHaveLength(100);
  });

  it("uses the first member as captain for a three-person team", () => {
    const names = generateNamesForTeams([{
      id: "team-1",
      name: "",
      members: ["Paul", "Lars", "Fred"],
    }], deterministicRandom);
    expect(names[0]).toMatch(/^Pauls /);
  });

  it("offers different variants for different captains", () => {
    const names = generateNamesForTeams([
      { id: "team-1", name: "", members: ["Henni", "Paul", "Fred"] },
      { id: "team-2", name: "", members: ["Boyke", "Lars", "Leif"] },
    ], deterministicRandom);
    expect(names[0]).toMatch(/^Hennis /);
    expect(names[1]).toMatch(/^Boykes /);
    expect(names[0]).not.toBe(names[1]);
  });

  it("offers multiple variants for the same captain", () => {
    const team = [{ id: "team-1", name: "", members: ["Paul", "Lars", "Fred"] }];
    const first = generateNamesForTeams(team, () => 0)[0];
    const second = generateNamesForTeams(team, () => 0.99)[0];
    expect(first).toMatch(/^Pauls /);
    expect(second).toMatch(/^Pauls /);
    expect(first).not.toBe(second);
  });

  it("uses a duo name instead of forcing a captain for two-person teams", () => {
    const [name] = generateNamesForTeams([{
      id: "team-1",
      name: "",
      members: ["Paul", "Lars"],
    }], deterministicRandom);
    expect(name).not.toMatch(/^Pauls /);
    expect(name).toMatch(/Doppel|Duo|Freunde|Kump|Syndikat|Brüder|Paar|Tandem|Zwei|Pärchen|Durst|Pakt|Zapfhahn|Mates/);
  });

  it("uses captain naming for the three-person team in pairs mode and duo naming for the others", () => {
    const teams = createTeams(DK_CREW, "pairs", deterministicRandom);
    const triple = teams.find((team) => team.members.length === 3)!;
    const captain = triple.members[0];
    const possessive = CAPTAIN_POSSESSIVES[captain];
    expect(triple.name).toMatch(new RegExp(`^${possessive} `));
    expect(teams.filter((team) => team.members.length === 2).every((team) => !team.name.startsWith(`${CAPTAIN_POSSESSIVES[team.members[0]]} `))).toBe(true);
  });

  it("keeps names unique without changing team composition", () => {
    const teams: DkTeam[] = [
      { id: "team-1", name: "vorher", members: ["Paul", "Lars"] },
      { id: "team-2", name: "vorher", members: ["Henni", "Fred"] },
      { id: "team-3", name: "vorher", members: ["Leif", "Mischa", "Boyke"] },
    ];
    const membersBefore = teams.map((team) => [...team.members]);
    const names = generateNamesForTeams(teams, deterministicRandom);
    expect(new Set(names)).toHaveLength(teams.length);
    expect(teams.map((team) => team.members)).toEqual(membersBefore);
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

  it("keeps a 3-team final open while the other semifinal is unresolved", () => {
    const bracket = createTournament(makeTeams(3), deterministicRandom);
    const bye = bracket.rounds[0].matches.find((match) => Boolean(match.teamAId) !== Boolean(match.teamBId));
    const semifinal = bracket.rounds[0].matches.find((match) => match.teamAId && match.teamBId);
    expect(bye?.winnerId).not.toBeNull();
    expect(semifinal?.winnerId).toBeNull();
    expect(bracket.rounds[1].matches[0].winnerId).toBeNull();
    expect(bracket.championId).toBeNull();

    const finalists = setTournamentScore(bracket, semifinal!.id, { scoreA: 2, scoreB: 1 });
    expect(finalists.rounds[1].matches[0].teamAId).not.toBeNull();
    expect(finalists.rounds[1].matches[0].teamBId).not.toBeNull();
    expect(finalists.championId).toBeNull();
  });

  it("does not declare a 4-team champion until both semifinals and the final are decided", () => {
    let bracket = createTournament(makeTeams(4), deterministicRandom);
    bracket = setTournamentScore(bracket, bracket.rounds[0].matches[0].id, { scoreA: 1, scoreB: 0 });
    expect(bracket.rounds[1].matches[0]).toMatchObject({ teamAId: expect.any(String), teamBId: null, winnerId: null });
    expect(bracket.championId).toBeNull();

    bracket = setTournamentScore(bracket, bracket.rounds[0].matches[1].id, { scoreA: 0, scoreB: 1 });
    expect(bracket.rounds[1].matches[0]).toMatchObject({ teamAId: expect.any(String), teamBId: expect.any(String), winnerId: null });
    expect(bracket.championId).toBeNull();

    bracket = setTournamentScore(bracket, bracket.rounds[1].matches[0].id, { scoreA: 3, scoreB: 2 });
    expect(bracket.championId).toBe(bracket.rounds[1].matches[0].teamAId);
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
