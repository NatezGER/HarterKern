import { cn } from "@/lib/cn";
import {
  evaluateCompareWinner,
  type CompareDirection,
} from "@/lib/playerCompare";

interface CompareMetricRowProps {
  label: string;
  left: { raw: number | null; display: string };
  right: { raw: number | null; display: string };
  direction: CompareDirection | null;
}

export function CompareMetricRow({ label, left, right, direction }: CompareMetricRowProps) {
  const winner = direction == null ? null : evaluateCompareWinner(left.raw, right.raw, direction);
  return (
    <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_minmax(5.25rem,0.72fr)_minmax(0,1fr)] items-stretch border-t border-white/[0.06] first:border-t-0 sm:min-h-20 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.8fr)_minmax(0,1fr)]">
      <MetricValue value={left.display} winner={winner === "a"} align="left" />
      <div className="grid place-items-center px-1 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.08em] text-white/40 sm:px-3 sm:text-[11px] sm:tracking-[0.13em]">
        {label}
      </div>
      <MetricValue value={right.display} winner={winner === "b"} align="right" />
    </div>
  );
}

function MetricValue({
  value,
  winner,
  align,
}: {
  value: string;
  winner: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={cn(
      "flex min-w-0 items-center gap-1 px-2 py-3 sm:gap-2 sm:px-5",
      align === "right" && "flex-row-reverse",
    )}>
      <strong className={cn(
        "min-w-0 truncate font-display text-lg font-black tabular-nums sm:text-2xl",
        winner ? "context-accent-text" : "text-white/85",
      )}>
        {value}
      </strong>
      {winner && <span className="compare-winner-pill shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide sm:px-2 sm:text-[8px]">Vorn</span>}
    </div>
  );
}
