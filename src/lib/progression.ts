export interface ProgressionDatum {
  id: string;
  achievedAt: string;
  timeHundredths: number;
  durationDays?: number;
  axisAt?: string;
  periodEndAt?: string;
}

export interface ProgressionCoordinate extends ProgressionDatum {
  x: number;
  y: number;
}

const X_PADDING = 7;
const Y_PADDING = 12;
const DAY_IN_MILLISECONDS = 86_400_000;

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildProgressionCoordinates<T extends ProgressionDatum>(
  input: T[],
  domain?: { startAt?: string; endAt?: string },
): Array<T & ProgressionCoordinate> {
  const points = [...input].sort((left, right) =>
    (left.axisAt ?? left.achievedAt).localeCompare(right.axisAt ?? right.achievedAt)
      || left.id.localeCompare(right.id));
  if (!points.length) return [];
  const values = points.map(({ timeHundredths }) => timeHundredths);
  const fastest = Math.min(...values);
  const slowest = Math.max(...values);
  const range = slowest - fastest;
  const startedAt = domain?.startAt ? timestamp(domain.startAt) : timestamp(points[0].axisAt ?? points[0].achievedAt);
  const endedAt = Math.max(domain?.endAt ? timestamp(domain.endAt) : startedAt, ...points.map((point) =>
    point.periodEndAt
      ? timestamp(point.periodEndAt)
      : timestamp(point.axisAt ?? point.achievedAt) + Math.max(0, point.durationDays ?? 0) * DAY_IN_MILLISECONDS));
  const dateRange = endedAt - startedAt;
  return points.map((point) => ({
    ...point,
    x: points.length === 1
      ? 50
      : dateRange === 0
        ? 50
        : X_PADDING + ((timestamp(point.axisAt ?? point.achievedAt) - startedAt) / dateRange) * (100 - X_PADDING * 2),
    // Faster times sit lower: a falling line represents a record being broken.
    y: range === 0
      ? 50
      : Y_PADDING + ((slowest - point.timeHundredths) / range) * (100 - Y_PADDING * 2),
  }));
}

export function buildStepPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points.slice(1).reduce(
    (path, point) => `${path} H ${point.x.toFixed(2)} V ${point.y.toFixed(2)}`,
    `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`,
  );
}

export function formatRecordDuration(days: number) {
  if (days === 1) return "1 Tag";
  return `${days.toLocaleString("de-DE")} Tage`;
}

export function formatCurrentRecordDuration(days: number) {
  if (days === 1) return "seit 1 Tag";
  return `seit ${days.toLocaleString("de-DE")} Tagen`;
}

export function formatTimelineMoment(achievedAt: string, achievedDate: string, hasExactTime: boolean) {
  const date = new Date(`${achievedDate}T12:00:00`).toLocaleDateString("de-DE");
  if (!hasExactTime) return date;
  const time = new Date(achievedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time} Uhr`;
}
