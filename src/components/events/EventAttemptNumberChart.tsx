import { AttemptNumberChart } from "@/components/players/AttemptNumberChart";
import type { EventAttemptNumberPoint } from "@/types/historyProfiles";

export function EventAttemptNumberChart({ points }: { points: EventAttemptNumberPoint[] }) {
  return <div className="[&_.h-52]:h-64 sm:[&_.h-52]:h-72"><AttemptNumberChart points={points.map((point) => ({
    attemptNumber: point.attemptNumber,
    samples: point.samples,
    validAttempts: point.samples,
    dnfCount: 0,
    averageHundredths: point.averageHundredths,
  }))} /></div>;
}
