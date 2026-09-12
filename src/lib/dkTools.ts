export const DK_CREW = [
  "Leif",
  "Fipsi",
  "Henni",
  "Boyke",
  "Käptn",
  "Lars",
  "Martin",
  "Paul",
  "Lonzo",
  "Fred",
  "Mischa",
] as const;

export type TeamStructure = 2 | 3 | 4 | "pairs";

export interface DkTeam {
  id: string;
  name: string;
  members: string[];
}

export interface LeagueMatch {
  id: string;
  teamAId: string;
  teamBId: string;
}

export interface MatchScore {
  scoreA: number | null;
  scoreB: number | null;
}

export interface Standing {
  rank: number;
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  difference: number;
  points: number;
}

export interface TournamentMatch {
  id: string;
  roundIndex: number;
  matchIndex: number;
  seedAId: string | null;
  seedBId: string | null;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
}

export interface TournamentRound {
  id: string;
  label: string;
  matches: TournamentMatch[];
}

export interface TournamentBracket {
  rounds: TournamentRound[];
  championId: string | null;
}

export interface DkGameState {
  teams: DkTeam[];
  leagueMatches: LeagueMatch[];
  leagueScores: Record<string, MatchScore>;
  bracket: TournamentBracket | null;
}

const TEAM_PREFIXES = [
  "Hopfen", "Promille", "Bier", "Tresen", "Zapfhahn", "Suff", "Kneipen", "Malz",
  "Pils", "Kronkorken", "Fass", "Durst", "Rausch", "Schluck", "Dosen", "Theken",
];

const TEAM_SUFFIXES = [
  "Hooligans", "Panzer", "Berserker", "Zerstörer", "Söldner", "Titanen", "Piraten",
  "Raketen", "Rambos", "Legenden", "Kommandos", "Kavaliere", "Banditen", "Barone",
  "Wikinger", "Wölfe",
];

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function drawOrder(participants: readonly string[], random: () => number = Math.random): string[] {
  return shuffle(participants, random);
}

export function getTeamSizes(participantCount: number, structure: TeamStructure): number[] {
  if (participantCount <= 0) return [];

  const requestedTeamCount = structure === "pairs"
    ? Math.max(1, Math.floor(participantCount / 2))
    : structure;
  const teamCount = Math.min(participantCount, requestedTeamCount);
  const baseSize = Math.floor(participantCount / teamCount);
  const largerTeams = participantCount % teamCount;

  return Array.from({ length: teamCount }, (_, index) => baseSize + (index < largerTeams ? 1 : 0));
}

export function generateTeamNames(count: number, random: () => number = Math.random): string[] {
  const combinations = TEAM_PREFIXES.flatMap((prefix) =>
    TEAM_SUFFIXES.map((suffix) => `${prefix}-${suffix}`),
  );
  return shuffle(combinations, random).slice(0, count);
}

export function createTeams(
  participants: readonly string[],
  structure: TeamStructure,
  random: () => number = Math.random,
): DkTeam[] {
  const shuffledParticipants = shuffle(participants, random);
  const sizes = getTeamSizes(shuffledParticipants.length, structure);
  const names = generateTeamNames(sizes.length, random);
  const teams = sizes.map((_, index) => ({ id: `team-${index + 1}`, name: names[index], members: [] as string[] }));

  let teamIndex = 0;
  for (const participant of shuffledParticipants) {
    while (teams[teamIndex].members.length >= sizes[teamIndex]) {
      teamIndex = (teamIndex + 1) % teams.length;
    }
    teams[teamIndex].members.push(participant);
    teamIndex = (teamIndex + 1) % teams.length;
  }

  return teams;
}

export function resetForNewTeams(
  participants: readonly string[],
  structure: TeamStructure,
  random: () => number = Math.random,
): DkGameState {
  return {
    teams: createTeams(participants, structure, random),
    leagueMatches: [],
    leagueScores: {},
    bracket: null,
  };
}

export function getTeamRevealOrder(teams: readonly DkTeam[]): Array<{ teamId: string; member: string }> {
  const maxSize = Math.max(0, ...teams.map((team) => team.members.length));
  const result: Array<{ teamId: string; member: string }> = [];
  for (let memberIndex = 0; memberIndex < maxSize; memberIndex += 1) {
    for (const team of teams) {
      const member = team.members[memberIndex];
      if (member) result.push({ teamId: team.id, member });
    }
  }
  return result;
}

export function createLeagueMatches(teams: readonly DkTeam[], random: () => number = Math.random): LeagueMatch[] {
  const matches: LeagueMatch[] = [];
  for (let first = 0; first < teams.length; first += 1) {
    for (let second = first + 1; second < teams.length; second += 1) {
      matches.push({
        id: `league-${teams[first].id}-${teams[second].id}`,
        teamAId: teams[first].id,
        teamBId: teams[second].id,
      });
    }
  }
  return shuffle(matches, random);
}

export function resetForNewLeagueMatches(
  teams: DkTeam[],
  random: () => number = Math.random,
): DkGameState {
  return {
    teams,
    leagueMatches: createLeagueMatches(teams, random),
    leagueScores: {},
    bracket: null,
  };
}

export function calculateStandings(
  teams: readonly DkTeam[],
  matches: readonly LeagueMatch[],
  scores: Readonly<Record<string, MatchScore>>,
): Standing[] {
  const rows = new Map(teams.map((team) => [team.id, {
    rank: 0,
    teamId: team.id,
    teamName: team.name,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    scored: 0,
    conceded: 0,
    difference: 0,
    points: 0,
  }]));

  for (const match of matches) {
    const score = scores[match.id];
    if (!score || score.scoreA === null || score.scoreB === null) continue;
    const teamA = rows.get(match.teamAId);
    const teamB = rows.get(match.teamBId);
    if (!teamA || !teamB) continue;

    teamA.played += 1;
    teamB.played += 1;
    teamA.scored += score.scoreA;
    teamA.conceded += score.scoreB;
    teamB.scored += score.scoreB;
    teamB.conceded += score.scoreA;

    if (score.scoreA === score.scoreB) {
      teamA.draws += 1;
      teamB.draws += 1;
      teamA.points += 1;
      teamB.points += 1;
    } else if (score.scoreA > score.scoreB) {
      teamA.wins += 1;
      teamB.losses += 1;
      teamA.points += 3;
    } else {
      teamB.wins += 1;
      teamA.losses += 1;
      teamB.points += 3;
    }
  }

  const sorted = [...rows.values()].map((row) => ({
    ...row,
    difference: row.scored - row.conceded,
  })).sort((a, b) =>
    b.points - a.points || b.difference - a.difference || b.scored - a.scored,
  );

  let currentRank = 1;
  return sorted.map((row, index) => {
    if (index > 0) {
      const previous = sorted[index - 1];
      if (row.points !== previous.points || row.difference !== previous.difference || row.scored !== previous.scored) {
        currentRank = index + 1;
      }
    }
    return { ...row, rank: currentRank };
  });
}

function roundLabel(roundIndex: number, roundCount: number): string {
  const remaining = roundCount - roundIndex;
  if (remaining === 1) return "Finale";
  if (remaining === 2) return "Halbfinale";
  if (remaining === 3) return "Viertelfinale";
  return roundIndex === 0 ? "Vorrunde" : `Runde ${roundIndex + 1}`;
}

export function createTournament(teams: readonly DkTeam[], random: () => number = Math.random): TournamentBracket {
  if (teams.length < 2) return { rounds: [], championId: teams[0]?.id ?? null };

  const bracketSize = 2 ** Math.ceil(Math.log2(teams.length));
  const firstRoundMatchCount = bracketSize / 2;
  const preliminaryMatches = teams.length - firstRoundMatchCount;
  const shuffledTeams = shuffle(teams, random);
  const seeds: Array<[string | null, string | null]> = [];
  let cursor = 0;

  for (let index = 0; index < preliminaryMatches; index += 1) {
    seeds.push([shuffledTeams[cursor++].id, shuffledTeams[cursor++].id]);
  }
  while (seeds.length < firstRoundMatchCount) {
    seeds.push([shuffledTeams[cursor++].id, null]);
  }

  const roundCount = Math.log2(bracketSize);
  const rounds: TournamentRound[] = Array.from({ length: roundCount }, (_, roundIndex) => {
    const matchCount = bracketSize / (2 ** (roundIndex + 1));
    return {
      id: `round-${roundIndex}`,
      label: roundLabel(roundIndex, roundCount),
      matches: Array.from({ length: matchCount }, (__, matchIndex) => {
        const seed = roundIndex === 0 ? seeds[matchIndex] : [null, null];
        return {
          id: `tournament-${roundIndex}-${matchIndex}`,
          roundIndex,
          matchIndex,
          seedAId: seed[0],
          seedBId: seed[1],
          teamAId: seed[0],
          teamBId: seed[1],
          scoreA: null,
          scoreB: null,
          winnerId: null,
        };
      }),
    };
  });

  return resolveTournament({ rounds, championId: null });
}

function winnerFor(match: TournamentMatch): string | null {
  if (match.teamAId && !match.teamBId) return match.teamAId;
  if (match.teamBId && !match.teamAId) return match.teamBId;
  if (!match.teamAId || !match.teamBId || match.scoreA === null || match.scoreB === null || match.scoreA === match.scoreB) {
    return null;
  }
  return match.scoreA > match.scoreB ? match.teamAId : match.teamBId;
}

function resolveTournament(bracket: TournamentBracket): TournamentBracket {
  const rounds = bracket.rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => ({ ...match })),
  }));

  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
    for (const match of rounds[roundIndex].matches) {
      if (roundIndex > 0) {
        const previousMatches = rounds[roundIndex - 1].matches;
        const teamAId = previousMatches[match.matchIndex * 2]?.winnerId ?? null;
        const teamBId = previousMatches[match.matchIndex * 2 + 1]?.winnerId ?? null;
        if (match.teamAId !== teamAId || match.teamBId !== teamBId) {
          match.scoreA = null;
          match.scoreB = null;
        }
        match.teamAId = teamAId;
        match.teamBId = teamBId;
      }
      match.winnerId = winnerFor(match);
    }
  }

  const final = rounds.at(-1)?.matches[0];
  return { rounds, championId: final?.winnerId ?? null };
}

export function setTournamentScore(
  bracket: TournamentBracket,
  matchId: string,
  score: MatchScore,
): TournamentBracket {
  const rounds = bracket.rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => match.id === matchId ? { ...match, ...score } : { ...match }),
  }));
  return resolveTournament({ rounds, championId: null });
}
