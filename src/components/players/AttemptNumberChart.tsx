import { scaleAttemptNumberBars } from "@/lib/attemptNumberChart";
import type { AttemptNumberPoint } from "@/types/historyProfiles";
import { formatTime } from "@/utils/format";

export function AttemptNumberChart({ points }: { points: AttemptNumberPoint[] }) {
  const bars = scaleAttemptNumberBars(points);
  if (!bars.some(({ averageHundredths }) => averageHundredths != null)) {
    return (
      <div className="py-12 text-center text-sm text-white/40">
        Noch nicht genug gültige Eventversuche.
      </div>
    );
  }
  return (
    <div>
      <p className="mb-5 text-xs text-white/40">
        Je höher der Balken, desto schneller die durchschnittliche Zeit.
      </p>
      <div className="flex h-52 items-end gap-2 overflow-x-auto pb-2">
        {bars.map((point) => (
          <div
            key={point.attemptNumber}
            className="flex h-full min-w-14 flex-1 flex-col items-center justify-end"
          >
            <span className="mb-2 text-[10px] font-bold text-white/50">
              {point.averageHundredths == null
                ? "DNF"
                : formatTime(point.averageHundredths / 100)}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-gold-600/60 to-gold-300"
                style={{
                  height: `${point.heightPercent}%`,
                  minHeight: "0.5rem",
                }}
              />
            </div>
            <span className="mt-2 text-[10px] text-white/35">
              #{point.attemptNumber}
            </span>
            <span className="text-[9px] text-white/25">
              {point.validAttempts}/{point.samples}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
