import { AttemptNumberChart } from "@/components/players/AttemptNumberChart";
import {
  calculateAttemptNumberPerformance,
  calculateTimeThresholds,
  officialTimesFromMostWanted,
} from "@/lib/officialTimePerformance";
import type { MostWantedSnapshot } from "@/types";

export function OfficialTimeThresholds({ data }: { data: MostWantedSnapshot }) {
  const thresholds = calculateTimeThresholds(officialTimesFromMostWanted(data));
  return <div className="panel p-5 sm:p-6">
    <div className="grid grid-cols-3 gap-3">
      {thresholds.map((item) => <div key={item.seconds} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-center">
        <p className="font-display text-xl font-black">Unter {item.seconds} s</p>
        <p className="mt-1 text-xs text-white/45">{item.count} · {item.percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</p>
      </div>)}
    </div>
  </div>;
}

export function LeagueAttemptNumberChart({ data }: { data: MostWantedSnapshot }) {
  const points = calculateAttemptNumberPerformance(officialTimesFromMostWanted(data));
  return <AttemptNumberChart points={points} />;
}
