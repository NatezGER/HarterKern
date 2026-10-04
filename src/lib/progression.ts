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
const Y_PADDING = 18;
const DAY_IN_MILLISECONDS = 86_400_000;

export interface TimeViewport { startMs: number; endMs: number }

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createTimeViewport(values: string[], startAt?: string, endAt?: string): TimeViewport | null {
  const timestamps = values.map(Date.parse).filter(Number.isFinite);
  if (startAt && Number.isFinite(Date.parse(startAt))) timestamps.push(Date.parse(startAt));
  if (endAt && Number.isFinite(Date.parse(endAt))) timestamps.push(Date.parse(endAt));
  if (!timestamps.length) return null;
  const startMs = Math.min(...timestamps);
  const endMs = Math.max(startMs, ...timestamps);
  return { startMs, endMs };
}

export function zoomTimeViewport(viewport: TimeViewport, full: TimeViewport, factor: number): TimeViewport {
  const fullSpan = full.endMs - full.startMs;
  if (fullSpan <= 0) return full;
  const currentSpan = Math.max(1, viewport.endMs - viewport.startMs);
  const span = Math.min(fullSpan, Math.max(fullSpan / 32, currentSpan * factor));
  const center = (viewport.startMs + viewport.endMs) / 2;
  return clampTimeViewport({ startMs: center - span / 2, endMs: center + span / 2 }, full);
}

export function panTimeViewport(viewport: TimeViewport, full: TimeViewport, direction: -1 | 1): TimeViewport {
  const span = viewport.endMs - viewport.startMs;
  return clampTimeViewport({ startMs: viewport.startMs + direction * span * 0.5, endMs: viewport.endMs + direction * span * 0.5 }, full);
}

export function clampTimeViewport(viewport: TimeViewport, full: TimeViewport): TimeViewport {
  const fullSpan = full.endMs - full.startMs;
  const span = Math.min(fullSpan, Math.max(0, viewport.endMs - viewport.startMs));
  let startMs = Math.max(full.startMs, Math.min(viewport.startMs, full.endMs - span));
  let endMs = startMs + span;
  if (endMs > full.endMs) {
    endMs = full.endMs;
    startMs = endMs - span;
  }
  return { startMs, endMs };
}

export function selectViewportPoints<T extends ProgressionDatum>(input: T[], viewport: TimeViewport): T[] {
  const ordered = [...input].sort((left, right) => timestamp(left.axisAt ?? left.achievedAt) - timestamp(right.axisAt ?? right.achievedAt) || left.id.localeCompare(right.id));
  const before = ordered.filter((point) => timestamp(point.axisAt ?? point.achievedAt) < viewport.startMs).at(-1);
  const visible = ordered.filter((point) => {
    const value = timestamp(point.axisAt ?? point.achievedAt);
    return value >= viewport.startMs && value <= viewport.endMs;
  });
  return before ? [{ ...before, axisAt: new Date(viewport.startMs).toISOString() }, ...visible] : visible;
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
    x: points.length === 1 && !domain?.startAt && !domain?.endAt
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
  const timeZone = "Europe/Berlin";
  const date = new Date(`${achievedDate}T12:00:00Z`).toLocaleDateString("de-DE", { timeZone });
  if (!hasExactTime) return date;
  const time = new Date(achievedAt).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  return `${date} · ${time} Uhr`;
}
