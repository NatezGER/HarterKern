export const BEER_LITERS_PER_VALID_ATTEMPT = 0.2;

export interface BeerVolumeMilestone {
  liters: number;
  label: string;
  emoji: string;
}

export const beerVolumeMilestones: BeerVolumeMilestone[] = [
  { liters: 1, label: "große Flasche", emoji: "🍺" },
  { liters: 2, label: "großer Krug", emoji: "🍻" },
  { liters: 5, label: "kleiner Kanister", emoji: "🫗" },
  { liters: 10, label: "Putzeimer", emoji: "🪣" },
  { liters: 20, label: "Maurerkübel", emoji: "🪣" },
  { liters: 30, label: "kleines Fass", emoji: "🛢️" },
  { liters: 50, label: "Dänemark-Fass", emoji: "🇩🇰" },
  { liters: 70, label: "große Mörtelwanne", emoji: "🧱" },
  { liters: 100, label: "kleine Regentonne", emoji: "🌧️" },
  { liters: 150, label: "Badewanne", emoji: "🛁" },
  { liters: 300, label: "kleines Planschbecken", emoji: "🏖️" },
  { liters: 500, label: "großes Planschbecken", emoji: "🌊" },
  { liters: 1_000, label: "IBC-Container", emoji: "📦" },
  { liters: 2_000, label: "kleiner Whirlpool", emoji: "♨️" },
  { liters: 5_000, label: "Gartenpool", emoji: "🏊" },
  { liters: 10_000, label: "großer Aufstellpool", emoji: "🏊‍♂️" },
  { liters: 25_000, label: "kleines Schwimmbecken", emoji: "🌊" },
  { liters: 50_000, label: "Tankwagen", emoji: "🚛" },
  { liters: 100_000, label: "großes Becken", emoji: "🌊" },
  { liters: 250_000, label: "sehr großes Schwimmbecken", emoji: "🏟️" },
  { liters: 500_000, label: "absurd großes Becken", emoji: "🤯" },
  { liters: 1_000_000, label: "Endgegner", emoji: "👑" },
];

export function beerLitersForAttempts(validAttemptCount: number) {
  return Math.max(0, validAttemptCount) * BEER_LITERS_PER_VALID_ATTEMPT;
}

export function countBeerEligibleEventAttempts(attempts: Array<{
  isGuest: boolean;
  isAk: boolean;
  isDnf: boolean;
  timeHundredths: number | null;
}>) {
  return attempts.filter((attempt) => !attempt.isGuest && !attempt.isAk
    && !attempt.isDnf && attempt.timeHundredths != null).length;
}

export function resolveBeerVolumeMilestone(validAttemptCount: number) {
  const liters = beerLitersForAttempts(validAttemptCount);
  const reached = [...beerVolumeMilestones].reverse().find((milestone) => liters >= milestone.liters) ?? null;
  const next = beerVolumeMilestones.find((milestone) => liters < milestone.liters) ?? null;
  const progress = next
    ? Math.max(0, Math.min(100, liters / next.liters * 100))
    : 100;
  return { liters, reached, next, progress, remainingLiters: next ? next.liters - liters : 0 };
}
