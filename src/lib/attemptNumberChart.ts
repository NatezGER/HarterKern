import type { AttemptNumberPoint } from "@/types/historyProfiles";

const EMPTY_HEIGHT = 8;
const SINGLE_HEIGHT = 70;
const MIN_VALID_HEIGHT = 35;
const MAX_VALID_HEIGHT = 100;

export interface AttemptBarPoint extends AttemptNumberPoint {
  heightPercent: number;
}

export function scaleAttemptNumberBars(
  points: AttemptNumberPoint[],
): AttemptBarPoint[] {
  const values = points.flatMap(({ averageHundredths }) =>
    averageHundredths == null ? [] : [averageHundredths]);
  if (!values.length) {
    return points.map((point) => ({ ...point, heightPercent: EMPTY_HEIGHT }));
  }
  const fastest = Math.min(...values);
  const slowest = Math.max(...values);
  if (fastest === slowest) {
    return points.map((point) => ({
      ...point,
      heightPercent: point.averageHundredths == null
        ? EMPTY_HEIGHT
        : SINGLE_HEIGHT,
    }));
  }
  return points.map((point) => ({
    ...point,
    heightPercent: point.averageHundredths == null
      ? EMPTY_HEIGHT
      : MIN_VALID_HEIGHT +
        ((slowest - point.averageHundredths) / (slowest - fastest)) *
        (MAX_VALID_HEIGHT - MIN_VALID_HEIGHT),
  }));
}
