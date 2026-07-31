import { AttemptNumberChart } from "@/components/players/AttemptNumberChart";
import type { EventAttemptNumberPoint } from "@/types/historyProfiles";

export function EventAttemptNumberChart({ points }: { points: EventAttemptNumberPoint[] }) {
  return <AttemptNumberChart points={points.map((point) => ({
    attemptNumber: point.attemptNumber,
    samples: point.samples,
    validAttempts: point.samples,
    dnfCount: 0,
    averageHundredths: point.averageHundredths,
  }))} />;
}
