import { UserRound } from "lucide-react";
import { formatDate, formatTime } from "@/utils/format";
import type { HistoricalAttempt } from "@/types/liveEvent";
import { sortHistoricalAttempts } from "@/lib/historicalAttempts";

export function HistoricalAttemptList({
  attempts,
  limit,
}: {
  attempts: HistoricalAttempt[];
  limit?: number;
}) {
  const ordered = sortHistoricalAttempts(attempts).slice(0, limit);
  if (!ordered.length) {
    return (
      <p className="panel py-12 text-center text-sm text-white/35">
        Noch keine historischen Versuche.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {ordered.map((attempt) => (
        <article
          key={attempt.id}
          className="panel grid gap-3 p-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center sm:px-5"
        >
          <p className="text-xs font-semibold text-white/45">{formatDate(attempt.date)}</p>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-semibold">
              {attempt.displayName}
              {attempt.isGuest && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-gold-300">
                  <UserRound className="size-3" /> Gast · AK
                </span>
              )}
            </p>
            {attempt.historicalLabel && (
              <p className="mt-1 truncate text-xs text-white/35">
                {attempt.historicalLabel}
              </p>
            )}
          </div>
          <p className="font-display text-2xl font-black text-gold-300">
            {formatTime(attempt.timeSeconds)}
          </p>
        </article>
      ))}
    </div>
  );
}
